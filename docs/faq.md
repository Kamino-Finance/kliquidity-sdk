# FAQ

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

Kamino strategies use Solana Address Lookup Tables to keep transactions small. Existing strategies expose the lookup table on the strategy state, and new lookup tables must be created with an explicit finalized slot:

```typescript
// Existing strategies expose the lookup table on the strategy object.
const lut = strategyState.strategy.strategyLookupTable;

// For a newly created strategy, fetch a fresh finalized slot and pass it explicitly.
const slot = await kamino.getConnection().getSlot({ commitment: 'finalized' }).send();
const lookupTableSetup = await kamino.setupStrategyLookupTable(signer, strategyAddress, slot);
```
