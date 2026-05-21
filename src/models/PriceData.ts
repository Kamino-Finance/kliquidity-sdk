import Decimal from 'decimal.js';

export type PriceData = {
  // Price of token A in USD, null if the price cannot be calculated
  aPrice: Decimal | null;
  // Price of token B in USD, null if the price cannot be calculated
  bPrice: Decimal | null;
  // Optional reward token price, if the strategy has a reward token
  reward0Price: Decimal | null;
  reward1Price: Decimal | null;
  reward2Price: Decimal | null;
  // Lower bound of the price range for the position, in token B per token A
  lowerPrice: Decimal;
  // Upper bound of the price range for the position, in token B per token A
  upperPrice: Decimal;
  // Current price, in token B per token A
  poolPrice: Decimal;
  twapPrice: Decimal | null;
  // Threshold prices when strategy should rebalance, in token B per token A
  lowerResetPrice: Decimal | null;
  upperResetPrice: Decimal | null;
};

export default PriceData;
