# SDK Type Reference

Key TypeScript types exported by the SDK.

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

## StrategyWithAddress

```typescript
interface StrategyWithAddress {
  strategy: WhirlpoolStrategy;  // On-chain strategy account data
  address: Address;             // Strategy public key
}
```

## KaminoPosition

```typescript
interface KaminoPosition {
  strategy: Address;       // Strategy address
  shareMint: Address;      // Share token mint
  sharesAmount: Decimal;   // Number of shares held
  strategyDex: Dex;        // 'ORCA' | 'RAYDIUM' | 'METEORA'
}
```

## Holdings

```typescript
type Holdings = {
  available: TokenAmounts;  // Tokens in vaults (not yet invested)
  availableUsd: Decimal;    // USD value of available tokens
  invested: TokenAmounts;   // Tokens in the active LP position
  investedUsd: Decimal;     // USD value of invested tokens
  totalSum: Decimal;        // Total USD value (available + invested)
};
```

## TokenAmounts

```typescript
type TokenAmounts = {
  a: Decimal;  // Token A amount
  b: Decimal;  // Token B amount
};
```

## ShareData

```typescript
type ShareData = {
  balance: StrategyBalances;  // Token balances and holdings
  price: Decimal;             // Current share price in USD
};
```

## StrategyBalances

```typescript
type StrategyBalances = {
  computedHoldings: Holdings;  // Computed position values
  prices: PriceData;           // Token prices used in calculations
  tokenAAmounts: Decimal;      // Raw Token A in strategy
  tokenBAmounts: Decimal;      // Raw Token B in strategy
};
```

## PriceData

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

## StrategyPrices

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

## StrategyHolder

```typescript
type StrategyHolder = {
  holderPubkey: Address;  // Wallet address
  amount: Decimal;        // Number of shares held
};
```

## StrategiesFilters

```typescript
type StrategiesFilters = {
  strategyType?: 'NON_PEGGED' | 'PEGGED' | 'STABLE';
  strategyCreationStatus?: 'IGNORED' | 'SHADOW' | 'LIVE' | 'DEPRECATED' | 'STAGING';
  isCommunity?: boolean;
  owner?: Address;
};
```

## WithdrawShares

```typescript
// Returned by kamino.withdrawShares()
type WithdrawShares = {
  prerequisiteIxs: IInstruction[];  // Instructions to run before withdrawal
  withdrawIx: IInstruction;         // The actual withdrawal instruction
  closeSharesAtaIx?: IInstruction;  // Optional: close shares ATA if empty
};
```
