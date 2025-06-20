import Decimal from 'decimal.js';
import { PositionRange, RebalanceFieldInfo, RebalanceFieldsDict } from '../utils/types';
import { Dex, readPriceOption } from '../utils';
import { priceToTickIndex, sqrtPriceToPrice as orcaSqrtPriceToPrice, tickIndexToPrice } from '@orca-so/whirlpools-core';
import { RebalanceRaw } from '../@codegen/kliquidity/types';
import { RebalanceTypeLabelName } from './consts';
import { upsertManyRebalanceFieldInfos } from './utils';
import { getPriceOfBinByBinIdWithDecimals } from '../utils/meteora';
import { SqrtPriceMath } from '@raydium-io/raydium-sdk-v2/lib';

export const DEFAULT_DRIFT_TICKS_PER_EPOCH = new Decimal(1);
export const DEFAULT_TICKS_BELOW_MID = new Decimal(10);
export const DEFAULT_TICKS_ABOVE_MID = new Decimal(10);
export const DEFAULT_FRONTRUN_MULTIPLIER_BPS = new Decimal(10_000);
export const DEFAULT_STAKING_RATE_SOURCE_A = new Decimal(0);
export const DEFAULT_STAKING_RATE_SOURCE_B = new Decimal(0);
export const DEFAULT_DIRECTION = new Decimal(1);
export const AutodriftRebalanceTypeName = 'autodrift';

export function getAutodriftRebalanceFieldInfos(
  dex: Dex,
  tokenADecimals: number,
  tokenBDecimals: number,
  tickSpacing: number,
  lastMidTick: Decimal,
  initDriftTicksPerEpoch: Decimal,
  ticksBelowMid: Decimal,
  ticksAboveMid: Decimal,
  frontrunMultiplierBps: Decimal,
  stakingRateASource: Decimal,
  stakingRateBSource: Decimal,
  initialDriftDirection: Decimal,
  enabled: boolean = true
): RebalanceFieldInfo[] {
  const rebalanceType: RebalanceFieldInfo = {
    label: RebalanceTypeLabelName,
    type: 'string',
    value: AutodriftRebalanceTypeName,
    enabled,
  };
  const lastMidTickRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'lastMidTick',
    type: 'number',
    value: lastMidTick,
    enabled: false,
  };
  const initDriftTicksPerEpochRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'initDriftTicksPerEpoch',
    type: 'number',
    value: initDriftTicksPerEpoch,
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
  const fronturnMultiplierBpsRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'frontrunMultiplierBps',
    type: 'number',
    value: frontrunMultiplierBps,
    enabled,
  };
  const stakingRateASourceRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'stakingRateASource',
    type: 'number',
    value: stakingRateASource,
    enabled,
  };
  const stakingRateBSourceRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'stakingRateBSource',
    type: 'number',
    value: stakingRateBSource,
    enabled,
  };
  const initialDriftDirectionRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'initialDriftDirection',
    type: 'number',
    value: initialDriftDirection,
    enabled,
  };

  const { lowerPrice, upperPrice } = getPositionRangeFromAutodriftParams(
    dex,
    tokenADecimals,
    tokenBDecimals,
    lastMidTick,
    ticksBelowMid,
    ticksAboveMid,
    tickSpacing
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
    ticksBelowMidRebalanceFieldInfo,
    ticksAboveMidRebalanceFieldInfo,
    initialDriftDirectionRebalanceFieldInfo,
    lowerRangeRebalanceFieldInfo,
    upperRangeRebalanceFieldInfo,
    fronturnMultiplierBpsRebalanceFieldInfo,
    stakingRateASourceRebalanceFieldInfo,
    stakingRateBSourceRebalanceFieldInfo,
    initDriftTicksPerEpochRebalanceFieldInfo,
    lastMidTickRebalanceFieldInfo,
  ];
}

export function getPositionRangeFromAutodriftParams(
  dex: Dex,
  tokenADecimals: number,
  tokenBDecimals: number,
  startMidTick: Decimal,
  ticksBelowMid: Decimal,
  ticksAboveMid: Decimal,
  tickSpacing: number
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
export function getDefaultAutodriftRebalanceFieldInfos(
  dex: Dex,
  price: Decimal,
  tokenADecimals: number,
  tokenBDecimals: number,
  tickSpacing: number
): RebalanceFieldInfo[] {
  const currentTickIndex = priceToTickIndex(price.toNumber(), tokenADecimals, tokenBDecimals);
  const startMidTick = new Decimal(currentTickIndex);

  return getAutodriftRebalanceFieldInfos(
    dex,
    tokenADecimals,
    tokenBDecimals,
    tickSpacing,
    startMidTick,
    DEFAULT_DRIFT_TICKS_PER_EPOCH,
    DEFAULT_TICKS_BELOW_MID,
    DEFAULT_TICKS_ABOVE_MID,
    DEFAULT_FRONTRUN_MULTIPLIER_BPS,
    DEFAULT_STAKING_RATE_SOURCE_A,
    DEFAULT_STAKING_RATE_SOURCE_B,
    DEFAULT_DIRECTION
  );
}

export function readAutodriftRebalanceParamsFromStrategy(rebalanceRaw: RebalanceRaw): RebalanceFieldsDict {
  const paramsBuffer = Buffer.from(rebalanceRaw.params);
  const params: RebalanceFieldsDict = {};

  params['initDriftTicksPerEpoch'] = new Decimal(paramsBuffer.readUInt32LE(0));
  params['ticksBelowMid'] = new Decimal(paramsBuffer.readInt32LE(4));
  params['ticksAboveMid'] = new Decimal(paramsBuffer.readInt32LE(8));
  params['frontrunMultiplierBps'] = new Decimal(paramsBuffer.readUInt16LE(12));
  params['stakingRateASource'] = new Decimal(paramsBuffer.readUint8(14));
  params['stakingRateBSource'] = new Decimal(paramsBuffer.readUint8(15));
  params['initialDriftDirection'] = new Decimal(paramsBuffer.readUint8(16));

  return params;
}

export function readRawAutodriftRebalanceStateFromStrategy(rebalanceRaw: RebalanceRaw) {
  const stateBuffer = Buffer.from(rebalanceRaw.state);
  const state: RebalanceFieldsDict = {};

  // prettier-ignore
  {
      let offset = 0;
      [offset, state['last_window_staking_rate_a']     ] = readPriceOption(stateBuffer, offset);
      [offset, state['last_window_staking_rate_b']     ] = readPriceOption(stateBuffer, offset);
      [offset, state['last_window_epoch']              ] = [offset + 8, new Decimal(stateBuffer.readBigUInt64LE(offset).toString())];
      [offset, state['last_window_theoretical_tick']   ] = [offset + 4, new Decimal(stateBuffer.readInt32LE(offset))];
      [offset, state['last_window_strat_mid_tick']     ] = [offset + 4, new Decimal(stateBuffer.readInt32LE(offset))];

      [offset, state['current_window_staking_rate_a']  ] = readPriceOption(stateBuffer, offset);
      [offset, state['current_window_staking_rate_b']  ] = readPriceOption(stateBuffer, offset);
      [offset, state['current_window_epoch']           ] = [offset + 8, new Decimal(stateBuffer.readBigUInt64LE(offset).toString())];
      [offset, state['current_window_theoretical_tick']] = [offset + 4, new Decimal(stateBuffer.readInt32LE(offset))];
      [offset, state['current_window_strat_mid_tick']  ] = [offset + 4, new Decimal(stateBuffer.readInt32LE(offset))];
      [offset, state['autodrift_step']                 ] = [offset + 1, new Decimal(stateBuffer.readInt8(offset))];
  }

  return state;
}

export function readAutodriftRebalanceStateFromStrategy(
  dex: Dex,
  tokenADecimals: number,
  tokenBDecimals: number,
  tickSpacing: number,
  rebalanceRaw: RebalanceRaw
) {
  const params = readAutodriftRebalanceParamsFromStrategy(rebalanceRaw);
  const state = readRawAutodriftRebalanceStateFromStrategy(rebalanceRaw);

  const lastMidTick = state['current_window_strat_mid_tick'];

  const ticksBelowMid = params['ticksBelowMid'];
  const ticksAboveMid = params['ticksAboveMid'];

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

export function deserializeAutodriftRebalanceFromOnchainParams(
  dex: Dex,
  tokenADecimals: number,
  tokenBDecimals: number,
  tickSpacing: number,
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const params = readAutodriftRebalanceParamsFromStrategy(rebalanceRaw);
  const state = readRawAutodriftRebalanceStateFromStrategy(rebalanceRaw);

  return getAutodriftRebalanceFieldInfos(
    dex,
    tokenADecimals,
    tokenBDecimals,
    tickSpacing,
    state['current_window_strat_mid_tick'],
    params['initDriftTicksPerEpoch'],
    params['ticksBelowMid'],
    params['ticksAboveMid'],
    params['frontrunMultiplierBps'],
    params['stakingRateASource'],
    params['stakingRateBSource'],
    params['initialDriftDirection']
  );
}

export function deserializeAutodriftRebalanceWithStateOverride(
  dex: Dex,
  tokenADecimals: number,
  tokenBDecimals: number,
  tickSpacing: number,
  rebalanceRaw: RebalanceRaw
): RebalanceFieldInfo[] {
  const stateFields = readAutodriftRebalanceStateFromStrategy(
    dex,
    tokenADecimals,
    tokenBDecimals,
    tickSpacing,
    rebalanceRaw
  );

  const fields = deserializeAutodriftRebalanceFromOnchainParams(
    dex,
    tokenADecimals,
    tokenBDecimals,
    tickSpacing,
    rebalanceRaw
  );

  return upsertManyRebalanceFieldInfos(fields, stateFields);
}
