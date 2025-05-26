export interface OrcaWhirlpoolsResponse {
  whirlpools: Whirlpool[];
}

/*
{
    "address": "Hp53XEtt4S8SvPCXarsLSdGfZBuUr5mMmZmX2DRNXQKp",
    "whirlpoolsConfig": "2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ",
    "whirlpoolBump": [
      255
    ],
    "tickSpacing": 1,
    "tickSpacingSeed": [
      1,
      0
    ],
    "feeRate": 100,
    "protocolFeeRate": 1300,
    "liquidity": "186407121447125800",
    "sqrtPrice": "16817865661210768597",
    "tickCurrentIndex": -1850,
    "protocolFeeOwedA": "6910655",
    "protocolFeeOwedB": "24192737",
    "tokenMintA": "So11111111111111111111111111111111111111112",
    "tokenVaultA": "F7tcS67EfP4bBJhWLxCk6ZmPVcsmPnJvPLQcDw5eeR67",
    "feeGrowthGlobalA": "5856516601072098",
    "tokenMintB": "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    "tokenVaultB": "8tfJVFdcogGMmvW1RA1kDZey2BjwdCznF3MD4Pcxi9xn",
    "feeGrowthGlobalB": "5196269371031558",
    "rewardLastUpdatedTimestamp": "2025-05-18T13:06:48Z",
    "updatedAt": "2025-05-18T13:07:01.890216Z",
    "updatedSlot": 340839232,
    "writeVersion": 1472314063788,
    "hasWarning": false,
    "poolType": "whirlpool",
    "tokenA": {
      "address": "So11111111111111111111111111111111111111112",
      "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "imageUrl": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      "name": "Solana",
      "symbol": "SOL",
      "decimals": 9,
      "tags": []
    },
    "tokenB": {
      "address": "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
      "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "imageUrl": "https://storage.googleapis.com/token-metadata/JitoSOL-256.png",
      "name": "Jito Staked SOL",
      "symbol": "JitoSOL",
      "decimals": 9,
      "tags": []
    },
    "price": "0.83119383457282635084",
    "tvlUsdc": "35062760.9256379165977103510951581800",
    "yieldOverTvl": "0.00003685735342614780",
    "tokenBalanceA": "175941230354160",
    "tokenBalanceB": "23546778892271",
    "stats": {
      "24h": {
        "volume": "12923205.71532760",
        "fees": "1292.320571532760",
        "rewards": "0",
        "yieldOverTvl": "0.00003687135564068930"
      },
      "7d": {
        "volume": "103350125.18232400",
        "fees": "10335.012518232400",
        "rewards": "0",
        "yieldOverTvl": "0.00029486167140021200"
      },
      "30d": {
        "volume": "353418685.79528200",
        "fees": "35341.868579528200",
        "rewards": "0",
        "yieldOverTvl": "0.00100831638291509000"
      }
    },
    "rewards": [
      {
        "mint": "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
        "vault": "CCGXLwLh43f6G2c6vWgWN2RhszwjU33q8DpuAr1djpmK",
        "authority": "DjDsi34mSB66p2nhBL6YvhbcLtZbkGfNybFeLDjJqxJW",
        "emissions_per_second_x64": "0",
        "growth_global_x64": "17448826142094",
        "active": false,
        "emissionsPerSecond": "0"
      },
      {
        "mint": "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
        "vault": "3t5hknAXoWbaxok6JG7qBewftGF9sJkW6NFf1HzMEYPF",
        "authority": "DjDsi34mSB66p2nhBL6YvhbcLtZbkGfNybFeLDjJqxJW",
        "emissions_per_second_x64": "0",
        "growth_global_x64": "1158521908380882",
        "active": false,
        "emissionsPerSecond": "0"
      }
    ],
    "lockedLiquidityPercent": [
      {
        "name": "Whirlpool-Locked",
        "locked_percentage": "0.000000078",
        "lockedPercentage": "0.000000078"
      }
    ],
    "feeTierIndex": 1,
    "adaptiveFeeEnabled": false,
    "adaptiveFee": null,
    "tradeEnableTimestamp": "1970-01-01T00:00:00Z"
  },
  "meta": {
    "cursor": null
  }
*/
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
