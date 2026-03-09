import Decimal from 'decimal.js';
import { PositionRange, RebalanceFieldInfo, RebalanceFieldsDict } from '../utils/types';
import { DefaultLowerPercentageBPSDecimal, DefaultUpperPercentageBPSDecimal } from '../utils/CreationParameters';
import { RebalanceRaw } from '../@codegen/kliquidity/types';
import { RebalanceTypeLabelName } from './consts';
import { Dex, readBigUint128LE } from '../utils';
import { sqrtPriceToPrice as orcaSqrtPriceToPrice } from '@orca-so/whirlpools-core';
import { upsertManyRebalanceFieldInfos } from './utils';
import { getPriceRangeFromPriceAndDiffBPS, getResetRangeFromPriceAndDiffBPS } from './math_utils';
import { getPriceFromQ64Price } from '../utils/meteora';

export const DefaultMaxNumberOfExpansions = new Decimal(10);
export const DefaultExpansionSizeBPS = new Decimal(100);
export const DefaultSwapUnevenAllowed = new Decimal(1);
export const ExpanderRebalanceTypeName = 'expander';

export function getExpanderRebalanceFieldInfos(
  price: Decimal,
  lowerPercentageBPS: Decimal,
  upperPercentageBPS: Decimal,
  resetLowerPercentageBPS: Decimal,
  resetUpperPercentageBPS: Decimal,
  expansionBPS: Decimal,
  maxNumberOfExpansions: Decimal,
  swapUnevenAllowed: Decimal,
  enabled: boolean = true
): RebalanceFieldInfo[] {
  const rebalanceType: RebalanceFieldInfo = {
    label: RebalanceTypeLabelName,
    type: 'string',
    value: ExpanderRebalanceTypeName,
    enabled,
  };
  const lowerBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'lowerRangeBps',
    type: 'number',
    value: lowerPercentageBPS,
    enabled,
  };
  const upperBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'upperRangeBps',
    type: 'number',
    value: upperPercentageBPS,
    enabled,
  };
  const resetLowerBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'resetLowerRangeBps',
    type: 'number',
    value: resetLowerPercentageBPS,
    enabled,
  };
  const resetUpperBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'resetUpperRangeBps',
    type: 'number',
    value: resetUpperPercentageBPS,
    enabled,
  };
  const expansionBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'expansionBps',
    type: 'number',
    value: expansionBPS,
    enabled,
  };
  const maxNumberOfExpansionsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'maxNumberOfExpansions',
    type: 'number',
    value: maxNumberOfExpansions,
    enabled,
  };
  const swapUnevenAllowedFieldInfo: RebalanceFieldInfo = {
    label: 'swapUnevenAllowed',
    type: 'number',
    value: swapUnevenAllowed,
    enabled,
  };

  const { lowerPrice, upperPrice } = getPositionRangeFromExpanderParams(price, lowerPercentageBPS, upperPercentageBPS);
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

  const { lowerPrice: resetLowerPrice, upperPrice: resetUpperPrice } = getPositionResetRangeFromExpanderParams(
    price,
    lowerPercentageBPS,
    upperPercentageBPS,
    resetLowerPercentageBPS,
    resetUpperPercentageBPS
  );
  const resetLowerRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'resetPriceLower',
    type: 'number',
    value: resetLowerPrice,
    enabled: false,
  };
  const resetUpperRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'resetPriceUpper',
    type: 'number',
    value: resetUpperPrice,
    enabled: false,
  };

  return [
    rebalanceType,
    lowerBpsRebalanceFieldInfo,
    upperBpsRebalanceFieldInfo,
    resetLowerBpsRebalanceFieldInfo,
    resetUpperBpsRebalanceFieldInfo,
    expansionBpsRebalanceFieldInfo,
    maxNumberOfExpansionsRebalanceFieldInfo,
    swapUnevenAllowedFieldInfo,
    lowerRangeRebalanceFieldInfo,
    upperRangeRebalanceFieldInfo,
    resetLowerRangeRebalanceFieldInfo,
    resetUpperRangeRebalanceFieldInfo,
  ];
}

export function getPositionRangeFromExpanderParams(
  price: Decimal,
  lowerPriceDifferenceBPS: Decimal,
  upperPriceDifferenceBPS: Decimal
): PositionRange {
  return getPriceRangeFromPriceAndDiffBPS(price, lowerPriceDifferenceBPS, upperPriceDifferenceBPS);
}

export function getPositionResetRangeFromExpanderParams(
  price: Decimal,
  lowerPriceDifferenceBPS: Decimal,
  upperPriceDifferenceBPS: Decimal,
  resetLowerPriceDifferenceBPS: Decimal,
  resetUpperPriceDifferenceBPS: Decimal
): PositionRange {
  return getResetRangeFromPriceAndDiffBPS(
    price,
    lowerPriceDifferenceBPS,
    upperPriceDifferenceBPS,
    resetLowerPriceDifferenceBPS,
    resetUpperPriceDifferenceBPS
  );
}

export function getDefaultExpanderRebalanceFieldInfos(price: Decimal): RebalanceFieldInfo[] {
  return getExpanderRebalanceFieldInfos(
    price,
    DefaultLowerPercentageBPSDecimal,
    DefaultUpperPercentageBPSDecimal,
    DefaultLowerPercentageBPSDecimal,
    DefaultUpperPercentageBPSDecimal,
    DefaultLowerPercentageBPSDecimal,
    DefaultMaxNumberOfExpansions,
    DefaultSwapUnevenAllowed
  );
}

export function readRawExpanderRebalanceParamsFromStrategy(rebalanceRaw: RebalanceRaw) {
  const buf = new Uint8Array(rebalanceRaw.params);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const params: RebalanceFieldsDict = {};

  params['lowerRangeBps'] = new Decimal(dv.getUint16(0, true));
  params['upperRangeBps'] = new Decimal(dv.getUint16(2, true));
  params['lowerResetRatioBps'] = new Decimal(dv.getUint16(4, true));
  params['upperResetRatioBps'] = new Decimal(dv.getUint16(6, true));
  params['expansionBps'] = new Decimal(dv.getUint16(8, true));
  params['maxNumberOfExpansions'] = new Decimal(dv.getUint16(10, true));
  params['swapUnevenAllowed'] = new Decimal(dv.getUint8(12));

  return params;
}

export function readExpanderRebalanceParamsFromStrategy(rebalanceRaw: RebalanceRaw): RebalanceFieldInfo[] {
  const buf = new Uint8Array(rebalanceRaw.params);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const lowerRangeBps = new Decimal(dv.getUint16(0, true));
  const upperRangeBps = new Decimal(dv.getUint16(2, true));
  const lowerResetRatioBps = new Decimal(dv.getUint16(4, true));
  const upperResetRatioBps = new Decimal(dv.getUint16(6, true));
  const expansionBps = new Decimal(dv.getUint16(8, true));
  const maxNumberOfExpansions = new Decimal(dv.getUint16(10, true));
  const swapUnevenAllowed = new Decimal(dv.getUint8(12));

  const lowerBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'lowerRangeBps',
    type: 'number',
    value: lowerRangeBps,
    enabled: true,
  };
  const upperBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'upperRangeBps',
    type: 'number',
    value: upperRangeBps,
    enabled: true,
  };
  const resetLowerBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'resetLowerRangeBps',
    type: 'number',
    value: lowerResetRatioBps,
    enabled: true,
  };
  const resetUpperBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'resetUpperRangeBps',
    type: 'number',
    value: upperResetRatioBps,
    enabled: true,
  };
  const expansionBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'expansionBps',
    type: 'number',
    value: expansionBps,
    enabled: true,
  };
  const maxNumberOfExpansionsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'maxNumberOfExpansions',
    type: 'number',
    value: maxNumberOfExpansions,
    enabled: true,
  };
  const swapUnevenAllowedFieldInfo: RebalanceFieldInfo = {
    label: 'swapUnevenAllowed',
    type: 'number',
    value: swapUnevenAllowed,
    enabled: true,
  };

  return [
    lowerBpsRebalanceFieldInfo,
    upperBpsRebalanceFieldInfo,
    resetLowerBpsRebalanceFieldInfo,
    resetUpperBpsRebalanceFieldInfo,
    expansionBpsRebalanceFieldInfo,
    maxNumberOfExpansionsRebalanceFieldInfo,
    swapUnevenAllowedFieldInfo,
  ];
}

export function readRawExpanderRebalanceStateFromStrategy(rebalanceRaw: RebalanceRaw) {
  const buf = new Uint8Array(rebalanceRaw.state);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const state: RebalanceFieldsDict = {};

  state['initialPoolPrice'] = new Decimal(readBigUint128LE(buf, 0).toString());
  state['expansionCount'] = new Decimal(dv.getUint16(16, true));

  return state;
}

export function readExpanderRebalanceStateFromStrategy(
  dex: Dex,
  tokenADecimals: number,
  tokenBDecimals: number,
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const params = readRawExpanderRebalanceParamsFromStrategy(rebalanceRaw);

  const lowerRangeBps = params['lowerRangeBps'];
  const upperRangeBps = params['upperRangeBps'];
  const lowerResetRatioBps = params['lowerResetRatioBps'];
  const upperResetRatioBps = params['upperResetRatioBps'];
  const expansionBps = params['expansionBps'];

  const state = readRawExpanderRebalanceStateFromStrategy(rebalanceRaw);

  const initialPriceX64 = state['initialPoolPrice'];
  const expansionCount = state['expansionCount'];

  let initialPrice: Decimal;
  if (dex == 'ORCA') {
    initialPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(initialPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
  } else if (dex == 'RAYDIUM') {
    initialPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(initialPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
  } else if (dex == 'METEORA') {
    initialPrice = getPriceFromQ64Price(new Decimal(initialPriceX64.toString()), tokenADecimals, tokenBDecimals);
  } else {
    throw new Error(`Unknown DEX ${dex}`);
  }

  const lowerRangeFactorBPS = lowerRangeBps.add(expansionBps.mul(expansionCount));
  const upperRangeFactorBPS = upperRangeBps.add(expansionBps.mul(expansionCount));

  const { lowerPrice, upperPrice } = getPriceRangeFromPriceAndDiffBPS(
    initialPrice,
    lowerRangeFactorBPS,
    upperRangeFactorBPS
  );

  const { lowerPrice: lowerResetPrice, upperPrice: upperResetPrice } = getResetRangeFromPriceAndDiffBPS(
    initialPrice,
    lowerRangeFactorBPS,
    upperRangeFactorBPS,
    lowerResetRatioBps,
    upperResetRatioBps
  );

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

  const resetLowerRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'resetPriceLower',
    type: 'number',
    value: lowerResetPrice,
    enabled: false,
  };
  const resetUpperRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'resetPriceUpper',
    type: 'number',
    value: upperResetPrice,
    enabled: false,
  };

  return [
    lowerRangeRebalanceFieldInfo,
    upperRangeRebalanceFieldInfo,
    resetLowerRangeRebalanceFieldInfo,
    resetUpperRangeRebalanceFieldInfo,
  ];
}

export function readExpanderRebalanceFieldInfosFromStrategy(price: Decimal, rebalanceRaw: RebalanceRaw) {
  const buf = new Uint8Array(rebalanceRaw.params);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const lowerRangeBps = new Decimal(dv.getUint16(0, true));
  const upperRangeBps = new Decimal(dv.getUint16(2, true));
  const lowerResetRatioBps = new Decimal(dv.getUint16(4, true));
  const upperResetRatioBps = new Decimal(dv.getUint16(6, true));
  const expansionBps = new Decimal(dv.getUint16(8, true));
  const maxNumberOfExpansions = new Decimal(dv.getUint16(10, true));
  const swapUnevenAllowed = new Decimal(dv.getUint8(12));

  return getExpanderRebalanceFieldInfos(
    price,
    lowerRangeBps,
    upperRangeBps,
    lowerResetRatioBps,
    upperResetRatioBps,
    expansionBps,
    maxNumberOfExpansions,
    swapUnevenAllowed
  );
}

export function deserializeExpanderRebalanceWithStateOverride(
  dex: Dex,
  tokenADecimals: number,
  tokenBDecimals: number,
  price: Decimal,
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const stateFields = readExpanderRebalanceStateFromStrategy(dex, tokenADecimals, tokenBDecimals, rebalanceRaw);

  const fields = readExpanderRebalanceFieldInfosFromStrategy(price, rebalanceRaw);

  return upsertManyRebalanceFieldInfos(fields, stateFields);
}
