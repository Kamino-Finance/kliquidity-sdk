import {
  address,
  createDefaultRpcTransport,
  createRpc,
  createSolanaRpcApi,
  createSolanaRpcSubscriptions,
  DEFAULT_RPC_CONFIG,
  SolanaRpcApi,
} from '@solana/kit';
import { Dex, JupService, Kamino, KSWAP_BASE_API, MeteoraService, OrcaService, RaydiumService } from '../src';
import { getTokensPrices } from '../src/services/kSwap';

async function main() {
  const cluster = 'mainnet-beta';
  const rpcUrl: string = 'https://kamino.rpcpool.com/c081b4d9-33ec-4f10-8ff4-c49ecdb6ab52';
  const wsUrl: string = 'wss://kamino.rpcpool.com/c081b4d9-33ec-4f10-8ff4-c49ecdb6ab52';

  const api = createSolanaRpcApi<SolanaRpcApi>({ ...DEFAULT_RPC_CONFIG, defaultCommitment: 'processed' });
  const rpc = createRpc({ api, transport: createDefaultRpcTransport({ url: rpcUrl }) });
  const ws = createSolanaRpcSubscriptions(wsUrl);

  const c = { rpc, wsRpc: ws };

  const kamino = new Kamino(cluster, c.rpc);

  // const prices = await kamino.getAllPrices();
  // console.log('prices', Object.keys(prices.spot).length);

  const owner = await kamino.getAccountOwner(address('7ZCprpjnnovdYFMbMJs2U2QDG5VZKwccstuMTQtsc8UK'));
  console.log('owner', owner);

  // const raydiumRange = await kamino.getPositionRange('RAYDIUM', address("FvTFJw2EGeXj3QTdRfvTESdSBTVMm4D52Y8EvCQHvMu8"), 6, 6);
  // console.log("raydiumRange", raydiumRange);

  // const orcaRange = await kamino.getPositionRange('ORCA', address("7Ci6yo2FQuXqf1PYbA7hqaipuv8ds7wkQWFUT7D93UWy"), 6, 6);
  // console.log("orcaRange", orcaRange);

  // const meteoraRange = await kamino.getPositionRange('METEORA', address("B6y3FCxor4fU7RjNQWVGUZBCbp9q1H5tMukvJBqkBvYH"), 6, 6);
  // console.log("meteoraRange", meteoraRange);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// // import {
// //   address,
// //   createDefaultRpcTransport,
// //   createRpc,
// //   createSolanaRpcApi,
// //   createSolanaRpcSubscriptions,
// //   DEFAULT_RPC_CONFIG,
// //   SolanaRpcApi,
// // } from '@solana/kit';

// // import {
// //   sqrtPriceToPrice as orcaSqrtPriceToPrice,
// //   getTickArrayStartTickIndex as orcaGetTickArrayStartTickIndex,
// //   priceToTickIndex as orcaPriceToTickIndex,
// //   IncreaseLiquidityQuote,
// //   sqrtPriceToPrice,
// //   tickIndexToPrice as orcaTickIndexToPrice,
// // } from '@orca-so/whirlpools-core';
// // export const KaminoProgramIdMainnet = address('6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc');

// export const GlobalConfigMainnet = new PublicKey('GKnHiWh3RRrE1zsNzWxRkomymHc374TvJPSTv2wPeYdB');
// // export const kliquidityProgramId = address('E6qbhrt4pFmCotNUSSEh6E5cRQCEJpMcd79Z56EG9KY');

// async function main() {
//   const cluster = 'mainnet-beta';
//   const rpcUrl: string = 'https://kamino.rpcpool.com/c081b4d9-33ec-4f10-8ff4-c49ecdb6ab52';
//   // const wsUrl: string = 'wss://kamino.rpcpool.com/c081b4d9-33ec-4f10-8ff4-c49ecdb6ab52';

//   // const api = createSolanaRpcApi<SolanaRpcApi>({ ...DEFAULT_RPC_CONFIG, defaultCommitment: 'processed' });
//   // const rpc = createRpc({ api, transport: createDefaultRpcTransport({ url: rpcUrl }) });
//   // const ws = createSolanaRpcSubscriptions(wsUrl);

//   // const c = { rpc, wsRpc: ws };

//   const legacyConnection = new Connection(rpcUrl, 'processed');

//   const kamino = new Kamino(
//     cluster,
//     legacyConnection,
//     GlobalConfigMainnet,
//     new PublicKey('6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc')
//   );

//   // const addresses = [new PublicKey('6evbrCcpyvMHmZZndyAEZs1v5NtZYqT9gkWsgA9iz4es'), new PublicKey('9xe6UH95osJvrYoQkJRiG2DcczzzSwSy5JsB9ZvrDagK'), new PublicKey('9qTHAiFD85EpTodEX7DnXgbVTzsPab6Njiy29hSoWYyR')]
//   const addresses = [new PublicKey('Aj7o7RrGtpmHDKUvqeDpU33CXpvSbwBfEd7emZUr8DYY')];
//   const shareData = await kamino.getStrategiesShareData(addresses);
//   console.log('shareData', shareData[0]!.shareData.balance.computedHoldings.invested);
//   // }
//   // const shareData = await kamino.getStrategySharePrice(new PublicKey('H8h7ZyS5qJR2cwLxvZQdPaNzLik17cRxB5pDvjdXeuBg'));
//   // console.log('shareData', shareData);

//   // const rebalanceParams = await kamino.readRebalancingParamsFromChain(
//   //   new PublicKey('H8h7ZyS5qJR2cwLxvZQdPaNzLik17cRxB5pDvjdXeuBg')
//   // );
//   // console.log('rebalanceParams', rebalanceParams);

//   // const price = await JupService.getPrice("KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
//   // console.log('price', price);

//   // const prices = await JupService.getPrices(["KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"], "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
//   // console.log('prices', prices);

//   // const raydiumService = new RaydiumService(c.rpc);
//   // // const poolInfo = await raydiumService.getRaydiumPoolInfoFromAPI(
//   // //   address('3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv')
//   // // );

//   // const legacyPoolInfo = await raydiumService.getRaydiumPoolInfo(
//   //   address('3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv')
//   // );
//   // console.log('legacyPoolInfo', legacyPoolInfo);
//   // console.log('poolInfo', poolInfo);

//   // const meteoraPools = await kamino.getMeteoraPools();
//   // console.log('meteoraPools', meteoraPools);

//   // const meteoraService = new MeteoraService(c.rpc);
//   // const meteoraPools = await meteoraService.getMeteoraPoolsFromAPI();
//   // console.log(`Successfully fetched ${meteoraPools.length} Meteora pools from API`);

//   // Example: Log first few pools
//   // console.log(
//   //   'Sample pools:',
//   //   meteoraPools.slice(0, 3).map((p) => ({
//   //     address: p.address,
//   //     name: p.name,
//   //     mint_x: p.mint_x,
//   //     mint_y: p.mint_y,
//   //     base_fee_percentage: p.base_fee_percentage,
//   //   }))
//   // );

//   // const orcaService = new OrcaService(c.rpc, kamino.getLegacyConnection());
//   // orcaService.getOrcaWhirlpools

//   // // const raydiumStrat = address('4TQ1DZtibQuy5ux33fcZprUmLcLoAdSNfwaUukc9kdXP');
//   // // const aprApy = await kamino.getStrategyAprApy(raydiumStrat);
//   // // console.log('aprApy', aprApy);

//   // // const kaminoStrat = address('2AXogHv1qD5dRfxWzWYijxsen2PgpnyziCwRYAWtBLv8');
//   // // const maxDepositInUSD = await kamino.getStrategyCurrentWithdrawalCaps(kaminoStrat);
//   // // console.log('maxDepositInUSD', maxDepositInUSD);

//   // // const kaminoStrat = address('2AXogHv1qD5dRfxWzWYijxsen2PgpnyziCwRYAWtBLv8');
//   // // const poolInfo = await kamino.getGenericPoolInfo('ORCA', address('H6gUYo94dMyhaT4Zm94DRSuH931atRcdAVdMCu3aAwze'));
//   // // console.log('poolInfo', poolInfo);

//   // const aprApy = await kamino.getStrategyAprApy(address('7qwUjxLqLu6sLMYThaF6CC92XkqqdxMHYhZdVtGkefX5'));
//   // console.log('aprApy', aprApy);

//   // // kamino._orcaService.getStrategyWhirlpoolPoolAprApy(address('68soqftZg4HL1Dcis5hMgkLKU9qyC8qbn5JzLhrxhgi9'))

//   // // const orcaWhirlpools = await kamino.getAllWhirlpoolsFromAPI([address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'), ]);
//   // // console.log('orcaWhirlpools', orcaWhirlpools.length);

//   // // const orcaWhirlpool = await kamino._orcaService.getOrcaWhirlpool(address('68soqftZg4HL1Dcis5hMgkLKU9qyC8qbn5JzLhrxhgi9'));
//   // console.log('orcaWhirlpool', orcaWhirlpool);

//   const priceLower = new Decimal(0.97);
//   const priceUpper = new Decimal(1.03);
//   const decimalsA = 6;
//   const decimalsB = 6;
//   const tickSpacing = 1;
//   // const priceToTickIndexLower = priceToTickIndex(priceLower, decimalsA, decimalsB);
//   // const priceToTickIndexUpper = priceToTickIndex(priceUpper, decimalsA, decimalsB);
//   // const tickLowerIndex = getNextValidTickIndex(priceToTickIndexLower, tickSpacing);
//   // const tickUpperIndex = getNextValidTickIndex(priceToTickIndexUpper, tickSpacing);
//   // const startTickIndex = getStartTickIndex(tickLowerIndex, tickSpacing, 0);
//   // const endTickIndex = getStartTickIndex(tickUpperIndex, tickSpacing, 0);

//   // const priceToTickIndexLower = orcaPriceToTickIndex(priceLower.toNumber(), decimalsA, decimalsB);
//   // const priceToTickIndexUpper = orcaPriceToTickIndex(priceUpper.toNumber(), decimalsA, decimalsB);
//   // const tickLowerIndex = orcaGetTickArrayStartTickIndex(priceToTickIndexLower, tickSpacing);
//   // const tickUpperIndex = orcaGetTickArrayStartTickIndex(priceToTickIndexUpper, tickSpacing);

//   // console.log('priceToTickIndexLower', priceToTickIndexLower);
//   // console.log('priceToTickIndexUpper', priceToTickIndexUpper);
//   // console.log('tickLowerIndex', tickLowerIndex);
//   // console.log('tickUpperIndex', tickUpperIndex);
//   // console.log('startTickIndex', startTickIndex);
//   // console.log('endTickIndex', endTickIndex);
// }

// main().catch(console.error);
