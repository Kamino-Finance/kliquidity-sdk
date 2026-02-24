// Source: https://raw.githubusercontent.com/orca-so/whirlpool-sdk/main/src/position/quotes/remove-liquidity.ts
/**
 * Added roundUp flag to accurately estimate token holdings for deposits
 */

import { Address } from '@solana/kit';
import { positionStatus, tickIndexToSqrtPrice } from '@orca-so/whirlpools-core';
import { ZERO_BN } from '../constants/numericalValues';
import { adjustForSlippage, getTokenAFromLiquidity, getTokenBFromLiquidity } from './orca';
import { Percentage } from './types';

export type InternalRemoveLiquidityQuoteParam = {
  positionAddress: Address;
  tickCurrentIndex: number;
  sqrtPrice: bigint;
  tickLowerIndex: number;
  tickUpperIndex: number;
  liquidity: bigint;
  slippageTolerance: Percentage;
};

export function getRemoveLiquidityQuote(
  param: InternalRemoveLiquidityQuoteParam,
  roundUp: boolean = false
): RemoveLiquidityQuote {
  const posStatus = positionStatus(param.sqrtPrice, param.tickLowerIndex, param.tickUpperIndex);

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
    sqrtPriceLowerX64,
    sqrtPriceUpperX64,
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
    sqrtPriceX64,
    sqrtPriceUpperX64,
    roundUp
  );
  const minTokenA = adjustForSlippage(estTokenA, slippageTolerance, roundUp);

  const estTokenB = getTokenBFromLiquidity(
    liquidity,
    sqrtPriceLowerX64,
    sqrtPriceX64,
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
    sqrtPriceLowerX64,
    sqrtPriceUpperX64,
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
  minTokenA: bigint;
  minTokenB: bigint;
  estTokenA: bigint;
  estTokenB: bigint;
  liquidity: bigint;
};
