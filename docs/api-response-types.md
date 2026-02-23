# API Response Types

TypeScript interfaces matching the Kamino Public API responses, for use in your frontend code.

```typescript
// GET /strategies
interface StrategyListItem {
  address: string;
  type: 'NON_PEGGED' | 'PEGGED' | 'STABLE';
  shareMint: string;
  status: 'LIVE' | 'DEPRECATED' | 'SHADOW' | 'STAGING' | 'IGNORED';
  tokenAMint: string;
  tokenBMint: string;
}

// GET /strategies/:address/metrics
interface StrategyMetrics {
  strategy: string;
  tokenAMint: string;
  tokenBMint: string;
  tokenA: string;           // human-readable token name
  tokenB: string;
  rewardMints: string[];
  krewardMints: string[];
  profitAndLoss: string;
  sharePrice: string;
  sharesIssued: string;
  totalValueLocked: string;
  kaminoApy: {
    vault: {
      apr7d: string;
      apy7d: string;
      apr24h: string;
      apr30d: string;
      apy24h: string;
      apy30d: string;
      krewardsApr7d: string;
      krewardsApy7d: string;
      krewardsApr24h: string;
      krewardsApr30d: string;
      krewardsApy24h: string;
      krewardsApy30d: string;
      lastCalculated: string; // ISO 8601
    };
    kamino: any[];
    totalApy: string;
  };
  apy: {
    vault: {
      feeApr: string;
      feeApy: string;
      totalApr: string;
      totalApy: string;
      poolPrice: string;
      priceLower: string;
      priceUpper: string;
      rewardsApr: string[];
      rewardsApy: string[];
      strategyOutOfRange: boolean;
    };
    kamino: any[];
    totalApy: string;
  };
  vaultBalances: {
    tokenA: TokenBalance;
    tokenB: TokenBalance;
  };
}

interface TokenBalance {
  invested: string;
  available: string;
  total: string;
  totalUsd: string;
}

// GET /v2/strategies/:address/shareholders/:wallet/pnl
interface PositionPnl {
  totalPnl: CurrencyAmounts;
  totalCostBasis: CurrencyAmounts;
}

interface CurrencyAmounts {
  usd: string;
  sol: string;
  a: string;
  b: string;
}

// GET /shareholders/:wallet/transactions
interface ShareholderTransaction {
  strategy: string;
  instruction: 'deposit' | 'withdraw' | 'claim';
  signature: string;
  timestamp: string;       // ISO 8601
  numberOfShares: string;
  sharePrice: string;
  tokenAAmount: string;
  tokenBAmount: string;
  solPrice: string;
  fullWithdraw: boolean;
}

// GET /strategies/:address/shareholders/:wallet/fees-and-rewards
interface ShareholderFeesAndRewards {
  feesAEarned: string;
  feesBEarned: string;
  rewards0Earned: string;
  rewards1Earned: string;
  rewards2Earned: string;
  kaminoRewards0Earned: string;
  kaminoRewards1Earned: string;
  kaminoRewards2Earned: string;
  feesAEarnedUsd: string;
  feesBEarnedUsd: string;
  rewards0EarnedUsd: string;
  rewards1EarnedUsd: string;
  rewards2EarnedUsd: string;
  kaminoRewards0EarnedUsd: string;
  kaminoRewards1EarnedUsd: string;
  kaminoRewards2EarnedUsd: string;
  lastCalculated: string;  // ISO 8601
}

// GET /strategies/fees-and-rewards
interface StrategyFeesAndRewards {
  strategyPubkey: string;
  feesAEarned: string;
  feesBEarned: string;
  rewards0Earned: string;
  rewards1Earned: string;
  rewards2Earned: string;
  kaminoRewards0Earned: string;
  kaminoRewards1Earned: string;
  kaminoRewards2Earned: string;
  feesAEarnedUsd: string;
  feesBEarnedUsd: string;
  rewards0EarnedUsd: string;
  rewards1EarnedUsd: string;
  rewards2EarnedUsd: string;
  kaminoRewards0EarnedUsd: string;
  kaminoRewards1EarnedUsd: string;
  kaminoRewards2EarnedUsd: string;
  totalUsd: string;
  lastCalculated: string;  // ISO 8601
}

// GET /v2/strategies/:address/history
interface StrategyHistoryPoint {
  timestamp: string;          // ISO 8601
  feesCollectedCumulativeA: string;
  feesCollectedCumulativeB: string;
  rewardsCollectedCumulative0: string;
  rewardsCollectedCumulative1: string;
  rewardsCollectedCumulative2: string;
  kaminoRewardsIssuedCumulative0: string;
  kaminoRewardsIssuedCumulative1: string;
  kaminoRewardsIssuedCumulative2: string;
  sharePrice: string;
  sharesIssued: string;
  tokenAAmounts: string;
  tokenBAmounts: string;
  tokenAPrice: string;
  tokenBPrice: string;
  reward0Price: string;
  reward1Price: string;
  reward2Price: string;
  totalValueLocked: string;
  solPrice: string;
  profitAndLoss: string;
}
```
