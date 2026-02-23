import { address } from '@solana/kit';
import { Kamino } from '@kamino-finance/kliquidity-sdk';
import { getConnection } from './utils/connection';

/**
 * Read strategy data: share price, token balances, and vault holdings.
 *
 * Usage:
 *   export RPC_ENDPOINT=<your-rpc-url>
 *   yarn read-strategy
 */
(async () => {
  const cluster = 'mainnet-beta';
  const kamino = new Kamino(cluster, getConnection());

  // Replace with any live strategy address
  const strategyAddress = address('2H4xebnp2M9JYgPPfUw58uUQahWF8f1YTNxwwtmdqVYV');

  // Fetch the strategy account
  const strategy = await kamino.getStrategyByAddress(strategyAddress);
  if (!strategy) {
    throw new Error('Strategy not found');
  }

  console.log('=== Strategy Info ===');
  console.log('Address:', strategyAddress);
  console.log('Token A Mint:', strategy.tokenAMint);
  console.log('Token B Mint:', strategy.tokenBMint);
  console.log('DEX:', strategy.strategyDex.toString(), '(0=ORCA, 1=RAYDIUM, 2=METEORA)');
  console.log('Shares Mint:', strategy.sharesMint);
  console.log('Shares Issued:', strategy.sharesIssued.toString());

  // Share price
  const sharePrice = await kamino.getStrategySharePrice(strategyAddress);
  console.log('\n=== Share Price ===');
  console.log('Share price (USD):', sharePrice.toString());

  // Token amounts per share
  const tokensPerShare = await kamino.getTokenAAndBPerShare(strategyAddress);
  console.log('Token A per share:', tokensPerShare.a.toString());
  console.log('Token B per share:', tokensPerShare.b.toString());

  // Full share data with balances
  const shareData = await kamino.getStrategyShareData(strategyAddress);
  const holdings = shareData.balance.computedHoldings;

  console.log('\n=== Vault Holdings ===');
  console.log('Available Token A:', holdings.available.a.toString());
  console.log('Available Token B:', holdings.available.b.toString());
  console.log('Available USD:', holdings.availableUsd.toString());
  console.log('Invested Token A:', holdings.invested.a.toString());
  console.log('Invested Token B:', holdings.invested.b.toString());
  console.log('Invested USD:', holdings.investedUsd.toString());
  console.log('Total Value (USD):', holdings.totalSum.toString());

  // Prices used in calculations
  const prices = shareData.balance.prices;
  console.log('\n=== Prices ===');
  console.log('Token A price:', prices.aPrice?.toString() ?? 'N/A');
  console.log('Token B price:', prices.bPrice?.toString() ?? 'N/A');
  console.log('Pool price:', prices.poolPrice.toString());
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
