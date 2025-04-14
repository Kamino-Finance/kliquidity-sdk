import { Address } from '@solana/kit';
import Decimal from 'decimal.js';

export type StrategyHolder = {
  holderPubkey: Address;
  amount: Decimal;
};
