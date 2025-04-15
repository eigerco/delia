export function numberToU64LE(n: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setBigUint64(0, BigInt(n), true);
  return new Uint8Array(buffer);
}

export function numberToU32LE(n: number): Uint8Array {
  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setUint32(0, n, true);
  return new Uint8Array(buffer);
}
