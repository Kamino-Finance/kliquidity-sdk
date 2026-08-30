/**
 * One deposit condition: the pool price must stay close to the oracle price.
 *
 * Callers should use `checkStrategyAcceptsDeposit` instead of these functions. It runs every deposit
 * condition and returns a message to show the user. Call the functions here only when you need the
 * raw deviation numbers, for example to render them next to the button.
 */
import Decimal from 'decimal.js';
import { GlobalConfig, WhirlpoolStrategy } from '../@codegen/kliquidity/accounts';
import { FullBPS } from './CreationParameters';

/**
 * Hardcoded upper bound of the configurable pool/oracle deviation cap.
 * Mirrors `CAP_MAX_PRICE_DEVIATION_BPS` in the yvaults program.
 */
export const CAP_MAX_PRICE_DEVIATION_BPS = 500;

export type DepositPriceDeviationParams = {
  strategy: WhirlpoolStrategy;
  globalConfig: GlobalConfig;
  /** Current pool price, in whole token B per whole token A. */
  poolPrice: Decimal;
  /** Oracle (scope) USD price of token A. */
  oraclePriceA: Decimal;
  /** Oracle (scope) USD price of token B. */
  oraclePriceB: Decimal;
};

export type DepositPriceDeviationStatus = {
  /** False when the pool price is too far from the oracle price for the deposit to succeed. */
  canDeposit: boolean;
  /** Distance between the pool price and the oracle price, in bps of the oracle price. */
  deviationBps: Decimal;
  /** Deviation the program accepts for this deposit, in bps. */
  maxDeviationBps: number;
  /** Pool price used for the check, in whole token B per whole token A. */
  poolPrice: Decimal;
  /** Oracle price used for the check, in whole token B per whole token A. */
  oraclePrice: Decimal;
};

function minBigInt(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function maxBigInt(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

/**
 * Get the effective cap of the pool/oracle deviation, in bps.
 * Mirrors `GlobalConfig::get_effective_pool_price_oracle_deviation_bps_cap`.
 */
export function getEffectivePoolPriceOracleDeviationBpsCap(globalConfig: GlobalConfig): number {
  if (globalConfig.capMaxPriceDeviationBps === 0) {
    return CAP_MAX_PRICE_DEVIATION_BPS;
  }
  return Math.min(globalConfig.capMaxPriceDeviationBps, CAP_MAX_PRICE_DEVIATION_BPS);
}

/**
 * Get the pool/oracle deviation the program accepts on a proportional deposit, in bps.
 * Mirrors `WhirlpoolStrategy::get_deposit_max_pool_price_oracle_deviation_bps`: take the most
 * permissive of the strategy and global dedicated deposit values, fall back to the strategy invest
 * deviation when neither is set, and cap the result with the global cap.
 */
export function getDepositMaxPoolPriceOracleDeviationBps(
  strategy: WhirlpoolStrategy,
  globalConfig: GlobalConfig
): number {
  const cap = BigInt(getEffectivePoolPriceOracleDeviationBpsCap(globalConfig));
  const dedicatedDeviationBps = maxBigInt(
    strategy.depositMaxPoolPriceOracleDeviationBps,
    globalConfig.depositMaxPoolPriceOracleDeviationBps
  );

  if (dedicatedDeviationBps === 0n) {
    return Number(minBigInt(strategy.maxPriceDeviationBps, cap));
  }
  return Number(minBigInt(dedicatedDeviationBps, cap));
}

/**
 * Get the distance between the pool price and the oracle price, in bps of the oracle price.
 * Mirrors `assert_valid_pool_price`, which takes the oracle price as the reference.
 */
export function getPoolOracleDeviationBps(poolPrice: Decimal, oraclePrice: Decimal): Decimal {
  if (oraclePrice.lte(0)) {
    throw new Error(`Oracle price must be positive, got ${oraclePrice.toString()}`);
  }
  return poolPrice.sub(oraclePrice).abs().div(oraclePrice).mul(FullBPS);
}

/**
 * Check whether the pool price is close enough to the oracle price for a proportional deposit to
 * succeed. Mirrors the pool/oracle price gate of `vault_operations::deposit`, which rejects the
 * deposit with `OrcaPriceTooDifferentFromScope` when the deviation is too large.
 *
 * Price based strategies run the same gate, but an unbalanced one is held to a tighter limit that
 * this function does not compute, so the result is an upper bound for them.
 *
 * Prefer `checkStrategyAcceptsDeposit`, which runs this condition together with every other one and
 * returns a message to show the user.
 */
export function getDepositPriceDeviationStatus(params: DepositPriceDeviationParams): DepositPriceDeviationStatus {
  const { strategy, globalConfig, poolPrice, oraclePriceA, oraclePriceB } = params;

  if (oraclePriceB.lte(0)) {
    throw new Error(`Oracle price of token B must be positive, got ${oraclePriceB.toString()}`);
  }

  const maxDeviationBps = getDepositMaxPoolPriceOracleDeviationBps(strategy, globalConfig);
  const oraclePrice = oraclePriceA.div(oraclePriceB);
  const deviationBps = getPoolOracleDeviationBps(poolPrice, oraclePrice);

  return {
    canDeposit: deviationBps.lte(maxDeviationBps),
    deviationBps,
    maxDeviationBps,
    poolPrice,
    oraclePrice,
  };
}
