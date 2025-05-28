import Decimal from 'decimal.js';
import { PositionRange, RebalanceFieldInfo, RebalanceFieldsDict } from '../utils/types';
import { Dex } from '../utils';
import { priceToTickIndex, sqrtPriceToPrice as orcaSqrtPriceToPrice, tickIndexToPrice } from '@orca-so/whirlpools-core';
import { RebalanceRaw } from '../@codegen/kliquidity/types';
import { RebalanceTypeLabelName } from './consts';
import { upsertManyRebalanceFieldInfos } from './utils';
import { getPriceOfBinByBinIdWithDecimals } from '../utils/meteora';
import { SqrtPriceMath } from '@raydium-io/raydium-sdk-v2/lib';

export const DEFAULT_TICKS_BELOW_MID = new Decimal(10);
export const DEFAULT_TICKS_ABOVE_MID = new Decimal(10);
export const DEFAULT_SECONDS_PER_TICK = new Decimal(60 * 60 * 24 * 3); // 3 days; todo: get a reasonable default from Matt
export const DEFAULT_DIRECTION = new Decimal(1);
export const DriftRebalanceTypeName = 'drift';

export function getDriftRebalanceFieldInfos(
  dex: Dex,
  tickSpacing: number,
  tokenADecimals: number,
  tokenBDecimals: number,
  startMidTick: Decimal,
  ticksBelowMid: Decimal,
  ticksAboveMid: Decimal,
  secondsPerTick: Decimal,
  direction: Decimal,
  enabled: boolean = true
): RebalanceFieldInfo[] {
  const rebalanceType: RebalanceFieldInfo = {
    label: RebalanceTypeLabelName,
    type: 'string',
    value: DriftRebalanceTypeName,
    enabled,
  };
  const startMidTickRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'startMidTick',
    type: 'number',
    value: startMidTick,
    enabled,
  };
  const ticksBelowMidRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'ticksBelowMid',
    type: 'number',
    value: ticksBelowMid,
    enabled,
  };
  const ticksAboveMidRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'ticksAboveMid',
    type: 'number',
    value: ticksAboveMid,
    enabled,
  };
  const secondsPerTickRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'secondsPerTick',
    type: 'number',
    value: secondsPerTick,
    enabled,
  };
  const directionRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'direction',
    type: 'number',
    value: direction,
    enabled,
  };

  const { lowerPrice, upperPrice } = getPositionRangeFromDriftParams(
    dex,
    tokenADecimals,
    tokenBDecimals,
    tickSpacing,
    startMidTick,
    ticksBelowMid,
    ticksAboveMid
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

  return [
    rebalanceType,
    startMidTickRebalanceFieldInfo,
    ticksBelowMidRebalanceFieldInfo,
    ticksAboveMidRebalanceFieldInfo,
    secondsPerTickRebalanceFieldInfo,
    directionRebalanceFieldInfo,
    lowerRangeRebalanceFieldInfo,
    upperRangeRebalanceFieldInfo,
  ];
}

export function getPositionRangeFromDriftParams(
  dex: Dex,
  tickSpacing: number,
  tokenADecimals: number,
  tokenBDecimals: number,
  startMidTick: Decimal,
  ticksBelowMid: Decimal,
  ticksAboveMid: Decimal
): PositionRange {
  const lowerTickIndex = startMidTick.sub(ticksBelowMid);
  const upperTickIndex = startMidTick.add(ticksAboveMid);

  if (dex == 'ORCA') {
    const lowerPrice = new Decimal(tickIndexToPrice(lowerTickIndex.toNumber(), tokenADecimals, tokenBDecimals));
    const upperPrice = new Decimal(tickIndexToPrice(upperTickIndex.toNumber(), tokenADecimals, tokenBDecimals));
    return { lowerPrice, upperPrice };
  } else if (dex == 'RAYDIUM') {
    const lowerPrice = new Decimal(
      SqrtPriceMath.sqrtPriceX64ToPrice(
        SqrtPriceMath.getSqrtPriceX64FromTick(lowerTickIndex.toNumber()),
        tokenADecimals,
        tokenBDecimals
      )
    );

    const upperPrice = new Decimal(
      SqrtPriceMath.sqrtPriceX64ToPrice(
        SqrtPriceMath.getSqrtPriceX64FromTick(upperTickIndex.toNumber()),
        tokenADecimals,
        tokenBDecimals
      )
    );

    return { lowerPrice, upperPrice };
  } else if (dex == 'METEORA') {
    const lowerPrice = getPriceOfBinByBinIdWithDecimals(
      lowerTickIndex.toNumber(),
      tickSpacing,
      tokenADecimals,
      tokenBDecimals
    );

    const upperPrice = getPriceOfBinByBinIdWithDecimals(
      upperTickIndex.toNumber(),
      tickSpacing,
      tokenADecimals,
      tokenBDecimals
    );

    return { lowerPrice, upperPrice };
  } else {
    throw new Error(`Unknown DEX ${dex}`);
  }
}

// todo(silviu): get sensible default params from Matt
export function getDefaultDriftRebalanceFieldInfos(
  dex: Dex,
  tickSpacing: number,
  price: Decimal,
  tokenADecimals: number,
  tokenBDecimals: number
): RebalanceFieldInfo[] {
  const currentTickIndex = priceToTickIndex(price.toNumber(), tokenADecimals, tokenBDecimals);
  const startMidTick = new Decimal(currentTickIndex);

  return getDriftRebalanceFieldInfos(
    dex,
    tickSpacing,
    tokenADecimals,
    tokenBDecimals,
    startMidTick,
    DEFAULT_TICKS_BELOW_MID,
    DEFAULT_TICKS_ABOVE_MID,
    DEFAULT_SECONDS_PER_TICK,
    DEFAULT_DIRECTION
  );
}

export function readDriftRebalanceParamsFromStrategy(rebalanceRaw: RebalanceRaw): RebalanceFieldsDict {
  const paramsBuffer = Buffer.from(rebalanceRaw.params);
  const params: RebalanceFieldsDict = {};

  params['startMidTick'] = new Decimal(paramsBuffer.readInt32LE(0));
  params['ticksBelowMid'] = new Decimal(paramsBuffer.readInt32LE(4));
  params['ticksAboveMid'] = new Decimal(paramsBuffer.readInt32LE(8));
  params['secondsPerTick'] = new Decimal(paramsBuffer.readBigUInt64LE(12).toString());
  params['direction'] = new Decimal(paramsBuffer.readUint8(20));

  return params;
}

export function readRawDriftRebalanceStateFromStrategy(rebalanceRaw: RebalanceRaw) {
  const stateBuffer = Buffer.from(rebalanceRaw.state);
  const state: RebalanceFieldsDict = {};

  state['step'] = new Decimal(stateBuffer.readUInt8(0));
  state['lastDriftTimestamp'] = new Decimal(stateBuffer.readBigUInt64LE(1).toString());
  state['lastMidTick'] = new Decimal(stateBuffer.readInt32LE(9));

  return state;
}

export function readDriftRebalanceStateFromStrategy(
  dex: Dex,
  tickSpacing: number,
  tokenADecimals: number,
  tokenBDecimals: number,
  rebalanceRaw: RebalanceRaw
) {
  const stateBuffer = Buffer.from(rebalanceRaw.state);
  const paramsBuffer = Buffer.from(rebalanceRaw.params);

  const lastMidTick = new Decimal(stateBuffer.readInt32LE(9));

  const ticksBelowMid = new Decimal(paramsBuffer.readInt32LE(4));
  const ticksAboveMid = new Decimal(paramsBuffer.readInt32LE(8));

  const lowerTickIndex = lastMidTick.sub(ticksBelowMid);
  const upperTickIndex = lastMidTick.add(ticksAboveMid);

  let lowerPrice: Decimal, upperPrice: Decimal;
  if (dex == 'ORCA') {
    lowerPrice = new Decimal(tickIndexToPrice(lowerTickIndex.toNumber(), tokenADecimals, tokenBDecimals));
    upperPrice = new Decimal(tickIndexToPrice(upperTickIndex.toNumber(), tokenADecimals, tokenBDecimals));
  } else if (dex == 'RAYDIUM') {
    lowerPrice = new Decimal(
      orcaSqrtPriceToPrice(
        BigInt(SqrtPriceMath.getSqrtPriceX64FromTick(lowerTickIndex.toNumber()).toString()),
        tokenADecimals,
        tokenBDecimals
      )
    );

    upperPrice = new Decimal(
      orcaSqrtPriceToPrice(
        BigInt(SqrtPriceMath.getSqrtPriceX64FromTick(upperTickIndex.toNumber()).toString()),
        tokenADecimals,
        tokenBDecimals
      )
    );
  } else if (dex == 'METEORA') {
    lowerPrice = getPriceOfBinByBinIdWithDecimals(
      lowerTickIndex.toNumber(),
      tickSpacing,
      tokenADecimals,
      tokenBDecimals
    );

    upperPrice = getPriceOfBinByBinIdWithDecimals(
      upperTickIndex.toNumber(),
      tickSpacing,
      tokenADecimals,
      tokenBDecimals
    );
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

export function deserializeDriftRebalanceFromOnchainParams(
  dex: Dex,
  tickSpacing: number,
  tokenADecimals: number,
  tokenBDecimals: number,
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const params = readDriftRebalanceParamsFromStrategy(rebalanceRaw);

  return getDriftRebalanceFieldInfos(
    dex,
    tickSpacing,
    tokenADecimals,
    tokenBDecimals,
    params['startMidTick'],
    params['ticksBelowMid'],
    params['ticksAboveMid'],
    params['secondsPerTick'],
    params['direction']
  );
}

export function deserializeDriftRebalanceWithStateOverride(
  dex: Dex,
  tickSpacing: number,
  tokenADecimals: number,
  tokenBDecimals: number,
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const stateFields = readDriftRebalanceStateFromStrategy(
    dex,
    tickSpacing,
    tokenADecimals,
    tokenBDecimals,
    rebalanceRaw
  );

  const fields = deserializeDriftRebalanceFromOnchainParams(
    dex,
    tickSpacing,
    tokenADecimals,
    tokenBDecimals,
    rebalanceRaw
  );

  return upsertManyRebalanceFieldInfos(fields, stateFields);
}
