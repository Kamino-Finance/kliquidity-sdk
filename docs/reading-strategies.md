# Reading Strategy Data

## List All Strategies

```typescript
// Get all LIVE strategies
const strategies = await kamino.getAllStrategiesWithFilters({
  strategyCreationStatus: 'LIVE',
});

for (const s of strategies) {
  console.log('Strategy:', s.address);
  console.log('Token A Mint:', s.strategy.tokenAMint);
  console.log('Token B Mint:', s.strategy.tokenBMint);
  console.log('DEX:', s.strategy.strategyDex.toString()); // 0=ORCA, 1=RAYDIUM, 2=METEORA
  console.log('Shares Issued:', s.strategy.sharesIssued.toString());
}
```

**Filter options:**

| Filter | Values | Description |
|--------|--------|-------------|
| `strategyCreationStatus` | `'LIVE'`, `'DEPRECATED'`, `'SHADOW'`, `'STAGING'`, `'IGNORED'` | Strategy lifecycle status. Use `'LIVE'` for production strategies. |
| `strategyType` | `'NON_PEGGED'`, `'PEGGED'`, `'STABLE'` | Token pair type. `NON_PEGGED` = e.g. SOL-BONK, `PEGGED` = e.g. BSOL-JitoSOL, `STABLE` = e.g. USDC-USDT. |
| `isCommunity` | `boolean` | Whether the strategy is community-managed |

## Get a Single Strategy

```typescript
import { address } from '@solana/kit';

const strategyAddress = address('2H4xebnp2M9JYgPPfUw58uUQahWF8f1YTNxwwtmdqVYV');

// Returns the on-chain WhirlpoolStrategy account data
const strategy = await kamino.getStrategyByAddress(strategyAddress);
if (!strategy) {
  throw new Error('Strategy not found');
}

// Wrap it for use with other SDK methods
const strategyWithAddress = { strategy, address: strategyAddress };
```

## Strategy Metrics (Share Price, TVL, APY)

```typescript
// Share price - the USD value of one share
const sharePrice = await kamino.getStrategySharePrice(strategyAddress);
console.log('Share price (USD):', sharePrice.toString());

// Token amounts per share - how much Token A and B one share is worth
const tokensPerShare = await kamino.getTokenAAndBPerShare(strategyAddress);
console.log('Token A per share:', tokensPerShare.a.toString());
console.log('Token B per share:', tokensPerShare.b.toString());

// Full share data including balances and price
const shareData = await kamino.getStrategyShareData(strategyAddress);
console.log('Total vault value (USD):', shareData.balance.computedHoldings.totalSum.toString());

// APR/APY breakdown
const aprApy = await kamino.getStrategyAprApy(strategyAddress);
console.log('Total APR:', aprApy.totalApr.toString());
console.log('Fee APR:', aprApy.feeApr.toString());
console.log('Total APY:', aprApy.totalApy.toString());
console.log('Out of range:', aprApy.strategyOutOfRange);
```

## Strategy Position Range & Pool Price

```typescript
// Get the price range where this strategy's liquidity is active
const range = await kamino.getStrategyRange(strategyAddress);
console.log('Lower price:', range.lowerPrice.toString());
console.log('Upper price:', range.upperPrice.toString());

// Get current pool price
const currentPrice = await kamino.getCurrentPrice(strategyAddress);
console.log('Current price:', currentPrice.toString());

// Check if strategy is in range
const inRange = currentPrice.gte(range.lowerPrice) && currentPrice.lte(range.upperPrice);
console.log('In range:', inRange);
```

## Strategy Token Balances

```typescript
// Get token amounts in the strategy (both available in vaults and invested in position)
const balances = await kamino.getStrategyShareData(strategyAddress);
const holdings = balances.balance.computedHoldings;

console.log('Available Token A:', holdings.available.a.toString()); // Tokens sitting in vaults
console.log('Available Token B:', holdings.available.b.toString());
console.log('Available USD:', holdings.availableUsd.toString());

console.log('Invested Token A:', holdings.invested.a.toString());   // Tokens in the LP position
console.log('Invested Token B:', holdings.invested.b.toString());
console.log('Invested USD:', holdings.investedUsd.toString());

console.log('Total Value (USD):', holdings.totalSum.toString());

// Get prices used in calculations
const prices = balances.balance.prices;
console.log('Token A price:', prices.aPrice?.toString());
console.log('Token B price:', prices.bPrice?.toString());
console.log('Pool price:', prices.poolPrice.toString());
```

See [example_read_strategy.ts](../examples/example_read_strategy.ts) for a runnable example.
