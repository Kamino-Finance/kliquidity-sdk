import { PoolRewardInfo } from "@orca-so/whirlpool-sdk";

export interface OrcaWhirlpoolsResponse {
  whirlpools: Whirlpool[];
  hasMore: boolean;
}

export interface Whirlpool {
  address: string;
  tokenA: TokenA;
  tokenB: TokenB;
  whitelisted: boolean;
  tickSpacing: number;
  price: number;
  lpFeeRate: number;
  protocolFeeRate: number;
  whirlpoolsConfig: string;
  modifiedTimeMs?: number;
  tvl?: number;
  volume?: Volume;
  volumeDenominatedA?: VolumeDenominatedA;
  volumeDenominatedB?: VolumeDenominatedB;
  priceRange?: PriceRange;
  feeApr?: FeeApr;
  reward0Apr?: Reward0Apr;
  reward1Apr?: Reward1Apr;
  reward2Apr?: Reward2Apr;
  totalApr?: TotalApr;
}

/*
    address: 'H6gUYo94dMyhaT4Zm94DRSuH931atRcdAVdMCu3aAwze',
    whirlpoolsConfig: '2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ',
    whirlpoolBump: [ 255 ],
    tickSpacing: 1,
    tickSpacingSeed: [ 1, 0 ],
    feeRate: 100,
    protocolFeeRate: 1300,
    liquidity: '84955327731',
    sqrtPrice: '18406755745344783722',
    tickCurrentIndex: -44,
    protocolFeeOwedA: '2649',
    protocolFeeOwedB: '1971',
    tokenMintA: 'WFRGB49tP8CdKubqCdt5Spo2BdGS4BpgoinNER5TYUm',
    tokenVaultA: 'BqDyUSu9kTpKKuY8yGqdkSdnrBpEf1v1UjZ4hJpuyajg',
    feeGrowthGlobalA: '32395396025436',
    tokenMintB: 'zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg',
    tokenVaultB: 'GsFtbxPvGsbL7xq8t8CaZtsCXvzmaw8cVo8uKPoo2bRg',
    feeGrowthGlobalB: '22354292382958',
    rewardLastUpdatedTimestamp: '2025-05-08T20:56:05Z',
    updatedAt: '2025-05-08T20:56:19.167643Z',
    updatedSlot: 338724881,
    writeVersion: 1458725149559,
    hasWarning: false,
    poolType: 'whirlpool',
    tokenA: {
      address: 'WFRGB49tP8CdKubqCdt5Spo2BdGS4BpgoinNER5TYUm',
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      imageUrl: 'https://fragmetric-assets.s3.ap-northeast-2.amazonaws.com/wfragbtc.png',
      name: 'Wrapped Fragmetric Staked BTC',
      symbol: 'wfragBTC',
      decimals: 8,
      tags: []
    },
    tokenB: {
      address: 'zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg',
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      imageUrl: 'https://raw.githubusercontent.com/ZeusNetworkHQ/zbtc-metadata/refs/heads/main/lgoo-v2.png',
      name: 'zBTC',
      symbol: 'zBTC',
      decimals: 8,
      tags: []
    },
    price: '0.99566915598510086153',
    tvlUsdc: '249977.027572681125980618366400',
    yieldOverTvl: '0.00130814320537998000',
    tokenBalanceA: '578913361',
    tokenBalanceB: '242681698',
    stats: { '24h': [Object], '7d': [Object], '30d': [Object] },
    rewards: [ [Object], [Object] ],
    lockedLiquidityPercent: [],
    feeTierIndex: 1,
    adaptiveFeeEnabled: false,
    adaptiveFee: null,
    tradeEnableTimestamp: '1970-01-01T00:00:00Z'
*/
export interface WhirlpoolV2 {
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
  tokenMintA: TokenAV2;
  tokenMintB: TokenBV2;
  price: string;
  tvlUsdc: string;
  yieldOverTvl: string;
  tokenBalanceA: string;
  tokenBalanceB: string;
  stats: {
    '24h': {
      volume: string;
      fees: string;
      rewards: string;
      yieldOverTvl: string;
    };
    '7d': {
      volume: string;
      fees: string;
      rewards: string;
      yieldOverTvl: string;
    };
    '30d': {
      volume: string;
      fees: string;
      rewards: string;
      yieldOverTvl: string;
    };
  };
  rewards: PoolRewardInfo[];
}

export interface TokenA {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  coingeckoId?: string;
  whitelisted: boolean;
  poolToken: boolean;
  wrapper?: string;
}

export interface TokenB {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  coingeckoId?: string;
  whitelisted: boolean;
  poolToken: boolean;
  wrapper?: string;
}

/*
     address: 'WFRGB49tP8CdKubqCdt5Spo2BdGS4BpgoinNER5TYUm',
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      imageUrl: 'https://fragmetric-assets.s3.ap-northeast-2.amazonaws.com/wfragbtc.png',
      name: 'Wrapped Fragmetric Staked BTC',
      symbol: 'wfragBTC',
      decimals: 8,
      tags: []
*/
export interface TokenAV2 {
  address: string;
  programId: string;
  imageUrl: string;
  name: string;
  symbol: string;
  decimals: number;
  tags: string[];
}

export interface TokenBV2 {
  address: string;
  programId: string;
  imageUrl: string;
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

/*
{
  mint: 'WFRGSWjaz8tbAxsJitmbfRuFV2mSNwy7BMWcCwaA28U',
      vault: '6FMLT6M2BL7uuhKV7brFpCA3LKGXzNHggUXUYkJcrVKH',
      authority: 'DjDsi34mSB66p2nhBL6YvhbcLtZbkGfNybFeLDjJqxJW',
      emissions_per_second_x64: '213506806498708417624571',
      growth_global_x64: '1827397914164128254',
      active: true,
      emissionsPerSecond: '11574.2271723170941414568567255638509294612958910875022411346435546875'
    }
   */
export interface Reward {
  mint: string;
  vault: string;
  authority: string;
  emissions_per_second_x64: string;
  growth_global_x64: string;
  active: boolean;
  emissionsPerSecond: string;
}
