import { LiquidityMathUtil, PersonalPositionLayout, TickArrayUtil, TickUtil } from '@raydium-io/raydium-sdk-v2/lib';
import BN from 'bn.js';
import Decimal from 'decimal.js';

export type ReturnTypeGetTickPrice = {
  tick: number;
  price: Decimal;
  tickSqrtPriceX64: BN;
};

export type RaydiumPersonalPositionInfo = ReturnType<typeof PersonalPositionLayout.decode>;

export function decodeRaydiumPersonalPosition(data: Buffer): RaydiumPersonalPositionInfo {
  return PersonalPositionLayout.decode(data);
}

export class RaydiumSqrtPriceMath {
  static sqrtPriceX64ToPrice(sqrtPriceX64: BN, decimalsA: number, decimalsB: number): Decimal {
    return TickUtil.sqrtPriceX64ToPrice(sqrtPriceX64, decimalsA, decimalsB);
  }

  static priceToSqrtPriceX64(price: Decimal, decimalsA: number, decimalsB: number): BN {
    return TickUtil.priceToSqrtPriceX64(price, decimalsA, decimalsB);
  }

  static getSqrtPriceX64FromTick(tick: number): BN {
    return TickUtil.getSqrtPriceAtTick(tick);
  }

  static getTickFromPrice(price: Decimal, decimalsA: number, decimalsB: number): number {
    return TickUtil.priceToTick(price, decimalsA, decimalsB);
  }

  static getTickFromSqrtPriceX64(sqrtPriceX64: BN): number {
    return TickUtil.getTickAtSqrtPrice(sqrtPriceX64);
  }
}

export class RaydiumTickMath {
  static getTickWithPriceAndTickspacing(
    price: Decimal,
    tickSpacing: number,
    mintDecimalsA: number,
    mintDecimalsB: number
  ): number {
    const tick = RaydiumSqrtPriceMath.getTickFromPrice(price, mintDecimalsA, mintDecimalsB);
    const roundedTick = tick < 0 ? Math.floor(tick / tickSpacing) : Math.ceil(tick / tickSpacing);
    return roundedTick * tickSpacing;
  }

  static roundPriceWithTickspacing(
    price: Decimal,
    tickSpacing: number,
    mintDecimalsA: number,
    mintDecimalsB: number
  ): Decimal {
    const tick = this.getTickWithPriceAndTickspacing(price, tickSpacing, mintDecimalsA, mintDecimalsB);
    return RaydiumSqrtPriceMath.sqrtPriceX64ToPrice(
      RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(tick),
      mintDecimalsA,
      mintDecimalsB
    );
  }
}

export class RaydiumLiquidityMath {
  static addDelta(x: BN, y: BN): BN {
    return LiquidityMathUtil.addDelta(x, y);
  }

  static getTokenAmountAFromLiquidity(sqrtPriceX64A: BN, sqrtPriceX64B: BN, liquidity: BN, roundUp: boolean): BN {
    return LiquidityMathUtil.getAmountForLiquidityA(sqrtPriceX64A, sqrtPriceX64B, liquidity, roundUp);
  }

  static getTokenAmountBFromLiquidity(sqrtPriceX64A: BN, sqrtPriceX64B: BN, liquidity: BN, roundUp: boolean): BN {
    return LiquidityMathUtil.getAmountForLiquidityB(sqrtPriceX64A, sqrtPriceX64B, liquidity, roundUp);
  }

  static getLiquidityFromTokenAmountA(sqrtPriceX64A: BN, sqrtPriceX64B: BN, amountA: BN, _roundUp: boolean): BN {
    return LiquidityMathUtil.getLiquidityFromAmountA(sqrtPriceX64A, sqrtPriceX64B, amountA);
  }

  static getLiquidityFromTokenAmountB(sqrtPriceX64A: BN, sqrtPriceX64B: BN, amountB: BN): BN {
    return LiquidityMathUtil.getLiquidityFromAmountB(sqrtPriceX64A, sqrtPriceX64B, amountB);
  }

  static getLiquidityFromTokenAmounts(
    sqrtPriceCurrentX64: BN,
    sqrtPriceX64A: BN,
    sqrtPriceX64B: BN,
    amountA: BN,
    amountB: BN
  ): BN {
    return LiquidityMathUtil.getLiquidityFromAmounts(
      sqrtPriceCurrentX64,
      sqrtPriceX64A,
      sqrtPriceX64B,
      amountA,
      amountB
    );
  }

  static getAmountsFromLiquidity(
    sqrtPriceCurrentX64: BN,
    sqrtPriceX64A: BN,
    sqrtPriceX64B: BN,
    liquidity: BN,
    roundUp: boolean
  ): { amountA: BN; amountB: BN } {
    return LiquidityMathUtil.getAmountsForLiquidity(
      sqrtPriceCurrentX64,
      sqrtPriceX64A,
      sqrtPriceX64B,
      liquidity,
      roundUp
    );
  }

  static getAmountsFromLiquidityWithSlippage(
    sqrtPriceCurrentX64: BN,
    sqrtPriceX64A: BN,
    sqrtPriceX64B: BN,
    liquidity: BN,
    amountMax: boolean,
    roundUp: boolean,
    amountSlippage: number
  ): { amountSlippageA: BN; amountSlippageB: BN } {
    return LiquidityMathUtil.getAmountsFromLiquidityWithSlippage(
      sqrtPriceCurrentX64,
      sqrtPriceX64A,
      sqrtPriceX64B,
      liquidity,
      amountMax,
      roundUp,
      amountSlippage
    );
  }
}

export class RaydiumTickUtils {
  static getTickArrayStartIndexByTick(tickIndex: number, tickSpacing: number): number {
    return TickArrayUtil.getTickArrayStartIndex(tickIndex, tickSpacing);
  }
}
