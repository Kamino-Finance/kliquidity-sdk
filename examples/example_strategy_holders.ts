import { address } from '@solana/kit';
import { Kamino } from '@kamino-finance/kliquidity-sdk';
import { getConnection } from './utils/connection';

/**
 * List all holders of a strategy's shares.
 *
 * Usage:
 *   export RPC_ENDPOINT=<your-rpc-url>
 *   yarn strategy-holders
 */
(async () => {
  const cluster = 'mainnet-beta';
  const kamino = new Kamino(cluster, getConnection());

  // Replace with any live strategy address
  const strategyAddress = address('2H4xebnp2M9JYgPPfUw58uUQahWF8f1YTNxwwtmdqVYV');

  console.log('Fetching holders for strategy:', strategyAddress);

  const holders = await kamino.getStrategyHolders(strategyAddress);

  if (holders.length === 0) {
    console.log('No holders found.');
    return;
  }

  console.log(`Found ${holders.length} holder(s)\n`);

  // Get share price to calculate USD values
  const sharePrice = await kamino.getStrategySharePrice(strategyAddress);

  for (const holder of holders) {
    const valueUsd = holder.amount.mul(sharePrice);
    console.log(`Wallet: ${holder.holderPubkey}`);
    console.log(`  Shares: ${holder.amount.toString()}`);
    console.log(`  Value (USD): $${valueUsd.toFixed(2)}`);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
