[![npm](https://img.shields.io/npm/v/@kamino-finance/kliquidity-sdk)](https://www.npmjs.com/package/@kamino-finance/kliquidity-sdk)

# Kamino Liquidity SDK

Typescript SDK for integrating with **Kamino Liquidity** (automated CLMM vaults) on Solana. Kamino manages concentrated liquidity positions across Orca Whirlpools, Raydium CLMM, and Meteora DLMM, handling automatic rebalancing, fee compounding, and reward collection.

**This guide is for UI/frontend developers** who want to integrate Kamino Liquidity into their applications. It covers reading strategy data, depositing, withdrawing, and querying user positions via both the SDK and the REST API.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Installation](#installation)
- [SDK Setup](#sdk-setup)
- [Reading Strategy Data](#reading-strategy-data)
  - [List All Strategies](#list-all-strategies)
  - [Get a Single Strategy](#get-a-single-strategy)
  - [Strategy Metrics (Share Price, TVL, APY)](#strategy-metrics-share-price-tvl-apy)
  - [Strategy Position Range & Pool Price](#strategy-position-range--pool-price)
  - [Strategy Token Balances](#strategy-token-balances)
- [Deposits](#deposits)
  - [Both-Sided Deposit](#both-sided-deposit)
  - [Single-Sided Deposit](#single-sided-deposit)
- [Withdrawals](#withdrawals)
  - [Withdraw a Specific Amount of Shares](#withdraw-a-specific-amount-of-shares)
  - [Withdraw All Shares](#withdraw-all-shares)
- [User Positions](#user-positions)
  - [Get All User Positions](#get-all-user-positions)
  - [Calculate User Position Value](#calculate-user-position-value)
- [Pending Fees & Rewards](#pending-fees--rewards)
- [Strategy Holders](#strategy-holders)
- [Farms (Staking)](#farms-staking)
- [Kamino Public API](#kamino-public-api)
  - [Base URL](#base-url)
  - [Strategy Endpoints](#strategy-endpoints)
  - [User Position & PnL Endpoints](#user-position--pnl-endpoints)
  - [Transaction History](#transaction-history)
  - [Fees & Rewards Endpoints](#fees--rewards-endpoints)
  - [Historical Data](#historical-data)
- [API Response Types](#api-response-types)
- [SDK Type Reference](#sdk-type-reference)
- [FAQ](#faq)
- [Development](#development)

---

## Quick Start

```bash
npm install @kamino-finance/kliquidity-sdk @solana/kit decimal.js
```

```typescript
import { Kamino } from '@kamino-finance/kliquidity-sdk';
import { createSolanaRpc } from '@solana/kit';

const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');
const kamino = new Kamino('mainnet-beta', rpc);

// List all live strategies
const strategies = await kamino.getAllStrategiesWithFilters({ strategyCreationStatus: 'LIVE' });

// Get share price for a strategy
const sharePrice = await kamino.getStrategySharePrice(strategies[0].address);
console.log('Share price:', sharePrice.toString());
```

---

## Core Concepts

Before integrating, here's what you need to know:

| Concept | Description |
|---------|-------------|
| **Strategy** | A vault that manages a concentrated liquidity position on a DEX (Orca, Raydium, or Meteora). Users deposit tokens and receive **shares** representing their portion of the vault. |
| **Shares (kTokens)** | ERC-20-like SPL tokens minted to depositors. Each strategy has its own share mint. Your share of the vault = `(your shares / total shares issued) * vault value`. |
| **Share Price** | The USD value of one share. Increases as the vault earns trading fees and rewards. |
| **Token A / Token B** | The two tokens in the liquidity pair (e.g., SOL and USDC). |
| **Position Range** | The price range where the vault's liquidity is active. Outside this range, the position earns no fees. |
| **Farm** | Optional staking program. Some strategies have farms where users can stake their shares for additional rewards. |
| **DEX** | The underlying decentralized exchange: `'ORCA'`, `'RAYDIUM'`, or `'METEORA'`. |

**How deposits work:** You provide Token A and/or Token B. The vault mints shares proportional to the token amounts of your deposit relative to the total vault tokens. After deposit the funds can be invested permissionlessly into the concentrated liquidity position.

**How withdrawals work:** You burn shares. The vault removes a proportional amount of liquidity, collects any pending fees, and returns Token A and Token B to your wallet.

---

## Installation

```bash
# npm
npm install @kamino-finance/kliquidity-sdk

# yarn
yarn add @kamino-finance/kliquidity-sdk
```

**Peer dependencies** (install if not already in your project):

```bash
npm install @solana/kit decimal.js
```

---

## SDK Setup

```typescript
import { Kamino } from '@kamino-finance/kliquidity-sdk';
import { createSolanaRpc } from '@solana/kit';

// Using a public RPC (rate-limited, use your own RPC for production)
const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');
const kamino = new Kamino('mainnet-beta', rpc);
```

The `Kamino` constructor accepts:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cluster` | `'mainnet-beta' \| 'devnet'` | Yes | Solana cluster |
| `rpc` | `Rpc<SolanaRpcApi>` | Yes | Solana RPC connection from `@solana/kit` |
| `globalConfig` | `Address` | No | Override global config address |
| `programId` | `Address` | No | Override Kamino program ID |
| `logger` | `Logger` | No | Custom logger for debugging |

---

## Reading Strategy Data

### List All Strategies

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

### Get a Single Strategy

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

### Strategy Metrics (Share Price, TVL, APY)

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

### Strategy Position Range & Pool Price

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

### Strategy Token Balances

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

---

## Deposits

### Both-Sided Deposit

Deposit both Token A and Token B into a strategy. The amounts don't need to be perfectly balanced - the vault handles the ratio.

```typescript
import Decimal from 'decimal.js';
import { address, generateKeyPairSigner } from '@solana/kit';
import {
  Kamino,
  createComputeUnitLimitIx,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from '@kamino-finance/kliquidity-sdk';

const strategyAddress = address('2H4xebnp2M9JYgPPfUw58uUQahWF8f1YTNxwwtmdqVYV');

// 1. Fetch strategy data
const strategyState = (await kamino.getStrategiesWithAddresses([strategyAddress]))[0];
if (!strategyState) throw new Error('Strategy not found');

const strategyWithAddress = {
  address: strategyAddress,
  strategy: strategyState.strategy,
};

// 2. Build the transaction
const tx = [createComputeUnitLimitIx(1_400_000)];

// 3. Create the shares token account if it doesn't exist
const sharesAta = await getAssociatedTokenAddress(strategyState.strategy.sharesMint, signer.address);
const createAtaIx = createAssociatedTokenAccountInstruction(
  signer,
  sharesAta,
  signer.address,
  strategyState.strategy.sharesMint
);
tx.push(createAtaIx);

// 4. Create deposit instruction
// Amounts are in token decimals (e.g., 5.0 USDC, not 5000000 lamports)
const amountA = new Decimal(5.0);  // 5 Token A
const amountB = new Decimal(5.0);  // 5 Token B
const depositIx = await kamino.deposit(strategyWithAddress, amountA, amountB, signer);
tx.push(depositIx);

// 5. Send using the strategy's lookup table for smaller transaction size
// Use your preferred transaction sending method with:
//   - Lookup table: strategyState.strategy.strategyLookupTable
//   - Compute budget: 1,400,000 units
```

### Single-Sided Deposit

Deposit only Token A or only Token B. The SDK handles the swap to balance the deposit using Jupiter.

```typescript
import Decimal from 'decimal.js';

// Single-sided deposit with Token A only
const amountToDeposit = new Decimal(10.0); // 10 Token A
const slippageBps = 50; // 0.5% slippage tolerance for the swap

const result = await kamino.singleSidedDepositTokenA(
  strategyWithAddress,
  amountToDeposit,
  signer,
  slippageBps
);

// result contains instructions and lookup tables
// result.instructions: IInstruction[] - all instructions to execute
// result.lookupTables: Address[] - lookup tables needed for the transaction

// For Token B single-sided deposit:
const resultB = await kamino.singleSidedDepositTokenB(
  strategyWithAddress,
  amountToDeposit,
  signer,
  slippageBps
);
```

**Important notes on deposits:**
- Amounts are in **token decimals**, not lamports. If you want to deposit 5 USDC, pass `new Decimal(5)`, not `new Decimal(5000000)`.
- The deposit instruction will fail if you don't have enough tokens in your wallet.
- Shares are minted to the user's shares ATA (associated token account for the strategy's share mint).
- Some strategies have deposit caps. Check with `kamino.getStrategyMaxDepositInUSD(address)` and `kamino.getStrategyDepositCapInUSDPerIx(address)`.

---

## Withdrawals

### Withdraw a Specific Amount of Shares

```typescript
import Decimal from 'decimal.js';
import {
  Kamino,
  createComputeUnitLimitIx,
  getAssociatedTokenAddressAndAccount,
} from '@kamino-finance/kliquidity-sdk';

const strategyAddress = address('2H4xebnp2M9JYgPPfUw58uUQahWF8f1YTNxwwtmdqVYV');

// 1. Fetch strategy
const strategy = await kamino.getStrategyByAddress(strategyAddress);
if (!strategy) throw new Error('Strategy not found');
const strategyWithAddress = { strategy, address: strategyAddress };

// 2. Check existing token accounts
const [sharesAta, sharesMintData] = await getAssociatedTokenAddressAndAccount(
  kamino.getConnection(), strategy.sharesMint, signer.address
);
const [tokenAAta, tokenAData] = await getAssociatedTokenAddressAndAccount(
  kamino.getConnection(), strategy.tokenAMint, signer.address
);
const [tokenBAta, tokenBData] = await getAssociatedTokenAddressAndAccount(
  kamino.getConnection(), strategy.tokenBMint, signer.address
);

// 3. Build transaction
const tx = [createComputeUnitLimitIx(1_400_000)];

// 4. Create token accounts if they don't exist (you need ATAs for Token A and B to receive them)
const ataInstructions = await kamino.getCreateAssociatedTokenAccountInstructionsIfNotExist(
  signer,
  strategyWithAddress,
  tokenAData,
  tokenAAta,
  tokenBData,
  tokenBAta,
  sharesMintData,
  sharesAta
);
tx.push(...ataInstructions);

// 5. Create withdraw instruction
const sharesToWithdraw = new Decimal(5); // withdraw 5 shares
const withdrawResult = await kamino.withdrawShares(strategyWithAddress, sharesToWithdraw, signer);

// withdrawResult has three parts:
tx.push(...withdrawResult.prerequisiteIxs);  // Required setup (e.g., collect fees for Raydium)
tx.push(withdrawResult.withdrawIx);          // The actual withdrawal
if (withdrawResult.closeSharesAtaIx) {
  tx.push(withdrawResult.closeSharesAtaIx);  // Optional: close shares ATA if emptied
}

// 6. Send with strategy lookup table
```

### Withdraw All Shares

```typescript
const withdrawIxns = await kamino.withdrawAllShares(strategyWithAddress, signer);
if (withdrawIxns) {
  tx.push(...withdrawIxns);
} else {
  console.log('No shares to withdraw');
}
```

**What you receive after withdrawal:**
- Token A and Token B are sent to your associated token accounts.
- The amounts depend on your share percentage and the current vault composition.
- A withdrawal fee may apply (configured per strategy).

---

## User Positions

### Get All User Positions

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

### Calculate User Position Value

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

---

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

---

## Strategy Holders

```typescript
// Get all wallets holding shares of a strategy and their amounts
const holders = await kamino.getStrategyHolders(strategyAddress);

for (const holder of holders) {
  console.log('Wallet:', holder.holderPubkey);
  console.log('Shares:', holder.amount.toString());
}
```

---

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

See the [examples/](./examples/) directory for full deposit+stake and unstake+withdraw flows.

---

## Kamino Public API

The Kamino Public API provides REST endpoints for reading strategy data, user positions, PnL, transaction history, and more. Use it for data that doesn't require on-chain transactions.

### Base URL

```
https://api.kamino.finance
```

All endpoints accept an `env` query parameter. Default: `mainnet-beta`.

```
https://api.kamino.finance/strategies?env=mainnet-beta
```

### Strategy Endpoints

#### List All Strategies

```
GET /strategies?env=mainnet-beta&status=LIVE
```

Returns an array of strategy summaries:

```json
[
  {
    "address": "2H4xebnp2M9JYgPPfUw58uUQahWF8f1YTNxwwtmdqVYV",
    "type": "STABLE",
    "shareMint": "HYmVV4g4BDpSrz5nPSeFkQ8ysRa5XDHBnKSBjW7FPFjg",
    "status": "LIVE",
    "tokenAMint": "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX",
    "tokenBMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `address` | `string` | Strategy public key |
| `type` | `string` | `NON_PEGGED`, `PEGGED`, or `STABLE` |
| `shareMint` | `string` | SPL token mint for this strategy's shares |
| `status` | `string` | `LIVE`, `DEPRECATED`, etc. |
| `tokenAMint` | `string` | Token A mint address |
| `tokenBMint` | `string` | Token B mint address |

#### Get Strategy Metrics

```
GET /strategies/:strategyAddress/metrics?env=mainnet-beta
```

Returns detailed metrics for a single strategy:

```json
{
  "strategy": "1k1LKNtugkPkSVGFfMAFXQoVGRsBNJzphNoghLNGtps",
  "tokenAMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "tokenBMint": "So11111111111111111111111111111111111111112",
  "tokenA": "USDC",
  "tokenB": "SOL",
  "rewardMints": ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
  "krewardMints": [],
  "profitAndLoss": "0",
  "sharePrice": "0.03725687025547599494",
  "sharesIssued": "8700761.465532",
  "totalValueLocked": "324163.14104517",
  "kaminoApy": {
    "vault": {
      "apr7d": "42.15",
      "apy7d": "52.01",
      "apr24h": "38.50",
      "apr30d": "40.20",
      "apy24h": "46.93",
      "apy30d": "49.53",
      "krewardsApr7d": "0",
      "krewardsApy7d": "0",
      "lastCalculated": "2026-02-18T15:01:09.206Z"
    },
    "kamino": [],
    "totalApy": "52.01"
  },
  "apy": {
    "vault": {
      "feeApr": "42.15",
      "feeApy": "52.01",
      "totalApr": "42.15",
      "totalApy": "52.01",
      "poolPrice": "0.00946",
      "priceLower": "0.00876",
      "priceUpper": "0.01023",
      "rewardsApr": [],
      "rewardsApy": [],
      "strategyOutOfRange": false
    },
    "kamino": [],
    "totalApy": "52.01"
  },
  "vaultBalances": {
    "tokenA": {
      "invested": "90000.00",
      "available": "5000.00",
      "total": "95000.00",
      "totalUsd": "95000.00"
    },
    "tokenB": {
      "invested": "2000.00",
      "available": "100.00",
      "total": "2100.00",
      "totalUsd": "229000.00"
    }
  }
}
```

**Key fields explained:**

| Field | Description |
|-------|-------------|
| `sharePrice` | Current USD value of one share |
| `sharesIssued` | Total shares outstanding |
| `totalValueLocked` | Total USD value in the strategy |
| `kaminoApy.vault.apr7d` | Annualized return rate over the last 7 days |
| `kaminoApy.vault.apy7d` | Compounded annual return over the last 7 days |
| `apy.vault.feeApr` | APR from trading fees alone |
| `apy.vault.poolPrice` | Current pool price (Token A in terms of Token B) |
| `apy.vault.priceLower` | Lower bound of position range |
| `apy.vault.priceUpper` | Upper bound of position range |
| `apy.vault.strategyOutOfRange` | `true` if current price is outside the position range |
| `vaultBalances.tokenA.invested` | Token A amount actively providing liquidity |
| `vaultBalances.tokenA.available` | Token A amount sitting idle in the vault |
| `vaultBalances.tokenA.totalUsd` | USD value of all Token A in the strategy |

#### Get All Strategy Metrics

```
GET /strategies/metrics?env=mainnet-beta&status=LIVE
```

Returns the same metrics format as above but for all strategies matching the status filter. Same response shape as single strategy metrics, but as an array.

### User Position & PnL Endpoints

#### User Position PnL

```
GET /v2/strategies/:strategyAddress/shareholders/:walletAddress/pnl?env=mainnet-beta
```

Returns the user's profit/loss for a specific strategy position:

```json
{
  "totalPnl": {
    "usd": "125.50",
    "sol": "1.15",
    "a": "125.50",
    "b": "0.0058"
  },
  "totalCostBasis": {
    "usd": "1000.00",
    "sol": "9.20",
    "a": "500.00",
    "b": "2.50"
  }
}
```

| Field | Description |
|-------|-------------|
| `totalPnl.usd` | Total profit/loss in USD |
| `totalPnl.sol` | Total profit/loss in SOL |
| `totalPnl.a` | PnL denominated in Token A |
| `totalPnl.b` | PnL denominated in Token B |
| `totalCostBasis.usd` | Total amount deposited (cost basis) in USD |

#### User PnL History

```
GET /v2/strategies/:strategyAddress/shareholders/:walletAddress/pnl/history?env=mainnet-beta&start=2026-01-01T00:00:00Z&end=2026-02-01T00:00:00Z
```

Returns PnL snapshots over time for charting.

#### User Fees & Rewards Earned

```
GET /strategies/:strategyAddress/shareholders/:walletAddress/fees-and-rewards?env=mainnet-beta
```

Returns cumulative fees and rewards earned by a specific user in a specific strategy:

```json
{
  "feesAEarned": "12.50",
  "feesBEarned": "0.005",
  "rewards0Earned": "100.0",
  "rewards1Earned": "0",
  "rewards2Earned": "0",
  "kaminoRewards0Earned": "0",
  "kaminoRewards1Earned": "0",
  "kaminoRewards2Earned": "0",
  "feesAEarnedUsd": "12.50",
  "feesBEarnedUsd": "0.55",
  "rewards0EarnedUsd": "5.00",
  "rewards1EarnedUsd": "0",
  "rewards2EarnedUsd": "0",
  "kaminoRewards0EarnedUsd": "0",
  "kaminoRewards1EarnedUsd": "0",
  "kaminoRewards2EarnedUsd": "0",
  "lastCalculated": "2026-02-18T00:00:00.000Z"
}
```

| Field | Description |
|-------|-------------|
| `feesAEarned` | Cumulative Token A trading fees earned (in token units) |
| `feesBEarned` | Cumulative Token B trading fees earned |
| `rewards0Earned` | Cumulative pool reward 0 earned (e.g., ORCA rewards) |
| `kaminoRewards0Earned` | Cumulative Kamino incentive rewards earned |
| `feesAEarnedUsd` | USD value of Token A fees earned |
| `lastCalculated` | Timestamp of the last calculation |

#### Shareholder Reward History

```
GET /strategies/shareholders/:walletAddress/rewards/history?env=mainnet-beta
```

Returns all historical rewards for a wallet across all strategies:

```json
{
  "ownerPubkey": "HrwbdQYwSnAyVpVHuGQ661HiNbWmGjDp5DdDR9YMw7Bu",
  "rewards": [
    {
      "strategy": "2H4xebnp...",
      "rewardsEarned": [
        {
          "token": "USDC",
          "amount": "50.0",
          "year": 2026,
          "month": 1,
          "configuration": "..."
        }
      ]
    }
  ]
}
```

### Transaction History

#### Get User Transactions

```
GET /shareholders/:walletAddress/transactions?env=mainnet-beta
```

Returns all deposit, withdrawal, and claim transactions for a wallet:

```json
[
  {
    "strategy": "2H4xebnp2M9JYgPPfUw58uUQahWF8f1YTNxwwtmdqVYV",
    "instruction": "deposit",
    "signature": "5K7x...txhash",
    "timestamp": "2026-01-15T10:30:00.000Z",
    "numberOfShares": "100.5",
    "sharePrice": "1.05",
    "tokenAAmount": "50.25",
    "tokenBAmount": "52.76",
    "solPrice": "95.50",
    "fullWithdraw": false
  },
  {
    "strategy": "2H4xebnp2M9JYgPPfUw58uUQahWF8f1YTNxwwtmdqVYV",
    "instruction": "withdraw",
    "signature": "3Rq1...txhash",
    "timestamp": "2026-02-01T14:00:00.000Z",
    "numberOfShares": "50.0",
    "sharePrice": "1.12",
    "tokenAAmount": "28.00",
    "tokenBAmount": "28.00",
    "solPrice": "100.20",
    "fullWithdraw": false
  }
]
```

| Field | Description |
|-------|-------------|
| `strategy` | Strategy address |
| `instruction` | `"deposit"`, `"withdraw"`, or `"claim"` |
| `signature` | Solana transaction signature |
| `timestamp` | ISO 8601 timestamp |
| `numberOfShares` | Shares minted (deposit) or burned (withdraw) |
| `sharePrice` | Share price at time of transaction |
| `tokenAAmount` | Token A amount deposited/received |
| `tokenBAmount` | Token B amount deposited/received |
| `solPrice` | SOL/USD price at time of transaction |
| `fullWithdraw` | `true` if the user withdrew all their shares |

### Fees & Rewards Endpoints

#### Strategy Fees & Rewards (Time Period)

```
GET /strategies/fees-and-rewards?env=mainnet-beta&period=24h&statuses=LIVE
```

Returns fees and rewards earned by each strategy over a time period (`24h`, `7d`, `30d`):

```json
[
  {
    "strategyPubkey": "1k1LKNtugkPkSVGFfMAFXQoVGRsBNJzphNoghLNGtps",
    "feesAEarned": "71.38",
    "feesBEarned": "0.712",
    "rewards0Earned": "0",
    "feesAEarnedUsd": "71.37",
    "feesBEarnedUsd": "75.53",
    "totalUsd": "146.91",
    "lastCalculated": "2026-02-18T16:15:06.371Z"
  }
]
```

#### All-Time Fees & Rewards

```
GET /strategies/all-time-fees-and-rewards?env=mainnet-beta
```

#### All-Time Volume

```
GET /strategies/all-time-volume?env=mainnet-beta
```

Returns `{ "volumeUsd": "...", "lastCalculated": "..." }`.

#### Total TVL

```
GET /strategies/tvl?env=mainnet-beta
```

Returns `{ "tvl": "..." }` - total USD value locked across all strategies.

### Historical Data

#### Strategy History (Time Series)

```
GET /v2/strategies/:strategyAddress/history?env=mainnet-beta&start=2026-02-17T00:00:00Z&end=2026-02-18T00:00:00Z&frequency=hour
```

Returns time-series data for charting strategy performance:

```json
[
  {
    "timestamp": "2026-02-17T00:00:00.000Z",
    "feesCollectedCumulativeA": "386564.538238",
    "feesCollectedCumulativeB": "2178.223047595",
    "rewardsCollectedCumulative0": "0",
    "sharePrice": "0.03725687025547599494",
    "sharesIssued": "8700761.465532",
    "tokenAAmounts": "94374.091296",
    "tokenBAmounts": "2104.502578997",
    "tokenAPrice": "0.9999506",
    "tokenBPrice": "109.19146126",
    "totalValueLocked": "324163.14",
    "solPrice": "86.54727332",
    "profitAndLoss": "0"
  }
]
```

| Query Parameter | Values | Description |
|-----------------|--------|-------------|
| `start` | ISO 8601 datetime | Start of time range |
| `end` | ISO 8601 datetime | End of time range |
| `frequency` | `minute`, `hour`, `day` | Data point frequency |
| `includePerfFee` | `true`/`false` | Include performance fee in calculations |

#### Strategy Range History

```
GET /strategies/:strategyAddress/ranges/history?env=mainnet-beta&period=7d
```

Returns historical price ranges for charting position range changes over time.

#### Strategy Metrics History

```
GET /strategies/:strategyAddress/metrics/history?env=mainnet-beta&start=...&end=...&period=24h
```

Returns historical metrics including APY, TVL, shareholder count, and reserve data over time.

---

## API Response Types

Here are TypeScript interfaces matching the API responses, for use in your frontend code:

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

---

## SDK Type Reference

These are the key TypeScript types exported by the SDK:

```typescript
import {
  Kamino,
  StrategyWithAddress,
  KaminoPosition,
  Holdings,
  TokenAmounts,
  ShareData,
  StrategyBalances,
  StrategyPrices,
  StrategyHolder,
  StrategyWithPendingFees,
  StrategiesFilters,
} from '@kamino-finance/kliquidity-sdk';
```

### StrategyWithAddress
```typescript
interface StrategyWithAddress {
  strategy: WhirlpoolStrategy;  // On-chain strategy account data
  address: Address;             // Strategy public key
}
```

### KaminoPosition
```typescript
interface KaminoPosition {
  strategy: Address;       // Strategy address
  shareMint: Address;      // Share token mint
  sharesAmount: Decimal;   // Number of shares held
  strategyDex: Dex;        // 'ORCA' | 'RAYDIUM' | 'METEORA'
}
```

### Holdings
```typescript
type Holdings = {
  available: TokenAmounts;  // Tokens in vaults (not yet invested)
  availableUsd: Decimal;    // USD value of available tokens
  invested: TokenAmounts;   // Tokens in the active LP position
  investedUsd: Decimal;     // USD value of invested tokens
  totalSum: Decimal;        // Total USD value (available + invested)
};
```

### TokenAmounts
```typescript
type TokenAmounts = {
  a: Decimal;  // Token A amount
  b: Decimal;  // Token B amount
};
```

### ShareData
```typescript
type ShareData = {
  balance: StrategyBalances;  // Token balances and holdings
  price: Decimal;             // Current share price in USD
};
```

### StrategyBalances
```typescript
type StrategyBalances = {
  computedHoldings: Holdings;  // Computed position values
  prices: PriceData;           // Token prices used in calculations
  tokenAAmounts: Decimal;      // Raw Token A in strategy
  tokenBAmounts: Decimal;      // Raw Token B in strategy
};
```

### PriceData
```typescript
type PriceData = {
  aPrice: Decimal | null;          // Token A USD price
  bPrice: Decimal | null;          // Token B USD price
  reward0Price: Decimal | null;    // Reward token 0 price
  reward1Price: Decimal | null;    // Reward token 1 price
  reward2Price: Decimal | null;    // Reward token 2 price
  lowerPrice: Decimal;             // Position lower price bound
  upperPrice: Decimal;             // Position upper price bound
  poolPrice: Decimal;              // Current pool price
  twapPrice: Decimal | null;       // Time-weighted average price
  lowerResetPrice: Decimal | null; // Price to trigger lower rebalance
  upperResetPrice: Decimal | null; // Price to trigger upper rebalance
};
```

### StrategyPrices
```typescript
type StrategyPrices = {
  aPrice: Decimal | null;       // Token A USD price (from oracle)
  bPrice: Decimal | null;       // Token B USD price
  reward0Price: Decimal | null; // Reward 0 price
  reward1Price: Decimal | null; // Reward 1 price
  reward2Price: Decimal | null; // Reward 2 price
  aTwapPrice: Decimal | null;   // Token A TWAP price
  bTwapPrice: Decimal | null;   // Token B TWAP price
};
```

### StrategyHolder
```typescript
type StrategyHolder = {
  holderPubkey: Address;  // Wallet address
  amount: Decimal;        // Number of shares held
};
```

### StrategiesFilters
```typescript
type StrategiesFilters = {
  strategyType?: 'NON_PEGGED' | 'PEGGED' | 'STABLE';
  strategyCreationStatus?: 'IGNORED' | 'SHADOW' | 'LIVE' | 'DEPRECATED' | 'STAGING';
  isCommunity?: boolean;
  owner?: Address;
};
```

### WithdrawShares
```typescript
// Returned by kamino.withdrawShares()
type WithdrawShares = {
  prerequisiteIxs: IInstruction[];  // Instructions to run before withdrawal
  withdrawIx: IInstruction;         // The actual withdrawal instruction
  closeSharesAtaIx?: IInstruction;  // Optional: close shares ATA if empty
};
```

---

## FAQ

**Q: What's the difference between the SDK and the API?**

The SDK interacts directly with the Solana blockchain via RPC. Use it for:
- Building and sending transactions (deposits, withdrawals)
- Reading real-time on-chain data
- Any operation that modifies state

The API is a REST service that provides pre-computed, cached data. Use it for:
- Historical time-series data (charts, PnL history)
- Transaction history
- Aggregated metrics (TVL, APY over time periods)
- Data that would be expensive to compute on-the-fly from chain

**Q: How do I calculate a user's position value in USD?**

```typescript
// Option 1: Using the SDK
const sharePrice = await kamino.getStrategySharePrice(strategyAddress);
const userShares = position.sharesAmount;  // from getUserPositions()
const valueUsd = userShares.mul(sharePrice);

// Option 2: Using the API
// GET /strategies/:address/metrics → sharePrice
// Multiply by user's share balance
```

**Q: How do I know which tokens a strategy uses?**

```typescript
const strategy = await kamino.getStrategyByAddress(strategyAddress);
console.log('Token A:', strategy.tokenAMint); // mint address
console.log('Token B:', strategy.tokenBMint);
// Use a token registry or the API to get human-readable names
```

**Q: What's the difference between `available` and `invested` balances?**

- **Available:** Tokens sitting in the strategy's vault accounts, not earning fees. This happens between deposits and the next invest cycle, or after fee collection.
- **Invested:** Tokens actively providing liquidity in the CLMM position, earning trading fees.

**Q: How often does the API data update?**

Most API endpoints cache data with expiry times ranging from 30 seconds to 24 hours depending on the endpoint. Real-time data should be read from chain via the SDK.

**Q: Can I deposit only one token?**

Yes, use `singleSidedDepositTokenA()` or `singleSidedDepositTokenB()`. The SDK handles the swap via Jupiter to balance the deposit. You need to provide a slippage tolerance.

**Q: How do I handle the strategy lookup table?**

Kamino strategies use Solana Address Lookup Tables to keep transactions small. When sending transactions, include `strategy.strategyLookupTable` as a lookup table address:

```typescript
// The lookup table address is on the strategy object
const lut = strategyState.strategy.strategyLookupTable;
```

---

## Development

### Codegen
Copy the new `idl` from the kamino-liquidity program to `src/kamino-client/idl.json`:
```bash
yarn codegen:kliquidity
```

### Setup localnet
Ensure `deps` contains the correct `.so` you want to test against. Either build it from the main repo or dump it from mainnet:
```bash
yarn start-validator
```

### Run tests
```bash
yarn start-validator-and-test
# Or, if the local validator is already running:
yarn test
```

### Sync with smart contracts
```bash
yarn
solana program dump 6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc -u m deps/kamino.so
yarn codegen
```
