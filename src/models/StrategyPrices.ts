import Decimal from 'decimal.js';

export type StrategyPrices = {
  aPrice: Decimal | null;
  bPrice: Decimal | null;
  reward0Price: Decimal | null;
  reward1Price: Decimal | null;
  reward2Price: Decimal | null;
  aTwapPrice: Decimal | null;
  bTwapPrice: Decimal | null;
};
