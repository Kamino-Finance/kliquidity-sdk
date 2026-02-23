# Deposits

## Both-Sided Deposit

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

## Single-Sided Deposit

Deposit only Token A or only Token B. The SDK handles the swap to balance the deposit using Jupiter.

```typescript
import Decimal from 'decimal.js';

// Single-sided deposit with Token A only
const amountToDeposit = new Decimal(10.0); // 10 Token A
const slippageBps = new Decimal(50); // 0.5% slippage tolerance for the swap

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

## Important Notes

- Amounts are in **token decimals**, not lamports. If you want to deposit 5 USDC, pass `new Decimal(5)`, not `new Decimal(5000000)`.
- The deposit instruction will fail if you don't have enough tokens in your wallet.
- Shares are minted to the user's shares ATA (associated token account for the strategy's share mint).
- Some strategies have deposit caps. Check with `kamino.getStrategyMaxDepositInUSD(address)` and `kamino.getStrategyDepositCapInUSDPerIx(address)`.

See [example_deposit_and_stake.ts](../examples/example_deposit_and_stake.ts) for a full deposit + stake example.
