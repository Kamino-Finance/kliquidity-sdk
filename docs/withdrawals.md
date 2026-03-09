# Withdrawals

## Withdraw a Specific Amount of Shares

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

## Withdraw All Shares

```typescript
const withdrawIxns = await kamino.withdrawAllShares(strategyWithAddress, signer);
if (withdrawIxns) {
  tx.push(...withdrawIxns);
} else {
  console.log('No shares to withdraw');
}
```

## What You Receive

- Token A and Token B are sent to your associated token accounts.
- The amounts depend on your share percentage and the current vault composition.
- A withdrawal fee may apply (configured per strategy).

See [example_unstake_and_withdraw.ts](../examples/example_unstake_and_withdraw.ts) for a full unstake + withdraw example.
