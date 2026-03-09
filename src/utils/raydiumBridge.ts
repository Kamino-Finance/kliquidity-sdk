import BN from 'bn.js';

/** Convert bigint to BN for Raydium SDK interop */
export function toBN(value: bigint): BN {
  return new BN(value.toString());
}

/** Convert BN to bigint (from Raydium SDK results) */
export function fromBN(value: BN): bigint {
  return BigInt(value.toString());
}
