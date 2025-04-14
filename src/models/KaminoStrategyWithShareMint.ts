import { Address } from '@solana/kit';

export interface KaminoStrategyWithShareMint {
  address: Address;
  type: string;
  shareMint: Address;
  status: string;
  tokenAMint: Address;
  tokenBMint: Address;
}
