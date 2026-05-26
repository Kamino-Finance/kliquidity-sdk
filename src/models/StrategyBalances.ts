import { Holdings } from './Holdings';
import { PriceData } from './PriceData';
import Decimal from 'decimal.js';
import StrategyWithAddress from './StrategyWithAddress';

export type StrategyBalances = {
  // Token amounts & their USD value for the strategy
  computedHoldings: Holdings;
  // Token price data, as viewed from on Chain
  prices: PriceData;
  // Total amount of tokens in the strategy, including both available and invested tokens.
  // Same as computedHoldings.available.a.plus(computedHoldings.invested.a)
  tokenAAmounts: Decimal;
  // Same as computedHoldings.available.b.plus(computedHoldings.invested.b)
  tokenBAmounts: Decimal;
};
export type StrategyBalanceWithAddress = {
  balance: StrategyBalances;
  strategyWithAddress: StrategyWithAddress;
};
