# User Positions, Fees & Rewards

## Get All User Positions

```typescript
import { address } from '@solana/kit';

const walletAddress = address('HrwbdQYwSnAyVpVHuGQ661HiNbWmGjDp5DdDR9YMw7Bu');

// Get all strategies the user has shares in
const positions = await kamino.getUserPositions(walletAddress);

for (const pos of positions) {
  console.log('Strategy:', pos.strategy);
  console.log('Share Mint:', pos.shareMint);
  console.log('Shares Held:', pos.sharesAmount.toString());
  console.log('DEX:', pos.strategyDex); // 'ORCA' | 'RAYDIUM' | 'METEORA'
}
```

## Calculate User Position Value

```typescript
// For each position, calculate the USD value
for (const pos of positions) {
  const sharePrice = await kamino.getStrategySharePrice(pos.strategy);
  const userValueUsd = pos.sharesAmount.mul(sharePrice);
  console.log(`Strategy ${pos.strategy}: $${userValueUsd.toFixed(2)}`);

  // Get token breakdown per share
  const tokensPerShare = await kamino.getTokenAAndBPerShare(pos.strategy);
  const userTokenA = pos.sharesAmount.mul(tokensPerShare.a);
  const userTokenB = pos.sharesAmount.mul(tokensPerShare.b);
  console.log(`  Token A: ${userTokenA.toFixed(6)}`);
  console.log(`  Token B: ${userTokenB.toFixed(6)}`);
}
```

## Pending Fees & Rewards

```typescript
// Get pending (uncollected) fees for strategies
const pendingFees = await kamino.getPendingFees([strategyAddress]);

for (const pf of pendingFees) {
  console.log('Strategy:', pf.strategy.address);
  console.log('Pending Token A fees:', pf.pendingFees.a.toString());
  console.log('Pending Token B fees:', pf.pendingFees.b.toString());
}

// Collect fees and rewards (typically done by the strategy manager, but permissionless)
const collectIx = await kamino.collectFeesAndRewards(strategyWithAddress, signer);
```

## Strategy Holders

```typescript
// Get all wallets holding shares of a strategy and their amounts
const holders = await kamino.getStrategyHolders(strategyAddress);

for (const holder of holders) {
  console.log('Wallet:', holder.holderPubkey);
  console.log('Shares:', holder.amount.toString());
}
```

## Farms (Staking)

Some strategies have associated farms where users can stake their shares for extra rewards. Check if a strategy has a farm:

```typescript
import { DEFAULT_PUBLIC_KEY } from '@kamino-finance/kliquidity-sdk';

const hasFarm = strategy.farm !== DEFAULT_PUBLIC_KEY;
console.log('Has farm:', hasFarm);

if (hasFarm) {
  console.log('Farm address:', strategy.farm);
  // Use @kamino-finance/farms-sdk for staking/unstaking
}
```

See the [examples/](../examples/) directory for full deposit+stake and unstake+withdraw flows.

## Runnable Examples

- [example_read_positions.ts](../examples/example_read_positions.ts) - Read positions and calculate value
- [example_strategy_holders.ts](../examples/example_strategy_holders.ts) - List strategy holders
