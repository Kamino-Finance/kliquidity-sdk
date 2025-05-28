//
// meta: {
//   cursor: {
//     previous: null,
//     next: '5arazDvfFnLxLWEUdX9orQaeYvq6QRehJtAuna9Vu3zHTET'
//   }
// }
export interface OrcaWhirlpoolsResponse {
  data: Whirlpool[];
  meta: {
    cursor: {
      previous: string | null;
      next: string | null;
    };
  };
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
  rewards: WhirlpoolReward[];
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
