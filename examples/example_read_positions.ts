import { address } from '@solana/kit';
import { Kamino } from '@kamino-finance/kliquidity-sdk';
import { getConnection } from './utils/connection';

/**
 * Read all Kamino Liquidity positions for a wallet and calculate their USD values.
 *
 * Usage:
 *   export RPC_ENDPOINT=<your-rpc-url>
 *   yarn read-positions
 */
(async () => {
  const cluster = 'mainnet-beta';
  const kamino = new Kamino(cluster, getConnection());

  // Replace with the wallet you want to query
  const walletAddress = address('HrwbdQYwSnAyVpVHuGQ661HiNbWmGjDp5DdDR9YMw7Bu');

  console.log('Fetching positions for wallet:', walletAddress);

  // Get all strategies the user has shares in
  const positions = await kamino.getUserPositions(walletAddress);

  if (positions.length === 0) {
    console.log('No positions found for this wallet.');
    return;
  }

  console.log(`Found ${positions.length} position(s)\n`);

  for (const pos of positions) {
    console.log('=== Position ===');
    console.log('Strategy:', pos.strategy);
    console.log('Share Mint:', pos.shareMint);
    console.log('Shares Held:', pos.sharesAmount.toString());
    console.log('DEX:', pos.strategyDex);

    // Calculate USD value
    const sharePrice = await kamino.getStrategySharePrice(pos.strategy);
    const userValueUsd = pos.sharesAmount.mul(sharePrice);
    console.log('Share Price (USD):', sharePrice.toString());
    console.log('Position Value (USD):', userValueUsd.toFixed(2));

    // Get token breakdown
    const tokensPerShare = await kamino.getTokenAAndBPerShare(pos.strategy);
    const userTokenA = pos.sharesAmount.mul(tokensPerShare.a);
    const userTokenB = pos.sharesAmount.mul(tokensPerShare.b);
    console.log('User Token A:', userTokenA.toFixed(6));
    console.log('User Token B:', userTokenB.toFixed(6));

    console.log('');
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
