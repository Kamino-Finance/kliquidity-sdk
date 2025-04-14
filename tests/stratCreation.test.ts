import {
  address,
  Address, generateKeyPairSigner,
  IInstruction,
} from '@solana/kit';
import {
  createAddExtraComputeUnitsIx,
  getAssociatedTokenAddressAndAccount,
  Kamino,
  OrcaService,
  RaydiumService,
  sleep,
  StrategiesFilters,
  U64_MAX,
} from '../src';
import Decimal from 'decimal.js';
import { createComputeUnitLimitIx } from '../src';
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
} from './runner/utils';
import { UpdateRebalanceType } from '../src/@codegen/kliquidity/types/StrategyConfigOption';
import { expect } from 'chai';
import { PROGRAM_ID as WHIRLPOOL_PROGRAM_ID } from '../src/@codegen/whirlpools/programId';
import { PROGRAM_ID as RAYDIUM_PROGRAM_ID } from '../src/@codegen/raydium/programId';
import { Manual, PricePercentage, PricePercentageWithReset } from '../src/@codegen/kliquidity/types/RebalanceType';
import { createWsolAtaIfMissing, getComputeBudgetAndPriorityFeeIxns } from '../src/utils/transactions';
import { JupService } from '../src/services/JupService';
import { DEFAULT_PUBLIC_KEY, STAGING_GLOBAL_CONFIG, STAGING_KAMINO_PROGRAM_ID } from '../src/constants/pubkeys';
import { PROGRAM_ID as METEORA_PROGRAM_ID } from '../src/@codegen/meteora/programId';
import { sendAndConfirmTx } from './runner/tx';
import { initEnv } from './runner/env';
import { setupStrategyLookupTable } from './runner/lut';

describe.skip('Kamino strategy creation SDK Tests', async () => {
  const cluster = 'mainnet-beta';
  const rpcUrl: string = 'https://api.mainnet-beta.solana.com';
  const wsUrl: string = 'wss://api.mainnet-beta.solana.com';

  // use your private key here
  // const signerPrivateKey = [];
  // const signer = Keypair.fromSecretKey(Uint8Array.from(signerPrivateKey));
  const signer = await generateKeyPairSigner();
  const env = await initEnv({ rpcUrl, wsUrl, admin: signer });

  it.skip('read raydium clmm APY', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const strategyState = await kamino.getStrategyByAddress(
      address('4TQ1DZtibQuy5ux33fcZprUmLcLoAdSNfwaUukc9kdXP')
    );
    const raydiumService = new RaydiumService(connection);
    const aprApy = await raydiumService.getStrategyWhirlpoolPoolAprApy(strategyState!);
    console.log('aprApy', aprApy);

    const second = await raydiumService.getRaydiumPositionAprApy(address('8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj'), new Decimal(180.0), new Decimal(250.0));
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

    const testMint = address('DVYcTNFVGxePLgK8rUjViJvurRmTnD1FZUBR7puADymT');
    const testQuote = await JupService.getBestRouteQuoteV6(new Decimal(100.0), testMint, USDCMintMainnet, 50);
    console.log('testQuote', testQuote);
  });

  it.skip('read all strat', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
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
      env.c.rpc,
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
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const upkeepIxn = await kamino.withdrawTopupVault(
      signer,
      new Decimal(U64_MAX)
    );

    const ixs: IInstruction[] = [upkeepIxn];
    console.log('ixs', ixs.length);
    const txHash = await sendAndConfirmTx(env.c, signer, ixs);
    console.log('create strategy tx hash', txHash);
  });

  it('read generic pool Meteora', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const poolInfo = await kamino.getGenericPoolInfo(
      'METEORA',
      address('FoSDw2L5DmTuQTFe55gWPDXf88euaxAEKFre74CnvQbX')
    );
    console.log('poolInfo', poolInfo);
  });

  it('read pending fees for Orca strategy', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const strategy = address('8DRToyNBUTR4MxqkKAP49s9z1JhotQWy3rMQKEw1HHdu');
    const pendingFees = await kamino.getPendingFees([strategy]);
    console.log('pending fees', pendingFees);
  });

  it('read pending fees for Raydium strategy', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const strategy = address('5QgwaBQzzMAHdxpaVUgb4KrpXELgNTaEYXycUvNvRxr6');
    const pendingFees = await kamino.getPendingFees([strategy]);
    console.log('pending fees', pendingFees);
  });

  it('read pending fees for Meteora strategy', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const strategy = address('HBuYwvq67VKnLyKxPzDjzskyRMk7ps39gwHdvaPGwdmQ');
    const pendingFees = await kamino.getPendingFees([strategy]);
    console.log('pending fees', pendingFees);
  });

  it('read share data', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    let data = await kamino.getStrategyShareData(address('HBZRKiRX88gpoBgZxNtnWHk5bPcbCM3ociEPWNS131cK'));
    console.log('data for GrsqRMeKdwXxTLv4QKVeL1qMhHqKqjo3ZabuNwFQAzNi', data);
    data = await kamino.getStrategyShareData(address('HBZRKiRX88gpoBgZxNtnWHk5bPcbCM3ociEPWNS131cK'));
    console.log('data for GrsqRMeKdwXxTLv4QKVeL1qMhHqKqjo3ZabuNwFQAzNi', data);
    data = await kamino.getStrategyShareData(address('HBZRKiRX88gpoBgZxNtnWHk5bPcbCM3ociEPWNS131cK'));
    console.log('data for 2scuULh4EZbMHCEUZde4VycQG6EvTWc2trGgRfSaTLvZ', data);
  });

  it('read empty strat Meteora', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigStaging,
      KaminoProgramIdStaging,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const stratPubkey = address('FNk2SdoM6TcUWrDLdmxF8p1kUocGoroW7gmC2nyVhNXj');

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

    let depositIx: IInstruction;
    if (strategyState.tokenAMint === SOLMintMainnet) {
      depositIx = await kamino.deposit(strategyWithAddress, solToDeposit, usdcToDeposit, signer);
    } else {
      depositIx = await kamino.deposit(strategyWithAddress, usdcToDeposit, solToDeposit, signer);
    }

    const [sharesAta, sharesMintData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.sharesMint,
      signer.address
    );
    const [tokenAAta, tokenAData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.tokenAMint,
      signer.address
    );
    const [tokenBAta, tokenBData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.tokenBMint,
      signer.address
    );

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

    const increaseBudgetIx = createAddExtraComputeUnitsIx(1_000_000);
    const txHash = await sendAndConfirmTx(env.c, signer, [increaseBudgetIx, ...ataInstructions, depositIx], [], [strategyState.strategyLookupTable]);
    console.log('deposit tx hash', txHash);
  });

  it('deposit WIF-SOL Meteora', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      STAGING_GLOBAL_CONFIG,
      STAGING_KAMINO_PROGRAM_ID,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const strategyPubkey = address('97nwDqK1DAjDw2CKiou3bantTj8DwpPGVJBukpzEwVnk');
    const strategyState = await kamino.getStrategyByAddress(strategyPubkey);
    if (!strategyState) {
      throw new Error('strategy not found');
    }
    const strategyWithAddress = { address: strategyPubkey, strategy: strategyState };

    const solToDeposit = new Decimal(0.01);
    const wifToDeposit = new Decimal(10.0);

    let depositIx: IInstruction;
    if (strategyState.tokenAMint === SOLMintMainnet) {
      depositIx = await kamino.deposit(strategyWithAddress, solToDeposit, wifToDeposit, signer);
    } else {
      depositIx = await kamino.deposit(strategyWithAddress, wifToDeposit, solToDeposit, signer);
    }

    const [sharesAta, sharesMintData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.sharesMint,
      signer.address
    );
    const [tokenAAta, tokenAData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.tokenAMint,
      signer.address
    );
    const [tokenBAta, tokenBData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.tokenBMint,
      signer.address
    );

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

    const increaseBudgetIx = createAddExtraComputeUnitsIx(1_000_000);
    const txHash = await sendAndConfirmTx(env.c, signer, [increaseBudgetIx, ...ataInstructions, depositIx], [], [strategyState.strategyLookupTable]);
    console.log('deposit tx hash', txHash);
  });

  it('read all pools for tokens Meteora', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const pools = await kamino.getMeteoraPoolsForTokens(
      address('So11111111111111111111111111111111111111112'),
      address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    );
    console.log('pools', pools.length);
    console.log('pools', pools[0].key.toString());
    console.log('pools', pools[1].key.toString());
  });

  it('read pool price Meteora', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const price = await kamino.getMeteoraPoolPrice(address('FoSDw2L5DmTuQTFe55gWPDXf88euaxAEKFre74CnvQbX'));
    console.log('pool price', price);
  });

  it('create Kamino staging', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      STAGING_GLOBAL_CONFIG,
      STAGING_KAMINO_PROGRAM_ID,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const globalConfig = kamino.getGlobalConfig();
    expect(globalConfig === STAGING_GLOBAL_CONFIG).to.be.true;
  });

  it('both sides deposit in Meteora strategy', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      STAGING_GLOBAL_CONFIG,
      STAGING_KAMINO_PROGRAM_ID,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const strategy = address('6cM3MGNaJBfpBQy1P9oiZkDDzcWgSxjMaj6iWtz8ydSk');
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
      signer
    );
    console.log('depositIxs', depositIx);

    const [sharesAta, sharesMintData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.sharesMint,
      signer.address
    );
    const [tokenAAta, tokenAData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.tokenAMint,
      signer.address
    );
    const [tokenBAta, tokenBData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.tokenBMint,
      signer.address
    );

    const strategyWithAddres = { address: strategy, strategy: strategyState };
    const ataInstructions = await kamino.getCreateAssociatedTokenAccountInstructionsIfNotExist(
      signer,
      strategyWithAddres,
      tokenAData,
      tokenAAta,
      tokenBData,
      tokenBAta,
      sharesMintData,
      sharesAta
    );

    const increaseBudgetIx = createAddExtraComputeUnitsIx(1_000_000);
    const txHash = await sendAndConfirmTx(env.c, signer, [increaseBudgetIx, ...ataInstructions, depositIx], [], [strategyState.strategyLookupTable]);
    console.log('deposit tx hash', txHash);
  });

  it('single sided deposit in Meteora strategy', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      STAGING_GLOBAL_CONFIG,
      STAGING_KAMINO_PROGRAM_ID,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );

    const strategy = address('6cM3MGNaJBfpBQy1P9oiZkDDzcWgSxjMaj6iWtz8ydSk');
    const amountToDeposit = new Decimal(5.0);

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const depositIx = await kamino.singleSidedDepositTokenB(
      { strategy: strategyState!, address: strategy },
      amountToDeposit,
      signer,
      new Decimal(500)
    );

    const [sharesAta, sharesMintData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.sharesMint,
      signer.address
    );
    const [tokenAAta, tokenAData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.tokenAMint,
      signer.address
    );
    const [tokenBAta, tokenBData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.tokenBMint,
      signer.address
    );

    const strategyWithAddres = { address: strategy, strategy: strategyState };
    await kamino.getCreateAssociatedTokenAccountInstructionsIfNotExist(
      signer,
      strategyWithAddres,
      tokenAData,
      tokenAAta,
      tokenBData,
      tokenBAta,
      sharesMintData,
      sharesAta
    );

    const increaseBudgetIx = createAddExtraComputeUnitsIx(1_400_000);
    const txHash = await sendAndConfirmTx(env.c, signer, [increaseBudgetIx, ...depositIx.instructions], [], [strategyState.strategyLookupTable, ...depositIx.lookupTablesAddresses]);
    console.log('deposit tx hash', txHash);
  });

  it('calculate amounts', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      STAGING_GLOBAL_CONFIG,
      STAGING_KAMINO_PROGRAM_ID,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID,
      METEORA_PROGRAM_ID
    );
    const amounts = await kamino.calculateAmountsToBeDepositedWithSwap(
      address('Cfuy5T6osdazUeLego5LFycBQebm9PP3H7VNdCndXXEN'),
      new Decimal(0),
      new Decimal(400)
    );

    const holdings = await kamino.getStrategyTokensHoldings(
      address('Cfuy5T6osdazUeLego5LFycBQebm9PP3H7VNdCndXXEN')
    );

    console.log('amounts', amounts);
    console.log('holdings', holdings);
  });

  it.skip('readWhirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const res = await kamino.getStrategiesShareData([
      address('DWkn7bbqAjYeu4U84iQHTbKT9fBEBZwpTSLondcp6dpd'),
      address('B8CLmUAErBALZWwD16xUvWWxGDmH6BJBrQRqXUBVEhYN'),
    ]);
    console.log('res', res);
  });

  it.skip('get pools for Raydium SOL-USDC pair', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const pool = await kamino.getPoolInitializedForDexPairTier(
      'RAYDIUM',
      address('So11111111111111111111111111111111111111112'),
      address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      new Decimal(5)
    );

    console.log('pools', pool.toString());
  });

  it.skip('get pools for Orca SOL-USDC pair', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const pool = await kamino.getPoolInitializedForDexPairTier(
      'RAYDIUM',
      address('So11111111111111111111111111111111111111112'),
      address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      new Decimal(1)
    );

    console.log('orca pools', pool.toString());
  });

  it.skip('getExistentPoolsForPair Raydium for SOL-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const pools = await kamino.getExistentPoolsForPair(
      'RAYDIUM',
      address('So11111111111111111111111111111111111111112'),
      address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    );

    console.log('Raydium pools', pools);
  });

  it.skip('getExistentPoolsForPair ORCA for USDH-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const pools = await kamino.getExistentPoolsForPair(
      'ORCA',
      address('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX'),
      address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    );

    console.log('Orca pools', pools);
  });

  it.skip('build strategy IX for Raydium SOL-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = await generateKeyPairSigner();
    const newPosition = await generateKeyPairSigner();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer, newStrategy);
    console.log('newStrategy.Address', newStrategy.address);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'RAYDIUM',
      new Decimal('5'),
      newStrategy.address,
      newPosition,
      signer,
      new Decimal(Manual.discriminator),
      [new Decimal(18.0), new Decimal(21.0)],
      address('So11111111111111111111111111111111111111112'),
      address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    );

    const ixs: IInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    console.log('ixs', ixs.length);
    let txHash = await sendAndConfirmTx(env.c, signer, ixs);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await setupStrategyLookupTable(env, kamino, newStrategy.address);

    txHash = await sendAndConfirmTx(env.c, signer, [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx], [], [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer, newStrategy.address);
    console.log('updateRewardMappingIxs', updateRewardMappingIxs.length);

    for (const ix of updateRewardMappingIxs) {
      txHash = await sendAndConfirmTx(env.c, signer, [ix[0]], [], [strategyLookupTable]);
      console.log('setup strategy reward mapping', txHash);
    }
  });

  it.skip('build strategy IX for Raydium SOL-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = await generateKeyPairSigner();
    const newPosition = await generateKeyPairSigner();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer, newStrategy);
    console.log('newStrategy.Address', newStrategy.address);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'RAYDIUM',
      new Decimal('0.0005'),
      newStrategy.address,
      newPosition,
      signer,
      new Decimal(Manual.discriminator),
      [new Decimal(18.0), new Decimal(21.0)],
      address('So11111111111111111111111111111111111111112'),
      address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    );

    const ixs: IInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    console.log('ixs', ixs.length);
    let txHash = await sendAndConfirmTx(env.c, signer, ixs);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await setupStrategyLookupTable(env, kamino, newStrategy.address);

    txHash = await sendAndConfirmTx(env.c, signer, [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx], [], [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer, newStrategy.address);
    console.log('updateRewardMappingIxs', updateRewardMappingIxs.length);

    for (const ix of updateRewardMappingIxs) {
      txHash = await sendAndConfirmTx(env.c, signer, [ix[0]]);
      console.log('setup strategy reward mapping', txHash);
    }
  });

  it.skip('create custom USDC-USDH new manual strategy on existing whirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = await generateKeyPairSigner();
    const newPosition = await generateKeyPairSigner();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer, newStrategy);
    console.log('newStrategy.Address', newStrategy.address);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(1),
      newStrategy.address,
      newPosition,
      signer,
      new Decimal(Manual.discriminator),
      [], // not needed used for manual
      address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      address('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX')
    );

    const ixs: IInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);

    let txHash = await sendAndConfirmTx(env.c, signer, ixs);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await setupStrategyLookupTable(env, kamino, newStrategy.address);

    txHash = await sendAndConfirmTx(env.c, signer, [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx], [], [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer, newStrategy.address);

    for (const ix of updateRewardMappingIxs) {
      txHash = await sendAndConfirmTx(env.c, signer, [ix[0]]);
      console.log('update reward mappings tx hash', txHash);
    }
  });

  it.skip('create new manual strategy on existing whirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = await generateKeyPairSigner();
    const newPosition = await generateKeyPairSigner();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer, newStrategy);
    console.log('newStrategy.Address', newStrategy.address);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(5),
      newStrategy.address,
      newPosition,
      signer,
      new Decimal(Manual.discriminator),
      [], // not needed used for manual
      SOLMintMainnet,
      USDCMintMainnet
    );

    const ixs: IInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);

    let txHash = await sendAndConfirmTx(env.c, signer, ixs);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await setupStrategyLookupTable(env, kamino, newStrategy.address);

    txHash = await sendAndConfirmTx(env.c, signer, [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx], [], [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer, newStrategy.address);

    for (const ix of updateRewardMappingIxs) {
      txHash = await sendAndConfirmTx(env.c, signer, [ix[0]]);
      console.log('update reward mappings tx hash', txHash);
    }
  });

  it.skip('create new percentage strategy on existing whirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = await generateKeyPairSigner();
    const newPosition = await generateKeyPairSigner();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer, newStrategy);
    console.log('newStrategy.Address', newStrategy.address);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(5),
      newStrategy.address,
      newPosition,
      signer,
      new Decimal(PricePercentage.discriminator),
      [new Decimal(100.0), new Decimal(100.0)],
      SOLMintMainnet,
      USDCMintMainnet
    );

    const ixs: IInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    let txHash = await sendAndConfirmTx(env.c, signer, ixs);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await setupStrategyLookupTable(env, kamino, newStrategy.address);

    txHash = await sendAndConfirmTx(env.c, signer, [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx], [], [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer, newStrategy.address);

    for (const ix of updateRewardMappingIxs) {
      txHash = await sendAndConfirmTx(env.c, signer, [ix[0]]);
      console.log('update reward mappings tx hash', txHash);
    }
  });

  it.skip('create custom USDC-USDH new percentage strategy on existing whirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = await generateKeyPairSigner();
    const newPosition = await generateKeyPairSigner();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer, newStrategy);
    console.log('newStrategy.Address', newStrategy.address);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(1),
      newStrategy.address,
      newPosition,
      signer,
      new Decimal(Manual.discriminator),
      [], // not needed used for manual
      address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      address('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX')
    );

    const ixs: IInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);

    let txHash = await sendAndConfirmTx(env.c, signer, ixs);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await setupStrategyLookupTable(env, kamino, newStrategy.address);

    txHash = await sendAndConfirmTx(env.c, signer, [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx], [], [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer, newStrategy.address);

    for (const ix of updateRewardMappingIxs) {
      txHash = await sendAndConfirmTx(env.c, signer, [ix[0]]);
      console.log('update reward mappings tx hash', txHash);
    }
  });

  it.skip('create new percentage strategy on existing whirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = await generateKeyPairSigner();
    const newPosition = await generateKeyPairSigner();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer, newStrategy);
    console.log('newStrategy.Address', newStrategy.address);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(5),
      newStrategy.address,
      newPosition,
      signer,
      new Decimal(PricePercentage.discriminator),
      [new Decimal(100.0), new Decimal(100.0)],
      SOLMintMainnet,
      USDCMintMainnet
    );

    const ixs: IInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    let txHash = await sendAndConfirmTx(env.c, signer, ixs);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await setupStrategyLookupTable(env, kamino, newStrategy.address);

    txHash = await sendAndConfirmTx(env.c, signer, [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx], [], [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]);
    console.log('setup strategy tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer, newStrategy.address);

    for (const ix of updateRewardMappingIxs) {
      txHash = await sendAndConfirmTx(env.c, signer, [ix[0]]);
      console.log('update reward mappings tx hash', txHash);
    }

    // update rebalance params
    const updateRebalanceParamsIx = await kamino.getUpdateRebalancingParamsIxns(
      signer,
      newStrategy.address,
      [new Decimal(10.0), new Decimal(24.0)]
    );
    const tx = [createComputeUnitLimitIx()];
    tx.push(updateRebalanceParamsIx);
    const updateRebalanceParamsTxHash = await sendAndConfirmTx(env.c, signer, tx);
    console.log('update Rebalance Params Tx Hash ', updateRebalanceParamsTxHash);

    let strategyData = await kamino.getStrategies([newStrategy.address]);
    expect(strategyData[0]?.rebalanceRaw.params[0] == 10.0);
    expect(strategyData[0]?.rebalanceRaw.params[2] == 24.0);

    // update rebalance method to manual
    await updateStrategyConfig(
      env,
      newStrategy.address,
      new UpdateRebalanceType(),
      new Decimal(Manual.discriminator)
    );

    strategyData = await kamino.getStrategies([newStrategy.address]);
    expect(strategyData[0]?.rebalanceType == Manual.discriminator);
  });

  it.skip('get raydium pool liquidity distribution', async () => {
    const raydiumService = new RaydiumService(connection);
    const liquidityDistribution = await raydiumService.getRaydiumPoolLiquidityDistribution(
      address('2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv')
    );

    console.log('raydium liquidityDistribution', liquidityDistribution);
  });

  it.skip('get raydium pool liquidity distribution with range', async () => {
    const raydiumService = new RaydiumService(connection);
    const liquidityDistribution = await raydiumService.getRaydiumPoolLiquidityDistribution(
      address('2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv'),
      true,
      -39470,
      -37360
    );

    console.log('raydium liquidityDistribution', liquidityDistribution);
  });

  it.skip('get raydium pool liquidity distribution with range inverse order', async () => {
    const raydiumService = new RaydiumService(connection);
    const liquidityDistribution = await raydiumService.getRaydiumPoolLiquidityDistribution(
      address('2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv'),
      false,
      -39470,
      -37360
    );

    console.log('raydium liquidityDistribution', liquidityDistribution);
  });

  it.skip('get raydium positions for live pool', async () => {
    const raydiumService = new RaydiumService(connection);
    const liquidityDistribution = await raydiumService.getRaydiumPoolLiquidityDistribution(
      address('61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht')
    );

    console.log('raydium liquidityDistribution', liquidityDistribution);
  });

  it.skip('get orca pool liquidity distribution', async () => {
    const orcaService = new OrcaService(connection, cluster);
    const liquidityDistribution = await orcaService.getWhirlpoolLiquidityDistribution(
      address('7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm')
    );

    console.log('orca liquidityDistribution', liquidityDistribution);
  });

  it.skip('get orca positions for pool', async () => {
    const orcaService = new OrcaService(connection, cluster);
    const positionsCount = await orcaService.getPositionsCountByPool(
      address('7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm')
    );

    console.log('orca positions count', positionsCount);
  });

  it.skip('get raydium positions for pool', async () => {
    const raydiumService = new RaydiumService(connection);
    const positionsCount = await raydiumService.getPositionsCountByPool(
      address('2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv')
    );

    console.log('raydium positions count', positionsCount);
  });

  it.skip('create new custom USDC-USDH percentage strategy on existing whirlpool', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = await generateKeyPairSigner();
    const newPosition = await generateKeyPairSigner();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer, newStrategy);
    console.log('newStrategy.Address', newStrategy.address);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(1),
      newStrategy.address,
      newPosition,
      signer,
      new Decimal(Manual.discriminator),
      [], // not needed used for manual
      address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      address('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX')
    );

    const ixs: IInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    let txHash = await sendAndConfirmTx(env.c, signer, ixs);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await setupStrategyLookupTable(env, kamino, newStrategy.address);

    txHash = await sendAndConfirmTx(env.c, signer, [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx], [], [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]);
    console.log('setup strategy tx hash', txHash);

    // update rebalance params
    const updateRebalanceParamsIx = await kamino.getUpdateRebalancingParamsIxns(
      signer,
      newStrategy.address,
      [new Decimal(10.0), new Decimal(24.0)]
    );
    const tx = [createComputeUnitLimitIx()];
    tx.push(updateRebalanceParamsIx);
    const updateRebalanceParamsTxHash = await sendAndConfirmTx(env.c, signer, tx);
    console.log('update Rebalance Params Tx Hash ', updateRebalanceParamsTxHash);

    let strategyData = await kamino.getStrategies([newStrategy.address]);
    expect(strategyData[0]?.rebalanceRaw.params[0] == 10.0);
    expect(strategyData[0]?.rebalanceRaw.params[2] == 24.0);

    // update rebalance method to manual
    await updateStrategyConfig(
      env,
      newStrategy.address,
      new UpdateRebalanceType(),
      new Decimal(Manual.discriminator)
    );

    strategyData = await kamino.getStrategies([newStrategy.address]);
    expect(strategyData[0]?.rebalanceType == Manual.discriminator);
  });

  //test create as PricePercentageWithreset -> Update to Manual -> move back to PricePercentageWithReset diff range
  it.skip('create new custom USDC-USDH percentage with reset strategy -> change to manual -> change back to reset with range', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = await generateKeyPairSigner();
    const newPosition = await generateKeyPairSigner();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer, newStrategy);

    const lowerPriceBpsDifference = new Decimal(10.0);
    const upperPriceBpsDifference = new Decimal(10.0);
    const lowerPriceResetRange = new Decimal(5.0);
    const upperPriceResetRange = new Decimal(30.0);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(1),
      newStrategy.address,
      newPosition,
      signer,
      new Decimal(PricePercentageWithReset.discriminator),
      [lowerPriceBpsDifference, upperPriceBpsDifference, lowerPriceResetRange, upperPriceResetRange],
      address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      address('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX')
    );

    const ixs: IInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);

    let txHash = await sendAndConfirmTx(env.c, signer, ixs);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await setupStrategyLookupTable(env, kamino, newStrategy.address);

    txHash = await sendAndConfirmTx(env.c, signer, [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx], [], [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]);
    console.log('setup strategy tx hash', txHash);

    // verify strategy rebalance params
    const strategyRebalanceParams = await kamino.readRebalancingParams(newStrategy.address);
    expect(strategyRebalanceParams.find((x) => x.label == 'lowerRangeBps')!.value == lowerPriceBpsDifference);
    expect(strategyRebalanceParams.find((x) => x.label == 'upperRangeBps')!.value == upperPriceBpsDifference);
    expect(strategyRebalanceParams.find((x) => x.label == 'resetLowerRangeBps')!.value == lowerPriceResetRange);
    expect(strategyRebalanceParams.find((x) => x.label == 'resetUpperRangeBps')!.value == lowerPriceResetRange);

    // open position
    const openPositionIxns = buildNewStrategyIxs.openPositionIxs;
    const openPositionTxId = await sendAndConfirmTx(env.c, signer, openPositionIxns, [], [
      strategyLookupTable,
      ...(await kamino.getMainLookupTablePks()),
    ]);
    console.log('openPositionTxId', openPositionTxId);

    // read prices
    const pricesRebalanceParams = await kamino.readRebalancingParams(newStrategy.address);
    console.log('pricesRebalanceParams', pricesRebalanceParams);
  });

  it.skip('test read rebalance params from existent percentageWithReset strategy', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const strat = address('8RsjvJ9VoLNJb5veXzbyc7DKqvPG296oY2BsPnuxPTQ2');
    const pricesRebalanceParams = await kamino.readRebalancingParams(strat);
    console.log('pricesRebalanceParams', pricesRebalanceParams);
  });

  it.skip('create new custom USDC-USDH percentage strategy on existing whirlpool and open position', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = await generateKeyPairSigner();
    const newPosition = await generateKeyPairSigner();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer, newStrategy);
    console.log('newStrategy.Address', newStrategy.address);

    const lowerPriceBpsDifference = new Decimal(10.0);
    const upperPriceBpsDifference = new Decimal(11.0);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(1),
      newStrategy.address,
      newPosition,
      signer,
      new Decimal(PricePercentage.discriminator),
      [lowerPriceBpsDifference, upperPriceBpsDifference],
      address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      address('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX')
    );

    const ixs: IInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    const txHash = await sendAndConfirmTx(env.c, signer, ixs);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await setupStrategyLookupTable(env, kamino, newStrategy.address);

    // const setupStratTx = await kamino.getTransactionV2Message(
    //   signer.address,
    //   [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx],
    //   [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]
    // );
    // const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    // setupStratTransactionV0.sign([signer]);

    // verify strategy rebalance params
    const strategyData = await kamino.getStrategies([newStrategy.address]);
    expect(strategyData[0]?.rebalanceRaw.params[0].toString() == lowerPriceBpsDifference.toString());
    expect(strategyData[0]?.rebalanceRaw.params[2].toString() == upperPriceBpsDifference.toString());

    // open position
    const openPositionTxId = await sendAndConfirmTx(env.c, signer, buildNewStrategyIxs.openPositionIxs, [], [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]);
    console.log('openPositionTxId', openPositionTxId);
  });

  it.skip('create new custom SOL-BONK percentage strategy on existing whirlpool and open position', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = await generateKeyPairSigner();
    const newPosition = await generateKeyPairSigner();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer, newStrategy);
    console.log('newStrategy.Address', newStrategy.address);

    const lowerPriceBpsDifference = new Decimal(100.0);
    const upperPriceBpsDifference = new Decimal(110.0);

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal(30),
      newStrategy.address,
      newPosition,
      signer,
      new Decimal(PricePercentage.discriminator),
      [lowerPriceBpsDifference, upperPriceBpsDifference],
      address('So11111111111111111111111111111111111111112'),
      address('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')
    );

    const ixs: IInstruction[] = [];
    ixs.push(createRaydiumStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    let txHash = await sendAndConfirmTx(env.c, signer, ixs);
    console.log('create strategy tx hash', txHash);

    // set up lookup table for strategy
    const strategyLookupTable = await setupStrategyLookupTable(env, kamino, newStrategy.address);

    txHash = await sendAndConfirmTx(env.c, signer, [...buildNewStrategyIxs.updateStrategyParamsIxs, buildNewStrategyIxs.updateRebalanceParamsIx], [], [strategyLookupTable, ...(await kamino.getMainLookupTablePks())]);
    console.log('setup strategy tx hash', txHash);

    // verify strategy rebalance params
    const strategyData = await kamino.getStrategies([newStrategy.address]);
    expect(strategyData[0]?.rebalanceRaw.params[0].toString() == lowerPriceBpsDifference.toString());
    expect(strategyData[0]?.rebalanceRaw.params[2].toString() == upperPriceBpsDifference.toString());

    const openPositionTxId = await sendAndConfirmTx(env.c, signer, buildNewStrategyIxs.openPositionIxs)
    console.log('openPositionTxId', openPositionTxId);
  });

  it.skip('one click single sided deposit USDC in USDH-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    // let strategy = address('Cfuy5T6osdazUeLego5LFycBQebm9PP3H7VNdCndXXEN');
    const strategy = address('CEz5keL9hBCUbtVbmcwenthRMwmZLupxJ6YtYAgzp4ex');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(0.1);
    const slippageBps = new Decimal(10);

    let singleSidedDepositIxs: IInstruction[] = [];
    const lookupTables: Address[] = [strategyState.strategyLookupTable];

    await kamino.getInitialUserTokenBalances(
      signer.address,
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
          signer,
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
          signer,
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

    try {
      const depositTxId = await sendAndConfirmTx(env.c, env.admin,
        [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs],
        [],
        [...lookupTables, ...(await kamino.getMainLookupTablePks())]);
      // const depositTxId = await kamino._connection.simulateTransaction(singleSidedDepositTx);
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
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const strategy = address('CEz5keL9hBCUbtVbmcwenthRMwmZLupxJ6YtYAgzp4ex');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(1.0);
    const slippageBps = new Decimal(100);

    let singleSidedDepositIxs: IInstruction[] = [];
    let lookupTables: Address[] = [];
    // if USDC is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint.toString() === USDCMintMainnet.toString()) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    }

    const depositTxId = await sendAndConfirmTx(env.c, signer, [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs], [], [...lookupTables, ...(await kamino.getMainLookupTablePks())]);
    console.log('singleSidedDepoxit tx hash', depositTxId);
  });

  it.skip('one click single sided deposit SOL in SOL-USDC strat', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const strategy = address('CEz5keL9hBCUbtVbmcwenthRMwmZLupxJ6YtYAgzp4ex');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(0.01);
    const slippageBps = new Decimal(50);

    let singleSidedDepositIxs: IInstruction[] = [];
    let lookupTables: Address[] = [];
    // if USDC is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint.toString() === SOLMintMainnet.toString()) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    }

    const depositTxId = await sendAndConfirmTx(env.c, signer, [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs], [], [...lookupTables, ...(await kamino.getMainLookupTablePks())]);
    console.log('singleSidedDepoxit tx hash', depositTxId);
  });

  it.skip('one click single sided deposit SOL in RLB-SOL strat', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const strategy = address('AepjvYK4QfGhV3UjSRkZviR2AJAkLGtqdyKJFCf9kpz9');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(0.02);
    const slippageBps = new Decimal(50);

    let singleSidedDepositIxs: IInstruction[] = [];
    let lookupTables: Address[] = [];
    // if USDC is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint.toString() === SOLMintMainnet.toString()) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    }

    try {
      const depositTxId = await sendAndConfirmTx(env.c, env.admin,       [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs], [],
        [...lookupTables, ...(await kamino.getMainLookupTablePks())])
      console.log('singleSidedDepoxit tx hash', depositTxId);
    } catch (e) {
      console.log(e);
    }
  });

  it.skip('one click single sided deposit SOL in SOL-USDC strat with existent wSOL ata', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const createWSolAtaIxns = await createWsolAtaIfMissing(kamino.getConnection(), new Decimal(0.02), signer);

    const createwSolAtaTxHash = await sendAndConfirmTx(env.c, signer, createWSolAtaIxns.createIxns);
    console.log('createSol tx hash', createwSolAtaTxHash);

    const strategy = address('CEz5keL9hBCUbtVbmcwenthRMwmZLupxJ6YtYAgzp4ex');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(0.1);
    const slippageBps = new Decimal(50);

    let singleSidedDepositIxs: IInstruction[] = [];
    let lookupTables: Address[] = [];
    // if USDC is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint.toString() === SOLMintMainnet.toString()) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    }

    try {
      const depositTxId = await sendAndConfirmTx(env.c, env.admin,
        [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs], [],
        [...lookupTables, ...(await kamino.getMainLookupTablePks())])
      console.log('singleSidedDepoxit tx hash', depositTxId);
    } catch (e) {
      console.log(e);
    }
  });

  it.skip('one click single sided deposit USDC in SOL-USDC strat with existent wSOL ata', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const createWSolAtaIxns = await createWsolAtaIfMissing(kamino.getConnection(), new Decimal(0.02), signer);

    const createwSolAtaTxHash = await sendAndConfirmTx(env.c, signer, createWSolAtaIxns.createIxns);
    console.log('createSol tx hash', createwSolAtaTxHash);

    const strategy = address('CEz5keL9hBCUbtVbmcwenthRMwmZLupxJ6YtYAgzp4ex');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(0.1);
    const slippageBps = new Decimal(50);

    let singleSidedDepositIxs: IInstruction[] = [];
    let lookupTables: Address[] = [];
    // if USDC is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint === USDCMintMainnet) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    }

    const depositTxId = await sendAndConfirmTx(env.c, signer, [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs], [], [...lookupTables, ...(await kamino.getMainLookupTablePks())]);
    console.log('singleSidedDepoxit tx hash', depositTxId);
  });

  it.skip('one click single sided deposit SOL in SOL-BONK strat with existent wSOL ata', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const createWSolAtaIxns = await createWsolAtaIfMissing(kamino.getConnection(), new Decimal(0.02), signer);

    const createwSolAtaTxHash = await sendAndConfirmTx(env.c, signer, createWSolAtaIxns.createIxns);
    console.log('createSol tx hash', createwSolAtaTxHash);

    const strategy = address('HWg7yB3C1BnmTKFMU3KGD7E96xx2rUhv4gxrwbZLXHBt');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const amountToDeposit = new Decimal(0.01);
    const slippageBps = new Decimal(50);

    let singleSidedDepositIxs: IInstruction[] = [];
    let lookupTables: Address[] = [];
    // if SOL is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint.toString() === SOLMintMainnet.toString()) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTablesAddresses;
    }

    try {
      const depositTxId = await sendAndConfirmTx(env.c, signer, [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs], [], [...lookupTables, ...(await kamino.getMainLookupTablePks())]);
      console.log('singleSidedDepoxit tx hash', depositTxId);
    } catch (e) {
      console.log(e);
    }
  });

  it.skip('one click single sided deposit SOL in SOL-USDH strat', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const strategy = address('CYLt3Bs51QT3WeFhjtYnPGZNDzdd6SY5vfUMa86gT2D8');

    const strategyState = (await kamino.getStrategies([strategy]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    const shareDataBefore = await kamino.getStrategyShareData(strategy);
    const sharesAtaBalanceBefore = await balance(kamino.getConnection(), signer.address, strategyState.sharesMint);
    const userSharesMvBefore = sharesAtaBalanceBefore! * shareDataBefore.price.toNumber();
    const amountToDeposit = new Decimal(0.01);
    {
      const aAtaBalance = await balance(kamino.getConnection(), signer.address, strategyState.tokenAMint);
      const bAtaBalance = await balance(kamino.getConnection(), signer.address, strategyState.tokenBMint);
      console.log('balances ', toJson({ aAtaBalance, bAtaBalance, sharesAtaBalanceBefore }));

      const aPrice = await JupService.getPrice(strategyState.tokenAMint, USDCMintMainnet);

      console.log('shareData', toJson(shareDataBefore));
      console.log('shares minted', strategyState.sharesIssued.toString());

      const userDepositMv = amountToDeposit.mul(aPrice).toNumber();
      console.log("user's deposit mv", userDepositMv);
      console.log('userShareMvBefore', userSharesMvBefore);
    }

    const slippageBps = new Decimal(100);

    let singleSidedDepositIxs: IInstruction[] = [];
    let lookupTables: Address[] = [...(await kamino.getMainLookupTablePks())];
    if (strategyState.strategyLookupTable !== DEFAULT_PUBLIC_KEY) {
      lookupTables.push(strategyState.strategyLookupTable);
    }
    // if SOL is tokenA mint deposit tokenA, else deposit tokenB
    if (strategyState.tokenAMint.toString() === SOLMintMainnet.toString()) {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenA(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTables.concat(lookupTablesAddresses);
    } else {
      const { instructions, lookupTablesAddresses } = await kamino.singleSidedDepositTokenB(
        strategy,
        amountToDeposit,
        signer,
        slippageBps
      );
      singleSidedDepositIxs = instructions;
      lookupTables = lookupTables.concat(lookupTablesAddresses);
    }

    console.log('lookupTables', lookupTables.length);

    const depositTxId = await sendAndConfirmTx(env.c, signer, [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...singleSidedDepositIxs], [], lookupTables);
    console.log('singleSidedDepoxit tx hash', depositTxId);

    await sleep(5000);

    const sharesAtaBalanceAfter = await balance(kamino.getConnection(), signer.address, strategyState.sharesMint);
    const shareDataAfter = await kamino.getStrategyShareData(strategy);
    const userSharesMvAfter = sharesAtaBalanceAfter! * shareDataAfter.price.toNumber();
    {
      console.log('after deposit');
      const aAtaBalance = await balance(kamino.getConnection(), signer.address, strategyState.tokenAMint);
      const bAtaBalance = await balance(kamino.getConnection(), signer.address, strategyState.tokenBMint);
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
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const createWSolAtaIxns = await createWsolAtaIfMissing(kamino.getConnection(), new Decimal(0), signer);

    try {
      const createwSolAtaTxHash = await sendAndConfirmTx(env.c, signer, createWSolAtaIxns.createIxns);
      console.log('singleSidedDepoxit tx hash', createwSolAtaTxHash);
    } catch (e) {
      console.log(e);
    }
  });

  it.skip('read strategies share data on devnet', async () => {
    const cluster = 'devnet';
    const rpcUrl: string = 'https://api.devnet.solana.com';
    const wsUrl: string = 'wss://api.devnet.solana.com';
    const env = await initEnv({ rpcUrl, wsUrl });

    const kamino = new Kamino(cluster, env.c.rpc);

    const shareData = await kamino.getStrategiesShareData({});
    console.log('shareData', shareData.length);
  });

  it.skip('amounts distribution to be deposited with price range Orca', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const [tokenAAmount, tokenBAmount] = await kamino.calculateAmountsDistributionWithPriceRange(
      'ORCA',
      address('7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm'),
      new Decimal(22.464697),
      new Decimal(32.301927)
    );

    console.log('tokenAAmount', tokenAAmount.toString());
    console.log('tokenBAmount', tokenBAmount.toString());
  });

  it.skip('amounts distribution to be deposited with price range Raydium', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const [tokenAAmount, tokenBAmount] = await kamino.calculateAmountsDistributionWithPriceRange(
      'RAYDIUM',
      address('2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv'),
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
      env.c.rpc,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const initPoolTickIfNeeded = await kamino.initializeTickForOrcaPool(
      signer,
      address('7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm'),
      new Decimal(0.1)
    );

    if (initPoolTickIfNeeded.initTickIx) {
      const txHash = await sendAndConfirmTx(env.c, signer, [initPoolTickIfNeeded.initTickIx]);
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
