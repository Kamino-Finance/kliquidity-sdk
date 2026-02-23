import { address } from '@solana/kit';
import { Kamino } from '@kamino-finance/kliquidity-sdk';
import { getConnection } from './utils/connection';

/**
 * Read APR/APY, position range, and pool price for a strategy.
 *
 * Usage:
 *   export RPC_ENDPOINT=<your-rpc-url>
 *   yarn strategy-apy
 */
(async () => {
  const cluster = 'mainnet-beta';
  const kamino = new Kamino(cluster, getConnection());

  // Replace with any live strategy address
  const strategyAddress = address('2H4xebnp2M9JYgPPfUw58uUQahWF8f1YTNxwwtmdqVYV');

  // APR/APY breakdown
  const aprApy = await kamino.getStrategyAprApy(strategyAddress);
  console.log('=== APR / APY ===');
  console.log('Total APR:', aprApy.totalApr.toString());
  console.log('Fee APR:', aprApy.feeApr.toString());
  console.log('Total APY:', aprApy.totalApy.toString());
  console.log('Fee APY:', aprApy.feeApy.toString());
  console.log('Strategy out of range:', aprApy.strategyOutOfRange);

  if (aprApy.rewardsApr.length > 0) {
    console.log('\n=== Reward APRs ===');
    aprApy.rewardsApr.forEach((r, i) => {
      console.log(`  Reward ${i} APR:`, r.toString());
    });
  }

  // Position range
  const range = await kamino.getStrategyRange(strategyAddress);
  console.log('\n=== Position Range ===');
  console.log('Lower price:', range.lowerPrice.toString());
  console.log('Upper price:', range.upperPrice.toString());

  // Current pool price
  const currentPrice = await kamino.getCurrentPrice(strategyAddress);
  console.log('\n=== Pool Price ===');
  console.log('Current price:', currentPrice.toString());

  // In range check
  const inRange = currentPrice.gte(range.lowerPrice) && currentPrice.lte(range.upperPrice);
  console.log('In range:', inRange);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
