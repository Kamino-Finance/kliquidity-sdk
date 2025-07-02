import {
  address,
  Address,
  generateKeyPairSigner,
  IInstruction,
  Signature,
  TransactionSigner,
} from '@solana/kit';
import {
  collToLamportsDecimal,
  createComputeUnitLimitIx,
  DepositAmountsForSwap,
  getAssociatedTokenAddressAndAccount,
  Kamino,
  sleep,
  StrategiesFilters,
  SwapperIxBuilder,
  TokenAmounts,
  ZERO,
} from '../src';
import Decimal from 'decimal.js';
import * as Instructions from '../src/@codegen/kliquidity/instructions';
import { GlobalConfigOption, GlobalConfigOptionKind, UpdateCollateralInfoMode } from '../src/@codegen/kliquidity/types';
import { initializeRaydiumPool, orderMints } from './runner/raydium_utils';
import { initializeWhirlpool } from './runner/orca_utils';
import {
  createMint,
  createUser,
  DEFAULT_MAX_PRICE_AGE,
  getCollInfoEncodedName,
  mintTo,
  updateCollateralInfo,
  updateStrategyConfig,
  updateTreasuryFeeVault,
  solAirdrop,
  getLocalSwapIxs,
  setupAta,
  getCollInfoEncodedChainFromIndexes,
} from './runner/utils';
import {
  AllowDepositWithoutInvest,
  UpdateCollectFeesFee,
  UpdateDepositCap,
  UpdateDepositCapIxn,
  UpdateMaxDeviationBps,
  UpdateReward0Fee,
  UpdateReward1Fee,
  UpdateReward2Fee,
  UpdateStrategyCreationState,
  UpdateStrategyType,
} from '../src/@codegen/kliquidity/types/StrategyConfigOption';
import { expect } from 'chai';
import { PROGRAM_ID as KLIQUIDITY_PROGRAM_ID } from '../src/@codegen/kliquidity/programId';
import { PROGRAM_ID as WHIRLPOOL_PROGRAM_ID } from '../src/@codegen/whirlpools/programId';
import { PROGRAM_ID as RAYDIUM_PROGRAM_ID } from '../src/@codegen/raydium/programId';
import { createWsolAtaIfMissing } from '../src/utils/transactions';
import { getMintDecimals } from '../src/utils';
import { setupStrategyLookupTable } from './runner/lut';
import { Env, initEnv } from './runner/env';
import { CollateralInfos, GlobalConfig } from '../src/@codegen/kliquidity/accounts';
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { sendAndConfirmTx } from './runner/tx';

export const USDH_SCOPE_CHAIN_ID = BigInt(12);
export const USDC_SCOPE_CHAIN_ID = BigInt(20);

describe('Kamino SDK Tests', () => {
  let env: Env;
  const fixtures: Record<string, Address> = {
    globalConfig: address('GKnHiWh3RRrE1zsNzWxRkomymHc374TvJPSTv2wPeYdB'),
    newWhirlpool: address('Fvtf8VCjnkqbETA6KtyHYqHm26ut6w184Jqm4MQjPvv7'),
    newOrcaStrategy: address('Cfuy5T6osdazUeLego5LFycBQebm9PP3H7VNdCndXXEN'),
    newRaydiumPool: address('3tD34VtprDSkYCnATtQLCiVgTkECU3d12KtjupeR6N2X'),
    newRaydiumStrategy: address('AL6Yd51aSY3S9wpuypJYKtEf65xBSXKpfUCxN54CaWeE'),
    scopePrices: address('3NJYftD5sjVfxSnUdZ1wVML8f3aC6mp1CXCL6L7TnU8C'),
    scopeProgram: address('HFn8GnPADiny6XqUoWE8uRPPxb29ikn4yTuPa9MF2fWJ'),
    newTokenMintA: address('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX'),
    newTokenMintB: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    tokenInfos: address('3v6ootgJJZbSWEDfZMA1scfh7wcsVVfeocExRxPqCyWH'),
  };
  const lowerPrice = new Decimal(0.97);
  const upperPrice = new Decimal(1.03);

  before(async () => {
    env = await initEnv();

    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );
    // @ts-ignore
    kamino._scope._config.oraclePrices = fixtures.scopePrices;
    // @ts-ignore
    kamino._scope._config.programId = fixtures.scopeProgram;

    let tokenAMint = await createMint(env, 6);
    let tokenBMint = await createMint(env, 6);
    console.log('Mints initialized');
    const tokens = orderMints(tokenAMint, tokenBMint);
    tokenAMint = tokens[0];
    tokenBMint = tokens[1];
    fixtures.newTokenMintA = tokenAMint;
    fixtures.newTokenMintB = tokenBMint;
    const tokenAAta = await setupAta(env.c, env.admin, tokenAMint);
    const tokenBAta = await setupAta(env.c, env.admin, tokenBMint);
    await sleep(2000);
    await mintTo(env, tokenAMint, tokenAAta, 100_000_000_000);
    await mintTo(env, tokenBMint, tokenBAta, 100_000_000_000);
    await sleep(2000);

    const globalConfig = await setUpGlobalConfig(env, kamino, fixtures.scopeProgram, fixtures.scopePrices);
    console.log('globalConfig initialized ', globalConfig.toString());
    kamino.setGlobalConfig(globalConfig);
    fixtures.globalConfig = globalConfig;

    const collateralInfo = await setUpCollateralInfo(env, kamino);
    await sleep(1000);

    await updateCollateralInfoForToken(
      env,
      1,
      USDH_SCOPE_CHAIN_ID,
      globalConfig,
      'USDH',
      BigInt(1),
      tokenAMint,
      fixtures.scopePrices
    );

    await updateCollateralInfoForToken(
      env,
      0,
      USDC_SCOPE_CHAIN_ID,
      globalConfig,
      'USDC',
      BigInt(1),
      tokenBMint,
      fixtures.scopePrices
    );

    await sleep(100);
    fixtures.tokenInfos = collateralInfo;

    // @ts-ignore
    const treasuryFeeVaults = await kamino.getTreasuryFeeVaultPDAs(tokenAMint, tokenBMint);
    const updateTreasuryFeeA = await updateTreasuryFeeVault(
      env,
      globalConfig,
      'USDH',
      tokenAMint,
      treasuryFeeVaults.treasuryFeeTokenAVault,
      treasuryFeeVaults.treasuryFeeVaultAuthority
    );
    console.log('updateTreasuryFeeA tx', updateTreasuryFeeA);

    const updateTreasuryFeeB = await updateTreasuryFeeVault(
      env,
      globalConfig,
      'USDC',
      tokenBMint,
      treasuryFeeVaults.treasuryFeeTokenBVault,
      treasuryFeeVaults.treasuryFeeVaultAuthority
    );
    console.log('updateTreasuryFeeB tx', updateTreasuryFeeB);

    const raydiumPool = await initializeRaydiumPool(env, 1, fixtures.newTokenMintA, fixtures.newTokenMintB);
    fixtures.newRaydiumPool = raydiumPool.pool;
    const createRaydiumTx = [createComputeUnitLimitIx()];
    const newRaydiumStrategy = await generateKeyPairSigner();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(env.admin, newRaydiumStrategy);

    createRaydiumTx.push(createRaydiumStrategyAccountIx);
    const raydiumStrategyIx = await kamino.createStrategy(
      newRaydiumStrategy.address,
      raydiumPool.pool,
      env.admin,
      'RAYDIUM'
    );

    createRaydiumTx.push(raydiumStrategyIx);

    const raydiumTxHash = await sendAndConfirmTx(env.c, env.admin, createRaydiumTx);
    console.log('transaction hash', raydiumTxHash);
    console.log('new Raydium strategy has been created', newRaydiumStrategy.address);
    fixtures.newRaydiumStrategy = newRaydiumStrategy.address;

    const whirlpool = await initializeWhirlpool(env, 1, tokenAMint, tokenBMint);
    fixtures.newWhirlpool = whirlpool.pool;
    console.log('whilrpool is ', whirlpool.pool.toString());

    const tx = [createComputeUnitLimitIx()];
    const newOrcaStrategy = await generateKeyPairSigner();
    const createStrategyAccountIx = await kamino.createStrategyAccount(env.admin, newOrcaStrategy);
    tx.push(createStrategyAccountIx);
    const orcaStrategyIx = await kamino.createStrategy(newOrcaStrategy.address, whirlpool.pool, env.admin, 'ORCA');
    tx.push(orcaStrategyIx);

    const txHash = await sendAndConfirmTx(env.c, env.admin, tx);
    console.log('transaction hash', txHash);
    console.log('new Orca strategy has been created', newOrcaStrategy.address);

    fixtures.newOrcaStrategy = newOrcaStrategy.address;

    await updateStrategyConfig(
      env,
      fixtures.newOrcaStrategy,
      new UpdateDepositCapIxn(),
      new Decimal(1_000_000_000_000_000)
    );
    await updateStrategyConfig(
      env,
      fixtures.newOrcaStrategy,
      new UpdateDepositCap(),
      new Decimal(1_000_000_000_000_000)
    );
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateMaxDeviationBps(), new Decimal(1000));
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new AllowDepositWithoutInvest(), new Decimal(1));

    await updateStrategyConfig(
      env,
      fixtures.newRaydiumStrategy,
      new UpdateDepositCapIxn(),
      new Decimal(1_000_000_000_000_000)
    );
    await updateStrategyConfig(
      env,
      fixtures.newRaydiumStrategy,
      new UpdateDepositCap(),
      new Decimal(1_000_000_000_000_000)
    );
    await updateStrategyConfig(env, fixtures.newRaydiumStrategy, new UpdateMaxDeviationBps(), new Decimal(2000));
    await updateStrategyConfig(env, fixtures.newRaydiumStrategy, new AllowDepositWithoutInvest(), new Decimal(1));

    await setupStrategyLookupTable(env, kamino, newOrcaStrategy.address);
    await setupStrategyLookupTable(env, kamino, newRaydiumStrategy.address);

    await openPosition(env, kamino, env.admin, newOrcaStrategy.address, lowerPrice, upperPrice);
    console.log('orca position opened');
    await openPosition(env, kamino, env.admin, newRaydiumStrategy.address, lowerPrice, upperPrice);
    console.log('raydium position opened');
  });

  // it('should throw on invalid cluster', () => {
  //   // @ts-ignore
  //   const init = () => new Kamino('invalid-clusters', undefined);
  //   expect(init).to.throw(Error);
  // });

  it('price range is close to initial range', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const orcaStrategy = await kamino.getStrategyByAddress(fixtures.newOrcaStrategy);
    expect(orcaStrategy).not.to.be.null;
    const orcaPositionRange = await kamino.getPositionRangeOrca(
      orcaStrategy!.position,
      orcaStrategy!.tokenAMintDecimals.toNumber(),
      orcaStrategy!.tokenBMintDecimals.toNumber()
    );
    expect(orcaPositionRange.lowerPrice.toNumber()).to.be.approximately(lowerPrice.toNumber(), 0.001);
    expect(orcaPositionRange.upperPrice.toNumber()).to.be.approximately(upperPrice.toNumber(), 0.001);

    const raydiumStrategy = await kamino.getStrategyByAddress(fixtures.newRaydiumStrategy);
    expect(raydiumStrategy).not.to.be.null;
    const raydiumPositionRange = await kamino.getPositionRangeRaydium(
      raydiumStrategy!.position,
      raydiumStrategy!.tokenAMintDecimals.toNumber(),
      raydiumStrategy!.tokenBMintDecimals.toNumber()
    );
    expect(raydiumPositionRange.lowerPrice.toNumber()).to.be.approximately(lowerPrice.toNumber(), 0.001);
    expect(raydiumPositionRange.upperPrice.toNumber()).to.be.approximately(upperPrice.toNumber(), 0.001);
  });

  it('should get all Kamino prices', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );
    const prices = await kamino.getAllPrices();
    expect(prices).not.to.be.undefined;
    expect(Object.keys(prices.spot)).to.have.length(2);
    expect(Object.keys(prices.twap)).to.have.length(2);

    const usdh = prices.spot[fixtures.newTokenMintA.toString()];
    const usdc = prices.spot[fixtures.newTokenMintB.toString()];
    const usdhTwap = prices.twap[fixtures.newTokenMintA.toString()];
    const usdcTwap = prices.twap[fixtures.newTokenMintB.toString()];
    expect(usdh).not.to.be.undefined;
    expect(usdh!.name).to.be.equal('USDH');
    expect(usdh!.price.toNumber()).to.be.greaterThan(0);
    expect(usdc).not.to.be.undefined;
    expect(usdc!.name).to.be.equal('USDC');
    expect(usdc!.price.toNumber()).to.be.greaterThan(0);
    expect(usdhTwap).not.to.be.undefined;
    expect(usdhTwap!.name).to.be.equal('USDH');
    expect(usdhTwap!.price.toNumber()).to.be.greaterThan(0);
    expect(usdcTwap).not.to.be.undefined;
    expect(usdcTwap!.name).to.be.equal('USDC');
    expect(usdcTwap!.price.toNumber()).to.be.greaterThan(0);
  });

  it('should get all strategies', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );
    const allStrategies = await kamino.getStrategies([fixtures.newOrcaStrategy]);
    expect(allStrategies.length).to.be.greaterThan(0);
    for (const strat of allStrategies) {
      expect(strat).not.to.be.null;
      console.log(strat?.pool.toString());
    }
  });

  it('should get strategy by address', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );
    const strategy = await kamino.getStrategyByAddress(fixtures.newOrcaStrategy);
    expect(strategy).not.to.be.null;
    console.log(strategy?.toJSON());
  });

  it('should get RAYDIUM strategy share price', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategy = await kamino.getStrategyByAddress(fixtures.newRaydiumStrategy);
    expect(strategy).not.to.be.null;
    const price = await kamino.getStrategyShareData(fixtures.newRaydiumStrategy);
    expect(price.price.toNumber()).to.be.greaterThanOrEqual(0);
    console.log(price);
  });

  it('should get Orca strategy share price', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategyState = await kamino.getStrategyByAddress(fixtures.newOrcaStrategy);
    expect(strategyState).not.to.be.null;
    if (strategyState == null) {
      throw new Error(`Could not fetch strategy for pubkey ${fixtures.newOrcaStrategy.toString()}`);
    }

    const price = await kamino.getStrategyShareData(fixtures.newOrcaStrategy);
    expect(price.price.toNumber()).to.be.greaterThanOrEqual(0);
    console.log(price);
  });

  it('should get strategy share price from all strat', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const sharesPricesWithAddress = await kamino.getStrategyShareDataForStrategies({});
    expect(sharesPricesWithAddress.length).to.be.eq(2);
    console.log(sharesPricesWithAddress);
  });

  it('should get all strategy holders', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const solAirdropAmount = new Decimal(1);
    const usdcAirdropAmount = new Decimal(100);
    const usdhAirdropAmount = new Decimal(100);

    const user = await createUser(
      env,
      fixtures.newOrcaStrategy,
      solAirdropAmount,
      usdcAirdropAmount,
      usdhAirdropAmount
    );

    const [usdcDeposit, usdhDeposit] = [new Decimal(5), new Decimal(5)];
    await kamino.deposit(fixtures.newOrcaStrategy, usdcDeposit, usdhDeposit, user.owner);
    await sleep(2000);

    const strategy = await kamino.getStrategyByAddress(fixtures.newOrcaStrategy);
    expect(strategy).to.not.be.null;
    const accounts = await kamino.getStrategyHolders(fixtures.newOrcaStrategy);
    expect(accounts.length).to.be.greaterThan(0);
    const expectedShares = new Decimal(strategy!.sharesIssued.toString())
      .div(new Decimal(10).pow(strategy!.sharesMintDecimals.toString()))
      .toNumber();
    const actualShares = accounts.map((x) => x.amount.toNumber()).reduce((partialSum, a) => partialSum + a, 0);
    expect(expectedShares).to.eq(actualShares);
  });

  it('should get all whirlpools', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );
    console.log(await kamino.getWhirlpools([fixtures.newWhirlpool]));
  });

  it('should get all Raydium pools', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );
    console.log(await kamino.getRaydiumPools([fixtures.newRaydiumPool]));
  });

  it('should withdraw shares from a Orca strategy', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );
    const strategyState = await kamino.getStrategyByAddress(fixtures.newOrcaStrategy);
    expect(strategyState).not.to.be.null;
    if (strategyState == null) {
      throw new Error(`Could not fetch strategy for pubkey ${fixtures.newOrcaStrategy.toString()}`);
    }

    const tx = [createComputeUnitLimitIx(12000000)];
    const [sharesAta, sharesMintData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.sharesMint,
      env.admin.address
    );
    const [tokenAAta, tokenAData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.tokenAMint,
      env.admin.address
    );
    const [tokenBAta, tokenBData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.tokenBMint,
      env.admin.address
    );

    const strategyWithAddres = { address: fixtures.newOrcaStrategy, strategy: strategyState };
    const ataInstructions = await kamino.getCreateAssociatedTokenAccountInstructionsIfNotExist(
      env.admin,
      strategyWithAddres,
      tokenAData,
      tokenAAta,
      tokenBData,
      tokenBAta,
      sharesMintData,
      sharesAta
    );
    tx.push(...ataInstructions);

    const res = await sendAndConfirmTx(env.c, env.admin, tx);
    console.log('res createAtas ', res);

    const [usdcDeposit, usdhDeposit] = [new Decimal(5), new Decimal(5)];
    await mintTo(env, strategyState.tokenAMint, tokenAAta, 9000000);
    await mintTo(env, strategyState.tokenBMint, tokenBAta, 9000000);
    await sleep(5000);

    const depositIx = await kamino.deposit(fixtures.newOrcaStrategy, usdcDeposit, usdhDeposit, env.admin);
    const depositTx = [createComputeUnitLimitIx(1200000)];
    depositTx.push(depositIx);
    await sendAndConfirmTx(env.c, env.admin, depositTx);

    const strategy = (await kamino.getStrategyByAddress(fixtures.newOrcaStrategy))!;
    const strategyWithAddress = { strategy, address: fixtures.newOrcaStrategy };

    const withdrawTx = [createComputeUnitLimitIx()];

    //@ts-ignore
    const shares = await kamino.getTokenAccountBalance(sharesAta);
    console.log('shares, ', shares);

    const withdrawIxns = await kamino.withdrawShares(strategyWithAddress, new Decimal(0.2), env.admin);
    withdrawTx.push(...withdrawIxns.prerequisiteIxs, ...withdrawIxns.prerequisiteIxs);
    const txHash = sendAndConfirmTx(env.c, env.admin, withdrawTx);
    console.log('withdraw tx hash', txHash);
  });

  it.skip('create wSOL ata', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const solAirdropAmount = new Decimal(1);
    const usdcAirdropAmount = new Decimal(100);
    const usdhAirdropAmount = new Decimal(0);

    const user = await createUser(
      env,
      fixtures.newOrcaStrategy,
      solAirdropAmount,
      usdcAirdropAmount,
      usdhAirdropAmount
    );

    const createWSolAtaIxns = await createWsolAtaIfMissing(kamino.getConnection(), new Decimal(0.9), user.owner);

    const createAtaMessageTx = await sendAndConfirmTx(env.c, user.owner, createWSolAtaIxns.createIxns);
    console.log('createAtaMessageTx tx hash', createAtaMessageTx);

    //@ts-ignore
    const balance = await kamino.getTokenAccountBalance(createWSolAtaIxns.ata);
    console.log('balance', balance.toString());

    const closeAtaMessageTx = await sendAndConfirmTx(env.c, user.owner, createWSolAtaIxns.closeIxns);
    console.log('closeAtaMessageTx tx hash', closeAtaMessageTx);
  });

  it('create wSOL ata atomic', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const solAirdropAmount = new Decimal(1);
    const usdcAirdropAmount = new Decimal(100);
    const usdhAirdropAmount = new Decimal(0);

    const user = await createUser(
      env,
      fixtures.newOrcaStrategy,
      solAirdropAmount,
      usdcAirdropAmount,
      usdhAirdropAmount
    );

    const createWSolAtaIxns = await createWsolAtaIfMissing(kamino.getConnection(), new Decimal(0.9), user.owner);

    const createwSolAtaTxId = await sendAndConfirmTx(env.c, user.owner, [
      ...createWSolAtaIxns.createIxns,
      ...createWSolAtaIxns.closeIxns,
    ]);
    console.log('createwSolAta tx hash', createwSolAtaTxId);
  });

  it('single sided deposit only token A on Orca', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategyState = (await kamino.getStrategyByAddress(fixtures.newOrcaStrategy))!;

    const initialStrategyUsers = await kamino.getStrategyHolders(fixtures.newOrcaStrategy);

    const solAirdropAmount = new Decimal(1);
    const usdcAirdropAmount = new Decimal(100);
    const usdhAirdropAmount = new Decimal(0);

    const user = await createUser(
      env,
      fixtures.newOrcaStrategy,
      solAirdropAmount,
      usdcAirdropAmount,
      usdhAirdropAmount
    );

    const tokenADecimals = await getMintDecimals(env.c.rpc, strategyState.tokenAMint);
    const usdcDeposit = new Decimal(10.0);
    const swapper: SwapperIxBuilder = (
      input: DepositAmountsForSwap,
      tokenAMint: Address,
      tokenBMint: Address,
      user: TransactionSigner,
      slippageBps: Decimal
    ) => getLocalSwapIxs(input, tokenAMint, tokenBMint, user, slippageBps, env.admin);

    await sleep(2000);
    const initialTokenBalances = await kamino.getInitialUserTokenBalances(
      user.owner.address,
      strategyState.tokenAMint,
      strategyState.tokenBMint,
      undefined
    );
    console.log('initialTokenBalances', initialTokenBalances);

    const { instructions: singleSidedDepositIxs, lookupTablesAddresses: _lookupTables } =
      await kamino.singleSidedDepositTokenA(
        fixtures.newOrcaStrategy,
        usdcDeposit,
        user.owner,
        new Decimal(0),
        undefined,
        swapper
      );

    const increaseBudgetIx = createComputeUnitLimitIx(1_000_000);
    await sendAndConfirmTx(
      env.c,
      env.admin,
      [increaseBudgetIx, ...singleSidedDepositIxs],
      [],
      [strategyState.strategyLookupTable]
    );

    const strategy = await kamino.getStrategyByAddress(fixtures.newOrcaStrategy);
    expect(strategy).to.not.be.null;
    const accounts = await kamino.getStrategyHolders(fixtures.newOrcaStrategy);
    expect(accounts.length).to.be.eq(initialStrategyUsers.length + 1);

    const tokenALeft = await kamino.getConnection().getTokenAccountBalance(user.tokenAAta).send();
    const tokenBLeft = await kamino.getConnection().getTokenAccountBalance(user.tokenBAta).send();

    const expectedARemainingAmount = collToLamportsDecimal(new Decimal(90.0), tokenADecimals);
    expect(new Decimal(tokenALeft.value.amount).greaterThanOrEqualTo(expectedARemainingAmount)).to.be.true;
    expect(new Decimal(tokenALeft.value.amount).lessThan(expectedARemainingAmount.add(10))).to.be.true; // verify that the leftover from deposit is max 10 lamports
    expect(tokenBLeft.value.uiAmount).to.be.greaterThanOrEqual(0);
    expect(tokenBLeft.value.uiAmount).to.be.lessThanOrEqual(0.0001);
  });

  it('should withdraw shares from a Raydium strategy', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategyState = await kamino.getStrategyByAddress(fixtures.newRaydiumStrategy);
    expect(strategyState).not.to.be.null;
    if (strategyState == null) {
      throw new Error(`Could not fetch strategy for pubkey ${fixtures.newRaydiumStrategy.toString()}`);
    }

    const strategyWithAddress = { address: fixtures.newRaydiumStrategy, strategy: strategyState };
    const [sharesAta, sharesMintData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.sharesMint,
      env.admin.address
    );
    const [tokenAAta, tokenAData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.tokenAMint,
      env.admin.address
    );
    const [tokenBAta, tokenBData] = await getAssociatedTokenAddressAndAccount(
      env.c.rpc,
      strategyState.tokenBMint,
      env.admin.address
    );
    const tx = [createComputeUnitLimitIx()];
    const ataInstructions = await kamino.getCreateAssociatedTokenAccountInstructionsIfNotExist(
      env.admin,
      strategyWithAddress,
      tokenAData,
      tokenAAta,
      tokenBData,
      tokenBAta,
      sharesMintData,
      sharesAta
    );
    tx.push(...ataInstructions);

    const res = await sendAndConfirmTx(env.c, env.admin, tx);
    console.log('res createAtas ', res);
    await mintTo(env, strategyState.tokenAMint, tokenAAta, 9000000);
    await mintTo(env, strategyState.tokenBMint, tokenBAta, 9000000);
    await sleep(5000);

    const withdrawTx = [createComputeUnitLimitIx()];
    const withdrawIxns = await kamino.withdrawShares(strategyWithAddress, new Decimal(0.02), env.admin);
    tx.push(...withdrawIxns.prerequisiteIxs, withdrawIxns.withdrawIx);

    const txHash = await sendAndConfirmTx(env.c, env.admin, withdrawTx);
    console.log(txHash);
  });

  it('should withdraw all shares from an Orca strategy', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategy = (await kamino.getStrategyByAddress(fixtures.newOrcaStrategy))!;
    const strategyWithAddress = { strategy, address: fixtures.newOrcaStrategy };

    const solAirdropAmount = new Decimal(1);
    const usdcAirdropAmount = new Decimal(100);
    const usdhAirdropAmount = new Decimal(100);

    const user = await createUser(
      env,
      fixtures.newOrcaStrategy,
      solAirdropAmount,
      usdcAirdropAmount,
      usdhAirdropAmount
    );

    const tx = [createComputeUnitLimitIx(1200000)];
    const depositIx = await kamino.deposit(strategyWithAddress, new Decimal(1), new Decimal(2), user.owner);
    tx.push(depositIx);

    const depositTxHash = await sendAndConfirmTx(env.c, user.owner, tx);
    console.log('deposit tx hash', depositTxHash);

    const withdrawTx = [createComputeUnitLimitIx()];
    const withdrawIxns = await kamino.withdrawAllShares(strategyWithAddress, user.owner);
    if (withdrawIxns) {
      tx.push(...withdrawIxns.prerequisiteIxs, withdrawIxns.withdrawIx);
    } else {
      console.log('balance is 0, cant withdraw');
      return;
    }
    const withdrawTxHash = await sendAndConfirmTx(env.c, user.owner, withdrawTx);
    console.log('withdraw tx hash', withdrawTxHash);
  });

  it('should withdraw all shares from a Raydium strategy', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategy = (await kamino.getStrategyByAddress(fixtures.newRaydiumStrategy))!;
    const strategyWithAddress = { strategy, address: fixtures.newRaydiumStrategy };

    const solAirdropAmount = new Decimal(1);
    const usdcAirdropAmount = new Decimal(100);
    const usdhAirdropAmount = new Decimal(100);

    const user = await createUser(
      env,
      fixtures.newRaydiumStrategy,
      solAirdropAmount,
      usdcAirdropAmount,
      usdhAirdropAmount
    );

    const tx = [createComputeUnitLimitIx(1000000)];
    const depositIx = await kamino.deposit(strategyWithAddress, new Decimal(1), new Decimal(2), user.owner);
    tx.push(depositIx);

    const txHash = await sendAndConfirmTx(env.c, user.owner, tx);
    console.log('deposit tx hash', txHash);

    const withdrawTx = [createComputeUnitLimitIx(1000000)];
    const withdrawIxns = await kamino.withdrawAllShares(strategyWithAddress, user.owner);
    if (withdrawIxns) {
      tx.push(...withdrawIxns.prerequisiteIxs, withdrawIxns.withdrawIx);
    } else {
      console.log('balance is 0, cant withdraw');
      throw new Error('balance is 0, cant withdraw');
    }

    const withdrawSig = await sendAndConfirmTx(env.c, user.owner, withdrawTx);
    console.log('withdraw tx hash', withdrawSig);
  });

  it('should deposit tokens into an Orca strategy', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategy = (await kamino.getStrategyByAddress(fixtures.newOrcaStrategy))!;
    const strategyWithAddress = { strategy, address: fixtures.newOrcaStrategy };

    const solAirdropAmount = new Decimal(1);
    const usdcAirdropAmount = new Decimal(100);
    const usdhAirdropAmount = new Decimal(100);

    const user = await createUser(
      env,
      fixtures.newOrcaStrategy,
      solAirdropAmount,
      usdcAirdropAmount,
      usdhAirdropAmount
    );

    const tx = [createComputeUnitLimitIx(1200000)];
    const depositIx = await kamino.deposit(strategyWithAddress, new Decimal(1), new Decimal(2), user.owner);
    tx.push(depositIx);
    const txHash = await sendAndConfirmTx(env.c, user.owner, tx);
    console.log(txHash);
  });

  it('should deposit tokens into a Raydium strategy', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategy = (await kamino.getStrategyByAddress(fixtures.newRaydiumStrategy))!;
    const strategyWithAddress = { strategy, address: fixtures.newRaydiumStrategy };

    const solAirdropAmount = new Decimal(1);
    const usdcAirdropAmount = new Decimal(100);
    const usdhAirdropAmount = new Decimal(100);

    const user = await createUser(
      env,
      fixtures.newRaydiumStrategy,
      solAirdropAmount,
      usdcAirdropAmount,
      usdhAirdropAmount
    );

    const tx = [createComputeUnitLimitIx(1000000)];
    const depositIx = await kamino.deposit(strategyWithAddress, new Decimal(1), new Decimal(2), user.owner);
    tx.push(depositIx);
    const txHash = await sendAndConfirmTx(env.c, user.owner, tx);
    console.log(txHash);
  });

  it('should deposit tokens into an Orca strategy with calculated amount', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategy = (await kamino.getStrategyByAddress(fixtures.newOrcaStrategy))!;
    const strategyWithAddress = { strategy, address: fixtures.newOrcaStrategy };

    const solAirdropAmount = new Decimal(1);
    const usdcAirdropAmount = new Decimal(1000000000);
    const usdhAirdropAmount = new Decimal(1000000000);

    const user = await createUser(
      env,
      fixtures.newOrcaStrategy,
      solAirdropAmount,
      usdcAirdropAmount,
      usdhAirdropAmount
    );

    const tx = [createComputeUnitLimitIx(1000000)];

    const amounts = await kamino.calculateAmountsToBeDeposited(fixtures.newOrcaStrategy, new Decimal(5400));
    console.log('orca amounts', amounts);

    const depositIx = await kamino.deposit(strategyWithAddress, amounts[0], amounts[1], user.owner);
    tx.push(depositIx);
    const txHash = await sendAndConfirmTx(env.c, user.owner, tx);
    console.log(txHash);
  });

  it('should deposit tokens into a Raydium strategy with calculated amount', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategy = (await kamino.getStrategyByAddress(fixtures.newRaydiumStrategy))!;
    const strategyWithAddress = { strategy, address: fixtures.newRaydiumStrategy };

    const solAirdropAmount = new Decimal(1);
    const usdcAirdropAmount = new Decimal(1000000000);
    const usdhAirdropAmount = new Decimal(1000000000);

    const user = await createUser(
      env,
      fixtures.newRaydiumStrategy,
      solAirdropAmount,
      usdcAirdropAmount,
      usdhAirdropAmount
    );

    const tx = [createComputeUnitLimitIx(1000000)];

    const amounts = await kamino.calculateAmountsToBeDeposited(fixtures.newRaydiumStrategy, new Decimal(54));
    console.log('amounts', amounts);

    const depositIx = await kamino.deposit(strategyWithAddress, amounts[0], amounts[1], user.owner);
    tx.push(depositIx);
    const txHash = await sendAndConfirmTx(env.c, user.owner, tx);
    console.log(txHash);
  });

  it('should rebalance an Orca strategy', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId
    );

    // New position to rebalance into
    const newPosition = await generateKeyPairSigner();

    const [collectFeesIx, openPositionIx] = await kamino.rebalance(
      env.admin,
      fixtures.newOrcaStrategy,
      newPosition,
      new Decimal(0.99),
      new Decimal(1.01)
    );

    {
      const increaseBudgetIx = createComputeUnitLimitIx(1_000_000);
      const tx = [increaseBudgetIx, collectFeesIx];
      const sig = await sendAndConfirmTx(env.c, env.admin, tx);
      expect(sig).to.not.be.null;
      console.log('executive withdraw and collect fees have been executed ');
    }
    {
      const strategy = (await kamino.getStrategyByAddress(fixtures.newOrcaStrategy))!;
      const increaseBudgetIx = createComputeUnitLimitIx(1_000_000);

      console.log('opening raydium position in rebalancing');
      const sig = await sendAndConfirmTx(
        env.c,
        env.admin,
        [increaseBudgetIx, openPositionIx],
        [],
        [strategy.strategyLookupTable]
      );
      console.log('open position tx hash', sig);

      expect(sig).to.not.be.null;
    }
  });

  it('should rebalance a Raydium strategy', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategy = (await kamino.getStrategyByAddress(fixtures.newRaydiumStrategy))!;
    const strategyWithAddress = { strategy, address: fixtures.newRaydiumStrategy };
    const solAirdropAmount = new Decimal(1);
    const usdcAirdropAmount = new Decimal(100);
    const usdhAirdropAmount = new Decimal(100);

    const user = await createUser(
      env,
      fixtures.newRaydiumStrategy,
      solAirdropAmount,
      usdcAirdropAmount,
      usdhAirdropAmount
    );

    const tx = [createComputeUnitLimitIx(1000000)];

    const depositIx = await kamino.deposit(strategyWithAddress, new Decimal(10), new Decimal(10), user.owner);
    tx.push(depositIx);

    const depositTxHash = await sendAndConfirmTx(env.c, user.owner, tx);
    console.log('deposit tx hash', depositTxHash);

    // New position to rebalance into
    const newPosition = await generateKeyPairSigner();

    const rebalanceIxns = await kamino.rebalance(
      env.admin,
      fixtures.newRaydiumStrategy,
      newPosition,
      new Decimal(0.98),
      new Decimal(1.01)
    );

    let openPositionIx: IInstruction;
    if (rebalanceIxns.length == 1) {
      openPositionIx = rebalanceIxns[0];
    } else {
      openPositionIx = rebalanceIxns[1];

      const tx = [createComputeUnitLimitIx(1_000_000), rebalanceIxns[0]];
      const sig = await sendAndConfirmTx(env.c, env.admin, tx);
      expect(sig).to.not.be.null;
      console.log('executive withdraw and collect fees have been executed');
    }

    {
      const increaseBudgetIx = createComputeUnitLimitIx(1_000_000);
      console.log('opening raydium position in rebalancing');
      const myHash = await sendAndConfirmTx(
        env.c,
        env.admin,
        [increaseBudgetIx, openPositionIx],
        [],
        [strategy.strategyLookupTable]
      );
      console.log('open position tx hash', myHash);
    }

    {
      const invextIx = await kamino.invest(fixtures.newRaydiumStrategy, env.admin);
      const tx = [createComputeUnitLimitIx(1000000), invextIx];
      const sig = await sendAndConfirmTx(env.c, env.admin, tx);
      expect(sig).not.to.be.null;
    }
  });

  it('should rebalance a new Raydium strategy without liquidity', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const createRaydiumTx = [createComputeUnitLimitIx()];
    const newRaydiumStrategy = await generateKeyPairSigner();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(env.admin, newRaydiumStrategy);

    createRaydiumTx.push(createRaydiumStrategyAccountIx);
    const raydiumStrategyIx = await kamino.createStrategy(
      newRaydiumStrategy.address,
      fixtures.newRaydiumPool,
      env.admin,
      'RAYDIUM'
    );
    createRaydiumTx.push(raydiumStrategyIx);
    const raydiumTxHash = await sendAndConfirmTx(env.c, env.admin, createRaydiumTx);
    console.log('create new Raydium strategy tx hash', raydiumTxHash);

    // setup strategy lookup table
    await setupStrategyLookupTable(env, kamino, newRaydiumStrategy.address);
    await sleep(1000);
    await openPosition(env, kamino, env.admin, newRaydiumStrategy.address, new Decimal(0.97), new Decimal(1.03));

    const strategy = (await kamino.getStrategyByAddress(newRaydiumStrategy.address))!;

    // New position to rebalance into
    const newPosition = await generateKeyPairSigner();

    const rebalanceIxs = await kamino.rebalance(
      env.admin,
      newRaydiumStrategy.address,
      newPosition,
      new Decimal(0.98),
      new Decimal(1.01)
    );

    {
      const increaseBudgetIx = createComputeUnitLimitIx(1_400_000);

      console.log('rebalancing raydium strategy in rebalancing');
      const myHash = await sendAndConfirmTx(
        env.c,
        env.admin,
        [increaseBudgetIx, ...rebalanceIxs],
        [],
        [strategy.strategyLookupTable]
      );
      console.log('rebalance tx hash', myHash);
    }
  });

  it('should read all strats correctly with no filter', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const filters: StrategiesFilters = {
      strategyType: undefined,
      strategyCreationStatus: undefined,
    };
    const strats = await kamino.getAllStrategiesWithFilters(filters);
    expect(strats.length).to.be.eq(3);
  });

  it('should get strat by kToken mint', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategyByAddress = await kamino.getStrategyByAddress(fixtures.newRaydiumStrategy);
    expect(strategyByAddress).not.null;

    const strategyByKToken = await kamino.getStrategyByKTokenMint(strategyByAddress!.sharesMint);
    expect(strategyByKToken).not.null;
    expect(strategyByKToken!.address).to.be.eq(fixtures.newRaydiumStrategy);
  });

  it('should read strats correctly when no strat match the filter', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const filters: StrategiesFilters = {
      strategyType: 'STABLE',
      strategyCreationStatus: undefined,
    };
    const strats = await kamino.getAllStrategiesWithFilters(filters);
    console.log('strats.length', strats.length);
    expect(strats.length).to.be.eq(0);
  });

  it('should read strats correctly with creation status SHADOW', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const filters: StrategiesFilters = {
      strategyType: undefined,
      strategyCreationStatus: 'IGNORED',
    };
    const strats = await kamino.getAllStrategiesWithFilters(filters);
    expect(strats.length).to.be.eq(3);
  });

  it('should read strats correctly with strategy type NON_PEGGED', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const filters: StrategiesFilters = {
      strategyType: 'NON_PEGGED',
      strategyCreationStatus: undefined,
    };
    const strats = await kamino.getAllStrategiesWithFilters(filters);
    expect(strats.length).to.be.eq(3);
  });

  it('should read strats correctly after creation status changes', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const filters: StrategiesFilters = {
      strategyType: undefined,
      strategyCreationStatus: 'IGNORED',
    };
    let strats = await kamino.getAllStrategiesWithFilters(filters);
    expect(strats.length).to.be.eq(3);

    // set creation state to live
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateStrategyCreationState(), new Decimal(2));

    // assert only a single strat remained SHADOW
    strats = await kamino.getAllStrategiesWithFilters(filters);
    expect(strats.length).to.be.eq(2);

    // assert there is a strategy with creation status LIVE
    filters.strategyCreationStatus = 'LIVE';
    strats = await kamino.getAllStrategiesWithFilters(filters);
    expect(strats.length).to.be.eq(1);
  });

  it('should read strats correctly after strategy type changes', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const filters: StrategiesFilters = {
      strategyType: 'NON_PEGGED',
      strategyCreationStatus: undefined,
    };
    let strats = await kamino.getAllStrategiesWithFilters(filters);
    expect(strats.length).to.be.eq(3);

    // set it to STABLE
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateStrategyType(), new Decimal(2));

    // assert that only one strat is NON_PEGGED
    strats = await kamino.getAllStrategiesWithFilters(filters);
    expect(strats.length).to.be.eq(2);

    // assert there is one strat that is STABLE
    filters.strategyType = 'STABLE';
    strats = await kamino.getAllStrategiesWithFilters(filters);
    expect(strats.length).to.be.eq(1);
  });

  it('create_terms_signature_and_read_state', async () => {
    const owner = await generateKeyPairSigner();

    await solAirdrop(env.c, owner.address, new Decimal(100));

    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    // generate signature for a basic message
    const message = Uint8Array.from([0xab, 0xbc, 0xcd, 0xde]);
    const signature = await owner.signMessages([{ content: message, signatures: {} }]);

    // initialize signature
    const signTermsIx = await kamino.getUserTermsSignatureIx(owner, signature[0][owner.address]);
    await sendAndConfirmTx(env.c, owner, [signTermsIx]);

    const termsSignatureState = await kamino.getUserTermsSignatureState(owner.address);
    console.log(termsSignatureState);
    expect(termsSignatureState).to.not.be.null;
  });

  it('read depositable tokens', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const depositableTokens = await kamino.getDepositableTokens();
    expect(depositableTokens.length).to.be.eq(2);

    expect(depositableTokens[1].mint.toString()).to.be.eq(fixtures.newTokenMintA.toString());
    expect(depositableTokens[0].mint.toString()).to.be.eq(fixtures.newTokenMintB.toString());
  });

  it('proportional deposit no tokenA in strategy', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const totalTokens: TokenAmounts = { a: ZERO, b: new Decimal(489_454) };
    // @ts-ignore
    // let { aToDeposit, bToDeposit }
    const tokens = await kamino.calculateDepositAmountsProportionalWithTotalTokens(
      totalTokens,
      new Decimal(1000),
      new Decimal(2000)
    );

    expect(tokens[0]).to.be.eq(ZERO);
    expect(tokens[1].toString()).to.be.eq(new Decimal(2000).toString());
  });

  it('proportional deposit no tokenB in strategy', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const totalTokens: TokenAmounts = { a: new Decimal(5678), b: ZERO };
    // @ts-ignore
    const tokens = await kamino.calculateDepositAmountsProportionalWithTotalTokens(
      totalTokens,
      new Decimal(546),
      new Decimal(2000)
    );

    expect(tokens[0].toString()).to.be.eq(new Decimal(546).toString());
    expect(tokens[1].toString()).to.be.eq(ZERO.toString());
  });

  it('proportional deposit more tokenA in strategy', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const totalTokens: TokenAmounts = { a: new Decimal(3000), b: new Decimal(1000) };
    // @ts-ignore
    const tokens = await kamino.calculateDepositAmountsProportionalWithTotalTokens(
      totalTokens,
      new Decimal(546),
      new Decimal(2000)
    );

    expect(tokens[0].toString()).to.be.eq(new Decimal(546).toString());
    expect(tokens[1].toString()).to.be.eq(new Decimal(182).toString());
  });

  it('proportional deposit more tokenA in strategy but not enough tokenB to deposit for all A', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const totalTokens: TokenAmounts = { a: new Decimal(3000), b: new Decimal(1000) };
    // @ts-ignore
    const tokens = await kamino.calculateDepositAmountsProportionalWithTotalTokens(
      totalTokens,
      new Decimal(546),
      new Decimal(180)
    );

    expect(tokens[0].toString()).to.be.eq(new Decimal(540).toString());
    expect(tokens[1].toString()).to.be.eq(new Decimal(180).toString());
  });

  it('proportional deposit more tokenB in strategy', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const totalTokens: TokenAmounts = { a: new Decimal(111), b: new Decimal(444) };
    // @ts-ignore
    const tokens = await kamino.calculateDepositAmountsProportionalWithTotalTokens(
      totalTokens,
      new Decimal(200),
      new Decimal(2000)
    );

    expect(tokens[0].toString()).to.be.eq(new Decimal(200).toString());
    expect(tokens[1].toString()).to.be.eq(new Decimal(800).toString());
  });

  it('proportional deposit more tokenB in strategy but not enough tokenA to deposit for all B', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const totalTokens: TokenAmounts = { a: new Decimal(2000), b: new Decimal(5000) };
    // @ts-ignore
    const tokens = await kamino.calculateDepositAmountsProportionalWithTotalTokens(
      totalTokens,
      new Decimal(10),
      new Decimal(450)
    );

    expect(tokens[0].toString()).to.be.eq(new Decimal(10).toString());
    expect(tokens[1].toString()).to.be.eq(new Decimal(25).toString());
  });

  it('read Strategy Performance Fee when no min performance fee in GlobalConfig', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    let performanceFees = await kamino.getStrategyPerformanceFees(fixtures.newOrcaStrategy);
    expect(performanceFees.feesFeeBPS.eq(ZERO)).to.be.true;
    expect(performanceFees.reward0FeeBPS.eq(ZERO)).to.be.true;
    expect(performanceFees.reward1FeeBPS.eq(ZERO)).to.be.true;
    expect(performanceFees.reward2FeeBPS.eq(ZERO)).to.be.true;

    // update fees and check they are read correctly
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateCollectFeesFee(), new Decimal(200));
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateReward0Fee(), new Decimal(300));
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateReward1Fee(), new Decimal(400));
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateReward2Fee(), new Decimal(500));

    await sleep(1000);
    performanceFees = await kamino.getStrategyPerformanceFees(fixtures.newOrcaStrategy);
    expect(performanceFees.feesFeeBPS.eq(new Decimal(200))).to.be.true;
    expect(performanceFees.reward0FeeBPS.eq(new Decimal(300))).to.be.true;
    expect(performanceFees.reward1FeeBPS.eq(new Decimal(400))).to.be.true;
    expect(performanceFees.reward2FeeBPS.eq(new Decimal(500))).to.be.true;

    // update fees again and check that they were updated
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateCollectFeesFee(), ZERO);
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateReward0Fee(), ZERO);
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateReward1Fee(), ZERO);
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateReward2Fee(), ZERO);

    await sleep(1000);
    performanceFees = await kamino.getStrategyPerformanceFees(fixtures.newOrcaStrategy);
    expect(performanceFees.feesFeeBPS.eq(ZERO)).to.be.true;
    expect(performanceFees.reward0FeeBPS.eq(ZERO)).to.be.true;
    expect(performanceFees.reward1FeeBPS.eq(ZERO)).to.be.true;
    expect(performanceFees.reward2FeeBPS.eq(ZERO)).to.be.true;
  });

  it('read Strategy Performance Fee with min performance fee in GlobalConfig', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    await updateGlobalConfig(
      env,
      kamino,
      kamino.getGlobalConfig(),
      '0',
      new GlobalConfigOption.MinPerformanceFeeBps(),
      new Decimal(500).toString(),
      'number'
    );

    await sleep(1000);
    let performanceFees = await kamino.getStrategyPerformanceFees(fixtures.newOrcaStrategy);
    expect(performanceFees.feesFeeBPS.eq(new Decimal(500))).to.be.true;
    expect(performanceFees.reward0FeeBPS.eq(new Decimal(500))).to.be.true;
    expect(performanceFees.reward1FeeBPS.eq(new Decimal(500))).to.be.true;
    expect(performanceFees.reward2FeeBPS.eq(new Decimal(500))).to.be.true;

    // update fees and check they are read correctly
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateCollectFeesFee(), new Decimal(400));
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateReward0Fee(), new Decimal(450));
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateReward1Fee(), new Decimal(700));
    await updateStrategyConfig(env, fixtures.newOrcaStrategy, new UpdateReward2Fee(), new Decimal(800));

    await sleep(1000);
    performanceFees = await kamino.getStrategyPerformanceFees(fixtures.newOrcaStrategy);
    expect(performanceFees.feesFeeBPS.eq(new Decimal(500))).to.be.true;
    expect(performanceFees.reward0FeeBPS.eq(new Decimal(500))).to.be.true;
    expect(performanceFees.reward1FeeBPS.eq(new Decimal(700))).to.be.true;
    expect(performanceFees.reward2FeeBPS.eq(new Decimal(800))).to.be.true;

    // update globalConfig min perf fee
    await updateGlobalConfig(
      env,
      kamino,
      kamino.getGlobalConfig(),
      '0',
      new GlobalConfigOption.MinPerformanceFeeBps(),
      new Decimal(420).toString(),
      'number'
    );

    await sleep(1000);
    performanceFees = await kamino.getStrategyPerformanceFees(fixtures.newOrcaStrategy);
    expect(performanceFees.feesFeeBPS.eq(new Decimal(420))).to.be.true;
    expect(performanceFees.reward0FeeBPS.eq(new Decimal(450))).to.be.true;
    expect(performanceFees.reward1FeeBPS.eq(new Decimal(700))).to.be.true;
    expect(performanceFees.reward2FeeBPS.eq(new Decimal(800))).to.be.true;
  });

  it('should get RAYDIUM strategy holdings round down withdraw/default', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategyState = (await kamino.getStrategyByAddress(fixtures.newRaydiumStrategy))!;
    // Deposit some funds
    await setupAta(env.c, env.admin, strategyState.sharesMint);
    const depositTxn = [createComputeUnitLimitIx(1000000)];
    const depositIx = await kamino.deposit(
      fixtures.newRaydiumStrategy,
      new Decimal(99.999999),
      new Decimal(99.999997),
      env.admin
    );
    depositTxn.push(depositIx);
    await sendAndConfirmTx(env.c, env.admin, depositTxn);

    const strategy = await kamino.getStrategyByAddress(fixtures.newRaydiumStrategy);
    expect(strategy).not.to.be.null;
    const amounts = await kamino.getStrategyTokensHoldings(fixtures.newRaydiumStrategy, 'WITHDRAW');
    expect(amounts.a.toNumber()).to.be.greaterThanOrEqual(97387845);
    expect(amounts.b.toNumber()).to.be.greaterThanOrEqual(99999997);
    console.log(amounts);
  });

  it('should get RAYDIUM strategy holdings round up for deposit', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategyState = (await kamino.getStrategyByAddress(fixtures.newRaydiumStrategy))!;
    // Deposit some funds
    await setupAta(env.c, env.admin, strategyState.sharesMint);
    const depositTxn = [createComputeUnitLimitIx(1000000)];
    const depositIx = await kamino.deposit(
      fixtures.newRaydiumStrategy,
      new Decimal(99.999999),
      new Decimal(99.999997),
      env.admin
    );
    depositTxn.push(depositIx);
    await sendAndConfirmTx(env.c, env.admin, depositTxn);

    const strategy = await kamino.getStrategyByAddress(fixtures.newRaydiumStrategy);
    expect(strategy).not.to.be.null;
    const amounts = await kamino.getStrategyTokensHoldings(fixtures.newRaydiumStrategy, 'DEPOSIT');
    expect(amounts.a.toNumber()).to.be.greaterThanOrEqual(97387845);
    expect(amounts.b.toNumber()).to.be.greaterThanOrEqual(99999997);
    console.log(amounts);
  });

  it('should get Orca strategy holdings round down withdraw/default', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategyState = (await kamino.getStrategyByAddress(fixtures.newOrcaStrategy))!;
    // Deposit some funds
    await setupAta(env.c, env.admin, strategyState.sharesMint);
    const depositTxn = [createComputeUnitLimitIx(1000000)];
    const depositIx = await kamino.deposit(
      fixtures.newOrcaStrategy,
      new Decimal(99.999999),
      new Decimal(99.999997),
      env.admin
    );
    depositTxn.push(depositIx);
    await sendAndConfirmTx(env.c, env.admin, depositTxn);

    const strategy = await kamino.getStrategyByAddress(fixtures.newOrcaStrategy);
    expect(strategy).not.to.be.null;
    const amounts = await kamino.getStrategyTokensHoldings(fixtures.newOrcaStrategy, 'WITHDRAW');
    console.log(amounts);
    expect(amounts.a.toNumber()).to.be.greaterThanOrEqual(97387845);
    expect(amounts.b.toNumber()).to.be.greaterThanOrEqual(99999997);
  });

  it('should get Orca strategy holdings round up for deposit', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );

    const strategyState = (await kamino.getStrategyByAddress(fixtures.newOrcaStrategy))!;
    // Deposit some funds
    await setupAta(env.c, env.admin, strategyState.sharesMint);
    const depositTxn = [createComputeUnitLimitIx(1000000)];
    const depositIx = await kamino.deposit(
      fixtures.newOrcaStrategy,
      new Decimal(99.999999),
      new Decimal(99.999997),
      env.admin
    );
    depositTxn.push(depositIx);
    await sendAndConfirmTx(env.c, env.admin, depositTxn);

    const strategy = await kamino.getStrategyByAddress(fixtures.newOrcaStrategy);
    expect(strategy).not.to.be.null;
    const amounts = await kamino.getStrategyTokensHoldings(fixtures.newOrcaStrategy, 'DEPOSIT');
    expect(amounts.a.toNumber()).to.be.greaterThanOrEqual(97387845);
    expect(amounts.b.toNumber()).to.be.greaterThanOrEqual(99999997);
    console.log(amounts);
  });

  it('closes the strategy with no position open', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );
    // Create a new strategy
    const txStrategyCreate: IInstruction[] = [createComputeUnitLimitIx()];
    const newOrcaStrategy = await generateKeyPairSigner();
    const createStrategyAccountIx = await kamino.createStrategyAccount(env.admin, newOrcaStrategy);
    txStrategyCreate.push(createStrategyAccountIx);
    const orcaStrategyIx = await kamino.createStrategy(
      newOrcaStrategy.address,
      fixtures.newWhirlpool,
      env.admin,
      'ORCA'
    );
    txStrategyCreate.push(orcaStrategyIx);
    await sendAndConfirmTx(env.c, env.admin, txStrategyCreate);
    const strategyBefore = (await kamino.getStrategyByAddress(newOrcaStrategy.address))!;

    // Close it right after
    const tx = [createComputeUnitLimitIx(1000000)];
    const closeIx = await kamino.closeStrategy(env.admin, newOrcaStrategy.address);
    tx.push(closeIx);
    await sendAndConfirmTx(env.c, env.admin, tx);

    const strategy = await kamino.getStrategyByAddress(newOrcaStrategy.address);
    expect(strategy).to.be.null;
    try {
      const position = await kamino.getPositionRangeOrca(
        strategyBefore.position,
        strategyBefore.tokenAMintDecimals.toNumber(),
        strategyBefore.tokenBMintDecimals.toNumber()
      );
      expect(position).to.be.null;
    } catch (error) {
      console.log(`Fetching closed position got err ${error}`);
    }
  });

  it('closes the strategy with position open', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );
    // Create a new strategy
    const txStrategyCreate = [createComputeUnitLimitIx()];
    const newOrcaStrategy = await generateKeyPairSigner();
    const createStrategyAccountIx = await kamino.createStrategyAccount(env.admin, newOrcaStrategy);
    txStrategyCreate.push(createStrategyAccountIx);
    const orcaStrategyIx = await kamino.createStrategy(
      newOrcaStrategy.address,
      fixtures.newWhirlpool,
      env.admin,
      'ORCA'
    );
    txStrategyCreate.push(orcaStrategyIx);
    await sendAndConfirmTx(env.c, env.admin, txStrategyCreate);
    // setup strategy lookup table
    await setupStrategyLookupTable(env, kamino, newOrcaStrategy.address);
    await sleep(1000);
    await openPosition(env, kamino, env.admin, newOrcaStrategy.address, new Decimal(0.97), new Decimal(1.03));
    const strategyState = (await kamino.getStrategyByAddress(newOrcaStrategy.address))!;

    // Close it right after
    const tx = [createComputeUnitLimitIx(1000000)];
    const closeIx = await kamino.closeStrategy(env.admin, newOrcaStrategy.address);
    tx.push(closeIx);
    await sendAndConfirmTx(env.c, env.admin, tx);

    const strategy = await kamino.getStrategyByAddress(newOrcaStrategy.address);
    expect(strategy).to.be.null;
    try {
      const position = await kamino.getPositionRangeOrca(
        strategyState.position,
        strategyState.tokenAMintDecimals.toNumber(),
        strategyState.tokenBMintDecimals.toNumber()
      );
      expect(position).to.be.null;
    } catch (error) {
      console.log(`Fetching closed position got err ${error}`);
    }
  });

  it('withdraw all shares and closes the strategy with position open', async () => {
    const kamino = new Kamino(
      'localnet',
      env.c.rpc,
      env.legacyConnection,
      fixtures.globalConfig,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      env.raydiumProgramId
    );
    // Create a new strategy
    const txStrategyCreate = [createComputeUnitLimitIx()];
    const newOrcaStrategy = await generateKeyPairSigner();
    const createStrategyAccountIx = await kamino.createStrategyAccount(env.admin, newOrcaStrategy);
    txStrategyCreate.push(createStrategyAccountIx);
    const orcaStrategyIx = await kamino.createStrategy(
      newOrcaStrategy.address,
      fixtures.newWhirlpool,
      env.admin,
      'ORCA'
    );
    txStrategyCreate.push(orcaStrategyIx);
    await sendAndConfirmTx(env.c, env.admin, txStrategyCreate);
    await updateStrategyConfig(env, newOrcaStrategy.address, new UpdateDepositCapIxn(), new Decimal(1000000000000000));
    await updateStrategyConfig(env, newOrcaStrategy.address, new UpdateDepositCap(), new Decimal(10000000000000000));
    const strategyState = (await kamino.getStrategyByAddress(newOrcaStrategy.address))!;

    // Create lookup table and open new position
    await setupStrategyLookupTable(env, kamino, newOrcaStrategy.address);
    await sleep(1000);
    await openPosition(env, kamino, env.admin, newOrcaStrategy.address, new Decimal(0.97), new Decimal(1.03));

    // Deposit some funds
    await setupAta(env.c, env.admin, strategyState.sharesMint);
    const depositTxn = [createComputeUnitLimitIx(1000000)];
    const depositIx = await kamino.deposit(newOrcaStrategy.address, new Decimal(100.0), new Decimal(100.0), env.admin);
    depositTxn.push(depositIx);
    await sendAndConfirmTx(env.c, env.admin, depositTxn);

    // Withdraw all shares and close it right after
    const tx = [createComputeUnitLimitIx(1000000)];
    const withdrawAndClose = await kamino.withdrawAllAndCloseStrategy(env.admin, newOrcaStrategy.address);
    expect(withdrawAndClose).to.not.be.null;
    for (const ixn of withdrawAndClose!.withdrawIxns) {
      tx.push(ixn);
    }
    tx.push(withdrawAndClose!.closeIxn);
    await sendAndConfirmTx(env.c, env.admin, tx);

    const strategy = await kamino.getStrategyByAddress(newOrcaStrategy.address);
    expect(strategy).to.be.null;
    try {
      const position = await kamino.getPositionRangeOrca(
        strategyState.position,
        strategyState.tokenAMintDecimals.toNumber(),
        strategyState.tokenBMintDecimals.toNumber()
      );
      expect(position).to.be.null;
    } catch (error) {
      console.log(`Fetching closed position got err ${error}`);
    }
  });

  it.skip('should get all mainnet Kamino prices', async () => {
    const rpcUrl: string = 'https://api.mainnet-beta.solana.com';
    const wsUrl: string = 'wss://api.mainnet-beta.solana.com';
    const env = await initEnv({
      rpcUrl,
      wsUrl,
      kliquidityProgramId: KLIQUIDITY_PROGRAM_ID,
      raydiumProgramId: RAYDIUM_PROGRAM_ID,
    });
    const kamino = new Kamino('mainnet-beta', env.c.rpc, env.legacyConnection);
    const prices = await kamino.getAllPrices();
    expect(prices).not.to.be.undefined;
    expect(Object.keys(prices.spot)).to.have.length.greaterThan(0);
    const usdh = prices.spot['USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX'];
    const usdhTwap = prices.twap['USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX'];
    expect(usdh).not.to.be.undefined;
    expect(usdh!.name).to.be.equal('USDH');
    expect(usdh!.price.toNumber()).to.be.greaterThan(0);
    expect(usdhTwap).not.to.be.undefined;
    expect(usdhTwap!.name).to.be.equal('USDH');
    expect(usdhTwap!.price.toNumber()).to.be.greaterThan(0);
  });
});

export async function openPosition(
  env: Env,
  kamino: Kamino,
  owner: TransactionSigner,
  strategy: Address,
  priceLower: Decimal,
  priceUpper: Decimal
) {
  // Open position
  const positionMint = await generateKeyPairSigner();
  {
    const strategyState = await kamino.getWhirlpoolStrategy(strategy);
    const openPositionIx = await kamino.openPosition(owner, strategy, positionMint, priceLower, priceUpper);
    const increaseBudgetIx = createComputeUnitLimitIx(1_400_000);

    const sig = await sendAndConfirmTx(
      env.c,
      owner,
      [increaseBudgetIx, openPositionIx],
      [],
      [strategyState!.strategyLookupTable]
    );

    console.log('open ray position th hash', sig);
    console.log('new position has been opened', positionMint.address);
  }
}

export async function setUpGlobalConfig(
  env: Env,
  kamino: Kamino,
  scopeProgram: Address,
  scopePrices: Address
): Promise<Address> {
  const globalConfig = await generateKeyPairSigner();

  const createGlobalConfigIx = await kamino.createAccountRentExempt(
    env.admin,
    globalConfig,
    BigInt(GlobalConfig.layout.span + 8)
  );

  const initializeGlobalConfigIx = kamino.initializeGlobalConfig(env.admin, globalConfig.address);

  const sig = await sendAndConfirmTx(env.c, env.admin, [createGlobalConfigIx, initializeGlobalConfigIx]);

  console.log('Initialize Global Config: ' + globalConfig.address);
  console.log('Initialize Global Config txn: ' + sig);

  kamino.setGlobalConfig(globalConfig.address);

  // Now set the Scope accounts
  await updateGlobalConfig(
    env,
    kamino,
    kamino.getGlobalConfig(),
    '0',
    new GlobalConfigOption.ScopeProgramId(),
    scopeProgram.toString(),
    'key'
  );

  await updateGlobalConfig(
    env,
    kamino,
    kamino.getGlobalConfig(),
    '0',
    new GlobalConfigOption.AddScopePriceId(),
    scopePrices.toString(),
    'key'
  );

  return globalConfig.address;
}

export async function setUpCollateralInfo(env: Env, kamino: Kamino): Promise<Address> {
  const collInfo = await generateKeyPairSigner();

  const createCollateralInfoIx = await kamino.createAccountRentExempt(
    env.admin,
    collInfo,
    BigInt(CollateralInfos.layout.span + 8)
  );

  const accounts: Instructions.InitializeCollateralInfoAccounts = {
    adminAuthority: env.admin,
    globalConfig: kamino.getGlobalConfig(),
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
    collInfo: collInfo.address,
  };

  const initializeCollateralInfosIx = Instructions.initializeCollateralInfo(accounts, kamino.getProgramID());

  const sig = await sendAndConfirmTx(env.c, env.admin, [createCollateralInfoIx, initializeCollateralInfosIx]);

  console.log('Initialize Coll Info: ' + collInfo.address);
  console.log('Initialize Coll Info txn: ' + sig);

  // Now set the collateral infos into the global config
  await updateGlobalConfig(
    env,
    kamino,
    kamino.getGlobalConfig(),
    '0',
    new GlobalConfigOption.UpdateTokenInfos(),
    collInfo.address.toString(),
    'key'
  );

  return collInfo.address;
}

export async function updateGlobalConfig(
  env: Env,
  kamino: Kamino,
  globalConfig: Address,
  keyIndex: string,
  globalConfigOption: GlobalConfigOptionKind,
  flagValue: string,
  flagValueType: string
): Promise<Signature> {
  let value: bigint | Address | boolean;
  if (flagValueType == 'number') {
    console.log('flagvalue is number');
    value = BigInt(flagValue);
  } else if (flagValueType == 'bool') {
    if (flagValue == 'false') {
      value = false;
    } else if (flagValue == 'true') {
      value = true;
    } else {
      throw new Error('the provided flag value is not valid bool');
    }
  } else if (flagValueType == 'key') {
    value = address(flagValue);
  } else {
    throw new Error("flagValueType must be 'number', 'bool', or 'key'");
  }

  const index = Number.parseInt(keyIndex);
  const updateConfigIx = kamino.updateGlobalConfig(env.admin, globalConfig, globalConfigOption, index, value);
  const sig = await sendAndConfirmTx(env.c, env.admin, [updateConfigIx]);

  console.log('Update Global Config ', globalConfigOption.toJSON(), sig);
  return sig;
}

export async function updateCollateralInfoForToken(
  env: Env,
  collTokenIndex: number,
  scopeChainId: bigint,
  globalConfig: Address,
  collateralToken: string,
  collInfoTwapId: bigint,
  tokenMint: Address,
  scopePrices: Address
) {
  // Set Mint
  await updateCollateralInfo(env, globalConfig, collTokenIndex, new UpdateCollateralInfoMode.CollateralId(), tokenMint);

  // Set Label
  await updateCollateralInfo(
    env,
    globalConfig,
    collTokenIndex,
    new UpdateCollateralInfoMode.UpdateName(),
    getCollInfoEncodedName(collateralToken)
  );

  // Set Scope Prices Feed
  await updateCollateralInfo(
    env,
    globalConfig,
    collTokenIndex,
    new UpdateCollateralInfoMode.UpdateScopeFeed(),
    scopePrices
  );

  // Set Twap
  await updateCollateralInfo(
    env,
    globalConfig,
    collTokenIndex,
    new UpdateCollateralInfoMode.UpdateScopeTwap(),
    getCollInfoEncodedChainFromIndexes([Number.parseInt(collInfoTwapId.toString())])
  );

  // Set Scope Chain
  await updateCollateralInfo(
    env,
    globalConfig,
    collTokenIndex,
    new UpdateCollateralInfoMode.UpdateScopeChain(),
    getCollInfoEncodedChainFromIndexes([Number.parseInt(scopeChainId.toString())])
  );

  // Set Twap Max Age
  await updateCollateralInfo(
    env,
    globalConfig,
    collTokenIndex,
    new UpdateCollateralInfoMode.UpdateTwapMaxAge(),
    BigInt(DEFAULT_MAX_PRICE_AGE)
  );

  // Set Price Max Age
  await updateCollateralInfo(
    env,
    globalConfig,
    collTokenIndex,
    new UpdateCollateralInfoMode.UpdatePriceMaxAge(),
    BigInt(DEFAULT_MAX_PRICE_AGE)
  );
}
