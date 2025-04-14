import { Address } from '@solana/kit';

export type StrategyProgramAddress = {
  tokenAVault: Address;
  tokenABump: number;
  tokenBVault: Address;
  tokenBBump: number;
  baseVaultAuthority: Address;
  baseVaultAuthorityBump: number;
  sharesMint: Address;
  sharesMintBump: number;
  sharesMintAuthority: Address;
  sharesMintAuthorityBump: number;
};
