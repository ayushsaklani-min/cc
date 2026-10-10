/** UTF-8 text right-padded with zeros to 32 bytes, matching Compact's `pad(32, "...")`. */
export function text32(s: string): Uint8Array {
  const encoded = new TextEncoder().encode(s);
  if (encoded.length > 32) throw new Error("text longer than 32 bytes");
  const out = new Uint8Array(32);
  out.set(encoded);
  return out;
}

export const toHex = (b: Uint8Array): string => Buffer.from(b).toString("hex");

export function fromHex(h: string, bytes?: number): Uint8Array {
  if (!/^([0-9a-f]{2})*$/.test(h) || (bytes !== undefined && h.length !== bytes * 2)) throw new Error("malformed hex");
  return new Uint8Array(Buffer.from(h, "hex"));
}
