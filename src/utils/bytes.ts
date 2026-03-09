const encoder = new TextEncoder();

/** UTF-8 string → Uint8Array (replaces Buffer.from('string')) */
export function encodeUtf8(s: string): Uint8Array {
  return encoder.encode(s);
}

/** Base64 string → Uint8Array (replaces Buffer.from(s, 'base64')) */
export function base64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Read a little-endian 128-bit unsigned integer as bigint. Pass an existing DataView to avoid allocation. */
export function readU128LE(dv: DataView, off: number): bigint {
  return dv.getBigUint64(off, true) + (dv.getBigUint64(off + 8, true) << 64n);
}

/** Write a little-endian 128-bit integer. Pass an existing DataView to avoid allocation. */
export function writeU128LE(dv: DataView, off: number, v: bigint) {
  const mask64 = (1n << 64n) - 1n;
  dv.setBigUint64(off, v & mask64, true);
  dv.setBigUint64(off + 8, (v >> 64n) & mask64, true);
}
