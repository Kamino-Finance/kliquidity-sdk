import Decimal from 'decimal.js';
import { FullBPSDecimal } from '../utils/CreationParameters';
import { PositionRange } from '../utils';

export function getPriceRangeFromPriceAndDiffBPS(
  price: Decimal,
  lowerDiffBPS: Decimal,
  upperDiffBPS: Decimal
): PositionRange {
  const lowerPrice = price.mul(FullBPSDecimal.sub(lowerDiffBPS)).div(FullBPSDecimal);
  const upperPrice = price.mul(FullBPSDecimal.add(upperDiffBPS)).div(FullBPSDecimal);

  return { lowerPrice, upperPrice };
}

export function getResetRangeFromPriceAndDiffBPS(
  price: Decimal,
  lowerDiffBPS: Decimal,
  upperDiffBPS: Decimal,
  resetLowerDiffBPS: Decimal,
  resetUpperDiffBPS: Decimal
): PositionRange {
  const resetLowerFactor = resetLowerDiffBPS.mul(lowerDiffBPS).div(FullBPSDecimal);
  const resetUpperFactor = resetUpperDiffBPS.mul(upperDiffBPS).div(FullBPSDecimal);
  const resetLowerPrice = price.mul(FullBPSDecimal.sub(resetLowerFactor)).div(FullBPSDecimal);
  const resetUpperPrice = price.mul(FullBPSDecimal.add(resetUpperFactor)).div(FullBPSDecimal);
  return { lowerPrice: resetLowerPrice, upperPrice: resetUpperPrice };
}
