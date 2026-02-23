# Kliquidity SDK Examples

## Setup

Make sure to define the `RPC_ENDPOINT` environment variable with your RPC URL. If you want to also send transactions you need to define a `WS_ENDPOINT` environment variable with your WS URL.

```bash
cd kliquidity-sdk/examples
yarn install
export RPC_ENDPOINT=YOUR_RPC_URL_HERE
export WS_ENDPOINT=YOUR_WS_ENDPOINT_HERE  # only needed for sending transactions
```

## Read-Only Examples

These examples only read data from chain and don't require a wallet or WS endpoint.

### Read strategy data

Fetch strategy info, share price, token balances, and vault holdings.

```bash
yarn read-strategy
```

### Read user positions

Fetch all Kamino Liquidity positions for a wallet and calculate USD values.

```bash
yarn read-positions
```

### Strategy APY & range

Read APR/APY breakdown, position range, and current pool price.

```bash
yarn strategy-apy
```

### Strategy holders

List all wallets holding shares of a strategy with their USD values.

```bash
yarn strategy-holders
```

## Transaction Examples

These examples build and send transactions. They require `WS_ENDPOINT` and a funded wallet.

### Deposit and stake

Deposit tokens into a strategy and stake shares in the strategy's farm.

```bash
yarn deposit-and-stake
```

### Deposit and stake (noop signer)

Same as above but uses a noop signer for transaction construction, useful for multisig proposals.

```bash
yarn deposit-and-stake-noop-signer
```

### Unstake and withdraw

Unstake shares from a farm and withdraw tokens from a strategy.

```bash
yarn unstake-and-withdraw
```
