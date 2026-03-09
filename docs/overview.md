# Kamino Liquidity SDK - Overview

Typescript SDK for integrating with **Kamino Liquidity** (automated CLMM vaults) on Solana. Kamino manages concentrated liquidity positions across Orca Whirlpools, Raydium CLMM, and Meteora DLMM, handling automatic rebalancing, fee compounding, and reward collection.

**This guide is for UI/frontend developers** who want to integrate Kamino Liquidity into their applications. It covers reading strategy data, depositing, withdrawing, and querying user positions via both the SDK and the REST API.

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

## Core Concepts

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

## Documentation Index

- **[Reading Strategies](./reading-strategies.md)** - List strategies, get metrics, balances, ranges
- **[Deposits](./deposits.md)** - Both-sided and single-sided deposits
- **[Withdrawals](./withdrawals.md)** - Partial and full share withdrawals
- **[Positions & PnL](./positions-and-pnl.md)** - User positions, fees, rewards, strategy holders
- **[REST API Reference](./api-reference.md)** - Kamino Public API endpoints
- **[SDK Types](./sdk-types.md)** - TypeScript type reference
- **[FAQ](./faq.md)** - Common questions

## Examples

See the [examples/](../examples/) directory for runnable code:

| Example | Description |
|---------|-------------|
| `example_read_strategy.ts` | Read strategy data, share price, token balances |
| `example_read_positions.ts` | Read user positions and calculate USD value |
| `example_strategy_apy.ts` | Read APY/APR, position range, and pool price |
| `example_strategy_holders.ts` | List all holders of a strategy |
| `example_deposit_and_stake.ts` | Deposit tokens and stake shares in a farm |
| `example_unstake_and_withdraw.ts` | Unstake from farm and withdraw tokens |
