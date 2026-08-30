import Decimal from 'decimal.js';
import { CollateralInfo } from '../@codegen/kliquidity/types';
import { GlobalConfig } from '../@codegen/kliquidity/accounts';
import { StrategyBalances } from '../models/StrategyBalances';
import {
  DepositPriceDeviationParams,
  DepositPriceDeviationStatus,
  getDepositPriceDeviationStatus,
} from './depositPriceDeviation';

/** Machine readable code of the condition that blocks a deposit. */
export const DepositRejectionReason = ['POOL_PRICE_TOO_FAR_FROM_ORACLE'] as const;
export type DepositRejectionReason = (typeof DepositRejectionReason)[number];

export type DepositCheckResult = {
  /** True when every deposit condition holds. */
  acceptsDeposit: boolean;
  /** Code of the first condition that failed, null when the strategy accepts the deposit. */
  reason: DepositRejectionReason | null;
  /** Message to show the user, null when the strategy accepts the deposit. */
  message: string | null;
};

/**
 * Inputs of every deposit condition. Widen this type when a new condition needs more state.
 */
export type DepositCheckParams = DepositPriceDeviationParams;

/**
 * States a caller may already hold. Anything left out is read from the chain by
 * `Kamino.checkStrategyAcceptsDeposit`.
 */
export type PrefetchedDepositCheckState = {
  /** Global config of the strategy. */
  globalConfig?: GlobalConfig;
  /** Collateral infos of the global config. Only read when the oracle prices are missing. */
  collateralInfos?: CollateralInfo[];
  /** Strategy balances, as returned by `getStrategyShareData`. Covers pool price and oracle prices. */
  balances?: StrategyBalances;
  /** Current pool price, in whole token B per whole token A. Takes precedence over `balances`. */
  poolPrice?: Decimal;
  /** Oracle (scope) USD price of token A. Takes precedence over `balances`. */
  oraclePriceA?: Decimal;
  /** Oracle (scope) USD price of token B. Takes precedence over `balances`. */
  oraclePriceB?: Decimal;
};

/** A failed condition, or null when the condition holds. */
type DepositRejection = Pick<DepositCheckResult, 'reason' | 'message'>;
type DepositCondition = (params: DepositCheckParams) => DepositRejection | null;

function formatBpsAsPercent(bps: Decimal): string {
  return `${bps.div(100).toDecimalPlaces(2).toString()}%`;
}

/**
 * The deposit instruction rejects the transaction when the pool price is too far from the oracle
 * price. See {@link getDepositPriceDeviationStatus}.
 */
const poolPriceCloseToOracle: DepositCondition = (params) => {
  const status: DepositPriceDeviationStatus = getDepositPriceDeviationStatus(params);
  if (status.canDeposit) {
    return null;
  }
  return {
    reason: 'POOL_PRICE_TOO_FAR_FROM_ORACLE',
    message:
      `The pool price is ${formatBpsAsPercent(status.deviationBps)} away from the oracle price. ` +
      `This vault allows ${formatBpsAsPercent(new Decimal(status.maxDeviationBps))}. ` +
      `You cannot deposit until the two prices move closer.`,
  };
};

/**
 * Every condition a deposit must satisfy, in the order they are reported.
 * Add a new condition here to make it apply to all callers.
 */
const DEPOSIT_CONDITIONS: DepositCondition[] = [poolPriceCloseToOracle];

/**
 * Check whether the strategy accepts a deposit right now.
 *
 * **Call this instead of the individual condition functions.** It runs every deposit condition and
 * reports the first one that fails, so a caller that uses it keeps working when new conditions are
 * added. A frontend can disable the deposit button on `acceptsDeposit === false` and show `message`.
 *
 * This is a pure function. Pass the states the caller already holds to avoid RPC calls, or use
 * `Kamino.checkStrategyAcceptsDeposit` to read the missing ones from the chain.
 */
export function checkStrategyAcceptsDeposit(params: DepositCheckParams): DepositCheckResult {
  for (const condition of DEPOSIT_CONDITIONS) {
    const failure = condition(params);
    if (failure) {
      return { acceptsDeposit: false, ...failure };
    }
  }
  return { acceptsDeposit: true, reason: null, message: null };
}
