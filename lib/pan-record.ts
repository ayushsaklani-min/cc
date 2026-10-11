// Reads DigiLocker's "PAN Verification Record". Call this only on bytes whose
// signature has already been verified (lib/signed-pdf.ts): the text of an
// unsigned PDF proves nothing.
//
// The record is plain text in a fixed layout, so it is parsed by rule. No model
// reads it.
import { extractText, getDocumentProxy } from "unpdf";

export class PanRecordError extends Error {
  constructor(readonly code: "not_a_pan_record" | "unreadable_record") {
    super(code);
  }
}

export interface PanRecord {
  /** The Permanent Account Number. Personal data: never log or return it. */
  pan: string;
  name: string;
  dateOfBirth: { year: number; month: number; day: number };
}

/** All text of a PDF, with runs of whitespace collapsed to single spaces. */
export async function pdfText(pdf: Uint8Array): Promise<string> {
  try {
    // unpdf takes ownership of the buffer it is given, so hand it a copy.
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(pdf)), { mergePages: true });
    return text.replace(/\s+/g, " ").trim();
  } catch {
    throw new PanRecordError("unreadable_record");
  }
}

export function parsePanRecord(text: string): PanRecord {
  const t = text.replace(/\s+/g, " ");
  if (!/PAN VERIFICATION RECORD/i.test(t)) throw new PanRecordError("not_a_pan_record");
  const pan = /Permanent Account Number ([A-Z]{5}[0-9]{4}[A-Z])\b/i.exec(t)?.[1];
  const name = /\bNAME (.+?) GENDER\b/i.exec(t)?.[1]?.trim();
  const dob = /\bDATE OF BIRTH (\d{2})-(\d{2})-(\d{4})\b/i.exec(t);
  if (!pan || !name || !dob) throw new PanRecordError("unreadable_record");
  const [day, month, year] = [Number(dob[1]), Number(dob[2]), Number(dob[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects impossible dates such as 31-02, which Date would silently roll over.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || year < 1900) {
    throw new PanRecordError("unreadable_record");
  }
  return { pan: pan.toUpperCase(), name, dateOfBirth: { year, month, day } };
}

/** Completed years of age on the UTC calendar day containing `now` (epoch seconds). */
export function ageOn(dateOfBirth: PanRecord["dateOfBirth"], now: number): number {
  const today = new Date(now * 1000);
  const hadBirthday =
    today.getUTCMonth() + 1 > dateOfBirth.month || (today.getUTCMonth() + 1 === dateOfBirth.month && today.getUTCDate() >= dateOfBirth.day);
  return today.getUTCFullYear() - dateOfBirth.year - (hadBirthday ? 0 : 1);
}
