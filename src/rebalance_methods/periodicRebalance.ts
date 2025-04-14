import Decimal from 'decimal.js';
import { PositionRange, RebalanceFieldInfo, RebalanceFieldsDict } from '../utils/types';
import { RebalanceRaw } from '../@codegen/kliquidity/types';
import { RebalanceTypeLabelName } from './consts';
import { getPriceRangeFromPriceAndDiffBPS } from './math_utils';

export const DEFAULT_LOWER_RANGE_PRICE_DIFF_BPS_PERIODIC_REBALANCE = new Decimal(500);
export const DEFAULT_UPPER_RANGE_PRICE_DIFF_BPS_PERIODIC_REBALANCE = new Decimal(500);
export const DEFAULT_REBALANCE_PERIOD = new Decimal(3600 * 24 * 3); // 3 days
export const PeriodicRebalanceTypeName = 'periodicRebalance';

export function getPeriodicRebalanceRebalanceFieldInfos(
  price: Decimal,
  period: Decimal, // seconds
  lowerRangeBps: Decimal,
  upperRangeBps: Decimal,
  enabled: boolean = true
): RebalanceFieldInfo[] {
  const rebalanceType: RebalanceFieldInfo = {
    label: RebalanceTypeLabelName,
    type: 'string',
    value: PeriodicRebalanceTypeName,
    enabled,
  };
  const periodRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'period',
    type: 'number',
    value: period,
    enabled,
  };
  const lowerRangeBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'lowerRangeBps',
    type: 'number',
    value: lowerRangeBps,
    enabled,
  };
  const upperRangeBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'upperRangeBps',
    type: 'number',
    value: upperRangeBps,
    enabled,
  };

  const { lowerPrice, upperPrice } = getPositionRangeFromPeriodicRebalanceParams(price, lowerRangeBps, upperRangeBps);

  const lowerRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'rangePriceLower',
    type: 'number',
    value: lowerPrice,
    enabled: false,
  };
  const upperRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'rangePriceUpper',
    type: 'number',
    value: upperPrice,
    enabled: false,
  };

  return [
    rebalanceType,
    periodRebalanceFieldInfo,
    lowerRangeBpsRebalanceFieldInfo,
    upperRangeBpsRebalanceFieldInfo,
    lowerRangeRebalanceFieldInfo,
    upperRangeRebalanceFieldInfo,
  ];
}

export function getPositionRangeFromPeriodicRebalanceParams(
  price: Decimal,
  lowerPercentageBPS: Decimal,
  upperPercentageBPS: Decimal
): PositionRange {
  return getPriceRangeFromPriceAndDiffBPS(price, lowerPercentageBPS, upperPercentageBPS);
}

export function getDefaultPeriodicRebalanceFieldInfos(price: Decimal): RebalanceFieldInfo[] {
  return getPeriodicRebalanceRebalanceFieldInfos(
    price,
    DEFAULT_REBALANCE_PERIOD,
    DEFAULT_LOWER_RANGE_PRICE_DIFF_BPS_PERIODIC_REBALANCE,
    DEFAULT_UPPER_RANGE_PRICE_DIFF_BPS_PERIODIC_REBALANCE
  );
}

export function readPeriodicRebalanceRebalanceParamsFromStrategy(rebalanceRaw: RebalanceRaw) {
  const paramsBuffer = Buffer.from(rebalanceRaw.params);
  const params: RebalanceFieldsDict = {};

  params['period'] = new Decimal(paramsBuffer.readBigUInt64LE(0).toString());
  params['lowerRangeBps'] = new Decimal(paramsBuffer.readUInt16LE(8));
  params['upperRangeBps'] = new Decimal(paramsBuffer.readUInt16LE(10));

  return params;
}

export function readPeriodicRebalanceRebalanceStateFromStrategy(rebalanceRaw: RebalanceRaw) {
  const stateBuffer = Buffer.from(rebalanceRaw.state);
  const state: RebalanceFieldsDict = {};

  state['lastRebalanceTimestamp'] = new Decimal(stateBuffer.readBigUInt64LE(0).toString());

  return state;
}

export function deserializePeriodicRebalanceFromOnchainParams(price: Decimal, rebalanceRaw: RebalanceRaw) {
  const params = readPeriodicRebalanceRebalanceParamsFromStrategy(rebalanceRaw);

  return getPeriodicRebalanceRebalanceFieldInfos(
    price,
    params['period'],
    params['lowerRangeBps'],
    params['upperRangeBps']
  );
}
