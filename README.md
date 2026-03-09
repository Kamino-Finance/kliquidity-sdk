[![npm](https://img.shields.io/npm/v/@kamino-finance/kliquidity-sdk)](https://www.npmjs.com/package/@kamino-finance/kliquidity-sdk)

# Kamino Liquidity SDK

Typescript SDK for integrating with **Kamino Liquidity** (automated CLMM vaults) on Solana. Kamino manages concentrated liquidity positions across Orca Whirlpools, Raydium CLMM, and Meteora DLMM, handling automatic rebalancing, fee compounding, and reward collection.

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

## Documentation

| Document | Description |
|----------|-------------|
| [Overview](./docs/overview.md) | Core concepts, installation, and SDK setup |
| [Reading Strategies](./docs/reading-strategies.md) | List strategies, get metrics, balances, and ranges |
| [Deposits](./docs/deposits.md) | Both-sided and single-sided deposits |
| [Withdrawals](./docs/withdrawals.md) | Partial and full share withdrawals |
| [Positions & PnL](./docs/positions-and-pnl.md) | User positions, fees, rewards, strategy holders |
| [REST API Reference](./docs/api-reference.md) | Kamino Public API endpoints |
| [API Response Types](./docs/api-response-types.md) | TypeScript interfaces for API responses |
| [SDK Types](./docs/sdk-types.md) | SDK type reference |
| [FAQ](./docs/faq.md) | Common questions |

## Examples

See the [examples/](./examples/) directory for runnable code. Setup:

```bash
cd examples
yarn install
export RPC_ENDPOINT=YOUR_RPC_URL_HERE
```

| Example | Run | Description |
|---------|-----|-------------|
| [Read strategy](./examples/example_read_strategy.ts) | `yarn read-strategy` | Strategy data, share price, token balances |
| [Read positions](./examples/example_read_positions.ts) | `yarn read-positions` | User positions and USD values |
| [Strategy APY](./examples/example_strategy_apy.ts) | `yarn strategy-apy` | APR/APY, position range, pool price |
| [Strategy holders](./examples/example_strategy_holders.ts) | `yarn strategy-holders` | All holders of a strategy |
| [Deposit & stake](./examples/example_deposit_and_stake.ts) | `yarn deposit-and-stake` | Deposit tokens and stake in farm |
| [Unstake & withdraw](./examples/example_unstake_and_withdraw.ts) | `yarn unstake-and-withdraw` | Unstake from farm and withdraw |

## Development

### Codegen

Copy the new `idl` from the kamino-liquidity program to `src/idl/kliquidity.json`:

```bash
yarn codegen
```

### Setup localnet

Ensure `deps` contains the correct `.so` you want to test against (in `deps/kliquidity/kliquidity.so`). Either build it from the main repo using `CLUSTER=devnet` or dump it from devnet:

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
