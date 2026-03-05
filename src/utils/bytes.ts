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

// --- Read helpers (replace buffer.readXxxLE) ---
function dv(buf: Uint8Array, off: number) {
  return new DataView(buf.buffer, buf.byteOffset + off);
}

export function readU8(buf: Uint8Array, off: number): number {
  return buf[off];
}
export function readI8(buf: Uint8Array, off: number): number {
  return dv(buf, off).getInt8(0);
}
export function readU16LE(buf: Uint8Array, off: number): number {
  return dv(buf, off).getUint16(0, true);
}
export function readI32LE(buf: Uint8Array, off: number): number {
  return dv(buf, off).getInt32(0, true);
}
export function readU32LE(buf: Uint8Array, off: number): number {
  return dv(buf, off).getUint32(0, true);
}
export function readU64LE(buf: Uint8Array, off: number): bigint {
  return dv(buf, off).getBigUint64(0, true);
}

// --- Write helpers (replace Buffer.alloc + buffer.writeXxxLE) ---
function wdv(buf: Uint8Array) {
  return new DataView(buf.buffer, buf.byteOffset);
}

export function writeU8(buf: Uint8Array, off: number, v: number) {
  wdv(buf).setUint8(off, v);
}
export function writeU16LE(buf: Uint8Array, off: number, v: number) {
  wdv(buf).setUint16(off, v, true);
}
export function writeI32LE(buf: Uint8Array, off: number, v: number) {
  wdv(buf).setInt32(off, v, true);
}
export function writeU32LE(buf: Uint8Array, off: number, v: number) {
  wdv(buf).setUint32(off, v, true);
}
export function writeU64LE(buf: Uint8Array, off: number, v: bigint) {
  wdv(buf).setBigUint64(off, v & ((1n << 64n) - 1n), true);
}
export function write128LE(buf: Uint8Array, off: number, v: bigint) {
  const mask64 = (1n << 64n) - 1n;
  writeU64LE(buf, off, v & mask64);
  writeU64LE(buf, off + 8, (v >> 64n) & mask64);
}
