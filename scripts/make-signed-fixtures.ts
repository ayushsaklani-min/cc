// Generates the signed-PDF test fixtures in test/fixtures/signed/.
// Needs the openssl command line. The private keys are created in a temporary
// directory and deleted: only certificates and signed PDFs are kept. All data
// in the documents is invented.
//
//   npx tsx scripts/make-signed-fixtures.ts
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../test/fixtures/signed/", import.meta.url));
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "cc-fixtures-"));

function openssl(args: string[]): void {
  const r = spawnSync("openssl", args, { encoding: "utf8", env: { ...process.env, MSYS_NO_PATHCONV: "1" } });
  if (r.status !== 0) throw new Error(`openssl ${args[0]} failed: ${r.stderr}`);
}

function signer(name: string, organisation: string): { cert: string; key: string } {
  const key = join(work, `${name}.key`);
  const cert = join(work, `${name}.pem`);
  openssl(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "3650", "-keyout", key, "-out", cert, "-subj", `/C=IN/O=${organisation}/CN=${name}`]);
  return { cert, key };
}

const SIGNATURE_HEX_CHARS = 8192;
const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);

/** A one-page text PDF with a detached signature over everything but the signature value. */
function signedPdf(lines: string[], by: { cert: string; key: string }): Uint8Array {
  const content = ["BT", "/F1 11 Tf", "16 TL", "56 780 Td", ...lines.map((l) => `(${escape(l)}) Tj T*`), "ET"].join("\n");
  const byteRange = "/ByteRange [0 0000000000 0000000000 0000000000]";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [6 0 R] /SigFlags 3 >> >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> /Annots [6 0 R] >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Annot /Subtype /Widget /FT /Sig /T (Signature1) /Rect [0 0 0 0] /P 3 0 R /V 7 0 R >>",
    `<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached ${byteRange} /Contents <${"0".repeat(SIGNATURE_HEX_CHARS)}> >>`,
  ];
  let pdf = "%PDF-1.7\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  // Fill in the byte range: everything before "<" and everything after ">".
  const open = pdf.indexOf(`/Contents <${"0".repeat(16)}`) + "/Contents ".length;
  const close = open + SIGNATURE_HEX_CHARS + 2;
  const pad = (n: number) => String(n).padStart(10, "0");
  pdf = pdf.replace(byteRange, `/ByteRange [0 ${pad(open)} ${pad(close)} ${pad(pdf.length - close)}]`);

  const bytes = Buffer.from(pdf, "latin1");
  const toSign = join(work, "content.bin");
  const signature = join(work, "signature.der");
  writeFileSync(toSign, Buffer.concat([bytes.subarray(0, open), bytes.subarray(close)]));
  openssl(["cms", "-sign", "-binary", "-md", "sha256", "-in", toSign, "-signer", by.cert, "-inkey", by.key, "-outform", "DER", "-out", signature]);
  const hex = readFileSync(signature).toString("hex");
  if (hex.length > SIGNATURE_HEX_CHARS) throw new Error("signature does not fit the placeholder");
  bytes.write(hex.padEnd(SIGNATURE_HEX_CHARS, "0"), open + 1, "latin1");
  return new Uint8Array(bytes);
}

/** The layout of DigiLocker's PAN Verification Record, with invented values. */
const panRecord = (dateOfBirth: string, pan = "ABCDE1234F") => [
  "PAN VERIFICATION RECORD",
  "Permanent Account Number",
  pan,
  "NAME ASHA EXAMPLE",
  "GENDER FEMALE",
  `DATE OF BIRTH ${dateOfBirth}`,
  "VERIFIED ON 01/01/2026 10:00:00",
  "Note:",
  "1. This is a test fixture. It is not a real record.",
];

try {
  const trusted = signer("test-issuer", "CipherComply Test Issuer");
  const stranger = signer("unknown-issuer", "Somebody Else");
  writeFileSync(join(out, "trusted-signer.pem"), readFileSync(trusted.cert));
  writeFileSync(join(out, "pan-adult.pdf"), signedPdf(panRecord("15-01-1990"), trusted));
  writeFileSync(join(out, "pan-minor.pdf"), signedPdf(panRecord("01-06-2015", "ZZZZZ9999Z"), trusted));
  writeFileSync(join(out, "pan-untrusted-signer.pdf"), signedPdf(panRecord("15-01-1990"), stranger));
  writeFileSync(join(out, "other-document.pdf"), signedPdf(["DRIVING LICENCE EXTRACT", "NAME ASHA EXAMPLE", "DATE OF BIRTH 15-01-1990"], trusted));
  console.log(`fixtures written to ${out}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
