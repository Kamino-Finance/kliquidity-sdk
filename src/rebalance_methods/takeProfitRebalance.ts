import Decimal from 'decimal.js';
import { PositionRange, RebalanceFieldInfo, RebalanceFieldsDict } from '../utils/types';
import { FullBPSDecimal } from '../utils/CreationParameters';
import { Dex, readBigUint128LE } from '../utils';
import { sqrtPriceToPrice as orcaSqrtPriceToPrice } from '@orca-so/whirlpools-core';
import BN from 'bn.js';
import { RebalanceRaw } from '../@codegen/kliquidity/types';
import { getPriceFromQ64Price } from '../utils/meteora';
import { SqrtPriceMath } from '@raydium-io/raydium-sdk-v2/lib';

export const DEFAULT_LOWER_RANGE_PRICE_DIFF_BPS = new Decimal(500);
export const DEFAULT_UPPER_RANGE_PRICE_DIFF_BPS = new Decimal(500);
export const DEFAULT_DESTINATION_TOKEN = new Decimal(1);
export const TakeProfitRebalanceTypeName = 'takeProfit';

export function getTakeProfitRebalanceFieldsInfos(
  lowerRangePrice: Decimal,
  upperRangePrice: Decimal,
  destinationToken: Decimal,
  enabled: boolean = true
): RebalanceFieldInfo[] {
  const rebalanceType: RebalanceFieldInfo = {
    label: 'rebalanceType',
    type: 'string',
    value: TakeProfitRebalanceTypeName,
    enabled,
  };
  const lowerRangePriceRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'rangePriceLower',
    type: 'number',
    value: lowerRangePrice,
    enabled,
  };
  const upperRangePriceRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'rangePriceUpper',
    type: 'number',
    value: upperRangePrice,
    enabled,
  };
  const destinationTokenRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'destinationToken',
    type: 'number',
    value: destinationToken,
    enabled,
  };

  return [
    rebalanceType,
    lowerRangePriceRebalanceFieldInfo,
    upperRangePriceRebalanceFieldInfo,
    destinationTokenRebalanceFieldInfo,
  ];
}

export function getPositionRangeFromTakeProfitParams(
  dex: Dex,
  tokenADecimals: number,
  tokenBDecimals: number,
  lowerSqrtPriceX64: Decimal,
  upperSqrtPriceX64: Decimal
): PositionRange {
  if (dex == 'ORCA') {
    const lowerPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(lowerSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
    const upperPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(upperSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
    return { lowerPrice, upperPrice };
  } else if (dex == 'RAYDIUM') {
    const lowerPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(lowerSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
    const upperPrice = new Decimal(
      orcaSqrtPriceToPrice(BigInt(upperSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals)
    );
    return { lowerPrice, upperPrice };
  } else if (dex == 'METEORA') {
    const lowerPrice = getPriceFromQ64Price(new Decimal(lowerSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals);
    const upperPrice = getPriceFromQ64Price(new Decimal(upperSqrtPriceX64.toString()), tokenADecimals, tokenBDecimals);
    return { lowerPrice, upperPrice };
  } else {
    throw new Error(`Unknown DEX ${dex}`);
  }
}

export function getDefaultTakeProfitRebalanceFieldsInfos(price: Decimal): RebalanceFieldInfo[] {
  const lowerPrice = price.mul(FullBPSDecimal.sub(DEFAULT_LOWER_RANGE_PRICE_DIFF_BPS)).div(FullBPSDecimal);
  const upperPrice = price.mul(FullBPSDecimal.add(DEFAULT_UPPER_RANGE_PRICE_DIFF_BPS)).div(FullBPSDecimal);

  return getTakeProfitRebalanceFieldsInfos(lowerPrice, upperPrice, price);
}

export function readTakeProfitRebalanceParamsFromStrategy(
  tokenADecimals: number,
  tokenBDecimals: number,
  rebalanceRaw: RebalanceRaw
) {
  const paramsBuffer = Buffer.from(rebalanceRaw.params);
  const params: RebalanceFieldsDict = {};

  params['lowerRangePrice'] = SqrtPriceMath.sqrtPriceX64ToPrice(
    new BN(readBigUint128LE(paramsBuffer, 0).toString()),
    tokenADecimals,
    tokenBDecimals
  );
  params['upperRangePrice'] = SqrtPriceMath.sqrtPriceX64ToPrice(
    new BN(readBigUint128LE(paramsBuffer, 16).toString()),
    tokenADecimals,
    tokenBDecimals
  );
  params['destinationToken'] = new Decimal(paramsBuffer.readUint8(32));

  return params;
}

export function readTakeProfitRebalanceStateFromStrategy(rebalanceRaw: RebalanceRaw) {
  const stateBuffer = Buffer.from(rebalanceRaw.state);
  const state: RebalanceFieldsDict = {};

  state['step'] = new Decimal(stateBuffer.readUInt8(0));

  return state;
}

export function deserializeTakeProfitRebalanceFromOnchainParams(
  tokenADecimals: number,
  tokenBDecimals: number,
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const params = readTakeProfitRebalanceParamsFromStrategy(tokenADecimals, tokenBDecimals, rebalanceRaw);

  return getTakeProfitRebalanceFieldsInfos(
    params['lowerRangePrice'],
    params['upperRangePrice'],
    params['destinationToken']
  );
}
