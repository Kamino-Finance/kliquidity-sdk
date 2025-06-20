import Decimal from 'decimal.js';
import { PositionRange, RebalanceFieldInfo } from '../utils/types';
import { DefaultLowerPercentageBPSDecimal, DefaultUpperPercentageBPSDecimal } from '../utils/CreationParameters';
import { RebalanceRaw } from '../@codegen/kliquidity/types';
import { RebalanceTypeLabelName } from './consts';
import { Dex, readBigUint128LE } from '../utils';
import { upsertManyRebalanceFieldInfos } from './utils';
import { sqrtPriceToPrice as orcaSqrtPriceToPrice } from '@orca-so/whirlpools-core';
import { getPriceRangeFromPriceAndDiffBPS } from './math_utils';
import { getPriceFromQ64Price } from '../utils/meteora';

export const PricePercentageRebalanceTypeName = 'pricePercentage';

export function getPricePercentageRebalanceFieldInfos(
  poolPrice: Decimal,
  lowerPercentageBPS: Decimal,
  upperPercentageBPS: Decimal,
  enabled: boolean = true
): RebalanceFieldInfo[] {
  const rebalanceType: RebalanceFieldInfo = {
    label: RebalanceTypeLabelName,
    type: 'string',
    value: PricePercentageRebalanceTypeName,
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

  const { lowerPrice, upperPrice } = getPositionRangeFromPercentageRebalanceParams(
    poolPrice,
    lowerPercentageBPS,
    upperPercentageBPS
  );
  const lowerRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'rangePriceLower',
    type: 'number',
    value: lowerPrice!,
    enabled: false,
  };
  const upperRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'rangePriceUpper',
    type: 'number',
    value: upperPrice!,
    enabled: false,
  };

  return [
    rebalanceType,
    lowerBpsRebalanceFieldInfo,
    upperBpsRebalanceFieldInfo,
    lowerRangeRebalanceFieldInfo,
    upperRangeRebalanceFieldInfo,
  ];
}

export function getPositionRangeFromPercentageRebalanceParams(
  price: Decimal,
  lowerPercentageBPS: Decimal,
  upperPercentageBPS: Decimal
): PositionRange {
  return getPriceRangeFromPriceAndDiffBPS(price, lowerPercentageBPS, upperPercentageBPS);
}

export function getDefaultPricePercentageRebalanceFieldInfos(price: Decimal): RebalanceFieldInfo[] {
  const fieldInfos = getPricePercentageRebalanceFieldInfos(
    price,
    DefaultLowerPercentageBPSDecimal,
    DefaultUpperPercentageBPSDecimal
  );
  return fieldInfos;
}

export function readPricePercentageRebalanceParamsFromStrategy(rebalanceRaw: RebalanceRaw): RebalanceFieldInfo[] {
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

  return [lowerBpsRebalanceFieldInfo, upperBpsRebalanceFieldInfo];
}

export function readRawPricePercentageRebalanceStateFromStrategy(rebalanceRaw: RebalanceRaw): RebalanceFieldInfo[] {
  const stateBuffer = Buffer.from(rebalanceRaw.state);

  const lowerRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'rangePriceLower',
    type: 'number',
    value: new Decimal(readBigUint128LE(stateBuffer, 0).toString()),
    enabled: false,
  };
  const upperRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'rangePriceUpper',
    type: 'number',
    value: new Decimal(readBigUint128LE(stateBuffer, 16).toString()),
    enabled: false,
  };
  return [lowerRangeRebalanceFieldInfo, upperRangeRebalanceFieldInfo];
}

export function readPricePercentageRebalanceStateFromStrategy(
  dex: Dex,
  tokenADecimals: number,
  tokenBDecimals: number,
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const stateBuffer = Buffer.from(rebalanceRaw.state);

  const lowerSqrtPriceX64 = readBigUint128LE(stateBuffer, 0).toString();
  const upperSqrtPriceX64 = readBigUint128LE(stateBuffer, 16).toString();
  let lowerPrice: Decimal, upperPrice: Decimal;

  if (dex == 'ORCA') {
    lowerPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(lowerSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
    upperPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(upperSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
  } else if (dex == 'RAYDIUM') {
    lowerPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(lowerSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
    upperPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(upperSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
  } else if (dex == 'METEORA') {
    lowerPrice = getPriceFromQ64Price(new Decimal(lowerSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals);
    upperPrice = getPriceFromQ64Price(new Decimal(upperSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals);
  } else {
    throw new Error(`Unknown DEX ${dex}`);
  }

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
  return [lowerRangeRebalanceFieldInfo, upperRangeRebalanceFieldInfo];
}

export function deserializePricePercentageRebalanceFromOnchainParams(
  price: Decimal,
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const params = readPricePercentageRebalanceParamsFromStrategy(rebalanceRaw);

  const lowerRangeBPS = new Decimal(params.find((param) => param.label == 'lowerRangeBps')?.value!);
  const upperRangeBPS = new Decimal(params.find((param) => param.label == 'upperRangeBps')?.value!);
  return getPricePercentageRebalanceFieldInfos(price, lowerRangeBPS, upperRangeBPS);
}

export function deserializePricePercentageRebalanceWithStateOverride(
  dex: Dex,
  tokenADecimals: number,
  tokenBDecimals: number,
  price: Decimal,
  rebalanceRaw: RebalanceRaw
) {
  const stateFields = readPricePercentageRebalanceStateFromStrategy(dex, tokenADecimals, tokenBDecimals, rebalanceRaw);

  const fields = deserializePricePercentageRebalanceFromOnchainParams(price, rebalanceRaw);

  return upsertManyRebalanceFieldInfos(fields, stateFields);
}
