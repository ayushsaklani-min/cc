// Verifies the digital signature on a PDF, so that a document's contents are
// believed only if a known issuer signed exactly these bytes.
//
// Deliberately narrow. It accepts one shape and refuses everything else:
//   - exactly one signature, covering the whole file (no bytes appended later);
//   - a detached CMS signature with signed attributes;
//   - SHA-256 with RSA (PKCS#1 v1.5), key of at least 2048 bits;
//   - a signing certificate whose SHA-256 fingerprint is on the caller's list.
//
// Trust is by pinned certificate, not by validating a chain to a root: the
// signature carries only the signer's own certificate. A pinned certificate
// must be replaced when the issuer rotates it.
import { createHash, verify, X509Certificate } from "node:crypto";

export class SignedPdfError extends Error {
  constructor(
    /** Stable code, safe to return to a client. */
    readonly code:
      | "not_signed"
      | "multiple_signatures"
      | "signature_not_over_whole_file"
      | "unsupported_signature"
      | "signature_invalid"
      | "signer_not_trusted"
      | "signer_certificate_not_valid",
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
  }
}

export interface TrustedSigner {
  /** SHA-256 fingerprint of the signing certificate, hex, any case, colons optional. */
  fingerprint256: string;
  /** Who this is, for logs and the UI. */
  name: string;
}

export interface VerifiedSignature {
  signer: TrustedSigner;
  /** When the signer says it signed, in seconds since the Unix epoch. */
  signedAt: number;
}

// ---- Minimal DER reader: just enough to walk a CMS SignedData. ----

interface Node {
  tag: number;
  /** Offset of the tag byte. */
  start: number;
  valueStart: number;
  end: number;
}

function readNode(buf: Uint8Array, offset: number, limit: number): Node {
  if (offset + 2 > limit) throw new SignedPdfError("unsupported_signature", "truncated DER");
  const tag = buf[offset]!;
  if ((tag & 0x1f) === 0x1f) throw new SignedPdfError("unsupported_signature", "multi-byte tag");
  let length = buf[offset + 1]!;
  let valueStart = offset + 2;
  if (length & 0x80) {
    const count = length & 0x7f;
    if (count === 0 || count > 4 || valueStart + count > limit) throw new SignedPdfError("unsupported_signature", "bad DER length");
    length = 0;
    for (let i = 0; i < count; i++) length = length * 256 + buf[valueStart + i]!;
    valueStart += count;
  }
  const end = valueStart + length;
  if (end > limit) throw new SignedPdfError("unsupported_signature", "DER value overruns");
  return { tag, start: offset, valueStart, end };
}

function children(buf: Uint8Array, parent: Node): Node[] {
  const out: Node[] = [];
  for (let at = parent.valueStart; at < parent.end; ) {
    const node = readNode(buf, at, parent.end);
    out.push(node);
    at = node.end;
  }
  return out;
}

const bytesOf = (buf: Uint8Array, n: Node, withHeader = false) => buf.subarray(withHeader ? n.start : n.valueStart, n.end);
const equal = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

function oid(buf: Uint8Array, n: Node): string {
  if (n.tag !== 0x06) throw new SignedPdfError("unsupported_signature", "expected an object identifier");
  const v = bytesOf(buf, n);
  const parts = [Math.floor(v[0]! / 40), v[0]! % 40];
  let acc = 0;
  for (const byte of v.subarray(1)) {
    acc = acc * 128 + (byte & 0x7f);
    if (!(byte & 0x80)) {
      parts.push(acc);
      acc = 0;
    }
  }
  return parts.join(".");
}

const OID = {
  signedData: "1.2.840.113549.1.7.2",
  data: "1.2.840.113549.1.7.1",
  sha256: "2.16.840.1.101.3.4.2.1",
  rsaEncryption: "1.2.840.113549.1.1.1",
  sha256WithRsa: "1.2.840.113549.1.1.11",
  contentType: "1.2.840.113549.1.9.3",
  messageDigest: "1.2.840.113549.1.9.4",
  signingTime: "1.2.840.113549.1.9.5",
};

/** UTCTime (YYMMDDHHMMSSZ) or GeneralizedTime (YYYYMMDDHHMMSSZ) to epoch seconds. */
function parseTime(buf: Uint8Array, n: Node): number {
  const s = new TextDecoder().decode(bytesOf(buf, n));
  const m = n.tag === 0x17 ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(s) : /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(s);
  if (!m) throw new SignedPdfError("unsupported_signature", "unreadable signing time");
  const year = n.tag === 0x17 ? (Number(m[1]) >= 50 ? 1900 : 2000) + Number(m[1]) : Number(m[1]);
  return Date.UTC(year, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6])) / 1000;
}

const normalizeFingerprint = (f: string) => f.replace(/[^0-9a-fA-F]/g, "").toLowerCase();

/** Verifies a detached CMS signature over `content` against the trusted signers. */
export function verifyDetachedCms(cms: Uint8Array, content: Uint8Array, trusted: readonly TrustedSigner[]): VerifiedSignature {
  const contentInfo = readNode(cms, 0, cms.length);
  const [contentType, wrapper] = children(cms, contentInfo);
  if (!contentType || !wrapper || oid(cms, contentType) !== OID.signedData || wrapper.tag !== 0xa0) {
    throw new SignedPdfError("unsupported_signature", "not CMS SignedData");
  }
  const signedData = children(cms, children(cms, wrapper)[0]!);
  const certificates = signedData.find((n) => n.tag === 0xa0);
  // signerInfos is the last element and a SET.
  const signerInfos = signedData[signedData.length - 1];
  if (!certificates || !signerInfos || signerInfos.tag !== 0x31) throw new SignedPdfError("unsupported_signature", "no signer or certificate");
  const signers = children(cms, signerInfos);
  if (signers.length !== 1) throw new SignedPdfError("unsupported_signature", "expected exactly one signer");

  const info = children(cms, signers[0]!);
  const [, sid, digestAlgorithm] = info;
  const signedAttrs = info.find((n) => n.tag === 0xa0);
  const signature = info.find((n) => n.tag === 0x04);
  const signatureAlgorithm = signature ? info[info.indexOf(signature) - 1] : undefined;
  if (!sid || !digestAlgorithm || !signedAttrs || !signature || !signatureAlgorithm) {
    throw new SignedPdfError("unsupported_signature", "signer info without signed attributes");
  }
  if (oid(cms, children(cms, digestAlgorithm)[0]!) !== OID.sha256) throw new SignedPdfError("unsupported_signature", "digest is not SHA-256");
  const algorithm = oid(cms, children(cms, signatureAlgorithm)[0]!);
  if (algorithm !== OID.rsaEncryption && algorithm !== OID.sha256WithRsa) throw new SignedPdfError("unsupported_signature", "signature is not RSA");

  // Signed attributes: the content digest, its type, and the signing time.
  const attributes = new Map<string, Node>();
  for (const attr of children(cms, signedAttrs)) {
    const [type, values] = children(cms, attr);
    const value = values ? children(cms, values)[0] : undefined;
    if (type && value) attributes.set(oid(cms, type), value);
  }
  const digest = attributes.get(OID.messageDigest);
  const type = attributes.get(OID.contentType);
  const time = attributes.get(OID.signingTime);
  if (!digest || !type || !time) throw new SignedPdfError("unsupported_signature", "missing signed attribute");
  if (oid(cms, type) !== OID.data) throw new SignedPdfError("unsupported_signature", "unexpected content type");
  if (!equal(bytesOf(cms, digest), new Uint8Array(createHash("sha256").update(content).digest()))) {
    throw new SignedPdfError("signature_invalid", "content digest does not match");
  }

  // The signer's certificate: the one whose issuer and serial number the signer info names.
  if (sid.tag !== 0x30) throw new SignedPdfError("unsupported_signature", "signer identified by key id");
  const [sidIssuer, sidSerial] = children(cms, sid);
  let signerCert: X509Certificate | undefined;
  for (const cert of children(cms, certificates)) {
    const tbs = children(cms, children(cms, cert)[0]!);
    const fields = tbs[0]?.tag === 0xa0 ? tbs.slice(1) : tbs;
    const [serial, , issuer] = fields;
    if (serial && issuer && sidIssuer && sidSerial && equal(bytesOf(cms, serial), bytesOf(cms, sidSerial)) && equal(bytesOf(cms, issuer, true), bytesOf(cms, sidIssuer, true))) {
      signerCert = new X509Certificate(bytesOf(cms, cert, true));
    }
  }
  if (!signerCert) throw new SignedPdfError("unsupported_signature", "signer certificate not included");

  // What is signed is the attribute set, re-tagged from [0] to SET.
  const toVerify = new Uint8Array(bytesOf(cms, signedAttrs, true));
  toVerify[0] = 0x31;
  const key = signerCert.publicKey;
  if (key.asymmetricKeyType !== "rsa" || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
    throw new SignedPdfError("unsupported_signature", "signer key is not RSA of at least 2048 bits");
  }
  if (!verify("sha256", toVerify, key, bytesOf(cms, signature))) throw new SignedPdfError("signature_invalid");

  const fingerprint = normalizeFingerprint(signerCert.fingerprint256);
  const signer = trusted.find((t) => normalizeFingerprint(t.fingerprint256) === fingerprint);
  if (!signer) throw new SignedPdfError("signer_not_trusted");

  const signedAt = parseTime(cms, time);
  if (signedAt * 1000 < Date.parse(signerCert.validFrom) || signedAt * 1000 > Date.parse(signerCert.validTo)) {
    throw new SignedPdfError("signer_certificate_not_valid", "signed outside the certificate's validity period");
  }
  return { signer, signedAt };
}

const ascii = (b: Uint8Array) => Buffer.from(b).toString("latin1");

/**
 * Verifies that `pdf` carries exactly one signature, by a trusted signer, over
 * every byte of the file except the signature value itself.
 * @throws SignedPdfError
 */
export function verifySignedPdf(pdf: Uint8Array, trusted: readonly TrustedSigner[]): VerifiedSignature {
  const text = ascii(pdf);
  const ranges = [...text.matchAll(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g)];
  if (ranges.length === 0) throw new SignedPdfError("not_signed");
  if (ranges.length > 1) throw new SignedPdfError("multiple_signatures");
  const [a, lengthA, b, lengthB] = ranges[0]!.slice(1).map(Number) as [number, number, number, number];
  // The two ranges must be the start of the file up to the signature value, and from
  // just after it to the very end. Anything else leaves bytes the signature does not cover.
  if (a !== 0 || lengthA <= 0 || b <= lengthA || b + lengthB !== pdf.length || ranges[0]!.index >= lengthA) {
    throw new SignedPdfError("signature_not_over_whole_file");
  }
  const gap = text.slice(lengthA, b);
  const hex = /^<([0-9a-fA-F]+)>$/.exec(gap)?.[1];
  if (!hex || hex.length % 2 !== 0) throw new SignedPdfError("signature_not_over_whole_file", "unexpected bytes around the signature value");
  if (!/\/SubFilter\s*\/(adbe\.pkcs7\.detached|ETSI\.CAdES\.detached)/.test(text)) throw new SignedPdfError("unsupported_signature", "not a detached signature");

  const padded = new Uint8Array(Buffer.from(hex, "hex"));
  // The value is zero-padded to a fixed width; the DER object says where it really ends.
  const cms = padded.subarray(0, readNode(padded, 0, padded.length).end);
  const content = new Uint8Array(lengthA + lengthB);
  content.set(pdf.subarray(0, lengthA), 0);
  content.set(pdf.subarray(b), lengthA);
  return verifyDetachedCms(cms, content, trusted);
}

/** The SHA-256 fingerprint of a PEM certificate, in the form TrustedSigner expects. */
export function certificateFingerprint(pem: string): string {
  return normalizeFingerprint(new X509Certificate(pem).fingerprint256);
}
