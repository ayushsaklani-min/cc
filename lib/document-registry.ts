// Document-uniqueness registry (spec 7.1, H2): RESERVED -> ISSUED -> CONFIRMED,
// keyed by content fingerprint, every transition in its own transaction.
//
// The property this exists for: once an attestation has been signed for a
// document, that fact is durable. A crash after signing leaves an ISSUED row,
// and an ISSUED row never expires, so the document stays bound to the subject
// it was issued to: no other subject can ever use it. Only RESERVED rows
// (abandoned uploads) time out.
//
// [DEVIATION S-3] The same subject may be issued a replacement once its earlier
// attestation can no longer be submitted (expired, plus a grace period for
// clock difference with the chain). At most one usable attestation per
// document exists at any time.
import { transaction, type Db } from "./db.ts";

export type DocumentState = "RESERVED" | "ISSUED" | "CONFIRMED";

/** What is recorded when the oracle signs. `issued` is the serialized response payload. */
export interface IssuedRecord {
  nonce: string;
  digest: string;
  issued: string;
  expiresAt: number;
}

export interface DocumentRow extends Partial<IssuedRecord> {
  fingerprint: string;
  subject: string;
  state: DocumentState;
}

export type ReserveResult =
  | { kind: "reserved" }
  /** This subject's earlier attestation has expired unusably; a replacement may be signed and stored with reissue(). */
  | { kind: "reissuable" }
  /** This subject already holds an attestation for this document: hand it back, never re-sign. */
  | { kind: "already_issued"; record: IssuedRecord; state: "ISSUED" | "CONFIRMED" };

export class DocumentConflictError extends Error {
  constructor() {
    super("document claimed by another subject");
  }
}

export class RegistryStateError extends Error {}

interface Row {
  fingerprint: string;
  subject: string;
  state: DocumentState;
  reserved_at: number;
  nonce: string | null;
  digest: string | null;
  issued: string | null;
  expires_at: number | null;
}

const recordOf = (r: Row): IssuedRecord => {
  if (r.nonce === null || r.digest === null || r.issued === null || r.expires_at === null) {
    throw new RegistryStateError("issued row is missing its record");
  }
  return { nonce: r.nonce, digest: r.digest, issued: r.issued, expiresAt: r.expires_at };
};

export class DocumentRegistry {
  constructor(
    private readonly db: Db,
    /** How long an abandoned RESERVED row blocks other subjects, in seconds. */
    private readonly reservationTtl = 900,
    /** How long after an attestation expires before the same subject may be issued a replacement, in seconds. */
    private readonly reissueGrace = 120,
  ) {}

  private row(fingerprint: string): Row | undefined {
    return this.db.prepare("SELECT * FROM documents WHERE fingerprint = ?").get(fingerprint) as Row | undefined;
  }

  /**
   * Claims a document for a subject.
   * @throws DocumentConflictError if another subject holds a live claim.
   */
  reserve(fingerprint: string, subject: string, now: number): ReserveResult {
    return transaction(this.db, () => {
      const row = this.row(fingerprint);
      if (row === undefined) {
        this.db
          .prepare("INSERT INTO documents (fingerprint, subject, state, reserved_at) VALUES (?, ?, 'RESERVED', ?)")
          .run(fingerprint, subject, now);
        return { kind: "reserved" };
      }
      if (row.state !== "RESERVED") {
        if (row.subject !== subject) throw new DocumentConflictError();
        const record = recordOf(row);
        if (row.state === "ISSUED" && now >= record.expiresAt + this.reissueGrace) return { kind: "reissuable" };
        return { kind: "already_issued", record, state: row.state };
      }
      const abandoned = now - row.reserved_at > this.reservationTtl;
      if (row.subject !== subject && !abandoned) throw new DocumentConflictError();
      this.db
        .prepare("UPDATE documents SET subject = ?, reserved_at = ? WHERE fingerprint = ? AND state = 'RESERVED'")
        .run(subject, now, fingerprint);
      return { kind: "reserved" };
    });
  }

  /**
   * Records a signed attestation. Must commit before the signature leaves the
   * process: after this returns, the document is spent for good.
   */
  markIssued(fingerprint: string, subject: string, record: IssuedRecord, now: number): void {
    transaction(this.db, () => {
      const r = this.db
        .prepare(
          `UPDATE documents SET state = 'ISSUED', nonce = ?, digest = ?, issued = ?, expires_at = ?, issued_at = ?
           WHERE fingerprint = ? AND subject = ? AND state = 'RESERVED'`,
        )
        .run(record.nonce, record.digest, record.issued, record.expiresAt, now, fingerprint, subject);
      if (r.changes !== 1) throw new RegistryStateError("no reservation held by this subject");
    });
  }

  /**
   * Replaces this subject's expired, unsubmitted attestation with a new one.
   * The row stays ISSUED throughout, so the document is never unclaimed.
   */
  reissue(fingerprint: string, subject: string, record: IssuedRecord, now: number): void {
    transaction(this.db, () => {
      const r = this.db
        .prepare(
          `UPDATE documents SET nonce = ?, digest = ?, issued = ?, expires_at = ?, issued_at = ?
           WHERE fingerprint = ? AND subject = ? AND state = 'ISSUED' AND expires_at + ? <= ?`,
        )
        .run(record.nonce, record.digest, record.issued, record.expiresAt, now, fingerprint, subject, this.reissueGrace, now);
      if (r.changes !== 1) throw new RegistryStateError("no expired attestation held by this subject");
    });
  }

  /** Marks settlement observed on-chain. Idempotent for an already CONFIRMED row. */
  confirm(fingerprint: string, now: number): void {
    transaction(this.db, () => {
      const row = this.row(fingerprint);
      if (row === undefined || row.state === "RESERVED") {
        throw new RegistryStateError("cannot confirm a document that was never issued");
      }
      if (row.state === "ISSUED") {
        this.db
          .prepare("UPDATE documents SET state = 'CONFIRMED', confirmed_at = ? WHERE fingerprint = ?")
          .run(now, fingerprint);
      }
    });
  }

  /** Releases a reservation after a failure before signing, so the upload can be retried. */
  release(fingerprint: string, subject: string): void {
    this.db
      .prepare("DELETE FROM documents WHERE fingerprint = ? AND subject = ? AND state = 'RESERVED'")
      .run(fingerprint, subject);
  }

  get(fingerprint: string): DocumentRow | undefined {
    const r = this.row(fingerprint);
    if (r === undefined) return undefined;
    const base = { fingerprint: r.fingerprint, subject: r.subject, state: r.state };
    return r.state === "RESERVED" ? base : { ...base, ...recordOf(r) };
  }

  /** ISSUED rows awaiting on-chain confirmation: recovery re-drives these, it never re-signs. */
  pendingSettlement(): (DocumentRow & IssuedRecord)[] {
    const rows = this.db.prepare("SELECT * FROM documents WHERE state = 'ISSUED' ORDER BY issued_at").all() as unknown as Row[];
    return rows.map((r) => ({ fingerprint: r.fingerprint, subject: r.subject, state: r.state, ...recordOf(r) }));
  }
}
