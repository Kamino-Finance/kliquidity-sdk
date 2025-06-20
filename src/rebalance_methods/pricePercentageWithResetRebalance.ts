import Decimal from 'decimal.js';
import { PositionRange, RebalanceFieldInfo } from '../utils/types';
import {
  DefaultLowerPercentageBPSDecimal,
  DefaultUpperPercentageBPSDecimal,
  FullBPSDecimal,
} from '../utils/CreationParameters';
import { RebalanceRaw } from '../@codegen/kliquidity/types';
import { RebalanceTypeLabelName } from './consts';
import { Dex, readBigUint128LE } from '../utils';
import { sqrtPriceToPrice as orcaSqrtPriceToPrice } from '@orca-so/whirlpools-core';
import { upsertManyRebalanceFieldInfos } from './utils';
import { getPriceRangeFromPriceAndDiffBPS, getResetRangeFromPriceAndDiffBPS } from './math_utils';
import { getPriceFromQ64Price } from '../utils/meteora';

export const PricePercentageWithResetRebalanceTypeName = 'pricePercentageWithReset';

export function getPricePercentageWithResetRebalanceFieldInfos(
  price: Decimal,
  lowerPercentageBPS: Decimal,
  upperPercentageBPS: Decimal,
  resetLowerPercentageBPS: Decimal,
  resetUpperPercentageBPS: Decimal,
  enabled: boolean = true
): RebalanceFieldInfo[] {
  const rebalanceType: RebalanceFieldInfo = {
    label: RebalanceTypeLabelName,
    type: 'string',
    value: PricePercentageWithResetRebalanceTypeName,
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

  const { lowerPrice, upperPrice } = getPositionRangeFromPricePercentageWithResetParams(
    price,
    lowerPercentageBPS,
    upperPercentageBPS
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

  const { lowerPrice: resetLowerPrice, upperPrice: resetUpperPrice } =
    getPositionResetRangeFromPricePercentageWithResetParams(
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
    lowerRangeRebalanceFieldInfo,
    upperRangeRebalanceFieldInfo,
    resetLowerRangeRebalanceFieldInfo,
    resetUpperRangeRebalanceFieldInfo,
  ];
}

export function getPositionRangeFromPricePercentageWithResetParams(
  price: Decimal,
  lowerPercentageBPS: Decimal,
  upperPercentageBPS: Decimal
): PositionRange {
  return getPriceRangeFromPriceAndDiffBPS(price, lowerPercentageBPS, upperPercentageBPS);
}

export function getPositionResetRangeFromPricePercentageWithResetParams(
  price: Decimal,
  lowerPercentageBPS: Decimal,
  upperPercentageBPS: Decimal,
  resetLowerPercentageBPS: Decimal,
  resetUpperPercentageBPS: Decimal
): PositionRange {
  return getResetRangeFromPriceAndDiffBPS(
    price,
    lowerPercentageBPS,
    upperPercentageBPS,
    resetLowerPercentageBPS,
    resetUpperPercentageBPS
  );
}

export function getDefaultPricePercentageWithResetRebalanceFieldInfos(price: Decimal): RebalanceFieldInfo[] {
  const fieldInfos = getPricePercentageWithResetRebalanceFieldInfos(
    price,
    DefaultLowerPercentageBPSDecimal,
    DefaultUpperPercentageBPSDecimal,
    DefaultLowerPercentageBPSDecimal,
    DefaultUpperPercentageBPSDecimal
  );
  return fieldInfos;
}

export function readPricePercentageWithResetRebalanceParamsFromStrategy(
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const paramsBuffer = Buffer.from(rebalanceRaw.params);

  const lowerBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'lowerRangeBps',
    type: 'number',
    value: new Decimal(paramsBuffer.readUint16LE(0)),
    enabled: true,
  };
  const upperBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'upperRangeBps',
    type: 'number',
    value: new Decimal(paramsBuffer.readUint16LE(2)),
    enabled: true,
  };
  const resetLowerBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'resetLowerRangeBps',
    type: 'number',
    value: new Decimal(paramsBuffer.readUint16LE(4)),
    enabled: true,
  };
  const resetUpperBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'resetUpperRangeBps',
    type: 'number',
    value: new Decimal(paramsBuffer.readUint16LE(6)),
    enabled: true,
  };

  return [
    lowerBpsRebalanceFieldInfo,
    upperBpsRebalanceFieldInfo,
    resetLowerBpsRebalanceFieldInfo,
    resetUpperBpsRebalanceFieldInfo,
  ];
}

export function readRawPricePercentageWithResetRebalanceStateFromStrategy(
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const stateBuffer = Buffer.from(rebalanceRaw.state);

  const lowerRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'lastRebalanceLowerResetPoolPrice',
    type: 'number',
    value: new Decimal(readBigUint128LE(stateBuffer, 0).toString()),
    enabled: false,
  };
  const upperRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'lastRebalanceUpperResetPoolPrice',
    type: 'number',
    value: new Decimal(readBigUint128LE(stateBuffer, 16).toString()),
    enabled: false,
  };
  return [lowerRangeRebalanceFieldInfo, upperRangeRebalanceFieldInfo];
}

export function readPricePercentageWithResetRebalanceStateFromStrategy(
  dex: Dex,
  tokenADecimals: number,
  tokenBDecimals: number,
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const stateBuffer = Buffer.from(rebalanceRaw.state);
  const params = readPricePercentageWithResetRebalanceParamsFromStrategy(rebalanceRaw);
  const lowerRangeBps = new Decimal(params.find((param) => param.label == 'lowerRangeBps')?.value.toString()!);
  const upperRangeBps = new Decimal(params.find((param) => param.label == 'upperRangeBps')?.value!.toString()!);
  const resetLowerRangeBps = new Decimal(
    params.find((param) => param.label == 'resetLowerRangeBps')?.value.toString()!
  );
  const resetUpperRangeBps = new Decimal(
    params.find((param) => param.label == 'resetUpperRangeBps')?.value!.toString()!
  );

  const lowerResetSqrtPriceX64 = readBigUint128LE(stateBuffer, 0).toString();
  const upperResetSqrtPriceX64 = readBigUint128LE(stateBuffer, 16).toString();

  let lowerResetPrice: Decimal, upperResetPrice: Decimal;

  if (dex == 'ORCA') {
    lowerResetPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(lowerResetSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
    upperResetPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(upperResetSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
  } else if (dex == 'RAYDIUM') {
    lowerResetPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(lowerResetSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
    upperResetPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(upperResetSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
  } else if (dex == 'METEORA') {
    lowerResetPrice = getPriceFromQ64Price(
      new Decimal(lowerResetSqrtPriceX64.toString()),
      tokenADecimals,
      tokenBDecimals
    );
    upperResetPrice = getPriceFromQ64Price(
      new Decimal(upperResetSqrtPriceX64.toString()),
      tokenADecimals,
      tokenBDecimals
    );
  } else {
    throw new Error(`Unknown DEX ${dex}`);
  }

  const resetLowerFactor = resetLowerRangeBps.mul(lowerRangeBps).div(FullBPSDecimal);
  const resetUpperFactor = resetUpperRangeBps.mul(upperRangeBps).div(FullBPSDecimal);
  const lowerPositionPrice = lowerResetPrice
    .mul(FullBPSDecimal.sub(lowerRangeBps))
    .div(FullBPSDecimal.sub(resetLowerFactor));
  const upperPositionPrice = upperResetPrice
    .mul(FullBPSDecimal.add(upperRangeBps))
    .div(FullBPSDecimal.add(resetUpperFactor));

  const lowerBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'rangePriceLower',
    type: 'number',
    value: lowerPositionPrice,
    enabled: true,
  };
  const upperBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'rangePriceUpper',
    type: 'number',
    value: upperPositionPrice,
    enabled: true,
  };
  const resetLowerBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'resetPriceLower',
    type: 'number',
    value: lowerResetPrice,
    enabled: true,
  };
  const resetUpperBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'resetPriceUpper',
    type: 'number',
    value: upperResetPrice,
    enabled: true,
  };

  return [
    lowerBpsRebalanceFieldInfo,
    upperBpsRebalanceFieldInfo,
    resetLowerBpsRebalanceFieldInfo,
    resetUpperBpsRebalanceFieldInfo,
  ];
}

export function deserializePricePercentageWithResetRebalanceFromOnchainParams(
  price: Decimal,
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const params = readPricePercentageWithResetRebalanceParamsFromStrategy(rebalanceRaw);

  const lowerRangeBps = new Decimal(params.find((param) => param.label == 'lowerRangeBps')?.value.toString()!);
  const upperRangeBps = new Decimal(params.find((param) => param.label == 'upperRangeBps')?.value.toString()!);
  const lowerResetRangeBps = new Decimal(
    params.find((param) => param.label == 'resetLowerRangeBps')?.value.toString()!
  );
  const upperResetRangeBps = new Decimal(
    params.find((param) => param.label == 'resetUpperRangeBps')?.value.toString()!
  );

  return getPricePercentageWithResetRebalanceFieldInfos(
    price,
    lowerRangeBps,
    upperRangeBps,
    lowerResetRangeBps,
    upperResetRangeBps
  );
}

export function deserializePricePercentageWithResetRebalanceWithStateOverride(
  dex: Dex,
  tokenADecimals: number,
  tokenBDecimals: number,
  price: Decimal,
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const stateFields = readPricePercentageWithResetRebalanceStateFromStrategy(
    dex,
    tokenADecimals,
    tokenBDecimals,
    rebalanceRaw
  );

  const fields = deserializePricePercentageWithResetRebalanceFromOnchainParams(price, rebalanceRaw);

  return upsertManyRebalanceFieldInfos(fields, stateFields);
}
