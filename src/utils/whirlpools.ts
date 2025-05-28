// Source: https://raw.githubusercontent.com/orca-so/whirlpool-sdk/main/src/position/quotes/remove-liquidity.ts
/**
 * Added roundUp flag to accurately estimate token holdings for deposits
 */

import { BN } from '@coral-xyz/anchor';
import { Address } from '@solana/kit';
import { positionStatus, tickIndexToSqrtPrice } from '@orca-so/whirlpools-core';
import { ZERO_BN } from '../constants/numericalValues';
import { adjustForSlippage, getTokenAFromLiquidity, getTokenBFromLiquidity } from './orca';
import { Percentage } from './types';

export type InternalRemoveLiquidityQuoteParam = {
  positionAddress: Address;
  tickCurrentIndex: number;
  sqrtPrice: BN;
  tickLowerIndex: number;
  tickUpperIndex: number;
  liquidity: BN;
  slippageTolerance: Percentage;
};

export function getRemoveLiquidityQuote(
  param: InternalRemoveLiquidityQuoteParam,
  roundUp: boolean = false
): RemoveLiquidityQuote {
  const posStatus = positionStatus(BigInt(param.sqrtPrice.toString()), param.tickLowerIndex, param.tickUpperIndex);

  switch (posStatus) {
    case 'priceBelowRange':
      return getRemoveLiquidityQuoteWhenPositionIsBelowRange(param, roundUp);
    case 'priceInRange':
      return getRemoveLiquidityQuoteWhenPositionIsInRange(param, roundUp);
    case 'priceAboveRange':
      return getRemoveLiquidityQuoteWhenPositionIsAboveRange(param, roundUp);
    default:
      throw new Error(`type ${posStatus} is an unknown PositionStatus`);
  }
}

function getRemoveLiquidityQuoteWhenPositionIsBelowRange(
  param: InternalRemoveLiquidityQuoteParam,
  roundUp: boolean = false
): RemoveLiquidityQuote {
  const { positionAddress, tickLowerIndex, tickUpperIndex, liquidity, slippageTolerance } = param;

  const sqrtPriceLowerX64 = tickIndexToSqrtPrice(tickLowerIndex);
  const sqrtPriceUpperX64 = tickIndexToSqrtPrice(tickUpperIndex);

  const estTokenA = getTokenAFromLiquidity(
    liquidity,
    new BN(sqrtPriceLowerX64.toString()),
    new BN(sqrtPriceUpperX64.toString()),
    roundUp
  );
  const minTokenA = adjustForSlippage(estTokenA, slippageTolerance, roundUp);

  return {
    positionAddress,
    minTokenA,
    minTokenB: ZERO_BN,
    estTokenA,
    estTokenB: ZERO_BN,
    liquidity,
  };
}

function getRemoveLiquidityQuoteWhenPositionIsInRange(
  param: InternalRemoveLiquidityQuoteParam,
  roundUp: boolean = false
): RemoveLiquidityQuote {
  const { positionAddress, sqrtPrice, tickLowerIndex, tickUpperIndex, liquidity, slippageTolerance } = param;

  const sqrtPriceX64 = sqrtPrice;
  const sqrtPriceLowerX64 = tickIndexToSqrtPrice(tickLowerIndex);
  const sqrtPriceUpperX64 = tickIndexToSqrtPrice(tickUpperIndex);

  const estTokenA = getTokenAFromLiquidity(
    liquidity,
    new BN(sqrtPriceX64.toString()),
    new BN(sqrtPriceUpperX64.toString()),
    roundUp
  );
  const minTokenA = adjustForSlippage(estTokenA, slippageTolerance, roundUp);

  const estTokenB = getTokenBFromLiquidity(
    liquidity,
    new BN(sqrtPriceLowerX64.toString()),
    new BN(sqrtPriceX64.toString()),
    roundUp
  );
  const minTokenB = adjustForSlippage(estTokenB, slippageTolerance, roundUp);

  return {
    positionAddress,
    minTokenA,
    minTokenB,
    estTokenA,
    estTokenB,
    liquidity,
  };
}

function getRemoveLiquidityQuoteWhenPositionIsAboveRange(
  param: InternalRemoveLiquidityQuoteParam,
  roundUp: boolean = false
): RemoveLiquidityQuote {
  const { positionAddress, tickLowerIndex, tickUpperIndex, liquidity, slippageTolerance: slippageTolerance } = param;

  const sqrtPriceLowerX64 = tickIndexToSqrtPrice(tickLowerIndex);
  const sqrtPriceUpperX64 = tickIndexToSqrtPrice(tickUpperIndex);

  const estTokenB = getTokenBFromLiquidity(
    liquidity,
    new BN(sqrtPriceLowerX64.toString()),
    new BN(sqrtPriceUpperX64.toString()),
    roundUp
  );
  const minTokenB = adjustForSlippage(estTokenB, slippageTolerance, roundUp);

  return {
    positionAddress,
    minTokenA: ZERO_BN,
    minTokenB,
    estTokenA: ZERO_BN,
    estTokenB,
    liquidity,
  };
}

export type RemoveLiquidityQuote = {
  positionAddress: Address;
  minTokenA: BN;
  minTokenB: BN;
  estTokenA: BN;
  estTokenB: BN;
  liquidity: BN;
};
