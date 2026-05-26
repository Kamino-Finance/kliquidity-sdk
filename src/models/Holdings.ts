import Decimal from 'decimal.js';
import { TokenAmounts } from './TokenAmounts';

// Token holdings for a strategy, including monetary value of the holdings
export type Holdings = TokenHoldings & {
  // The USD value of available tokens, 0 if the value cannot be calculated
  availableUsd: Decimal;
  // USD value of invested tokens, 0 if the value cannot be calculated
  investedUsd: Decimal;
  // USD value of all tokens, 0 if the value cannot be calculated
  totalSum: Decimal;
};

// Token holdings for a strategy
export type TokenHoldings = {
  // Number of tokens not yet invested in the DEX pool
  available: TokenAmounts;
  // Number of tokens currently invested in the DEX pool
  invested: TokenAmounts;
};
