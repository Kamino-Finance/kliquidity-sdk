import { Address } from '@solana/kit';

export interface OrcaWhirlpoolsResponse {
  whirlpools: Whirlpool[];
}

export interface Whirlpool {
  address: string;
  whirlpoolsConfig: string;
  whirlpoolBump: number[];
  tickSpacing: number;
  tickSpacingSeed: number[];
  feeRate: number;
  protocolFeeRate: number;
  liquidity: string;
  sqrtPrice: string;
  tickCurrentIndex: number;
  protocolFeeOwedA: string;
  protocolFeeOwedB: string;
  tokenMintA: string;
  tokenVaultA: string;
  feeGrowthGlobalA: string;
  tokenMintB: string;
  tokenVaultB: string;
  feeGrowthGlobalB: string;
  rewardLastUpdatedTimestamp: string;
  updatedAt: string;
  updatedSlot: number;
  writeVersion: number;
  hasWarning: boolean;
  poolType: string;
  tokenA: WhirlpoolToken;
  tokenB: WhirlpoolToken;
  price: string;
  tvlUsdc: string;
  yieldOverTvl: string;
  tokenBalanceA: string;
  tokenBalanceB: string;
  stats: Stats;
  rewards: WhirlpoolRewards;
  feeTierIndex: number;
  adaptiveFeeEnabled: boolean;
  tradeEnableTimestamp: string;
}

export interface WhirlpoolToken {
  address: string;
  programId: string;
  imageURL: string;
  name: string;
  symbol: string;
  decimals: number;
  tags: string[];
}

export interface Volume {
  day: number;
  week: number;
  month: number;
}

export interface VolumeDenominatedA {
  day: number;
  week: number;
  month: number;
}

export interface VolumeDenominatedB {
  day: number;
  week: number;
  month: number;
}

export interface PriceRange {
  day: Day;
  week: Week;
  month: Month;
}

export interface Day {
  min: number;
  max: number;
}

export interface Week {
  min: number;
  max: number;
}

export interface Month {
  min: number;
  max: number;
}

export interface FeeApr {
  day: number;
  week: number;
  month: number;
}

export interface Reward0Apr {
  day: number;
  week?: number;
  month?: number;
}

export interface Reward1Apr {
  day: number;
  week: number;
  month: number;
}

export interface Reward2Apr {
  day: number;
  week: number;
  month: number;
}

export interface TotalApr {
  day: number;
  week?: number;
  month?: number;
}

export interface WhirlpoolStat {
  volume: string;
  fees: string;
  rewards: string;
  yieldOverTvl: string;
}

export interface Stats {
  '24h': WhirlpoolStat;
  '7d': WhirlpoolStat;
  '30d': WhirlpoolStat;
}

export interface WhirlpoolReward {
  mint: string;
  vault: string;
  authority: string;
  emissions_per_second_x64: string;
  growth_global_x64: string;
  active: boolean;
  emissionsPerSecond: string;
}

export interface WhirlpoolRewards {
  rewards: WhirlpoolReward[];
}
