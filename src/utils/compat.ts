import { PublicKey } from '@solana/web3.js';
import { Address } from '@solana/kit';

export function toLegacyPublicKey(address: Address): PublicKey {
  return new PublicKey(address.toString());
}
