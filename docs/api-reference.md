# Kamino Public API

The Kamino Public API provides REST endpoints for reading strategy data, user positions, PnL, transaction history, and more. Use it for data that doesn't require on-chain transactions.

## Base URL

```
https://api.kamino.finance
```

All endpoints accept an `env` query parameter. Default: `mainnet-beta`.

```
https://api.kamino.finance/strategies?env=mainnet-beta
```

## Strategy Endpoints

### List All Strategies

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

### Get Strategy Metrics

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

**Key fields:**

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

### Get All Strategy Metrics

```
GET /strategies/metrics?env=mainnet-beta&status=LIVE
```

Returns the same metrics format as above but for all strategies matching the status filter.

## User Position & PnL Endpoints

### User Position PnL

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

### User PnL History

```
GET /v2/strategies/:strategyAddress/shareholders/:walletAddress/pnl/history?env=mainnet-beta&start=2026-01-01T00:00:00Z&end=2026-02-01T00:00:00Z
```

Returns PnL snapshots over time for charting.

### User Fees & Rewards Earned

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

### Shareholder Reward History

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

## Transaction History

### Get User Transactions

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

## Fees & Rewards Endpoints

### Strategy Fees & Rewards (Time Period)

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

### All-Time Fees & Rewards

```
GET /strategies/all-time-fees-and-rewards?env=mainnet-beta
```

### All-Time Volume

```
GET /strategies/all-time-volume?env=mainnet-beta
```

Returns `{ "volumeUsd": "...", "lastCalculated": "..." }`.

### Total TVL

```
GET /strategies/tvl?env=mainnet-beta
```

Returns `{ "tvl": "..." }` - total USD value locked across all strategies.

## Historical Data

### Strategy History (Time Series)

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

### Strategy Range History

```
GET /strategies/:strategyAddress/ranges/history?env=mainnet-beta&period=7d
```

Returns historical price ranges for charting position range changes over time.

### Strategy Metrics History

```
GET /strategies/:strategyAddress/metrics/history?env=mainnet-beta&start=...&end=...&period=24h
```

Returns historical metrics including APY, TVL, shareholder count, and reserve data over time.

## Response Types

See [API Response Types](./api-response-types.md) for TypeScript interfaces matching all API responses.
