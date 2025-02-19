import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  createAddExtraComputeUnitsIx,
  getAssociatedTokenAddressAndData,
  Kamino,
  OrcaService,
  RaydiumService,
  sendTransactionWithLogs,
  sleep,
  StrategiesFilters,
  U64_MAX,
} from '../src';
import Decimal from 'decimal.js';
import { createTransactionWithExtraBudget } from '../src';
import {
  balance,
  GlobalConfigMainnet,
  GlobalConfigStaging,
  KaminoProgramIdMainnet,
  KaminoProgramIdStaging,
  SOLMintMainnet,
  toJson,
  updateStrategyConfig,
  USDCMintMainnet,
} from './utils';
import { UpdateRebalanceType } from '../src/kamino-client/types/StrategyConfigOption';
import { expect } from 'chai';
import { WHIRLPOOL_PROGRAM_ID } from '../src/whirlpools-client/programId';
import { PROGRAM_ID as RAYDIUM_PROGRAM_ID } from '../src/raydium_client/programId';
import { Manual, PricePercentage, PricePercentageWithReset } from '../src/kamino-client/types/RebalanceType';
import { createWsolAtaIfMissing, getComputeBudgetAndPriorityFeeIxns } from '../src/utils/transactions';
import { JupService } from '../src/services/JupService';
import { STAGING_GLOBAL_CONFIG, STAGING_KAMINO_PROGRAM_ID } from '../src/constants/pubkeys';
import { METEORA_PROGRAM_ID } from '../src/meteora_client/programId';

describe.skip('Kamino strategy creation SDK Tests', () => {
  const cluster = 'mainnet-beta';

  const clusterUrl: string = 'https://api.mainnet-beta.solana.com';

  const connection = new Connection(clusterUrl, 'processed');

  // use your private key here
  // const signerPrivateKey = [];
  // const signer = Keypair.fromSecretKey(Uint8Array.from(signerPrivateKey));
  const signer = Keypair.generate();

  it.skip('read raydium clmm APY', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const strategyState = await kamino.getStrategyByAddress(
      new PublicKey('4TQ1DZtibQuy5ux33fcZprUmLcLoAdSNfwaUukc9kdXP')
    );
    const raydiumService = new RaydiumService(connection);
    const aprApy = await raydiumService.getStrategyWhirlpoolPoolAprApy(strategyState!);
    console.log('aprApy', aprApy);

    const second = await raydiumService.getRaydiumPositionAprApy(new PublicKey('8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj'), new Decimal(180.0), new Decimal(250.0));
    console.log('second', second);
  });

  it.skip('read multiple prices', async () => {
    const prices = await JupService.getPrices(
      [
        'So11111111111111111111111111111111111111112',
        'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
        'J39SiMc21133mMNZ5K46Z4ZwFa2oQrKHBh8iujqckdxN',
      ],
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    );

    const keys = prices.keys();
    for (const key of keys) {
      console.log('price', key.toString(), prices.get(key));
    }
  });

  it.skip('get quote', async () => {
    const solQuote = await JupService.getBestRouteQuoteV6(new Decimal(100000.0), SOLMintMainnet, USDCMintMainnet, 50);
    console.log('solQuote', solQuote);

    const testMint = new PublicKey('DVYcTNFVGxePLgK8rUjViJvurRmTnD1FZUBR7puADymT');
    const testQuote = await JupService.getBestRouteQuoteV6(new Decimal(100.0), testMint, USDCMintMainnet, 50);
    console.log('testQuote', testQuote);
  });

  it.skip('read all strat', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const filters: StrategiesFilters = { isCommunity: false };
    await kamino.getStrategiesShareData(filters);
  });

  it.skip('read prices', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const res = await kamino.getDisabledTokensPrices();
    console.log('res', res);
  });

  it.skip('withdraw topup vault', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const upkeepIxn = await kamino.withdrawTopupVault(
      new PublicKey('HzZH5jHVUPsw3qawUcQXG1SZJqNom3gt94eFHCWhq1KF'),
      new Decimal(U64_MAX)
    );

    const ixs: TransactionInstruction[] = [upkeepIxn];
    console.log('ixs', ixs.length);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([signer]);
    //@ts-ignore
    const txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);
  });

  it('read generic pool Meteora', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const poolInfo = await kamino.getGenericPoolInfo(
      'METEORA',
      new PublicKey('FoSDw2L5DmTuQTFe55gWPDXf88euaxAEKFre74CnvQbX')
    );
    console.log('poolInfo', poolInfo);
  });

  it('read pending fees for Orca strategy', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const strategy = new PublicKey('8DRToyNBUTR4MxqkKAP49s9z1JhotQWy3rMQKEw1HHdu');
    const pendingFees = await kamino.getPendingFees([strategy]);
    console.log('pending fees', pendingFees);
  });

  it('read pending fees for Raydium strategy', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const strategy = new PublicKey('5QgwaBQzzMAHdxpaVUgb4KrpXELgNTaEYXycUvNvRxr6');
    const pendingFees = await kamino.getPendingFees([strategy]);
    console.log('pending fees', pendingFees);
  });

  it('read pending fees for Meteora strategy', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const strategy = new PublicKey('HBuYwvq67VKnLyKxPzDjzskyRMk7ps39gwHdvaPGwdmQ');
    const pendingFees = await kamino.getPendingFees([strategy]);
    console.log('pending fees', pendingFees);
  });

  it('read share data', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    let data = await kamino.getStrategyShareData(new PublicKey('HBZRKiRX88gpoBgZxNtnWHk5bPcbCM3ociEPWNS131cK'));
    console.log('data for GrsqRMeKdwXxTLv4QKVeL1qMhHqKqjo3ZabuNwFQAzNi', data);
    data = await kamino.getStrategyShareData(new PublicKey('HBZRKiRX88gpoBgZxNtnWHk5bPcbCM3ociEPWNS131cK'));
    console.log('data for GrsqRMeKdwXxTLv4QKVeL1qMhHqKqjo3ZabuNwFQAzNi', data);
    data = await kamino.getStrategyShareData(new PublicKey('HBZRKiRX88gpoBgZxNtnWHk5bPcbCM3ociEPWNS131cK'));
    console.log('data for 2scuULh4EZbMHCEUZde4VycQG6EvTWc2trGgRfSaTLvZ', data);
  });

  it('read empty strat Meteora', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigStaging,
      KaminoProgramIdStaging,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const stratPubkey = new PublicKey('FNk2SdoM6TcUWrDLdmxF8p1kUocGoroW7gmC2nyVhNXj');

    const strategyState = await kamino.getStrategyByAddress(stratPubkey);
    if (!strategyState) {
      throw new Error('strategy not found');
    }
    const strategyWithAddress = { address: stratPubkey, strategy: strategyState };

    console.log('strat', strategyState);

    const amounts = await kamino.calculateDepostAmountsDollarBased(stratPubkey, new Decimal(0.01));
    console.log('amounts ', amounts[0].toString(), amounts[1].toString());

    const sharePrice = await kamino.getStrategySharePrice(stratPubkey);
    console.log('sharePrice', sharePrice.toString());

    const solToDeposit = new Decimal(0.01);
    const usdcToDeposit = new Decimal(2.0);

    let depositIx: TransactionInstruction;
    if (strategyState.tokenAMint.equals(SOLMintMainnet)) {
      depositIx = await kamino.deposit(strategyWithAddress, solToDeposit, usdcToDeposit, signer.publicKey);
    } else {
      depositIx = await kamino.deposit(strategyWithAddress, usdcToDeposit, solToDeposit, signer.publicKey);
    }

    const [sharesAta, sharesMintData] = await getAssociatedTokenAddressAndData(
      connection,
      strategyState.sharesMint,
      signer.publicKey
    );
    const [tokenAAta, tokenAData] = await getAssociatedTokenAddressAndData(
      connection,
      strategyState.tokenAMint,
      signer.publicKey
    );
    const [tokenBAta, tokenBData] = await getAssociatedTokenAddressAndData(
      connection,
      strategyState.tokenBMint,
      signer.publicKey
    );

    const ataInstructions = await kamino.getCreateAssociatedTokenAccountInstructionsIfNotExist(
      signer.publicKey,
      strategyWithAddress,
      tokenAData,
      tokenAAta,
      tokenBData,
      tokenBAta,
      sharesMintData,
      sharesAta
    );

    const increaseBudgetIx = createAddExtraComputeUnitsIx(1_000_000);
    const depositTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [increaseBudgetIx, ...ataInstructions, depositIx],
      [strategyState.strategyLookupTable]
    );
    const depositTransactionV0 = new VersionedTransaction(depositTx);
    depositTransactionV0.sign([signer]);
    //@ts-ignore
    const txHash = await sendAndConfirmTransaction(kamino._connection, depositTransactionV0, { skipPreflight: true });
    console.log('deposit tx hash', txHash);
  });

  it('deposit WIF-SOL Meteora', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      STAGING_GLOBAL_CONFIG,
      STAGING_KAMINO_PROGRAM_ID,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const strategyPubkey = new PublicKey('97nwDqK1DAjDw2CKiou3bantTj8DwpPGVJBukpzEwVnk');
    const strategyState = await kamino.getStrategyByAddress(strategyPubkey);
    if (!strategyState) {
      throw new Error('strategy not found');
    }
    const strategyWithAddress = { address: strategyPubkey, strategy: strategyState };

    const solToDeposit = new Decimal(0.01);
    const wifToDeposit = new Decimal(10.0);

    let depositIx: TransactionInstruction;
    if (strategyState.tokenAMint.equals(SOLMintMainnet)) {
      depositIx = await kamino.deposit(strategyWithAddress, solToDeposit, wifToDeposit, signer.publicKey);
    } else {
      depositIx = await kamino.deposit(strategyWithAddress, wifToDeposit, solToDeposit, signer.publicKey);
    }

    const [sharesAta, sharesMintData] = await getAssociatedTokenAddressAndData(
      connection,
      strategyState.sharesMint,
      signer.publicKey
    );
    const [tokenAAta, tokenAData] = await getAssociatedTokenAddressAndData(
      connection,
      strategyState.tokenAMint,
      signer.publicKey
    );
    const [tokenBAta, tokenBData] = await getAssociatedTokenAddressAndData(
      connection,
      strategyState.tokenBMint,
      signer.publicKey
    );

    const ataInstructions = await kamino.getCreateAssociatedTokenAccountInstructionsIfNotExist(
      signer.publicKey,
      strategyWithAddress,
      tokenAData,
      tokenAAta,
      tokenBData,
      tokenBAta,
      sharesMintData,
      sharesAta
    );

    const increaseBudgetIx = createAddExtraComputeUnitsIx(1_000_000);
    const depositTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [increaseBudgetIx, ...ataInstructions, depositIx],
      [strategyState.strategyLookupTable]
    );
    const depositTransactionV0 = new VersionedTransaction(depositTx);
    depositTransactionV0.sign([signer]);
    //@ts-ignore
    const txHash = await sendAndConfirmTransaction(kamino._connection, depositTransactionV0, { skipPreflight: true });
    console.log('deposit tx hash', txHash);
  });

  it('read all pools for tokens Meteora', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const pools = await kamino.getMeteoraPoolsForTokens(
      new PublicKey('So11111111111111111111111111111111111111112'),
      new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    );
    console.log('pools', pools.length);
    console.log('pools', pools[0].key.toString());
    console.log('pools', pools[1].key.toString());
  });

  it('read pool price Meteora', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const price = await kamino.getMeteoraPoolPrice(new PublicKey('FoSDw2L5DmTuQTFe55gWPDXf88euaxAEKFre74CnvQbX'));
    console.log('pool price', price);
  });

  it('create Kamino staging', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      STAGING_GLOBAL_CONFIG,
      STAGING_KAMINO_PROGRAM_ID,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const globalConfig = kamino.getGlobalConfig();
    expect(globalConfig.equals(STAGING_GLOBAL_CONFIG)).to.be.true;
  });

  it('both sides deposit in Meteora strategy', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      STAGING_GLOBAL_CONFIG,
      STAGING_KAMINO_PROGRAM_ID,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const strategy = new PublicKey('6cM3MGNaJBfpBQy1P9oiZkDDzcWgSxjMaj6iWtz8ydSk');
    const amountAToDeposit = new Decimal(0.01);
    const amountBToDeposit = new Decimal(1.0);

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const depositIx = await kamino.deposit(
      { strategy: strategyState!, address: strategy },
      amountAToDeposit,
      amountBToDeposit,
      signer.publicKey
    );
    console.log('depositIxs', depositIx);

    const [sharesAta, sharesMintData] = await getAssociatedTokenAddressAndData(
      connection,
      strategyState.sharesMint,
      signer.publicKey
    );
    const [tokenAAta, tokenAData] = await getAssociatedTokenAddressAndData(
      connection,
      strategyState.tokenAMint,
      signer.publicKey
    );
    const [tokenBAta, tokenBData] = await getAssociatedTokenAddressAndData(
      connection,
      strategyState.tokenBMint,
      signer.publicKey
    );

    const strategyWithAddres = { address: strategy, strategy: strategyState };
    const ataInstructions = await kamino.getCreateAssociatedTokenAccountInstructionsIfNotExist(
      signer.publicKey,
      strategyWithAddres,
      tokenAData,
      tokenAAta,
      tokenBData,
      tokenBAta,
      sharesMintData,
      sharesAta
    );

    const increaseBudgetIx = createAddExtraComputeUnitsIx(1_000_000);
    const depositTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [increaseBudgetIx, ...ataInstructions, depositIx],
      [strategyState.strategyLookupTable]
    );
    const depositTransactionV0 = new VersionedTransaction(depositTx);
    depositTransactionV0.sign([signer]);
    //@ts-ignore
    const txHash = await sendAndConfirmTransaction(kamino._connection, depositTransactionV0, { skipPreflight: true });
    console.log('deposit tx hash', txHash);
  });

  it('single sided deposit in Meteora strategy', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      STAGING_GLOBAL_CONFIG,
      STAGING_KAMINO_PROGRAM_ID,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const strategy = new PublicKey('6cM3MGNaJBfpBQy1P9oiZkDDzcWgSxjMaj6iWtz8ydSk');
    const amountToDeposit = new Decimal(5.0);

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const depositIx = await kamino.singleSidedDepositTokenB(
      { strategy: strategyState!, address: strategy },
      amountToDeposit,
      signer.publicKey,
      new Decimal(500)
    );

    const [sharesAta, sharesMintData] = await getAssociatedTokenAddressAndData(
      connection,
      strategyState.sharesMint,
      signer.publicKey
    );
    const [tokenAAta, tokenAData] = await getAssociatedTokenAddressAndData(
      connection,
      strategyState.tokenAMint,
      signer.publicKey
    );
    const [tokenBAta, tokenBData] = await getAssociatedTokenAddressAndData(
      connection,
      strategyState.tokenBMint,
      signer.publicKey
    );

    const strategyWithAddres = { address: strategy, strategy: strategyState };
    await kamino.getCreateAssociatedTokenAccountInstructionsIfNotExist(
      signer.publicKey,
      strategyWithAddres,
      tokenAData,
      tokenAAta,
      tokenBData,
      tokenBAta,
      sharesMintData,
      sharesAta
    );

    const increaseBudgetIx = createAddExtraComputeUnitsIx(1_400_000);
    const depositTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [increaseBudgetIx, ...depositIx.instructions],
      [strategyState.strategyLookupTable, ...depositIx.lookupTablesAddresses]
    );
    const depositTransactionV0 = new VersionedTransaction(depositTx);
    depositTransactionV0.sign([signer]);
    //@ts-ignore
    const txHash = await sendAndConfirmTransaction(kamino._connection, depositTransactionV0);
    // let txHash = await sendAndConfirmTransaction(kamino._connection, depositTransactionV0, { skipPreflight: true });
    console.log('deposit tx hash', txHash);
  });

  it('calculate amounts', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      STAGING_GLOBAL_CONFIG,
      STAGING_KAMINO_PROGRAM_ID,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );
    const amounts = await kamino.calculateAmountsToBeDepositedWithSwap(
      new PublicKey('Cfuy5T6osdazUeLego5LFycBQebm9PP3H7VNdCndXXEN'),
      new Decimal(0),
      new Decimal(400)
    );

    const holdings = await kamino.getStrategyTokensHoldings(
      new PublicKey('Cfuy5T6osdazUeLego5LFycBQebm9PP3H7VNdCndXXEN')
    );

    console.log('amounts', amounts);
    console.log('holdings', holdings);
  });

  it.skip('readWhirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const res = await kamino.getStrategiesShareData([
      new PublicKey('DWkn7bbqAjYeu4U84iQHTbKT9fBEBZwpTSLondcp6dpd'),
      new PublicKey('B8CLmUAErBALZWwD16xUvWWxGDmH6BJBrQRqXUBVEhYN'),
    ]);
    console.log('res', res);
  });

  it.skip('get pools for Raydium SOL-USDC pair', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const pool = await kamino.getPoolInitializedForDexPairTier(
      'RAYDIUM',
      new PublicKey('So11111111111111111111111111111111111111112'),
      new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      new Decimal(5)
    );

    console.log('pools', pool.toString());
  });

  it.skip('get pools for Orca SOL-USDC pair', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const pool = await kamino.getPoolInitializedForDexPairTier(
      'RAYDIUM',
      new PublicKey('So11111111111111111111111111111111111111112'),
      new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      new Decimal(1)
    );

    console.log('orca pools', pool.toString());
  });

  it.skip('getExistentPoolsForPair Raydium for SOL-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const pools = await kamino.getExistentPoolsForPair(
      'RAYDIUM',
      new PublicKey('So11111111111111111111111111111111111111112'),
      new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    );

    console.log('Raydium pools', pools);
  });

  it.skip('getExistentPoolsForPair ORCA for USDH-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const pools = await kamino.getExistentPoolsForPair(
      'ORCA',
      new PublicKey('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX'),
      new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    );

    console.log('Orca pools', pools);
  });

  it.skip('build strategy IX for Raydium SOL-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    const newPosition = Keypair.generate();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'RAYDIUM',
      new Decimal('5'),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(Manual.discriminator),
      [new Decimal(18.0), new Decimal(21.0)],
      new PublicKey('So11111111111111111111111111111111111111112'),
      new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    console.log('ixs', ixs.length);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

    const setupStratTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx],
      [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]
    );
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);
    console.log('updateRewardMappingIxs', updateRewardMappingIxs.length);

    for (const ix of updateRewardMappingIxs) {
      const updateRewardMappingTx = await kamino.getTransactionV2Message(
        signer.publicKey,
        [ix[0]],
        [strategyLookupTable]
      );
      const updateRewardMappingsTransactionV0 = new VersionedTransaction(updateRewardMappingTx);
      updateRewardMappingsTransactionV0.sign([signer, ix[1]]);
      //@ts-ignore
      txHash = await sendAndConfirmTransaction(kamino._connection, updateRewardMappingsTransactionV0);
      console.log('setup strategy reward mapping', txHash);
    }
  });

  it.skip('build strategy IX for Raydium SOL-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    const newPosition = Keypair.generate();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'RAYDIUM',
      new Decimal('0.0005'),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(Manual.discriminator),
      [new Decimal(18.0), new Decimal(21.0)],
      new PublicKey('So11111111111111111111111111111111111111112'),
      new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    console.log('ixs', ixs.length);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

    const setupStratTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx],
      [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]
    );
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);
    console.log('updateRewardMappingIxs', updateRewardMappingIxs.length);

    for (const ix of updateRewardMappingIxs) {
      const updateRewardMappingTx = await kamino.getTransactionV2Message(signer.publicKey, [ix[0]]);
      const updateRewardMappingsTransactionV0 = new VersionedTransaction(updateRewardMappingTx);
      updateRewardMappingsTransactionV0.sign([signer, ix[1]]);
      //@ts-ignore
      txHash = await sendAndConfirmTransaction(kamino._connection, updateRewardMappingsTransactionV0);
      console.log('setup strategy reward mapping', txHash);
    }
  });

  it.skip('create custom USDC-USDH new manual strategy on existing whirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    const newPosition = Keypair.generate();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(1),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(Manual.discriminator),
      [], // not needed used for manual
      new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      new PublicKey('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX')
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);

    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

    const setupStratTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx],
      [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]
    );
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);

    for (const ix of updateRewardMappingIxs) {
      const updateRewardMappingTx = await kamino.getTransactionV2Message(signer.publicKey, [ix[0]]);
      const updateRewardMappingsTransactionV0 = new VersionedTransaction(updateRewardMappingTx);
      updateRewardMappingsTransactionV0.sign([signer, ix[1]]);
      //@ts-ignore
      txHash = await sendAndConfirmTransaction(kamino._connection, updateRewardMappingsTransactionV0);
      console.log('update reward mappings tx hash', txHash);
    }
  });

  it.skip('create new manual strategy on existing whirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    const newPosition = Keypair.generate();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(5),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(Manual.discriminator),
      [], // not needed used for manual
      SOLMintMainnet,
      USDCMintMainnet
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

    const setupStratTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx],
      [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]
    );
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);

    for (const ix of updateRewardMappingIxs) {
      const updateRewardMappingTx = await kamino.getTransactionV2Message(signer.publicKey, [ix[0]]);
      const updateRewardMappingsTransactionV0 = new VersionedTransaction(updateRewardMappingTx);
      updateRewardMappingsTransactionV0.sign([signer, ix[1]]);
      //@ts-ignore
      txHash = await sendAndConfirmTransaction(kamino._connection, updateRewardMappingsTransactionV0);
      console.log('update reward mappings tx hash', txHash);
    }
  });

  it.skip('create new percentage strategy on existing whirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    const newPosition = Keypair.generate();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(5),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(PricePercentage.discriminator),
      [new Decimal(100.0), new Decimal(100.0)],
      SOLMintMainnet,
      USDCMintMainnet
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

    const setupStratTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx],
      [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]
    );
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);

    for (const ix of updateRewardMappingIxs) {
      const updateRewardMappingTx = await kamino.getTransactionV2Message(signer.publicKey, [ix[0]]);
      const updateRewardMappingsTransactionV0 = new VersionedTransaction(updateRewardMappingTx);
      updateRewardMappingsTransactionV0.sign([signer]);
      //@ts-ignore
      txHash = await sendAndConfirmTransaction(kamino._connection, updateRewardMappingsTransactionV0);
      console.log('update reward mappings tx hash', txHash);
    }
  });

  it.skip('create custom USDC-USDH new percentage strategy on existing whirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    const newPosition = Keypair.generate();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(1),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(Manual.discriminator),
      [], // not needed used for manual
      new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      new PublicKey('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX')
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

    const setupStratTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx],
      [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]
    );
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);

    for (const ix of updateRewardMappingIxs) {
      const updateRewardMappingTx = await kamino.getTransactionV2Message(signer.publicKey, [ix[0]]);
      const updateRewardMappingsTransactionV0 = new VersionedTransaction(updateRewardMappingTx);
      updateRewardMappingsTransactionV0.sign([signer, ix[1]]);
      //@ts-ignore
      txHash = await sendAndConfirmTransaction(kamino._connection, updateRewardMappingsTransactionV0);
      console.log('update reward mappings tx hash', txHash);
    }
  });

  it.skip('create new percentage strategy on existing whirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    const newPosition = Keypair.generate();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(5),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(PricePercentage.discriminator),
      [new Decimal(100.0), new Decimal(100.0)],
      SOLMintMainnet,
      USDCMintMainnet
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

    const setupStratTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx],
      [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]
    );
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);

    for (const ix of updateRewardMappingIxs) {
      const updateRewardMappingTx = await kamino.getTransactionV2Message(signer.publicKey, [ix[0]]);
      const updateRewardMappingsTransactionV0 = new VersionedTransaction(updateRewardMappingTx);
      updateRewardMappingsTransactionV0.sign([signer, ix[1]]);
      //@ts-ignore
      txHash = await sendAndConfirmTransaction(kamino._connection, updateRewardMappingsTransactionV0);
      console.log('update reward mappings tx hash', txHash);
    }

    // update rebalance params
    const updateRebalanceParamsIx = await kamino.getUpdateRebalancingParmsIxns(
      signer.publicKey,
      newStrategy.publicKey,
      [new Decimal(10.0), new Decimal(24.0)]
    );
    const tx = createTransactionWithExtraBudget();
    tx.add(updateRebalanceParamsIx);
    const updateRebalanceParamsTxHash = await sendTransactionWithLogs(connection, tx, signer.publicKey, [signer]);
    console.log('update Rebalance Params Tx Hash ', updateRebalanceParamsTxHash);

    let strategyData = await kamino.getStrategies([newStrategy.publicKey]);
    expect(strategyData[0]?.rebalanceRaw.params[0] == 10.0);
    expect(strategyData[0]?.rebalanceRaw.params[2] == 24.0);

    // update rebalance method to manual
    await updateStrategyConfig(
      connection,
      signer,
      newStrategy.publicKey,
      new UpdateRebalanceType(),
      new Decimal(Manual.discriminator)
    );

    strategyData = await kamino.getStrategies([newStrategy.publicKey]);
    expect(strategyData[0]?.rebalanceType == Manual.discriminator);
  });

  it.skip('get raydium pool liquidity distribution', async () => {
    const raydiumService = new RaydiumService(connection);
    const liquidityDistribution = await raydiumService.getRaydiumPoolLiquidityDistribution(
      new PublicKey('2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv')
    );

    console.log('raydium liquidityDistribution', liquidityDistribution);
  });

  it.skip('get raydium pool liquidity distribution with range', async () => {
    const raydiumService = new RaydiumService(connection);
    const liquidityDistribution = await raydiumService.getRaydiumPoolLiquidityDistribution(
      new PublicKey('2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv'),
      true,
      -39470,
      -37360
    );

    console.log('raydium liquidityDistribution', liquidityDistribution);
  });

  it.skip('get raydium pool liquidity distribution with range inverse order', async () => {
    const raydiumService = new RaydiumService(connection);
    const liquidityDistribution = await raydiumService.getRaydiumPoolLiquidityDistribution(
      new PublicKey('2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv'),
      false,
      -39470,
      -37360
    );

    console.log('raydium liquidityDistribution', liquidityDistribution);
  });

  it.skip('get raydium positions for live pool', async () => {
    const raydiumService = new RaydiumService(connection);
    const liquidityDistribution = await raydiumService.getRaydiumPoolLiquidityDistribution(
      new PublicKey('61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht')
    );

    console.log('raydium liquidityDistribution', liquidityDistribution);
  });

  it.skip('get orca pool liquidity distribution', async () => {
    const orcaService = new OrcaService(connection, cluster);
    const liquidityDistribution = await orcaService.getWhirlpoolLiquidityDistribution(
      new PublicKey('7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm')
    );

    console.log('orca liquidityDistribution', liquidityDistribution);
  });

  it.skip('get orca positions for pool', async () => {
    const orcaService = new OrcaService(connection, cluster);
    const positionsCount = await orcaService.getPositionsCountByPool(
      new PublicKey('7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm')
    );

    console.log('orca positions count', positionsCount);
  });

  it.skip('get raydium positions for pool', async () => {
    const raydiumService = new RaydiumService(connection);
    const positionsCount = await raydiumService.getPositionsCountByPool(
      new PublicKey('2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv')
    );

    console.log('raydium positions count', positionsCount);
  });

  it.skip('create new custom USDC-USDH percentage strategy on existing whirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    const newPosition = Keypair.generate();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(1),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(Manual.discriminator),
      [], // not needed used for manual
      new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      new PublicKey('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX')
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

    const setupStratTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx],
      [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]
    );
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    // update rebalance params
    const updateRebalanceParamsIx = await kamino.getUpdateRebalancingParmsIxns(
      signer.publicKey,
      newStrategy.publicKey,
      [new Decimal(10.0), new Decimal(24.0)]
    );
    const tx = createTransactionWithExtraBudget();
    tx.add(updateRebalanceParamsIx);
    const updateRebalanceParamsTxHash = await sendTransactionWithLogs(connection, tx, signer.publicKey, [signer]);
    console.log('update Rebalance Params Tx Hash ', updateRebalanceParamsTxHash);

    let strategyData = await kamino.getStrategies([newStrategy.publicKey]);
    expect(strategyData[0]?.rebalanceRaw.params[0] == 10.0);
    expect(strategyData[0]?.rebalanceRaw.params[2] == 24.0);

    // update rebalance method to manual
    await updateStrategyConfig(
      connection,
      signer,
      newStrategy.publicKey,
      new UpdateRebalanceType(),
      new Decimal(Manual.discriminator)
    );

    strategyData = await kamino.getStrategies([newStrategy.publicKey]);
    expect(strategyData[0]?.rebalanceType == Manual.discriminator);
  });

  //test create as PricePercentageWithreset -> Update to Manual -> move back to PricePercentageWithReset diff range
  it.skip('create new custom USDC-USDH percentage with reset strategy -> change to manual -> change back to reset with range', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    const newPosition = Keypair.generate();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);

    const lowerPriceBpsDifference = new Decimal(10.0);
    const upperPriceBpsDifference = new Decimal(10.0);
    const lowerPriceResetRange = new Decimal(5.0);
    const upperPriceResetRange = new Decimal(30.0);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(1),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(PricePercentageWithReset.discriminator),
      [lowerPriceBpsDifference, upperPriceBpsDifference, lowerPriceResetRange, upperPriceResetRange],
      new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      new PublicKey('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX')
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

    const setupStratTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx],
      [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]
    );
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    // verify strategy rebalance params
    const strategyRebalanceParams = await kamino.readRebalancingParams(newStrategy.publicKey);
    expect(strategyRebalanceParams.find((x) => x.label == 'lowerRangeBps')!.value == lowerPriceBpsDifference);
    expect(strategyRebalanceParams.find((x) => x.label == 'upperRangeBps')!.value == upperPriceBpsDifference);
    expect(strategyRebalanceParams.find((x) => x.label == 'resetLowerRangeBps')!.value == lowerPriceResetRange);
    expect(strategyRebalanceParams.find((x) => x.label == 'resetUpperRangeBps')!.value == lowerPriceResetRange);

    // open position
    const openPositionIxns = buildNewStrategyIxs.openPositionIxs;
    const openPositionMessage = await kamino.getTransactionV2Message(signer.publicKey, openPositionIxns, [
      strategyLookupTable,
      ...(await kamino.getMainLookupTablePks()),
    ]);
    const openPositionTx = new VersionedTransaction(openPositionMessage);
    openPositionTx.sign([signer, newPosition]);

    //@ts-ignore
    const openPositionTxId = await sendAndConfirmTransaction(kamino._connection, openPositionTx);
    console.log('openPositionTxId', openPositionTxId);

    // read prices
    const pricesRebalanceParams = await kamino.readRebalancingParams(newStrategy.publicKey);
    console.log('pricesRebalanceParams', pricesRebalanceParams);
  });

  it.skip('test read rebalance params from existent percentageWithReset strategy', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const strat = new PublicKey('8RsjvJ9VoLNJb5veXzbyc7DKqvPG296oY2BsPnuxPTQ2');
    const pricesRebalanceParams = await kamino.readRebalancingParams(strat);
    console.log('pricesRebalanceParams', pricesRebalanceParams);
  });

  it.skip('create new custom USDC-USDH percentage strategy on existing whirlpool and open position', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    const newPosition = Keypair.generate();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const lowerPriceBpsDifference = new Decimal(10.0);
    const upperPriceBpsDifference = new Decimal(11.0);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(1),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(PricePercentage.discriminator),
      [lowerPriceBpsDifference, upperPriceBpsDifference],
      new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      new PublicKey('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX')
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    const txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

    const setupStratTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx],
      [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]
    );
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    // verify strategy rebalance params
    const strategyData = await kamino.getStrategies([newStrategy.publicKey]);
    expect(strategyData[0]?.rebalanceRaw.params[0].toString() == lowerPriceBpsDifference.toString());
    expect(strategyData[0]?.rebalanceRaw.params[2].toString() == upperPriceBpsDifference.toString());

    // open position
    const openPositionMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      buildNewStrategyIxs.openPositionIxs,
      [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]
    );
    const openPositionTx = new VersionedTransaction(openPositionMessage);
    openPositionTx.sign([signer, newPosition]);

    //@ts-ignore
    const openPositionTxId = await sendAndConfirmTransaction(kamino._connection, openPositionTx);
    console.log('openPositionTxId', openPositionTxId);
  });

  it.skip('create new custom SOL-BONK percentage strategy on existing whirlpool and open position', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    const newPosition = Keypair.generate();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const lowerPriceBpsDifference = new Decimal(100.0);
    const upperPriceBpsDifference = new Decimal(110.0);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(30),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(PricePercentage.discriminator),
      [lowerPriceBpsDifference, upperPriceBpsDifference],
      new PublicKey('So11111111111111111111111111111111111111112'),
      new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

    const setupStratTx = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx],
      [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]
    );
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    // verify strategy rebalance params
    const strategyData = await kamino.getStrategies([newStrategy.publicKey]);
    expect(strategyData[0]?.rebalanceRaw.params[0].toString() == lowerPriceBpsDifference.toString());
    expect(strategyData[0]?.rebalanceRaw.params[2].toString() == upperPriceBpsDifference.toString());

    // open position
    const openPositionMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      buildNewStrategyIxs.openPositionIxs
    );
    const openPositionTx = new VersionedTransaction(openPositionMessage);
    openPositionTx.sign([signer, newPosition]);

    //@ts-ignore
    const openPositionTxId = await sendAndConfirmTransaction(kamino._connection, openPositionTx);
    console.log('openPositionTxId', openPositionTxId);
  });

  it.skip('one click single sided deposit USDC in USDH-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    // let strategy = new PublicKey('Cfuy5T6osdazUeLego5LFycBQebm9PP3H7VNdCndXXEN');
    const strategy = new PublicKey('CEz5keL9hBCUbtVbmcwenthRMwmZLupxJ6YtYAgzp4ex');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(0.1);
    const slippageBps = new Decimal(10);

    let singleSidedDepositIxs: TransactionInstruction[] = [];
    const lookupTables: PublicKey[] = [strategyState.strategyLookupTable];

    await kamino.getInitialUserTokenBalances(
      signer.publicKey,
      strategyState.tokenAMint,
      strategyState.tokenBMint,
      undefined
    );

    // if USDC is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint == USDCMintMainnet) {
      const { instructions, lookupTablesAddresses } = await profiledFunctionExecution(
        kamino.singleSidedDepositTokenA(
          { strategy: strategyState!, address: strategy },
          amountToDeposit,
          signer.publicKey,
          slippageBps,
          profiledFunctionExecution,
          undefined,
          undefined // initialTokenBalances
        ),
        'singleSidedDepositTokenA'
      );
      singleSidedDepositIxs = instructions;
      lookupTables.push(...lookupTablesAddresses);
    } else {
      const { instructions, lookupTablesAddresses } = await profiledFunctionExecution(
        kamino.singleSidedDepositTokenB(
          { strategy: strategyState!, address: strategy },
          amountToDeposit,
          signer.publicKey,
          slippageBps,
          profiledFunctionExecution,
          undefined,
          undefined // initialTokenBalances
        ),
        'singleSidedDepositTokenB'
      );
      singleSidedDepositIxs = instructions;
      lookupTables.push(...lookupTablesAddresses);
    }

    const singleSidedDepositMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs],
      [...lookupTables, ...(await kamino.getMainLookupTablePks())]
    );
    const singleSidedDepositTx = new VersionedTransaction(singleSidedDepositMessage);
    singleSidedDepositTx.sign([signer]);

    try {
      //@ts-ignore
      // const depositTxId = await sendAndConfirmTransaction(kamino._connection, singleSidedDepositTx);
      const depositTxId = await kamino._connection.simulateTransaction(singleSidedDepositTx);
      console.log('singleSidedDepoxit tx hash', depositTxId);
    } catch (e) {
      console.log(e);
    }

    // const simulateTransaction = async (txn: VersionedTransaction, connection: Connection) => {
    //   const { blockhash } = await connection.getLatestBlockhash();
    //   return connection.simulateTransaction(txn);
    // };
  });

  it.skip('one click single sided deposit USDC in SOL-USDC strat', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const strategy = new PublicKey('CEz5keL9hBCUbtVbmcwenthRMwmZLupxJ6YtYAgzp4ex');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(1.0);
    const slippageBps = new Decimal(100);

    let singleSidedDepositIxs: TransactionInstruction[] = [];
    let lookupTables: PublicKey[] = [];
    // if USDC is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint.toString() === USDCMintMainnet.toString()) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    }

    const singleSidedDepositMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs],
      [...lookupTables, ...(await kamino.getMainLookupTablePks())]
    );
    const singleSidedDepositTx = new VersionedTransaction(singleSidedDepositMessage);
    singleSidedDepositTx.sign([signer]);

    try {
      //@ts-ignore
      const depositTxId = await sendAndConfirmTransaction(kamino._connection, singleSidedDepositTx);
      console.log('singleSidedDepoxit tx hash', depositTxId);
    } catch (e) {
      console.log(e);
    }
  });

  it.skip('one click single sided deposit SOL in SOL-USDC strat', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const strategy = new PublicKey('CEz5keL9hBCUbtVbmcwenthRMwmZLupxJ6YtYAgzp4ex');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(0.01);
    const slippageBps = new Decimal(50);

    let singleSidedDepositIxs: TransactionInstruction[] = [];
    let lookupTables: PublicKey[] = [];
    // if USDC is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint.toString() === SOLMintMainnet.toString()) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    }

    const singleSidedDepositMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs],
      [...lookupTables, ...(await kamino.getMainLookupTablePks())]
    );
    const singleSidedDepositTx = new VersionedTransaction(singleSidedDepositMessage);
    singleSidedDepositTx.sign([signer]);

    //@ts-ignore
    const depositTxId = await sendAndConfirmTransaction(kamino._connection, singleSidedDepositTx);
    console.log('singleSidedDepoxit tx hash', depositTxId);
  });

  it.skip('one click single sided deposit SOL in RLB-SOL strat', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const strategy = new PublicKey('AepjvYK4QfGhV3UjSRkZviR2AJAkLGtqdyKJFCf9kpz9');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(0.02);
    const slippageBps = new Decimal(50);

    let singleSidedDepositIxs: TransactionInstruction[] = [];
    let lookupTables: PublicKey[] = [];
    // if USDC is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint.toString() === SOLMintMainnet.toString()) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    }

    const singleSidedDepositMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs],
      [...lookupTables, ...(await kamino.getMainLookupTablePks())]
    );
    const singleSidedDepositTx = new VersionedTransaction(singleSidedDepositMessage);
    singleSidedDepositTx.sign([signer]);

    try {
      //@ts-ignore
      const depositTxId = await sendAndConfirmTransaction(kamino._connection, singleSidedDepositTx);
      console.log('singleSidedDepoxit tx hash', depositTxId);
    } catch (e) {
      console.log(e);
    }
  });

  it.skip('one click single sided deposit SOL in SOL-USDC strat with existent wSOL ata', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    //@ts-ignore
    const createWSolAtaIxns = await createWsolAtaIfMissing(kamino._connection, new Decimal(0.02), signer.publicKey);

    const createwSolAtaMessage = await kamino.getTransactionV2Message(signer.publicKey, createWSolAtaIxns.createIxns);
    const createwSolAtaTx = new VersionedTransaction(createwSolAtaMessage);
    createwSolAtaTx.sign([signer]);

    //@ts-ignore
    const createwSolAtaTxHash = await sendAndConfirmTransaction(kamino._connection, createwSolAtaTx);
    console.log('createSol tx hash', createwSolAtaTxHash);

    const strategy = new PublicKey('CEz5keL9hBCUbtVbmcwenthRMwmZLupxJ6YtYAgzp4ex');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(0.1);
    const slippageBps = new Decimal(50);

    let singleSidedDepositIxs: TransactionInstruction[] = [];
    let lookupTables: PublicKey[] = [];
    // if USDC is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint.toString() === SOLMintMainnet.toString()) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    }

    const singleSidedDepositMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs],
      [...lookupTables, ...(await kamino.getMainLookupTablePks())]
    );
    const singleSidedDepositTx = new VersionedTransaction(singleSidedDepositMessage);
    singleSidedDepositTx.sign([signer]);

    try {
      //@ts-ignore
      const depositTxId = await sendAndConfirmTransaction(kamino._connection, singleSidedDepositTx);
      console.log('singleSidedDepoxit tx hash', depositTxId);
    } catch (e) {
      console.log(e);
    }
  });

  it.skip('one click single sided deposit USDC in SOL-USDC strat with existent wSOL ata', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    //@ts-ignore
    const createWSolAtaIxns = await createWsolAtaIfMissing(kamino._connection, new Decimal(0.02), signer.publicKey);

    const createwSolAtaMessage = await kamino.getTransactionV2Message(signer.publicKey, createWSolAtaIxns.createIxns);
    const createwSolAtaTx = new VersionedTransaction(createwSolAtaMessage);
    createwSolAtaTx.sign([signer]);

    //@ts-ignore
    const createwSolAtaTxHash = await sendAndConfirmTransaction(kamino._connection, createwSolAtaTx);
    console.log('createSol tx hash', createwSolAtaTxHash);

    const strategy = new PublicKey('CEz5keL9hBCUbtVbmcwenthRMwmZLupxJ6YtYAgzp4ex');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(0.1);
    const slippageBps = new Decimal(50);

    let singleSidedDepositIxs: TransactionInstruction[] = [];
    let lookupTables: PublicKey[] = [];
    // if USDC is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint.toString() === USDCMintMainnet.toString()) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    }

    const singleSidedDepositMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs],
      [...lookupTables, ...(await kamino.getMainLookupTablePks())]
    );
    const singleSidedDepositTx = new VersionedTransaction(singleSidedDepositMessage);
    singleSidedDepositTx.sign([signer]);

    try {
      //@ts-ignore
      const depositTxId = await sendAndConfirmTransaction(kamino._connection, singleSidedDepositTx);
      console.log('singleSidedDepoxit tx hash', depositTxId);
    } catch (e) {
      console.log(e);
    }
  });

  it.skip('one click single sided deposit SOL in SOL-BONK strat with existent wSOL ata', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    //@ts-ignore
    const createWSolAtaIxns = await createWsolAtaIfMissing(kamino._connection, new Decimal(0.02), signer.publicKey);

    const createwSolAtaMessage = await kamino.getTransactionV2Message(signer.publicKey, createWSolAtaIxns.createIxns);
    const createwSolAtaTx = new VersionedTransaction(createwSolAtaMessage);
    createwSolAtaTx.sign([signer]);

    //@ts-ignore
    const createwSolAtaTxHash = await sendAndConfirmTransaction(kamino._connection, createwSolAtaTx);
    console.log('createSol tx hash', createwSolAtaTxHash);

    const strategy = new PublicKey('HWg7yB3C1BnmTKFMU3KGD7E96xx2rUhv4gxrwbZLXHBt');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(0.01);
    const slippageBps = new Decimal(50);

    let singleSidedDepositIxs: TransactionInstruction[] = [];
    let lookupTables: PublicKey[] = [];
    // if SOL is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint.toString() === SOLMintMainnet.toString()) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    }

    const singleSidedDepositMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs],
      [...lookupTables, ...(await kamino.getMainLookupTablePks())]
    );
    const singleSidedDepositTx = new VersionedTransaction(singleSidedDepositMessage);
    singleSidedDepositTx.sign([signer]);

    try {
      //@ts-ignore
      const depositTxId = await sendAndConfirmTransaction(kamino._connection, singleSidedDepositTx);
      console.log('singleSidedDepoxit tx hash', depositTxId);
    } catch (e) {
      console.log(e);
    }
  });

  it.skip('one click single sided deposit SOL in SOL-USDH strat', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const strategy = new PublicKey('CYLt3Bs51QT3WeFhjtYnPGZNDzdd6SY5vfUMa86gT2D8');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const shareDataBefore = await kamino.getStrategyShareData(strategy);
    const sharesAtaBalanceBefore = await balance(kamino.getConnection(), signer, strategyState.sharesMint);
    const userSharesMvBefore = sharesAtaBalanceBefore! * shareDataBefore.price.toNumber();
    const amountToDeposit = new Decimal(0.01);
    {
      const aAtaBalance = await balance(kamino.getConnection(), signer, strategyState.tokenAMint);
      const bAtaBalance = await balance(kamino.getConnection(), signer, strategyState.tokenBMint);
      console.log('balances ', toJson({ aAtaBalance, bAtaBalance, sharesAtaBalanceBefore }));

      const aPrice = await JupService.getPrice(strategyState.tokenAMint, USDCMintMainnet);

      console.log('shareData', toJson(shareDataBefore));
      console.log('shares minted', strategyState.sharesIssued.toString());

      const userDepositMv = amountToDeposit.mul(aPrice).toNumber();
      console.log("user's deposit mv", userDepositMv);
      console.log('userShareMvBefore', userSharesMvBefore);
    }

    const slippageBps = new Decimal(100);

    let singleSidedDepositIxs: TransactionInstruction[] = [];
    let lookupTables: PublicKey[] = [...(await kamino.getMainLookupTablePks())];
    if (strategyState.strategyLookupTable != PublicKey.default) {
      lookupTables.push(strategyState.strategyLookupTable);
    }
    // if SOL is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint.toString() === SOLMintMainnet.toString()) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTables.concat(lookupTablesAddresses);
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer.publicKey,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTables.concat(lookupTablesAddresses);
    }

    console.log('lookupTables', lookupTables.length);
    const singleSidedDepositMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs],
      lookupTables
    );
    const singleSidedDepositTx = new VersionedTransaction(singleSidedDepositMessage);
    singleSidedDepositTx.sign([signer]);

    try {
      //@ts-ignore
      const depositTxId = await sendAndConfirmTransaction(kamino._connection, singleSidedDepositTx);
      console.log('singleSidedDepoxit tx hash', depositTxId);
    } catch (e) {
      console.log(e);
    }

    await sleep(5000);

    const sharesAtaBalanceAfter = await balance(kamino.getConnection(), signer, strategyState.sharesMint);
    const shareDataAfter = await kamino.getStrategyShareData(strategy);
    const userSharesMvAfter = sharesAtaBalanceAfter! * shareDataAfter.price.toNumber();
    {
      console.log('after deposit');
      const aAtaBalance = await balance(kamino.getConnection(), signer, strategyState.tokenAMint);
      const bAtaBalance = await balance(kamino.getConnection(), signer, strategyState.tokenBMint);
      console.log('balances ', toJson({ aAtaBalance, bAtaBalance, sharesAtaBalanceAfter }));

      console.log('shareData', toJson(shareDataAfter));
      console.log('shares minted', strategyState.sharesIssued.toString());

      const userSharesMv = sharesAtaBalanceAfter! * shareDataAfter.price.toNumber();
      console.log("user's shares mv", userSharesMv);

      const diffMv = userSharesMvAfter - userSharesMvBefore;
      console.log('userSharesMvAfter', userSharesMvAfter);
      console.log('diff mv', diffMv);
    }
  });

  it.skip('create wSOL ata', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    //@ts-ignore
    const createWSolAtaIxns = await createWsolAtaIfMissing(kamino._connection, new Decimal(0), signer.publicKey);

    const createwSolAtaMessage = await kamino.getTransactionV2Message(signer.publicKey, createWSolAtaIxns.createIxns);
    const createwSolAtaTx = new VersionedTransaction(createwSolAtaMessage);
    createwSolAtaTx.sign([signer]);

    try {
      //@ts-ignore
      const createwSolAtaTxHash = await sendAndConfirmTransaction(kamino._connection, createwSolAtaTx);
      console.log('singleSidedDepoxit tx hash', createwSolAtaTxHash);
    } catch (e) {
      console.log(e);
    }
  });

  it.skip('read strategies share data on devnet', async () => {
    const devnetConnection = new Connection('https://api.devnet.solana.com', 'processed');
    const kamino = new Kamino('devnet', devnetConnection);

    const shareData = await kamino.getStrategiesShareData({});
    console.log('shareData', shareData.length);
  });

  it.skip('amounts distribution to be deposited with price range Orca', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const [tokenAAmount, tokenBAmount] = await kamino.calculateAmountsDistributionWithPriceRange(
      'ORCA',
      new PublicKey('7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm'),
      new Decimal(22.464697),
      new Decimal(32.301927)
    );

    console.log('tokenAAmount', tokenAAmount.toString());
    console.log('tokenBAmount', tokenBAmount.toString());
  });

  it.skip('amounts distribution to be deposited with price range Raydium', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const [tokenAAmount, tokenBAmount] = await kamino.calculateAmountsDistributionWithPriceRange(
      'RAYDIUM',
      new PublicKey('2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv'),
      new Decimal(21.540764564),
      new Decimal(32.295468218)
    );

    console.log('tokenAAmount', tokenAAmount.toString());
    console.log('tokenBAmount', tokenBAmount.toString());
  });

  // example of successed tx: 5q5u6buXUVbN2N8heGwecrdWDXJpKRMiuSe9RmXhmS73P3Ex41zYu5XXDBiAP8YWpHErFegpcyijvRDYFjsMUhhb
  it.skip('initialize tick for Orca pool', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const initPoolTickIfNeeded = await kamino.initializeTickForOrcaPool(
      signer.publicKey,
      new PublicKey('7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm'),
      new Decimal(0.1)
    );

    if (initPoolTickIfNeeded.initTickIx) {
      const initTickIx = await kamino.getTransactionV2Message(signer.publicKey, [initPoolTickIfNeeded.initTickIx]);
      const txV0 = new VersionedTransaction(initTickIx);
      txV0.sign([signer]);
      //@ts-ignore
      const txHash = await sendAndConfirmTransaction(kamino._connection, txV0);
      console.log('init tick tx hash', txHash);
    }
  });
});

export async function profiledFunctionExecution(promise: Promise<any>, transactionName: string): Promise<any> {
  const startTime = Date.now(); // Start time

  const prefix = '[PROFILING]';
  console.log(prefix, `function=${transactionName} event=start ts=${new Date(startTime).toISOString()}`);

  const result = await promise; // Execute the passed function

  const endTime = Date.now(); // End time
  const duration = (endTime - startTime) / 1000; // Duration in seconds

  console.log(prefix, `function=${transactionName} event=finish ts=${new Date(endTime).toISOString()}`);
  console.log(prefix, `function=${transactionName} event=measure duration=${duration.toFixed(2)} seconds`);

  return result;
}
