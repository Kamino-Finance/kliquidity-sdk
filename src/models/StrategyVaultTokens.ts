import { Address } from '@solana/kit';
import Decimal from 'decimal.js';

export type StrategyVaultTokens = {
  address: Address;
  frontendUrl: string;
  amount: Decimal;
};

export type TotalStrategyVaultTokens = {
  totalTokenAmount: Decimal;
  vaults: StrategyVaultTokens[];
  timestamp: Date;
};
