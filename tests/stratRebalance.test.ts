import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  Dex,
  DriftRebalanceTypeName,
  ExpanderRebalanceTypeName,
  Kamino,
  ManualRebalanceTypeName,
  PeriodicRebalanceTypeName,
  PricePercentageRebalanceTypeName,
  PricePercentageWithResetRebalanceTypeName,
  sleep,
  TakeProfitRebalanceTypeName,
} from '../src';
import Decimal from 'decimal.js';
import { GlobalConfigMainnet, KaminoProgramIdMainnet } from './utils';
import { expect } from 'chai';
import { WHIRLPOOL_PROGRAM_ID } from '../src/whirlpools-client/programId';
import { PROGRAM_ID as RAYDIUM_PROGRAM_ID } from '../src/raydium_client/programId';
import {
  Drift,
  Expander,
  Manual,
  PeriodicRebalance,
  PricePercentage,
  PricePercentageWithReset,
  TakeProfit,
} from '../src/kamino-client/types/RebalanceType';
import { getComputeBudgetAndPriorityFeeIxns } from '../src/utils/transactions';
import { POOL, TWAP } from '../src/kamino-client/types/ReferencePriceType';
import {
  DriftRebalanceMethod,
  ExpanderMethod,
  PeriodicRebalanceMethod,
  PricePercentageRebalanceMethod,
  PricePercentageWithResetRangeRebalanceMethod,
  TakeProfitMethod,
} from '../src/utils/CreationParameters';
import { priceToTickIndex } from '@orca-so/whirlpool-sdk';
import { getMintDecimals } from '../src/utils';

describe.skip('Kamino strategy creation SDK Tests', () => {
  const cluster = 'mainnet-beta';

  const clusterUrl: string = 'https://api.mainnet-beta.solana.com';

  const connection: Connection = new Connection(clusterUrl, 'processed');

  // use your private key here
  // const signerPrivateKey = [];
  // const signer = Keypair.fromSecretKey(Uint8Array.from(signerPrivateKey));
  const signer = Keypair.generate();

  it.skip('build manual strategy Orca SOL-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    let newPosition = Keypair.generate();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const priceLower = new Decimal(15.0);
    const priceUpper = new Decimal(21.0);
    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'ORCA',
      new Decimal('5'),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(Manual.discriminator),
      [priceLower, priceUpper],
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

    const strategySetupIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(0, 4).map((ix) => strategySetupIxs.push(ix));
    const setupStratTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupIxs);
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    const strategySetupFeesIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(4).map((ix) => strategySetupFeesIxs.push(ix));
    strategySetupFeesIxs.push(buildNewStrategyIxs.updateRebalanceParamsIx);
    const setupStratFeesTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupFeesIxs);
    const setupStratFeesTransactionV0 = new VersionedTransaction(setupStratFeesTx);
    setupStratFeesTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratFeesTransactionV0);
    console.log('setup strategy fees tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);
    console.log('updateRewardMappingIxs', updateRewardMappingIxs.length);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

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

    // open position
    const openPositionIxn = buildNewStrategyIxs.openPositionIxs;
    const openPositionMessage = await kamino.getTransactionV2Message(signer.publicKey, [
      ...getComputeBudgetAndPriorityFeeIxns(1_400_000),
      ...openPositionIxn,
    ]);
    const openPositionTx = new VersionedTransaction(openPositionMessage);
    openPositionTx.sign([signer, newPosition]);

    //@ts-ignore
    const openPositionTxId = await sendAndConfirmTransaction(kamino._connection, openPositionTx);
    console.log('openPositionTxId', openPositionTxId);

    let stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);
    expect(stratFields.length == 3);
    expect(stratFields[0]['label'] == 'rebalanceType');
    expect(stratFields[0]['value'] == ManualRebalanceTypeName);
    expect(stratFields[1]['label'] == 'rangePriceLower');
    expect(stratFields[1]['value'].toString() == priceLower.toString());
    expect(stratFields[2]['label'] == 'rangePriceUpper');
    expect(stratFields[2]['value'] == priceUpper.toString());

    // update the rebalance params with new values; in the UI these should come from the user
    const newPriceLower = new Decimal(17.3);
    const newPriceUpper = new Decimal(30.0);
    const newPriceLowerInput = { label: 'rangePriceLower', value: newPriceLower };
    const newPriceUpperInput = { label: 'rangePriceUpper', value: newPriceUpper };
    const updateStratFields = kamino.getUpdatedRebalanceFieldInfos(stratFields, [
      newPriceLowerInput,
      newPriceUpperInput,
    ]);

    expect(updateStratFields.length == 3);
    expect(updateStratFields[0]['label'] == 'rebalanceType');
    expect(updateStratFields[0]['value'] == ManualRebalanceTypeName);
    expect(updateStratFields[1]['label'] == 'rangePriceLower');
    expect(updateStratFields[1]['value'].toString() == newPriceLower.toString());
    expect(updateStratFields[2]['label'] == 'rangePriceUpper');
    expect(updateStratFields[2]['value'] == newPriceUpper.toString());

    const updateStratIx = await kamino.getUpdateRebalancingParamsFromRebalanceFieldsIx(
      signer.publicKey,
      newStrategy.publicKey,
      updateStratFields
    );

    const updateStratTx = await kamino.getTransactionV2Message(signer.publicKey, [updateStratIx]);
    const updateStratTransactionV0 = new VersionedTransaction(updateStratTx);
    updateStratTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, updateStratTransactionV0);
    console.log('update strategy rebalance params tx hash', txHash);

    // rebalance with new range
    newPosition = Keypair.generate();
    const rebalanceIxns = await kamino.rebalance(
      newStrategy.publicKey,
      newPosition.publicKey,
      newPriceLower,
      newPriceUpper
    );
    const rebalanceMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...rebalanceIxns],
      [...(await kamino.getMainLookupTablePks()), strategyLookupTable]
    );
    const rebalanceTx = new VersionedTransaction(rebalanceMessage);
    rebalanceTx.sign([signer, newPosition]);

    //@ts-ignore
    const rebalanceTxId = await sendAndConfirmTransaction(kamino._connection, rebalanceTx);
    console.log('rebalanceTxId', rebalanceTxId);

    stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);
    expect(stratFields.length == 3);
    expect(stratFields[0]['label'] == 'rebalanceType');
    expect(stratFields[0]['value'] == ManualRebalanceTypeName);
    expect(stratFields[1]['label'] == 'rangePriceLower');
    expect(stratFields[1]['value'].toString() == newPriceLower.toString());
    expect(stratFields[2]['label'] == 'rangePriceUpper');
    expect(stratFields[2]['value'].toString() == newPriceUpper.toString());

    // read rebalance state and verify it is fixed in time
    await sleep(10000);
    const rebalanceState = await kamino.readRebalancingParamsWithState(newStrategy.publicKey);
    expect(rebalanceState.length == 3);
    expect(rebalanceState[0]['label'] == 'rebalanceType');
    expect(rebalanceState[0]['value'] == ManualRebalanceTypeName);
    expect(rebalanceState[1]['label'] == 'rangePriceLower');
    expect(rebalanceState[1]['value'].toString() == newPriceLower.toString());
    expect(rebalanceState[2]['label'] == 'rangePriceUpper');
    expect(rebalanceState[2]['value'].toString() == newPriceUpper.toString());
  });

  it.skip('build percentage strategy Orca SOL-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    let newPosition = Keypair.generate();
    const createStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const lowerRangeBPS = new Decimal(200.0);
    const upperRangeBPS = new Decimal(300.0);
    const dex: Dex = 'ORCA';
    const tokenAMint = new PublicKey('So11111111111111111111111111111111111111112');
    const tokenBMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      dex,
      new Decimal('5'),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(PricePercentage.discriminator),
      [lowerRangeBPS, upperRangeBPS],
      tokenAMint,
      tokenBMint
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    console.log('ixs', ixs.length);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    const strategySetupIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(0, 4).map((ix) => strategySetupIxs.push(ix));
    const setupStratTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupIxs);
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    const strategySetupFeesIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(4).map((ix) => strategySetupFeesIxs.push(ix));
    strategySetupFeesIxs.push(buildNewStrategyIxs.updateRebalanceParamsIx);
    const setupStratFeesTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupFeesIxs);
    const setupStratFeesTransactionV0 = new VersionedTransaction(setupStratFeesTx);
    setupStratFeesTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratFeesTransactionV0);
    console.log('setup strategy fees tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);
    console.log('updateRewardMappingIxs', updateRewardMappingIxs.length);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

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

    // open position
    const openPositionIxn = buildNewStrategyIxs.openPositionIxs;
    const openPositionMessage = await kamino.getTransactionV2Message(signer.publicKey, [
      ...getComputeBudgetAndPriorityFeeIxns(1_400_000),
      ...openPositionIxn,
    ]);
    const openPositionTx = new VersionedTransaction(openPositionMessage);
    openPositionTx.sign([signer, newPosition]);

    //@ts-ignore
    const openPositionTxId = await sendAndConfirmTransaction(kamino._connection, openPositionTx);
    console.log('openPositionTxId', openPositionTxId);

    let poolPrice = new Decimal(await kamino.getPriceForPair('ORCA', tokenAMint, tokenBMint));

    let stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);
    console.log("stratFields[3]['value'].toString()", stratFields[3]['value'].toString());
    console.log("stratFields[4]['value'].toString()", stratFields[4]['value'].toString());

    expect(stratFields.length == 5).to.be.true;
    expect(stratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(stratFields[0]['value'] == PricePercentageRebalanceTypeName).to.be.true;
    expect(stratFields[1]['label'] == 'lowerRangeBps').to.be.true;
    expect(stratFields[1]['value'].toString() == lowerRangeBPS.toString()).to.be.true;
    expect(stratFields[2]['label'] == 'upperRangeBps').to.be.true;
    expect(stratFields[2]['value'] == upperRangeBPS.toString()).to.be.true;
    expect(stratFields[3]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(stratFields[3]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[4]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(stratFields[4]['value'].toString()).greaterThan(poolPrice)).to.be.true;

    // update the rebalance params with new values; in the UI these should come from the user
    const newLowerRangeBPS = new Decimal(800.0);
    const newUpperRangeBPS = new Decimal(1000.0);
    const newPriceLowerRangeBPSInput = { label: 'lowerRangeBps', value: newLowerRangeBPS };
    const newPriceUpperRangeBPSInput = { label: 'upperRangeBps', value: newUpperRangeBPS };
    const updateStratFields = kamino.getUpdatedRebalanceFieldInfos(stratFields, [
      newPriceLowerRangeBPSInput,
      newPriceUpperRangeBPSInput,
    ]);

    expect(updateStratFields.length == 5).to.be.true;
    expect(updateStratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(updateStratFields[0]['value'] == PricePercentageRebalanceTypeName).to.be.true;
    expect(updateStratFields[1]['label'] == 'lowerRangeBps').to.be.true;
    expect(updateStratFields[1]['value'].toString() == newLowerRangeBPS.toString()).to.be.true;
    expect(updateStratFields[2]['label'] == 'upperRangeBps').to.be.true;
    expect(updateStratFields[2]['value'] == newUpperRangeBPS.toString()).to.be.true;
    expect(updateStratFields[3]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(updateStratFields[3]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(updateStratFields[4]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(updateStratFields[4]['value'].toString()).greaterThan(poolPrice)).to.be.true;

    const updateStratIx = await kamino.getUpdateRebalancingParamsFromRebalanceFieldsIx(
      signer.publicKey,
      newStrategy.publicKey,
      updateStratFields
    );

    const updateStratTx = await kamino.getTransactionV2Message(signer.publicKey, [updateStratIx]);
    const updateStratTransactionV0 = new VersionedTransaction(updateStratTx);
    updateStratTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, updateStratTransactionV0);
    console.log('update strategy rebalance params tx hash', txHash);

    // rebalance with new range; the range is calculated using `getFieldsForRebalanceMethod` as it returns the range for all strategies
    // if `rebalanceMethod` is available it can be used directly, otherwise we can get it from the fields
    const rebalanceMethod = kamino.getRebalanceMethodFromRebalanceFields(updateStratFields);

    // read the pool price so we calculate the position based on the exact pool price; this is needed when the rebalance strategy relies on pool price
    poolPrice = await kamino.getCurrentPrice(newStrategy.publicKey);
    const strat = (await kamino.getStrategyByAddress(newStrategy.publicKey))!;
    const tickSpacing = await kamino.getPoolTickSpacing(dex, strat!.pool);
    const updatedAllRebalanceFieldInfos = await kamino.getFieldsForRebalanceMethod(
      rebalanceMethod,
      dex,
      updateStratFields,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      poolPrice
    );

    const newPriceLower = new Decimal(
      updatedAllRebalanceFieldInfos.find((field) => field.label === 'rangePriceLower')!.value
    );
    const newPriceUpper = new Decimal(
      updatedAllRebalanceFieldInfos.find((field) => field.label === 'rangePriceUpper')!.value
    );
    console.log('newPriceLower.toString()', newPriceLower.toString());
    console.log('newPriceUpper.toString()', newPriceUpper.toString());

    newPosition = Keypair.generate();
    const rebalanceIxns = await kamino.rebalance(
      newStrategy.publicKey,
      newPosition.publicKey,
      newPriceLower,
      newPriceUpper
    );
    const rebalanceMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...rebalanceIxns],
      [...(await kamino.getMainLookupTablePks()), strategyLookupTable]
    );
    const rebalanceTx = new VersionedTransaction(rebalanceMessage);
    rebalanceTx.sign([signer, newPosition]);

    //@ts-ignore
    const rebalanceTxId = await sendAndConfirmTransaction(kamino._connection, rebalanceTx);
    console.log('rebalanceTxId', rebalanceTxId);

    stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);
    console.log("stratFields[3]['value'].toString()", stratFields[3]['value'].toString());
    console.log("stratFields[4]['value'].toString()", stratFields[4]['value'].toString());

    expect(stratFields.length == 5).to.be.true;
    expect(stratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(stratFields[0]['value'] == PricePercentageRebalanceTypeName).to.be.true;
    expect(stratFields[1]['label'] == 'lowerRangeBps').to.be.true;
    expect(stratFields[1]['value'].toString() == newLowerRangeBPS.toString()).to.be.true;
    expect(stratFields[2]['label'] == 'upperRangeBps').to.be.true;
    expect(stratFields[2]['value'] == newUpperRangeBPS.toString()).to.be.true;
    expect(stratFields[3]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(stratFields[3]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[4]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(stratFields[4]['value'].toString()).greaterThan(poolPrice)).to.be.true;

    // read rebalance state and verify it is fixed in time

    const rebalanceState = await kamino.readRebalancingParamsWithState(newStrategy.publicKey);

    await sleep(30000);
    const rebalanceState2 = await kamino.readRebalancingParamsWithState(newStrategy.publicKey);
    expect(rebalanceState.length == 5).to.be.true;
    expect(rebalanceState[0]['label'] == 'rebalanceType').to.be.true;
    expect(rebalanceState[0]['value'] == PricePercentageRebalanceTypeName).to.be.true;
    expect(rebalanceState[1]['label'] == 'lowerRangeBps').to.be.true;
    expect(rebalanceState[1]['value'].toString() == newLowerRangeBPS.toString()).to.be.true;
    expect(rebalanceState[2]['label'] == 'upperRangeBps').to.be.true;
    expect(rebalanceState[2]['value'] == newUpperRangeBPS.toString()).to.be.true;
    expect(rebalanceState[3]['label'] == 'rangePriceLower').to.be.true;
    expect(rebalanceState[3]['value'].toString() == rebalanceState2[3]['value'].toString()).to.be.true;
    expect(rebalanceState[4]['label'] == 'rangePriceUpper').to.be.true;
    expect(rebalanceState[4]['value'].toString() == rebalanceState2[4]['value'].toString()).to.be.true;
  });

  it.skip('build percentage with reset range Orca SOL-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    let newPosition = Keypair.generate();
    const createStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const lowerRangeBPS = new Decimal(1000.0);
    const upperRangeBPS = new Decimal(2000.0);
    const resetLowerRangeBPS = new Decimal(500.0);
    const resetUpperRangeBPS = new Decimal(300.0);

    const tokenAMint = new PublicKey('So11111111111111111111111111111111111111112');
    const tokenBMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    const dex: Dex = 'ORCA';

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      dex,
      new Decimal('5'),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(PricePercentageWithReset.discriminator),
      [lowerRangeBPS, upperRangeBPS, resetLowerRangeBPS, resetUpperRangeBPS],
      tokenAMint,
      tokenBMint
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    console.log('ixs', ixs.length);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    const strategySetupIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(0, 4).map((ix) => strategySetupIxs.push(ix));
    const setupStratTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupIxs);
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    const strategySetupFeesIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(4).map((ix) => strategySetupFeesIxs.push(ix));
    strategySetupFeesIxs.push(buildNewStrategyIxs.updateRebalanceParamsIx);
    const setupStratFeesTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupFeesIxs);
    const setupStratFeesTransactionV0 = new VersionedTransaction(setupStratFeesTx);
    setupStratFeesTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratFeesTransactionV0);
    console.log('setup strategy fees tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);
    console.log('updateRewardMappingIxs', updateRewardMappingIxs.length);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

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

    // open position
    const openPositionIxn = buildNewStrategyIxs.openPositionIxs;
    const openPositionMessage = await kamino.getTransactionV2Message(signer.publicKey, [
      ...getComputeBudgetAndPriorityFeeIxns(1_400_000),
      ...openPositionIxn,
    ]);
    const openPositionTx = new VersionedTransaction(openPositionMessage);
    openPositionTx.sign([signer, newPosition]);

    //@ts-ignore
    const openPositionTxId = await sendAndConfirmTransaction(kamino._connection, openPositionTx);
    console.log('openPositionTxId', openPositionTxId);

    let poolPrice = new Decimal(
      await kamino.getPriceForPair(
        'ORCA',
        new PublicKey('So11111111111111111111111111111111111111112'),
        new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
      )
    );

    let stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);

    console.log('price lower', stratFields[5]['value'].toString());
    console.log('price upper', stratFields[6]['value'].toString());
    console.log('reset price upper', stratFields[7]['value'].toString());
    console.log('reset price upper', stratFields[8]['value'].toString());

    expect(stratFields.length == 9).to.be.true;
    expect(stratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(stratFields[0]['value'] == PricePercentageWithResetRebalanceTypeName).to.be.true;
    expect(stratFields[1]['label'] == 'lowerRangeBps').to.be.true;
    expect(stratFields[1]['value'].toString() == lowerRangeBPS.toString()).to.be.true;
    expect(stratFields[2]['label'] == 'upperRangeBps').to.be.true;
    expect(stratFields[2]['value'].toString() == upperRangeBPS.toString()).to.be.true;
    expect(stratFields[3]['label'] == 'resetLowerRangeBps').to.be.true;
    expect(stratFields[3]['value'].toString() == resetLowerRangeBPS.toString()).to.be.true;
    expect(stratFields[4]['label'] == 'resetUpperRangeBps').to.be.true;
    expect(stratFields[4]['value'].toString() == resetUpperRangeBPS.toString()).to.be.true;
    expect(stratFields[5]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(stratFields[5]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[6]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(stratFields[6]['value'].toString()).greaterThan(poolPrice)).to.be.true;
    expect(stratFields[7]['label'] == 'resetPriceLower').to.be.true;
    expect(new Decimal(stratFields[7]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[8]['label'] == 'resetPriceUpper').to.be.true;
    expect(new Decimal(stratFields[8]['value'].toString()).greaterThan(poolPrice)).to.be.true;

    // update the rebalance params with new values; in the UI these should come from the user
    const newLowerRangeBPS = new Decimal(500.0);
    const newUpperRangeBPS = new Decimal(700.0);
    const newResetLowerRangeBPS = new Decimal(1000.0);
    const newResetUpperRangeBPS = new Decimal(2000.0);
    const newPriceLowerRangeBPSInput = { label: 'lowerRangeBps', value: newLowerRangeBPS };
    const newPriceUpperRangeBPSInput = { label: 'upperRangeBps', value: newUpperRangeBPS };
    const newResetPriceLowerRangeBPSInput = { label: 'resetLowerRangeBps', value: newResetLowerRangeBPS };
    const newResetPriceUpperRangeBPSInput = { label: 'resetUpperRangeBps', value: newResetUpperRangeBPS };

    const updateStratFields = kamino.getUpdatedRebalanceFieldInfos(stratFields, [
      newPriceLowerRangeBPSInput,
      newPriceUpperRangeBPSInput,
      newResetPriceLowerRangeBPSInput,
      newResetPriceUpperRangeBPSInput,
    ]);

    expect(updateStratFields.length == 9).to.be.true;
    expect(updateStratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(updateStratFields[0]['value'] == PricePercentageWithResetRebalanceTypeName).to.be.true;
    expect(updateStratFields[1]['label'] == 'lowerRangeBps').to.be.true;
    expect(updateStratFields[1]['value'].toString() == newLowerRangeBPS.toString()).to.be.true;
    expect(updateStratFields[2]['label'] == 'upperRangeBps').to.be.true;
    expect(updateStratFields[2]['value'].toString() == newUpperRangeBPS.toString()).to.be.true;
    expect(updateStratFields[3]['label'] == 'resetLowerRangeBps').to.be.true;
    expect(updateStratFields[3]['value'].toString() == newResetLowerRangeBPS.toString()).to.be.true;
    expect(updateStratFields[4]['label'] == 'resetUpperRangeBps').to.be.true;
    expect(updateStratFields[4]['value'].toString() == newResetUpperRangeBPS.toString()).to.be.true;
    expect(updateStratFields[5]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(updateStratFields[5]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(updateStratFields[6]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(updateStratFields[6]['value'].toString()).greaterThan(poolPrice)).to.be.true;
    expect(updateStratFields[7]['label'] == 'resetPriceLower').to.be.true;
    expect(new Decimal(updateStratFields[7]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(updateStratFields[8]['label'] == 'resetPriceUpper').to.be.true;
    expect(new Decimal(stratFields[8]['value'].toString()).greaterThan(poolPrice)).to.be.true;

    const updateStratIx = await kamino.getUpdateRebalancingParamsFromRebalanceFieldsIx(
      signer.publicKey,
      newStrategy.publicKey,
      updateStratFields
    );

    const updateStratTx = await kamino.getTransactionV2Message(signer.publicKey, [updateStratIx]);
    const updateStratTransactionV0 = new VersionedTransaction(updateStratTx);
    updateStratTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, updateStratTransactionV0);
    console.log('update strategy rebalance params tx hash', txHash);

    const rebalanceMethod = kamino.getRebalanceMethodFromRebalanceFields(updateStratFields);
    // read the pool price so we calculate the position based on the exact pool price; this is needed when the rebalance strategy relies on pool price
    poolPrice = await kamino.getCurrentPrice(newStrategy.publicKey);
    const strat = (await kamino.getStrategyByAddress(newStrategy.publicKey))!;
    const tickSpacing = await kamino.getPoolTickSpacing(dex, strat!.pool);
    const updatedAllRebalanceFieldInfos = await kamino.getFieldsForRebalanceMethod(
      rebalanceMethod,
      dex,
      updateStratFields,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      poolPrice
    );
    const newPriceLower = new Decimal(
      updatedAllRebalanceFieldInfos.find((field) => field.label === 'rangePriceLower')!.value
    );
    const newPriceUpper = new Decimal(
      updatedAllRebalanceFieldInfos.find((field) => field.label === 'rangePriceUpper')!.value
    );
    newPosition = Keypair.generate();
    const rebalanceIxns = await kamino.rebalance(
      newStrategy.publicKey,
      newPosition.publicKey,
      newPriceLower,
      newPriceUpper
    );
    const rebalanceMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...rebalanceIxns],
      [...(await kamino.getMainLookupTablePks()), strategyLookupTable]
    );
    const rebalanceTx = new VersionedTransaction(rebalanceMessage);
    rebalanceTx.sign([signer, newPosition]);

    //@ts-ignore
    const rebalanceTxId = await sendAndConfirmTransaction(kamino._connection, rebalanceTx);
    console.log('rebalanceTxId', rebalanceTxId);

    // read the updated strat fields
    stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);
    expect(stratFields.length == 9).to.be.true;
    expect(stratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(stratFields[0]['value'] == PricePercentageWithResetRebalanceTypeName).to.be.true;
    expect(stratFields[1]['label'] == 'lowerRangeBps').to.be.true;
    expect(stratFields[1]['value'].toString() == newLowerRangeBPS.toString()).to.be.true;
    expect(stratFields[2]['label'] == 'upperRangeBps').to.be.true;
    expect(stratFields[2]['value'].toString() == newUpperRangeBPS.toString()).to.be.true;
    expect(stratFields[3]['label'] == 'resetLowerRangeBps').to.be.true;
    expect(stratFields[3]['value'].toString() == newResetLowerRangeBPS.toString()).to.be.true;
    expect(stratFields[4]['label'] == 'resetUpperRangeBps').to.be.true;
    expect(stratFields[4]['value'].toString() == newResetUpperRangeBPS.toString()).to.be.true;
    expect(stratFields[5]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(stratFields[5]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[6]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(stratFields[6]['value'].toString()).greaterThan(poolPrice)).to.be.true;
    expect(stratFields[7]['label'] == 'resetPriceLower').to.be.true;
    expect(new Decimal(stratFields[7]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[8]['label'] == 'resetPriceUpper').to.be.true;

    // read rebalance state and verify it is fixed in time
    const rebalanceState = await kamino.readRebalancingParamsWithState(newStrategy.publicKey);

    await sleep(50000);
    const rebalanceState2 = await kamino.readRebalancingParamsWithState(newStrategy.publicKey);
    expect(rebalanceState.length == 9).to.be.true;
    expect(rebalanceState[0]['label'] == 'rebalanceType').to.be.true;
    expect(rebalanceState[0]['value'] == PricePercentageWithResetRebalanceTypeName).to.be.true;
    expect(rebalanceState[1]['label'] == 'lowerRangeBps').to.be.true;
    expect(rebalanceState[1]['value'].toString() == newLowerRangeBPS.toString()).to.be.true;
    expect(rebalanceState[2]['label'] == 'upperRangeBps').to.be.true;
    expect(rebalanceState[2]['value'].toString() == newUpperRangeBPS.toString()).to.be.true;
    expect(rebalanceState[3]['label'] == 'resetLowerRangeBps').to.be.true;
    expect(rebalanceState[3]['value'].toString() == newResetLowerRangeBPS.toString()).to.be.true;
    expect(rebalanceState[4]['label'] == 'resetUpperRangeBps').to.be.true;
    expect(rebalanceState[4]['value'].toString() == newResetUpperRangeBPS.toString()).to.be.true;
    expect(rebalanceState[5]['label'] == 'rangePriceLower').to.be.true;
    expect(rebalanceState[5]['value'].toString() == rebalanceState2[5]['value'].toString()).to.be.true;
    expect(rebalanceState[6]['label'] == 'rangePriceUpper').to.be.true;
    expect(rebalanceState[6]['value'].toString() == rebalanceState2[6]['value'].toString()).to.be.true;
    expect(rebalanceState[7]['label'] == 'resetPriceLower').to.be.true;
    expect(rebalanceState[7]['value'].toString() == rebalanceState2[7]['value'].toString()).to.be.true;
    expect(rebalanceState[8]['label'] == 'resetPriceUpper').to.be.true;
    expect(rebalanceState[8]['value'].toString() == rebalanceState2[8]['value'].toString()).to.be.true;
  });

  it.skip('build percentage with periodic rebalance Orca SOL-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    let newPosition = Keypair.generate();
    const createStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const period = new Decimal(600.0);
    const lowerRangeBPS = new Decimal(345.0);
    const upperRangeBPS = new Decimal(500.0);
    const dex: Dex = 'ORCA';
    const tokenAMint = new PublicKey('So11111111111111111111111111111111111111112');
    const tokenBMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      dex,
      new Decimal('5'),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(PeriodicRebalance.discriminator),
      [period, lowerRangeBPS, upperRangeBPS],
      tokenAMint,
      tokenBMint
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    console.log('ixs', ixs.length);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    const strategySetupIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(0, 4).map((ix) => strategySetupIxs.push(ix));
    const setupStratTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupIxs);
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    const strategySetupFeesIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(4).map((ix) => strategySetupFeesIxs.push(ix));
    strategySetupFeesIxs.push(buildNewStrategyIxs.updateRebalanceParamsIx);
    const setupStratFeesTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupFeesIxs);
    const setupStratFeesTransactionV0 = new VersionedTransaction(setupStratFeesTx);
    setupStratFeesTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratFeesTransactionV0);
    console.log('setup strategy fees tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);
    console.log('updateRewardMappingIxs', updateRewardMappingIxs.length);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

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

    // open position
    const openPositionIxn = buildNewStrategyIxs.openPositionIxs;
    const openPositionMessage = await kamino.getTransactionV2Message(signer.publicKey, [
      ...getComputeBudgetAndPriorityFeeIxns(1_400_000),
      ...openPositionIxn,
    ]);
    const openPositionTx = new VersionedTransaction(openPositionMessage);
    openPositionTx.sign([signer, newPosition]);

    try {
      //@ts-ignore
      const openPositionTxId = await sendAndConfirmTransaction(kamino._connection, openPositionTx);
      console.log('openPositionTxId', openPositionTxId);
    } catch (e) {
      console.log('error', e);
    }

    let poolPrice = new Decimal(await kamino.getPriceForPair('ORCA', tokenAMint, tokenBMint));

    let stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);

    console.log('price lower', stratFields[4]['value'].toString());
    console.log('price upper', stratFields[5]['value'].toString());

    expect(stratFields.length == 6).to.be.true;
    expect(stratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(stratFields[0]['value'] == PeriodicRebalanceTypeName).to.be.true;
    expect(stratFields[1]['label'] == 'period').to.be.true;
    expect(stratFields[1]['value'] == period.toString()).to.be.true;
    expect(stratFields[2]['label'] == 'lowerRangeBps').to.be.true;
    expect(stratFields[2]['value'].toString() == lowerRangeBPS.toString()).to.be.true;
    expect(stratFields[3]['label'] == 'upperRangeBps').to.be.true;
    expect(stratFields[3]['value'].toString() == upperRangeBPS.toString()).to.be.true;
    expect(stratFields[4]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(stratFields[4]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[5]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(stratFields[5]['value'].toString()).greaterThan(poolPrice)).to.be.true;

    // update the rebalance params with new values; in the UI these should come from the user
    const newPeriod = new Decimal(1000.0);
    const newLowerRangeBPS = new Decimal(400.0);
    const newUpperRangeBPS = new Decimal(500.0);
    const newPriceLowerRangeBPSInput = { label: 'lowerRangeBps', value: newLowerRangeBPS };
    const newPriceUpperRangeBPSInput = { label: 'upperRangeBps', value: newUpperRangeBPS };
    const newPeriodInput = { label: 'period', value: newPeriod };
    const updateStratFields = kamino.getUpdatedRebalanceFieldInfos(stratFields, [
      newPriceLowerRangeBPSInput,
      newPriceUpperRangeBPSInput,
      newPeriodInput,
    ]);

    expect(updateStratFields.length == 6).to.be.true;
    expect(updateStratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(updateStratFields[0]['value'] == PeriodicRebalanceTypeName).to.be.true;
    expect(updateStratFields[1]['label'] == 'period').to.be.true;
    expect(updateStratFields[1]['value'] == newPeriod.toString()).to.be.true;
    expect(updateStratFields[2]['label'] == 'lowerRangeBps').to.be.true;
    expect(updateStratFields[2]['value'].toString() == newLowerRangeBPS.toString()).to.be.true;
    expect(updateStratFields[3]['label'] == 'upperRangeBps').to.be.true;
    expect(updateStratFields[3]['value'].toString() == newUpperRangeBPS.toString()).to.be.true;
    expect(updateStratFields[4]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(updateStratFields[4]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(updateStratFields[5]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(updateStratFields[5]['value'].toString()).greaterThan(poolPrice)).to.be.true;

    const updateStratIx = await kamino.getUpdateRebalancingParamsFromRebalanceFieldsIx(
      signer.publicKey,
      newStrategy.publicKey,
      updateStratFields
    );

    const updateStratTx = await kamino.getTransactionV2Message(signer.publicKey, [updateStratIx]);
    const updateStratTransactionV0 = new VersionedTransaction(updateStratTx);
    updateStratTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, updateStratTransactionV0);
    console.log('update strategy rebalance params tx hash', txHash);

    // rebalance with new range; the range is calculated using `getFieldsForRebalanceMethod` as it returns the range for all strategies
    // if `rebalanceMethod` is available it can be used directly, otherwise we can get it from the fields
    const rebalanceMethod = kamino.getRebalanceMethodFromRebalanceFields(updateStratFields);

    // read the pool price so we calculate the position based on the exact pool price; this is needed when the rebalance strategy relies on pool price
    poolPrice = await kamino.getCurrentPrice(newStrategy.publicKey);
    const strat = (await kamino.getStrategyByAddress(newStrategy.publicKey))!;
    const tickSpacing = await kamino.getPoolTickSpacing(dex, strat!.pool);
    const updatedAllRebalanceFieldInfos = await kamino.getFieldsForRebalanceMethod(
      rebalanceMethod,
      dex,
      updateStratFields,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      poolPrice
    );

    const newPriceLower = new Decimal(
      updatedAllRebalanceFieldInfos.find((field) => field.label === 'rangePriceLower')!.value
    );
    const newPriceUpper = new Decimal(
      updatedAllRebalanceFieldInfos.find((field) => field.label === 'rangePriceUpper')!.value
    );
    console.log('newPriceLower.toString()', newPriceLower.toString());
    console.log('newPriceUpper.toString()', newPriceUpper.toString());

    newPosition = Keypair.generate();
    const rebalanceIxns = await kamino.rebalance(
      newStrategy.publicKey,
      newPosition.publicKey,
      newPriceLower,
      newPriceUpper
    );
    const rebalanceMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...rebalanceIxns],
      [...(await kamino.getMainLookupTablePks()), strategyLookupTable]
    );
    const rebalanceTx = new VersionedTransaction(rebalanceMessage);
    rebalanceTx.sign([signer, newPosition]);

    //@ts-ignore
    const rebalanceTxId = await sendAndConfirmTransaction(kamino._connection, rebalanceTx);
    console.log('rebalanceTxId', rebalanceTxId);

    stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);

    expect(stratFields.length == 6).to.be.true;
    expect(stratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(stratFields[0]['value'] == PeriodicRebalanceTypeName).to.be.true;
    expect(stratFields[1]['label'] == 'period').to.be.true;
    expect(stratFields[1]['value'] == newPeriod.toString()).to.be.true;
    expect(stratFields[2]['label'] == 'lowerRangeBps').to.be.true;
    expect(stratFields[2]['value'].toString() == newLowerRangeBPS.toString()).to.be.true;
    expect(stratFields[3]['label'] == 'upperRangeBps').to.be.true;
    expect(stratFields[3]['value'].toString() == upperRangeBPS.toString()).to.be.true;
    expect(stratFields[4]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(stratFields[4]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[5]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(stratFields[5]['value'].toString()).greaterThan(poolPrice)).to.be.true;
  });

  it.skip('build takeProfit Raydium USDT-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    let newPosition = Keypair.generate();
    const createStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const lowerPrice = new Decimal(0.96);
    const upperPrice = new Decimal(1.03);
    const destinationToken = new Decimal(0);
    const dex: Dex = 'ORCA';
    const tokenAMint = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
    const tokenBMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      dex,
      new Decimal('1'),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(TakeProfit.discriminator),
      [lowerPrice, upperPrice, destinationToken],
      tokenAMint,
      tokenBMint
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    console.log('ixs', ixs.length);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    const strategySetupIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(0, 4).map((ix) => strategySetupIxs.push(ix));
    const setupStratTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupIxs);
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    const strategySetupFeesIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(4).map((ix) => strategySetupFeesIxs.push(ix));
    strategySetupFeesIxs.push(buildNewStrategyIxs.updateRebalanceParamsIx);
    const setupStratFeesTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupFeesIxs);
    const setupStratFeesTransactionV0 = new VersionedTransaction(setupStratFeesTx);
    setupStratFeesTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratFeesTransactionV0);
    console.log('setup strategy fees tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);
    console.log('updateRewardMappingIxs', updateRewardMappingIxs.length);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

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

    // open position
    const openPositionIxn = buildNewStrategyIxs.openPositionIxs;
    const openPositionMessage = await kamino.getTransactionV2Message(signer.publicKey, [
      ...getComputeBudgetAndPriorityFeeIxns(1_400_000),
      ...openPositionIxn,
    ]);
    const openPositionTx = new VersionedTransaction(openPositionMessage);
    openPositionTx.sign([signer, newPosition]);

    //@ts-ignore
    const openPositionTxId = await sendAndConfirmTransaction(kamino._connection, openPositionTx);
    console.log('openPositionTxId', openPositionTxId);

    const poolPrice = new Decimal(await kamino.getPriceForPair(dex, tokenAMint, tokenBMint));

    let stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);

    console.log('price lower', stratFields[1]['value'].toString());
    console.log('price upper', stratFields[2]['value'].toString());

    expect(stratFields.length == 4).to.be.true;
    expect(stratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(stratFields[0]['value'] == TakeProfitRebalanceTypeName).to.be.true;
    expect(stratFields[1]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(stratFields[1]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[2]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(stratFields[2]['value'].toString()).greaterThan(poolPrice)).to.be.true;
    expect(stratFields[3]['label'] == 'destinationToken').to.be.true;
    expect(stratFields[3]['value'].toString() == destinationToken.toString()).to.be.true;

    // update the rebalance params with new values; in the UI these should come from the user
    const newPriceLower = new Decimal(0.98);
    const newPriceUpper = new Decimal(1.01);
    const newDestinationToken = new Decimal(1);
    const newPriceLowerInput = { label: 'rangePriceLower', value: newPriceLower };
    const newPriceUpperInput = { label: 'rangePriceUpper', value: newPriceUpper };
    const newDestinationTokenInput = { label: 'destinationToken', value: newDestinationToken };
    const updateStratFields = kamino.getUpdatedRebalanceFieldInfos(stratFields, [
      newPriceLowerInput,
      newPriceUpperInput,
      newDestinationTokenInput,
    ]);

    expect(updateStratFields.length == 4).to.be.true;
    expect(updateStratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(updateStratFields[0]['value'] == TakeProfitRebalanceTypeName).to.be.true;
    expect(updateStratFields[1]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(updateStratFields[1]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(updateStratFields[2]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(updateStratFields[2]['value'].toString()).greaterThan(poolPrice)).to.be.true;
    expect(updateStratFields[3]['label'] == 'destinationToken').to.be.true;
    expect(updateStratFields[3]['value'].toString() == newDestinationToken.toString()).to.be.true;

    const updateStratIx = await kamino.getUpdateRebalancingParamsFromRebalanceFieldsIx(
      signer.publicKey,
      newStrategy.publicKey,
      updateStratFields
    );

    const updateStratTx = await kamino.getTransactionV2Message(signer.publicKey, [updateStratIx]);
    const updateStratTransactionV0 = new VersionedTransaction(updateStratTx);
    updateStratTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, updateStratTransactionV0);
    console.log('update strategy rebalance params tx hash', txHash);

    newPosition = Keypair.generate();
    const rebalanceIxns = await kamino.rebalance(
      newStrategy.publicKey,
      newPosition.publicKey,
      newPriceLower,
      newPriceUpper
    );
    const rebalanceMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...rebalanceIxns],
      [...(await kamino.getMainLookupTablePks()), strategyLookupTable]
    );
    const rebalanceTx = new VersionedTransaction(rebalanceMessage);
    rebalanceTx.sign([signer, newPosition]);

    //@ts-ignore
    const rebalanceTxId = await sendAndConfirmTransaction(kamino._connection, rebalanceTx);
    console.log('rebalanceTxId', rebalanceTxId);

    stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);
    expect(stratFields.length == 4).to.be.true;
    expect(stratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(stratFields[0]['value'] == TakeProfitRebalanceTypeName).to.be.true;
    expect(stratFields[1]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(stratFields[1]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[2]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(stratFields[2]['value'].toString()).greaterThan(poolPrice)).to.be.true;
    expect(stratFields[3]['label'] == 'destinationToken').to.be.true;
    expect(stratFields[3]['value'].toString() == newDestinationToken.toString()).to.be.true;

    // read rebalance state and verify it is fixed in time
    const rebalanceState = await kamino.readRebalancingParamsWithState(newStrategy.publicKey);
    expect(rebalanceState.length == 4).to.be.true;
    expect(rebalanceState[0]['label'] == 'rebalanceType').to.be.true;
    expect(rebalanceState[0]['value'] == TakeProfitRebalanceTypeName).to.be.true;
    expect(rebalanceState[1]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(rebalanceState[1]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(rebalanceState[2]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(rebalanceState[2]['value'].toString()).greaterThan(poolPrice)).to.be.true;
    expect(rebalanceState[3]['label'] == 'destinationToken').to.be.true;
    expect(rebalanceState[3]['value'].toString() == newDestinationToken.toString()).to.be.true;

    await sleep(30000);

    const rebalanceState2 = await kamino.readRebalancingParamsWithState(newStrategy.publicKey);
    expect(rebalanceState2.length == 4).to.be.true;
    expect(rebalanceState2[0]['label'] == 'rebalanceType').to.be.true;
    expect(rebalanceState2[0]['value'] == TakeProfitRebalanceTypeName).to.be.true;
    expect(rebalanceState2[1]['label'] == 'rangePriceLower').to.be.true;
    expect(rebalanceState2[1]['value'].toString() == rebalanceState[1]['value'].toString()).to.be.true;
    expect(rebalanceState2[2]['label'] == 'rangePriceUpper').to.be.true;
    expect(rebalanceState2[2]['value'].toString() == rebalanceState[2]['value'].toString()).to.be.true;
    expect(rebalanceState2[3]['label'] == 'destinationToken').to.be.true;
    expect(rebalanceState2[3]['value'].toString() == rebalanceState[3]['value'].toString()).to.be.true;
  });

  it.skip('build expander Orca SOL-USDC', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    let newPosition = Keypair.generate();
    const createStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const lowerRangeBPS = new Decimal(300.0);
    const upperRangeBPS = new Decimal(800.0);
    const resetLowerRangeBPS = new Decimal(4000.0);
    const resetUpperRangeBPS = new Decimal(6000.0);
    const expansionBPS = new Decimal(400.0);
    const maxNumberOfExpansions = new Decimal(8);
    const swapUnevenAllowed = new Decimal(1);
    const dex: Dex = 'ORCA';
    const tokenAMint = new PublicKey('So11111111111111111111111111111111111111112');
    const tokenBMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      dex,
      new Decimal('5'),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(Expander.discriminator),
      [
        lowerRangeBPS,
        upperRangeBPS,
        resetLowerRangeBPS,
        resetUpperRangeBPS,
        expansionBPS,
        maxNumberOfExpansions,
        swapUnevenAllowed,
      ],
      tokenAMint,
      tokenBMint
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    console.log('ixs', ixs.length);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    const strategySetupIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(0, 4).map((ix) => strategySetupIxs.push(ix));
    const setupStratTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupIxs);
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    const strategySetupFeesIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(4).map((ix) => strategySetupFeesIxs.push(ix));
    strategySetupFeesIxs.push(buildNewStrategyIxs.updateRebalanceParamsIx);
    const setupStratFeesTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupFeesIxs);
    const setupStratFeesTransactionV0 = new VersionedTransaction(setupStratFeesTx);
    setupStratFeesTransactionV0.sign([signer]);
    try {
      //@ts-ignore
      txHash = await sendAndConfirmTransaction(kamino._connection, setupStratFeesTransactionV0);
      console.log('setup strategy fees tx hash', txHash);
    } catch (e) {
      console.log(e);
    }

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);
    console.log('updateRewardMappingIxs', updateRewardMappingIxs.length);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

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

    // open position
    const openPositionIxn = buildNewStrategyIxs.openPositionIxs;
    const openPositionMessage = await kamino.getTransactionV2Message(signer.publicKey, [
      ...getComputeBudgetAndPriorityFeeIxns(1_400_000),
      ...openPositionIxn,
    ]);
    const openPositionTx = new VersionedTransaction(openPositionMessage);
    openPositionTx.sign([signer, newPosition]);

    //@ts-ignore
    const openPositionTxId = await sendAndConfirmTransaction(kamino._connection, openPositionTx);
    console.log('openPositionTxId', openPositionTxId);

    let poolPrice = new Decimal(await kamino.getPriceForPair(dex, tokenAMint, tokenBMint));

    let stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);

    expect(stratFields.length == 12).to.be.true;
    expect(stratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(stratFields[0]['value'] == ExpanderRebalanceTypeName).to.be.true;
    expect(stratFields[1]['label'] == 'lowerRangeBps').to.be.true;
    expect(stratFields[1]['value'].toString() == lowerRangeBPS.toString()).to.be.true;
    expect(stratFields[2]['label'] == 'upperRangeBps').to.be.true;
    expect(stratFields[2]['value'].toString() == upperRangeBPS.toString()).to.be.true;
    expect(stratFields[3]['label'] == 'resetLowerRangeBps').to.be.true;
    expect(stratFields[3]['value'].toString() == resetLowerRangeBPS.toString()).to.be.true;
    expect(stratFields[4]['label'] == 'resetUpperRangeBps').to.be.true;
    expect(stratFields[4]['value'].toString() == resetUpperRangeBPS.toString()).to.be.true;
    expect(stratFields[5]['label'] == 'expansionBps').to.be.true;
    expect(stratFields[5]['value'].toString() == expansionBPS.toString()).to.be.true;
    expect(stratFields[6]['label'] == 'maxNumberOfExpansions').to.be.true;
    expect(stratFields[6]['value'].toString() == maxNumberOfExpansions.toString()).to.be.true;
    expect(stratFields[7]['label'] == 'swapUnevenAllowed').to.be.true;
    expect(stratFields[7]['value'].toString() == swapUnevenAllowed.toString()).to.be.true;
    expect(stratFields[8]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(stratFields[8]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[9]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(stratFields[9]['value'].toString()).greaterThan(poolPrice)).to.be.true;
    expect(stratFields[10]['label'] == 'resetPriceLower').to.be.true;
    expect(new Decimal(stratFields[10]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[11]['label'] == 'resetPriceUpper').to.be.true;
    expect(new Decimal(stratFields[11]['value'].toString()).greaterThan(poolPrice)).to.be.true;

    // update the rebalance params with new values; in the UI these should come from the user
    const newLowerRangeBPS = new Decimal(1000.0);
    const newUpperRangeBPS = new Decimal(1000.0);
    const newResetLowerRangeBPS = new Decimal(400.0);
    const newResetUpperRangeBPS = new Decimal(600.0);
    const newExpansionBPS = new Decimal(200.0);
    const newMaxNumberOfExpansions = new Decimal(10);
    const newSwapUnevenAllowed = new Decimal(0);
    const newPriceLowerRangeBPSInput = { label: 'lowerRangeBps', value: newLowerRangeBPS };
    const newPriceUpperRangeBPSInput = { label: 'upperRangeBps', value: newUpperRangeBPS };
    const newResetLowerRangeBPSInput = { label: 'resetLowerRangeBps', value: newResetLowerRangeBPS };
    const newResetUpperRangeBPSInput = { label: 'resetUpperRangeBps', value: newResetUpperRangeBPS };
    const newExpansionBPSInput = { label: 'expansionBps', value: newExpansionBPS };
    const newMaxNumberOfExpansionsInput = { label: 'maxNumberOfExpansions', value: newMaxNumberOfExpansions };
    const newSwapUnevenAllowedInput = { label: 'swapUnevenAllowed', value: newSwapUnevenAllowed };
    const updateStratFields = kamino.getUpdatedRebalanceFieldInfos(stratFields, [
      newPriceLowerRangeBPSInput,
      newPriceUpperRangeBPSInput,
      newResetLowerRangeBPSInput,
      newResetUpperRangeBPSInput,
      newExpansionBPSInput,
      newMaxNumberOfExpansionsInput,
      newSwapUnevenAllowedInput,
    ]);

    expect(updateStratFields.length == 12).to.be.true;
    expect(updateStratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(updateStratFields[0]['value'] == ExpanderRebalanceTypeName).to.be.true;
    expect(updateStratFields[1]['label'] == 'lowerRangeBps').to.be.true;
    expect(updateStratFields[1]['value'].toString() == newLowerRangeBPS.toString()).to.be.true;
    expect(updateStratFields[2]['label'] == 'upperRangeBps').to.be.true;
    expect(updateStratFields[2]['value'].toString() == newUpperRangeBPS.toString()).to.be.true;
    expect(updateStratFields[3]['label'] == 'resetLowerRangeBps').to.be.true;
    expect(updateStratFields[3]['value'].toString() == newResetLowerRangeBPS.toString()).to.be.true;
    expect(updateStratFields[4]['label'] == 'resetUpperRangeBps').to.be.true;
    expect(updateStratFields[4]['value'].toString() == newResetUpperRangeBPS.toString()).to.be.true;
    expect(updateStratFields[5]['label'] == 'expansionBps').to.be.true;
    expect(updateStratFields[5]['value'].toString() == newExpansionBPS.toString()).to.be.true;
    expect(updateStratFields[6]['label'] == 'maxNumberOfExpansions').to.be.true;
    expect(updateStratFields[6]['value'].toString() == newMaxNumberOfExpansions.toString()).to.be.true;
    expect(updateStratFields[7]['label'] == 'swapUnevenAllowed').to.be.true;
    expect(updateStratFields[7]['value'].toString() == newSwapUnevenAllowed.toString()).to.be.true;
    expect(stratFields[8]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(stratFields[8]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[9]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(stratFields[9]['value'].toString()).greaterThan(poolPrice)).to.be.true;
    expect(stratFields[10]['label'] == 'resetPriceLower').to.be.true;
    expect(new Decimal(stratFields[10]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[11]['label'] == 'resetPriceUpper').to.be.true;
    expect(new Decimal(stratFields[11]['value'].toString()).greaterThan(poolPrice)).to.be.true;

    const updateStratIx = await kamino.getUpdateRebalancingParamsFromRebalanceFieldsIx(
      signer.publicKey,
      newStrategy.publicKey,
      updateStratFields
    );

    const updateStratTx = await kamino.getTransactionV2Message(signer.publicKey, [updateStratIx]);
    const updateStratTransactionV0 = new VersionedTransaction(updateStratTx);
    updateStratTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, updateStratTransactionV0);
    console.log('update strategy rebalance params tx hash', txHash);

    // rebalance with new range; the range is calculated using `getFieldsForRebalanceMethod` as it returns the range for all strategies
    // if `rebalanceMethod` is available it can be used directly, otherwise we can get it from the fields
    const rebalanceMethod = kamino.getRebalanceMethodFromRebalanceFields(updateStratFields);

    // read the pool price so we calculate the position based on the exact pool price; this is needed when the rebalance strategy relies on pool price
    poolPrice = await kamino.getCurrentPrice(newStrategy.publicKey);
    const strat = (await kamino.getStrategyByAddress(newStrategy.publicKey))!;
    const tickSpacing = await kamino.getPoolTickSpacing(dex, strat!.pool);
    const updatedAllRebalanceFieldInfos = await kamino.getFieldsForRebalanceMethod(
      rebalanceMethod,
      dex,
      updateStratFields,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      poolPrice
    );

    const newPriceLower = new Decimal(
      updatedAllRebalanceFieldInfos.find((field) => field.label === 'rangePriceLower')!.value
    );
    const newPriceUpper = new Decimal(
      updatedAllRebalanceFieldInfos.find((field) => field.label === 'rangePriceUpper')!.value
    );
    newPosition = Keypair.generate();
    const rebalanceIxns = await kamino.rebalance(
      newStrategy.publicKey,
      newPosition.publicKey,
      newPriceLower,
      newPriceUpper
    );
    const rebalanceMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...rebalanceIxns],
      [...(await kamino.getMainLookupTablePks()), strategyLookupTable]
    );
    const rebalanceTx = new VersionedTransaction(rebalanceMessage);
    rebalanceTx.sign([signer, newPosition]);

    try {
      //@ts-ignore
      const rebalanceTxId = await sendAndConfirmTransaction(kamino._connection, rebalanceTx);
      console.log('rebalanceTxId', rebalanceTxId);
    } catch (e) {
      console.log(e);
    }

    stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);
    expect(stratFields.length == 12).to.be.true;
    expect(stratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(stratFields[0]['value'] == ExpanderRebalanceTypeName).to.be.true;
    expect(stratFields[1]['label'] == 'lowerRangeBps').to.be.true;
    expect(stratFields[1]['value'].toString() == newLowerRangeBPS.toString()).to.be.true;
    expect(stratFields[2]['label'] == 'upperRangeBps').to.be.true;
    expect(stratFields[2]['value'].toString() == newUpperRangeBPS.toString()).to.be.true;
    expect(stratFields[3]['label'] == 'resetLowerRangeBps').to.be.true;
    expect(stratFields[3]['value'].toString() == newResetLowerRangeBPS.toString()).to.be.true;
    expect(stratFields[4]['label'] == 'resetUpperRangeBps').to.be.true;
    expect(stratFields[4]['value'].toString() == newResetUpperRangeBPS.toString()).to.be.true;
    expect(stratFields[5]['label'] == 'expansionBps').to.be.true;
    expect(stratFields[5]['value'].toString() == newExpansionBPS.toString()).to.be.true;
    expect(stratFields[6]['label'] == 'maxNumberOfExpansions').to.be.true;
    expect(stratFields[6]['value'].toString() == newMaxNumberOfExpansions.toString()).to.be.true;
    expect(stratFields[7]['label'] == 'swapUnevenAllowed').to.be.true;
    expect(stratFields[7]['value'].toString() == newSwapUnevenAllowed.toString()).to.be.true;
    expect(stratFields[8]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(stratFields[8]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[9]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(stratFields[9]['value'].toString()).greaterThan(poolPrice)).to.be.true;
    expect(stratFields[10]['label'] == 'resetPriceLower').to.be.true;
    expect(new Decimal(stratFields[10]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[11]['label'] == 'resetPriceUpper').to.be.true;
    expect(new Decimal(stratFields[11]['value'].toString()).greaterThan(poolPrice)).to.be.true;

    const readFromStateFieldInfos = await kamino.readRebalancingParamsWithState(newStrategy.publicKey);

    await sleep(30000);

    expect(readFromStateFieldInfos.length == 12).to.be.true;
    expect(readFromStateFieldInfos[0]['label'] == 'rebalanceType').to.be.true;
    expect(readFromStateFieldInfos[0]['value'] == ExpanderRebalanceTypeName).to.be.true;
    expect(readFromStateFieldInfos[1]['label'] == 'lowerRangeBps').to.be.true;
    expect(readFromStateFieldInfos[1]['value'].toString() == newLowerRangeBPS.toString()).to.be.true;
    expect(readFromStateFieldInfos[2]['label'] == 'upperRangeBps').to.be.true;
    expect(readFromStateFieldInfos[2]['value'].toString() == newUpperRangeBPS.toString()).to.be.true;
    expect(readFromStateFieldInfos[3]['label'] == 'resetLowerRangeBps').to.be.true;
    expect(readFromStateFieldInfos[3]['value'].toString() == newResetLowerRangeBPS.toString()).to.be.true;
    expect(readFromStateFieldInfos[4]['label'] == 'resetUpperRangeBps').to.be.true;
    expect(readFromStateFieldInfos[4]['value'].toString() == newResetUpperRangeBPS.toString()).to.be.true;
    expect(readFromStateFieldInfos[5]['label'] == 'expansionBps').to.be.true;
    expect(readFromStateFieldInfos[5]['value'].toString() == newExpansionBPS.toString()).to.be.true;
    expect(readFromStateFieldInfos[6]['label'] == 'maxNumberOfExpansions').to.be.true;
    expect(readFromStateFieldInfos[6]['value'].toString() == newMaxNumberOfExpansions.toString()).to.be.true;
    expect(readFromStateFieldInfos[7]['label'] == 'swapUnevenAllowed').to.be.true;
    expect(readFromStateFieldInfos[7]['value'].toString() == newSwapUnevenAllowed.toString()).to.be.true;
    expect(readFromStateFieldInfos[8]['label'] == 'rangePriceLower').to.be.true;
    expect(readFromStateFieldInfos[8]['value'].toString() == stratFields[8]['value'].toString()).to.be.true;
    expect(readFromStateFieldInfos[9]['label'] == 'rangePriceUpper').to.be.true;
    expect(readFromStateFieldInfos[9]['value'].toString() == stratFields[9]['value'].toString()).to.be.true;
    expect(readFromStateFieldInfos[10]['label'] == 'resetPriceLower').to.be.true;
    expect(readFromStateFieldInfos[10]['value'].toString() == stratFields[10]['value'].toString()).to.be.true;
    expect(readFromStateFieldInfos[11]['label'] == 'resetPriceUpper').to.be.true;
    expect(readFromStateFieldInfos[11]['value'].toString() == stratFields[11]['value'].toString()).to.be.true;

    await sleep(30000);
    const readFromStateFieldInfos2 = await kamino.readRebalancingParamsWithState(newStrategy.publicKey);

    expect(readFromStateFieldInfos2.length == 12).to.be.true;
    expect(readFromStateFieldInfos2[0]['label'] == 'rebalanceType').to.be.true;
    expect(readFromStateFieldInfos2[0]['value'] == ExpanderRebalanceTypeName).to.be.true;
    expect(readFromStateFieldInfos2[1]['label'] == 'lowerRangeBps').to.be.true;
    expect(readFromStateFieldInfos2[1]['value'].toString() == newLowerRangeBPS.toString()).to.be.true;
    expect(readFromStateFieldInfos2[2]['label'] == 'upperRangeBps').to.be.true;
    expect(readFromStateFieldInfos2[2]['value'].toString() == newUpperRangeBPS.toString()).to.be.true;
    expect(readFromStateFieldInfos2[3]['label'] == 'resetLowerRangeBps').to.be.true;
    expect(readFromStateFieldInfos2[3]['value'].toString() == newResetLowerRangeBPS.toString()).to.be.true;
    expect(readFromStateFieldInfos2[4]['label'] == 'resetUpperRangeBps').to.be.true;
    expect(readFromStateFieldInfos2[4]['value'].toString() == newResetUpperRangeBPS.toString()).to.be.true;
    expect(readFromStateFieldInfos2[5]['label'] == 'expansionBps').to.be.true;
    expect(readFromStateFieldInfos2[5]['value'].toString() == newExpansionBPS.toString()).to.be.true;
    expect(readFromStateFieldInfos2[6]['label'] == 'maxNumberOfExpansions').to.be.true;
    expect(readFromStateFieldInfos2[6]['value'].toString() == newMaxNumberOfExpansions.toString()).to.be.true;
    expect(readFromStateFieldInfos2[7]['label'] == 'swapUnevenAllowed').to.be.true;
    expect(readFromStateFieldInfos2[7]['value'].toString() == newSwapUnevenAllowed.toString()).to.be.true;
    expect(readFromStateFieldInfos2[8]['label'] == 'rangePriceLower').to.be.true;
    expect(readFromStateFieldInfos2[8]['value'].toString() == readFromStateFieldInfos[8]['value'].toString()).to.be
      .true;
    expect(readFromStateFieldInfos2[9]['label'] == 'rangePriceUpper').to.be.true;
    expect(readFromStateFieldInfos2[9]['value'].toString() == readFromStateFieldInfos[9]['value'].toString()).to.be
      .true;
    expect(readFromStateFieldInfos2[10]['label'] == 'resetPriceLower').to.be.true;
    expect(readFromStateFieldInfos2[10]['value'].toString() == readFromStateFieldInfos[10]['value'].toString()).to.be
      .true;
    expect(readFromStateFieldInfos2[11]['label'] == 'resetPriceUpper').to.be.true;
    expect(readFromStateFieldInfos2[11]['value'].toString() == readFromStateFieldInfos[11]['value'].toString()).to.be
      .true;
  });

  it.skip('build drift Orca SOL-MSOL', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    let newPosition = Keypair.generate();
    const createStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const ticksBelowMid = new Decimal(10.0);
    const ticksAboveMid = new Decimal(5.0);
    const secondsPerTick = new Decimal(6000.0);
    const direction = new Decimal(1.0);
    const dex: Dex = 'ORCA';
    const tokenAMint = new PublicKey('So11111111111111111111111111111111111111112');
    const tokenBMint = new PublicKey('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So');
    //@ts-ignore
    const tokenADecimals = await getMintDecimals(kamino._connection, tokenAMint);
    //@ts-ignore
    const tokenBDecimals = await getMintDecimals(kamino._connection, tokenBMint);

    const poolPrice = new Decimal(await kamino.getPriceForPair(dex, tokenAMint, tokenBMint));
    const startMidTick = new Decimal(priceToTickIndex(poolPrice, tokenADecimals, tokenBDecimals));

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      dex,
      new Decimal('1'),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(Drift.discriminator),
      [startMidTick, ticksBelowMid, ticksAboveMid, secondsPerTick, direction],
      tokenAMint,
      tokenBMint
    );

    const ixs: TransactionInstruction[] = [];
    ixs.push(createStrategyAccountIx);
    ixs.push(buildNewStrategyIxs.initStrategyIx);
    console.log('ixs', ixs.length);
    const createStratTx = await kamino.getTransactionV2Message(signer.publicKey, ixs);
    const createStratTransactionV0 = new VersionedTransaction(createStratTx);
    createStratTransactionV0.sign([newStrategy, signer]);
    //@ts-ignore
    let txHash = await sendAndConfirmTransaction(kamino._connection, createStratTransactionV0);
    console.log('create strategy tx hash', txHash);

    const strategySetupIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(0, 4).map((ix) => strategySetupIxs.push(ix));
    const setupStratTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupIxs);
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    const strategySetupFeesIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(4).map((ix) => strategySetupFeesIxs.push(ix));
    strategySetupFeesIxs.push(buildNewStrategyIxs.updateRebalanceParamsIx);
    const setupStratFeesTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupFeesIxs);
    const setupStratFeesTransactionV0 = new VersionedTransaction(setupStratFeesTx);
    setupStratFeesTransactionV0.sign([signer]);
    try {
      //@ts-ignore
      txHash = await sendAndConfirmTransaction(kamino._connection, setupStratFeesTransactionV0);
      console.log('setup strategy fees tx hash', txHash);
    } catch (e) {
      console.log(e);
    }

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);
    console.log('updateRewardMappingIxs', updateRewardMappingIxs.length);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

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

    // open position
    const openPositionIxn = buildNewStrategyIxs.openPositionIxs;
    const openPositionMessage = await kamino.getTransactionV2Message(signer.publicKey, [
      ...getComputeBudgetAndPriorityFeeIxns(1_400_000),
      ...openPositionIxn,
    ]);
    const openPositionTx = new VersionedTransaction(openPositionMessage);
    openPositionTx.sign([signer, newPosition]);

    //@ts-ignore
    const openPositionTxId = await sendAndConfirmTransaction(kamino._connection, openPositionTx);
    console.log('openPositionTxId', openPositionTxId);

    let stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);

    console.log("new Decimal(stratFields[6]['value'].toString())", new Decimal(stratFields[6]['value'].toString()));
    console.log("new Decimal(stratFields[7]['value'].toString())", new Decimal(stratFields[7]['value'].toString()));
    console.log('pool price', poolPrice.toString());
    expect(stratFields.length == 8).to.be.true;
    expect(stratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(stratFields[0]['value'] == DriftRebalanceTypeName).to.be.true;
    expect(stratFields[1]['label'] == 'startMidTick').to.be.true;
    expect(stratFields[1]['value'].toString() == startMidTick.toString()).to.be.true;
    expect(stratFields[2]['label'] == 'ticksBelowMid').to.be.true;
    expect(stratFields[2]['value'].toString() == ticksBelowMid.toString()).to.be.true;
    expect(stratFields[3]['label'] == 'ticksAboveMid').to.be.true;
    expect(stratFields[3]['value'].toString() == ticksAboveMid.toString()).to.be.true;
    expect(stratFields[4]['label'] == 'secondsPerTick').to.be.true;
    expect(stratFields[4]['value'].toString() == secondsPerTick.toString()).to.be.true;
    expect(stratFields[5]['label'] == 'direction').to.be.true;
    expect(stratFields[5]['value'].toString() == direction.toString()).to.be.true;
    expect(stratFields[6]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(stratFields[6]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[7]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(stratFields[7]['value'].toString()).greaterThan(poolPrice)).to.be.true;

    // update the rebalance params with new values; in the UI these should come from the user
    const newStartMidTick = startMidTick.add(1);
    const newTicksBelowMid = ticksBelowMid.add(10);
    const newTicksAboveMid = ticksAboveMid.add(5);
    const newSecondsPerTick = secondsPerTick.add(6000);
    const newDirection = new Decimal(0);
    const newStartMidTickInput = { label: 'startMidTick', value: newStartMidTick };
    const newTickBelowMidInput = { label: 'ticksBelowMid', value: newTicksBelowMid };
    const newTickAboveMidInput = { label: 'ticksAboveMid', value: newTicksAboveMid };
    const newSecondsPerTickInput = { label: 'secondsPerTick', value: newSecondsPerTick };
    const newDirectionInput = { label: 'direction', value: newDirection };

    const updateStratFields = kamino.getUpdatedRebalanceFieldInfos(stratFields, [
      newStartMidTickInput,
      newTickBelowMidInput,
      newTickAboveMidInput,
      newSecondsPerTickInput,
      newDirectionInput,
    ]);

    expect(updateStratFields.length == 8).to.be.true;
    expect(updateStratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(updateStratFields[0]['value'] == DriftRebalanceTypeName).to.be.true;
    expect(updateStratFields[1]['label'] == 'startMidTick').to.be.true;
    expect(updateStratFields[1]['value'].toString() == newStartMidTick.toString()).to.be.true;
    expect(updateStratFields[2]['label'] == 'ticksBelowMid').to.be.true;
    expect(updateStratFields[2]['value'].toString() == newTicksBelowMid.toString()).to.be.true;
    expect(updateStratFields[3]['label'] == 'ticksAboveMid').to.be.true;
    expect(updateStratFields[3]['value'].toString() == newTicksAboveMid.toString()).to.be.true;
    expect(updateStratFields[4]['label'] == 'secondsPerTick').to.be.true;
    expect(updateStratFields[4]['value'].toString() == newSecondsPerTick.toString()).to.be.true;
    expect(updateStratFields[5]['label'] == 'direction').to.be.true;
    expect(updateStratFields[5]['value'].toString() == newDirection.toString()).to.be.true;
    expect(updateStratFields[6]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(updateStratFields[6]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(updateStratFields[7]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(updateStratFields[7]['value'].toString()).greaterThan(poolPrice)).to.be.true;

    const updateStratIx = await kamino.getUpdateRebalancingParamsFromRebalanceFieldsIx(
      signer.publicKey,
      newStrategy.publicKey,
      updateStratFields
    );

    const updateStratTx = await kamino.getTransactionV2Message(signer.publicKey, [updateStratIx]);
    const updateStratTransactionV0 = new VersionedTransaction(updateStratTx);
    updateStratTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, updateStratTransactionV0);
    console.log('update strategy rebalance params tx hash', txHash);

    // rebalance with new range; the range is calculated using `getFieldsForRebalanceMethod` as it returns the range for all strategies
    // if `rebalanceMethod` is available it can be used directly, otherwise we can get it from the fields
    const rebalanceMethod = kamino.getRebalanceMethodFromRebalanceFields(updateStratFields);
    const strat = (await kamino.getStrategyByAddress(newStrategy.publicKey))!;
    const tickSpacing = await kamino.getPoolTickSpacing(dex, strat!.pool);
    const updatedAllRebalanceFieldInfos = await kamino.getFieldsForRebalanceMethod(
      rebalanceMethod,
      dex,
      updateStratFields,
      tokenAMint,
      tokenBMint,
      tickSpacing
    );

    const newPriceLower = new Decimal(
      updatedAllRebalanceFieldInfos.find((field) => field.label === 'rangePriceLower')!.value
    );
    const newPriceUpper = new Decimal(
      updatedAllRebalanceFieldInfos.find((field) => field.label === 'rangePriceUpper')!.value
    );

    newPosition = Keypair.generate();
    const rebalanceIxns = await kamino.rebalance(
      newStrategy.publicKey,
      newPosition.publicKey,
      newPriceLower,
      newPriceUpper
    );
    const rebalanceMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...rebalanceIxns],
      [...(await kamino.getMainLookupTablePks()), strategyLookupTable]
    );
    const rebalanceTx = new VersionedTransaction(rebalanceMessage);
    rebalanceTx.sign([signer, newPosition]);

    //@ts-ignore
    const rebalanceTxId = await sendAndConfirmTransaction(kamino._connection, rebalanceTx);
    console.log('rebalanceTxId', rebalanceTxId);

    stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);

    expect(stratFields.length == 8).to.be.true;
    expect(stratFields[0]['label'] == 'rebalanceType').to.be.true;
    expect(stratFields[0]['value'] == DriftRebalanceTypeName).to.be.true;
    expect(stratFields[1]['label'] == 'startMidTick').to.be.true;
    expect(stratFields[1]['value'].toString() == newStartMidTick.toString()).to.be.true;
    expect(stratFields[2]['label'] == 'ticksBelowMid').to.be.true;
    expect(stratFields[2]['value'].toString() == newTicksBelowMid.toString()).to.be.true;
    expect(stratFields[3]['label'] == 'ticksAboveMid').to.be.true;
    expect(stratFields[3]['value'].toString() == newTicksAboveMid.toString()).to.be.true;
    expect(stratFields[4]['label'] == 'secondsPerTick').to.be.true;
    expect(stratFields[4]['value'].toString() == newSecondsPerTick.toString()).to.be.true;
    expect(stratFields[5]['label'] == 'direction').to.be.true;
    expect(stratFields[5]['value'].toString() == newDirection.toString()).to.be.true;
    expect(stratFields[6]['label'] == 'rangePriceLower').to.be.true;
    expect(new Decimal(stratFields[6]['value'].toString()).lessThan(poolPrice)).to.be.true;
    expect(stratFields[7]['label'] == 'rangePriceUpper').to.be.true;
    expect(new Decimal(stratFields[7]['value'].toString()).greaterThan(poolPrice)).to.be.true;

    await sleep(30000);
    const readFromStateFieldInfos = await kamino.readRebalancingParamsWithState(newStrategy.publicKey);
    await sleep(50000);
    const readFromStateFieldInfos2 = await kamino.readRebalancingParamsWithState(newStrategy.publicKey);

    expect(readFromStateFieldInfos.length == 8).to.be.true;
    expect(readFromStateFieldInfos[0]['label'] == 'rebalanceType').to.be.true;
    expect(readFromStateFieldInfos[0]['value'] == DriftRebalanceTypeName).to.be.true;
    expect(readFromStateFieldInfos[1]['label'] == 'startMidTick').to.be.true;
    expect(readFromStateFieldInfos[1]['value'].toString() == newStartMidTick.toString()).to.be.true;
    expect(readFromStateFieldInfos[2]['label'] == 'ticksBelowMid').to.be.true;
    expect(readFromStateFieldInfos[2]['value'].toString() == newTicksBelowMid.toString()).to.be.true;
    expect(readFromStateFieldInfos[3]['label'] == 'ticksAboveMid').to.be.true;
    expect(readFromStateFieldInfos[3]['value'].toString() == newTicksAboveMid.toString()).to.be.true;
    expect(readFromStateFieldInfos[4]['label'] == 'secondsPerTick').to.be.true;
    expect(readFromStateFieldInfos[4]['value'].toString() == newSecondsPerTick.toString()).to.be.true;
    expect(readFromStateFieldInfos[5]['label'] == 'direction').to.be.true;
    expect(readFromStateFieldInfos[5]['value'].toString() == newDirection.toString()).to.be.true;
    expect(readFromStateFieldInfos[6]['label'] == 'rangePriceLower').to.be.true;
    expect(readFromStateFieldInfos[6]['value'].toString() == stratFields[6]['value'].toString()).to.be.true;
    expect(readFromStateFieldInfos[6]['value'].toString() == readFromStateFieldInfos2[6]['value'].toString()).to.be
      .true;
    expect(readFromStateFieldInfos[7]['label'] == 'rangePriceUpper').to.be.true;
    expect(readFromStateFieldInfos[7]['value'].toString() == stratFields[7]['value'].toString()).to.be.true;
    expect(readFromStateFieldInfos[7]['value'].toString() == readFromStateFieldInfos2[7]['value'].toString()).to.be
      .true;
  });

  it.skip('update price reference type', async () => {
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

    const priceLower = new Decimal(15.0);
    const priceUpper = new Decimal(21.0);
    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'RAYDIUM',
      new Decimal('5'),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(Manual.discriminator),
      [priceLower, priceUpper],
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

    const strategySetupIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(0, 4).map((ix) => strategySetupIxs.push(ix));
    const setupStratTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupIxs);
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    const strategySetupFeesIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(4).map((ix) => strategySetupFeesIxs.push(ix));
    strategySetupFeesIxs.push(buildNewStrategyIxs.updateRebalanceParamsIx);
    const setupStratFeesTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupFeesIxs);
    const setupStratFeesTransactionV0 = new VersionedTransaction(setupStratFeesTx);
    setupStratFeesTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratFeesTransactionV0);
    console.log('setup strategy fees tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);
    console.log('updateRewardMappingIxs', updateRewardMappingIxs.length);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

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

    // open position
    const openPositionIxn = buildNewStrategyIxs.openPositionIxs;
    const openPositionMessage = await kamino.getTransactionV2Message(signer.publicKey, [
      ...getComputeBudgetAndPriorityFeeIxns(1_400_000),
      ...openPositionIxn,
    ]);
    const openPositionTx = new VersionedTransaction(openPositionMessage);
    openPositionTx.sign([signer, newPosition]);

    //@ts-ignore
    const openPositionTxId = await sendAndConfirmTransaction(kamino._connection, openPositionTx);
    console.log('openPositionTxId', openPositionTxId);

    let strategyState = (await kamino.getStrategies([newStrategy.publicKey]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }

    expect(strategyState!.rebalanceRaw.referencePriceType).to.be.eq(POOL.discriminator);

    let updatePriceReferenceTypeIx = await kamino.getUpdateReferencePriceTypeIx(newStrategy.publicKey, new TWAP());
    let updatePriceReferenceTypeTxMsg = await kamino.getTransactionV2Message(signer.publicKey, [
      updatePriceReferenceTypeIx,
    ]);
    let updatePriceReferenceTypeTx = new VersionedTransaction(updatePriceReferenceTypeTxMsg);
    updatePriceReferenceTypeTx.sign([signer]);

    //@ts-ignore
    let updatePriceReferenceTypeTxId = await sendAndConfirmTransaction(kamino._connection, updatePriceReferenceTypeTx);
    console.log('update reference price to TWAP tx', updatePriceReferenceTypeTxId);

    strategyState = (await kamino.getStrategies([newStrategy.publicKey]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }
    expect(strategyState!.rebalanceRaw.referencePriceType).to.be.eq(TWAP.discriminator);

    updatePriceReferenceTypeIx = await kamino.getUpdateReferencePriceTypeIx(newStrategy.publicKey, new POOL());
    updatePriceReferenceTypeTxMsg = await kamino.getTransactionV2Message(signer.publicKey, [
      updatePriceReferenceTypeIx,
    ]);
    updatePriceReferenceTypeTx = new VersionedTransaction(updatePriceReferenceTypeTxMsg);
    updatePriceReferenceTypeTx.sign([signer]);

    //@ts-ignore
    updatePriceReferenceTypeTxId = await sendAndConfirmTransaction(kamino._connection, updatePriceReferenceTypeTx);
    console.log('update reference price to POOL tx', updatePriceReferenceTypeTxId);

    strategyState = (await kamino.getStrategies([newStrategy.publicKey]))[0];
    if (!strategyState) {
      throw new Error('strategy not found');
    }
    expect(strategyState!.rebalanceRaw.referencePriceType).to.be.eq(POOL.discriminator);
  });

  it.skip('update rebalance strategy types and params', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const newStrategy = Keypair.generate();
    let newPosition = Keypair.generate();
    const createRaydiumStrategyAccountIx = await kamino.createStrategyAccount(signer.publicKey, newStrategy.publicKey);
    console.log('newStrategy.publicKey', newStrategy.publicKey.toString());

    const priceLower = new Decimal(15.0);
    const priceUpper = new Decimal(21.0);
    const dex: Dex = 'RAYDIUM';
    const tokenAMint = new PublicKey('So11111111111111111111111111111111111111112');
    const tokenBMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

    const buildNewStrategyIxs = await kamino.getBuildStrategyIxns(
      'RAYDIUM',
      new Decimal('5'),
      newStrategy.publicKey,
      newPosition.publicKey,
      signer.publicKey,
      new Decimal(Manual.discriminator),
      [priceLower, priceUpper],
      tokenAMint,
      tokenBMint
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

    const strategySetupIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(0, 4).map((ix) => strategySetupIxs.push(ix));
    const setupStratTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupIxs);
    const setupStratTransactionV0 = new VersionedTransaction(setupStratTx);
    setupStratTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratTransactionV0);
    console.log('setup strategy tx hash', txHash);

    const strategySetupFeesIxs: TransactionInstruction[] = [];
    buildNewStrategyIxs.updateStrategyParamsIxs.slice(4).map((ix) => strategySetupFeesIxs.push(ix));
    strategySetupFeesIxs.push(buildNewStrategyIxs.updateRebalanceParamsIx);
    const setupStratFeesTx = await kamino.getTransactionV2Message(signer.publicKey, strategySetupFeesIxs);
    const setupStratFeesTransactionV0 = new VersionedTransaction(setupStratFeesTx);
    setupStratFeesTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, setupStratFeesTransactionV0);
    console.log('setup strategy fees tx hash', txHash);

    // after strategy creation we have to set the reward mappings so it autocompounds
    const updateRewardMappingIxs = await kamino.getUpdateRewardsIxs(signer.publicKey, newStrategy.publicKey);
    console.log('updateRewardMappingIxs', updateRewardMappingIxs.length);

    // set up lookup table for strategy
    const strategyLookupTable = await kamino.setupStrategyLookupTable(signer, newStrategy.publicKey);

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

    // open position
    const openPositionIxn = buildNewStrategyIxs.openPositionIxs;
    const openPositionMessage = await kamino.getTransactionV2Message(signer.publicKey, [
      ...getComputeBudgetAndPriorityFeeIxns(1_400_000),
      ...openPositionIxn,
    ]);
    const openPositionTx = new VersionedTransaction(openPositionMessage);
    openPositionTx.sign([signer, newPosition]);

    //@ts-ignore
    const openPositionTxId = await sendAndConfirmTransaction(kamino._connection, openPositionTx);
    console.log('openPositionTxId', openPositionTxId);

    // read strategy params and assert they were set correctly
    const stratFields = await kamino.readRebalancingParams(newStrategy.publicKey);
    expect(stratFields.length == 3);
    expect(stratFields[0]['label'] == 'rebalanceType');
    expect(stratFields[0]['value'] == ManualRebalanceTypeName);
    expect(stratFields[1]['label'] == 'rangePriceLower');
    expect(stratFields[1]['value'].toString() == priceLower.toString());
    expect(stratFields[2]['label'] == 'rangePriceUpper');
    expect(stratFields[2]['value'] == priceUpper.toString());

    // 2. Update strategy to use percentage strategy
    const strat = (await kamino.getStrategyByAddress(newStrategy.publicKey))!;
    const tickSpacing = await kamino.getPoolTickSpacing(dex, strat!.pool);
    const defaultPricePercentageRebalanceFields = await kamino.getDefaultRebalanceFields(
      dex,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      PricePercentageRebalanceMethod
    );

    const updateStratIx = await kamino.getUpdateRebalancingParamsFromRebalanceFieldsIx(
      signer.publicKey,
      newStrategy.publicKey,
      defaultPricePercentageRebalanceFields
    );

    const updateStratTx = await kamino.getTransactionV2Message(signer.publicKey, [updateStratIx]);
    const updateStratTransactionV0 = new VersionedTransaction(updateStratTx);
    updateStratTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, updateStratTransactionV0);
    console.log('update strategy to price percentage rebalance params tx hash', txHash);

    // read the pool price so we calculate the position based on the exact pool price; this is needed when the rebalance strategy relies on pool price
    const rebalanceMethod = kamino.getRebalanceMethodFromRebalanceFields(defaultPricePercentageRebalanceFields);
    let poolPrice = await kamino.getCurrentPrice(newStrategy.publicKey);
    const updatedAllRebalanceFieldInfos = await kamino.getFieldsForRebalanceMethod(
      rebalanceMethod,
      dex,
      defaultPricePercentageRebalanceFields,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      poolPrice
    );

    let newPriceLower = new Decimal(
      updatedAllRebalanceFieldInfos.find((field) => field.label === 'rangePriceLower')!.value
    );
    let newPriceUpper = new Decimal(
      updatedAllRebalanceFieldInfos.find((field) => field.label === 'rangePriceUpper')!.value
    );
    console.log(
      `rebalance to percentage strategy newPriceLower ${newPriceLower.toString()} newPriceUpper ${newPriceUpper.toString()}`
    );

    newPosition = Keypair.generate();
    const rebalanceIxns = await kamino.rebalance(
      newStrategy.publicKey,
      newPosition.publicKey,
      newPriceLower,
      newPriceUpper
    );
    const rebalanceMessage = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...rebalanceIxns],
      [...(await kamino.getMainLookupTablePks()), strategyLookupTable]
    );
    const rebalanceTx = new VersionedTransaction(rebalanceMessage);
    rebalanceTx.sign([signer, newPosition]);

    //@ts-ignore
    const rebalanceTxId = await sendAndConfirmTransaction(kamino._connection, rebalanceTx);
    console.log('rebalance to pricePercentage TxId', rebalanceTxId);

    // 3. update the rebalance strategy to price percentage with reset
    const defaultPricePercentageWithResetRebalanceFields = await kamino.getDefaultRebalanceFields(
      dex,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      PricePercentageWithResetRangeRebalanceMethod
    );

    const updateStratToPricePercentageWithResetIx = await kamino.getUpdateRebalancingParamsFromRebalanceFieldsIx(
      signer.publicKey,
      newStrategy.publicKey,
      defaultPricePercentageWithResetRebalanceFields
    );

    const updateStraToPricePercentageWithResetTx = await kamino.getTransactionV2Message(signer.publicKey, [
      updateStratToPricePercentageWithResetIx,
    ]);
    const updateStratToPricePercentageWithResetTransactionV0 = new VersionedTransaction(
      updateStraToPricePercentageWithResetTx
    );
    updateStratToPricePercentageWithResetTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, updateStratToPricePercentageWithResetTransactionV0);
    console.log('update strategy to price percentage with reset rebalance params tx hash', txHash);

    // read the pool price so we calculate the position based on the exact pool price; this is needed when the rebalance strategy relies on pool price
    const pricePercentageWithResetRebalanceMethod = kamino.getRebalanceMethodFromRebalanceFields(
      defaultPricePercentageWithResetRebalanceFields
    );
    poolPrice = await kamino.getCurrentPrice(newStrategy.publicKey);
    const updatedAllPricePercentageWithResetRebalanceFieldInfos = await kamino.getFieldsForRebalanceMethod(
      pricePercentageWithResetRebalanceMethod,
      dex,
      defaultPricePercentageWithResetRebalanceFields,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      poolPrice
    );

    newPriceLower = new Decimal(
      updatedAllPricePercentageWithResetRebalanceFieldInfos.find((field) => field.label === 'rangePriceLower')!.value
    );
    newPriceUpper = new Decimal(
      updatedAllPricePercentageWithResetRebalanceFieldInfos.find((field) => field.label === 'rangePriceUpper')!.value
    );
    console.log(
      `rebalance to percentage with reset strategy newPriceLower ${newPriceLower.toString()} newPriceUpper ${newPriceUpper.toString()}`
    );

    newPosition = Keypair.generate();
    const rebalancePricePercentageWithResetIxns = await kamino.rebalance(
      newStrategy.publicKey,
      newPosition.publicKey,
      newPriceLower,
      newPriceUpper
    );
    const rebalanceMessagePricePercentageWithReset = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...rebalancePricePercentageWithResetIxns],
      [...(await kamino.getMainLookupTablePks()), strategyLookupTable]
    );
    const rebalancePricePercentageWithResetTx = new VersionedTransaction(rebalanceMessagePricePercentageWithReset);
    rebalancePricePercentageWithResetTx.sign([signer, newPosition]);

    //@ts-ignore
    const rebalancePricePercentageWithReseteTxId = await sendAndConfirmTransaction(
      //@ts-ignore
      kamino._connection,
      rebalancePricePercentageWithResetTx
    );
    console.log('rebalance to pricePercentageWithReset TxId', rebalancePricePercentageWithReseteTxId);

    // 4. update the rebalance strategy to drift
    const defaultDriftRebalanceFields = await kamino.getDefaultRebalanceFields(
      dex,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      DriftRebalanceMethod
    );

    const updateStratToDriftIx = await kamino.getUpdateRebalancingParamsFromRebalanceFieldsIx(
      signer.publicKey,
      newStrategy.publicKey,
      defaultDriftRebalanceFields
    );

    const updateStraToDriftTx = await kamino.getTransactionV2Message(signer.publicKey, [updateStratToDriftIx]);
    const updateStratToDriftTransactionV0 = new VersionedTransaction(updateStraToDriftTx);
    updateStratToDriftTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, updateStratToDriftTransactionV0);
    console.log('update strategy to drift params tx hash', txHash);

    // read the pool price so we calculate the position based on the exact pool price; this is needed when the rebalance strategy relies on pool price
    const driftRebalanceMethod = kamino.getRebalanceMethodFromRebalanceFields(defaultDriftRebalanceFields);
    poolPrice = await kamino.getCurrentPrice(newStrategy.publicKey);
    const updatedAllDriftFieldInfos = await kamino.getFieldsForRebalanceMethod(
      driftRebalanceMethod,
      dex,
      defaultDriftRebalanceFields,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      poolPrice
    );

    newPriceLower = new Decimal(updatedAllDriftFieldInfos.find((field) => field.label === 'rangePriceLower')!.value);
    newPriceUpper = new Decimal(updatedAllDriftFieldInfos.find((field) => field.label === 'rangePriceUpper')!.value);
    console.log(
      `rebalance to drift newPriceLower ${newPriceLower.toString()} newPriceUpper ${newPriceUpper.toString()}`
    );

    newPosition = Keypair.generate();
    const driftIxns = await kamino.rebalance(
      newStrategy.publicKey,
      newPosition.publicKey,
      newPriceLower,
      newPriceUpper
    );
    const rebalanceMessageDrift = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...driftIxns],
      [...(await kamino.getMainLookupTablePks()), strategyLookupTable]
    );
    const rebalanceDriftTx = new VersionedTransaction(rebalanceMessageDrift);
    rebalanceDriftTx.sign([signer, newPosition]);

    //@ts-ignore
    const rebalanceDriftTxId = await sendAndConfirmTransaction(
      //@ts-ignore
      kamino._connection,
      rebalanceDriftTx
    );
    console.log('rebalance to Drift TxId', rebalanceDriftTxId);

    // 5. update the rebalance strategy to TakeProfit
    const defaultTakeProfitRebalanceFields = await kamino.getDefaultRebalanceFields(
      dex,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      TakeProfitMethod
    );

    const updateStratToTakeProfitIx = await kamino.getUpdateRebalancingParamsFromRebalanceFieldsIx(
      signer.publicKey,
      newStrategy.publicKey,
      defaultTakeProfitRebalanceFields
    );

    const updateStratToTakeProfitTx = await kamino.getTransactionV2Message(signer.publicKey, [
      updateStratToTakeProfitIx,
    ]);
    const updateStratToTakeProfitTransactionV0 = new VersionedTransaction(updateStratToTakeProfitTx);
    updateStratToTakeProfitTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, updateStratToTakeProfitTransactionV0);
    console.log('update strategy to take profit tx hash', txHash);

    // read the pool price so we calculate the position based on the exact pool price; this is needed when the rebalance strategy relies on pool price
    const takeProfitRebalanceMethod = kamino.getRebalanceMethodFromRebalanceFields(defaultTakeProfitRebalanceFields);
    poolPrice = await kamino.getCurrentPrice(newStrategy.publicKey);
    const updatedAllTakeProfitFieldInfos = await kamino.getFieldsForRebalanceMethod(
      takeProfitRebalanceMethod,
      dex,
      defaultTakeProfitRebalanceFields,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      poolPrice
    );

    newPriceLower = new Decimal(
      updatedAllTakeProfitFieldInfos.find((field) => field.label === 'rangePriceLower')!.value
    );
    newPriceUpper = new Decimal(
      updatedAllTakeProfitFieldInfos.find((field) => field.label === 'rangePriceUpper')!.value
    );
    console.log(
      `rebalance to takeProfit newPriceLower ${newPriceLower.toString()} newPriceUpper ${newPriceUpper.toString()}`
    );

    newPosition = Keypair.generate();
    const takeProfitIxns = await kamino.rebalance(
      newStrategy.publicKey,
      newPosition.publicKey,
      newPriceLower,
      newPriceUpper
    );
    const rebalanceMessageTakeProfit = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...takeProfitIxns],
      [...(await kamino.getMainLookupTablePks()), strategyLookupTable]
    );
    const rebalanceTakeProfitTx = new VersionedTransaction(rebalanceMessageTakeProfit);
    rebalanceTakeProfitTx.sign([signer, newPosition]);

    //@ts-ignore
    const rebalanceTakeProfitTxId = await sendAndConfirmTransaction(
      //@ts-ignore
      kamino._connection,
      rebalanceTakeProfitTx
    );
    console.log('rebalance to TakeProfit TxId', rebalanceTakeProfitTxId);

    // sleep so rpc doesn't complain about rate limiting
    await sleep(60000);

    // 6. update the rebalance strategy to PeriodicRebalance
    const defaultPeriodicRebalanceRebalanceFields = await kamino.getDefaultRebalanceFields(
      dex,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      PeriodicRebalanceMethod
    );

    const updateStratToPeriodicRebalanceIx = await kamino.getUpdateRebalancingParamsFromRebalanceFieldsIx(
      signer.publicKey,
      newStrategy.publicKey,
      defaultPeriodicRebalanceRebalanceFields
    );

    const updateStratToPeriodicRebalanceTx = await kamino.getTransactionV2Message(signer.publicKey, [
      updateStratToPeriodicRebalanceIx,
    ]);
    const updateStratToPeriodicRebalanceTransactionV0 = new VersionedTransaction(updateStratToPeriodicRebalanceTx);
    updateStratToPeriodicRebalanceTransactionV0.sign([signer]);

    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, updateStratToPeriodicRebalanceTransactionV0);
    console.log('update strategy to periodic rebalance tx hash', txHash);

    // read the pool price so we calculate the position based on the exact pool price; this is needed when the rebalance strategy relies on pool price
    // const periodicRebalanceMethod = kamino.getRebalanceMethodFromRebalanceFields(defaultPeriodicRebalanceRebalanceFields);
    poolPrice = await kamino.getCurrentPrice(newStrategy.publicKey);
    const updatedAllPeriodicRebalanceFieldInfos = await kamino.getFieldsForRebalanceMethod(
      takeProfitRebalanceMethod,
      dex,
      defaultPeriodicRebalanceRebalanceFields,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      poolPrice
    );

    newPriceLower = new Decimal(
      updatedAllPeriodicRebalanceFieldInfos.find((field) => field.label === 'rangePriceLower')!.value
    );
    newPriceUpper = new Decimal(
      updatedAllPeriodicRebalanceFieldInfos.find((field) => field.label === 'rangePriceUpper')!.value
    );
    console.log(
      `rebalance to periodic rebalance newPriceLower ${newPriceLower.toString()} newPriceUpper ${newPriceUpper.toString()}`
    );

    newPosition = Keypair.generate();
    const periodicRebalanceIxns = await kamino.rebalance(
      newStrategy.publicKey,
      newPosition.publicKey,
      newPriceLower,
      newPriceUpper
    );
    const rebalanceMessagePeriodicRebalance = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...periodicRebalanceIxns],
      [...(await kamino.getMainLookupTablePks()), strategyLookupTable]
    );
    const rebalancePeriodicRebalanceTx = new VersionedTransaction(rebalanceMessagePeriodicRebalance);
    rebalancePeriodicRebalanceTx.sign([signer, newPosition]);

    //@ts-ignore
    const rebalancePeriodicRebalanceTxId = await sendAndConfirmTransaction(
      //@ts-ignore
      kamino._connection,
      rebalancePeriodicRebalanceTx
    );
    console.log('rebalance to Periodic Rebalance TxId', rebalancePeriodicRebalanceTxId);
    // sleep so rpc doesn't complain about rate limiting
    await sleep(10000);

    // 7. update the rebalance strategy to Expander
    const defaultExpanderRebalanceFields = await kamino.getDefaultRebalanceFields(
      dex,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      ExpanderMethod
    );

    const updateStratToExpanderIx = await kamino.getUpdateRebalancingParamsFromRebalanceFieldsIx(
      signer.publicKey,
      newStrategy.publicKey,
      defaultExpanderRebalanceFields
    );

    const updateStratToExpanderTx = await kamino.getTransactionV2Message(signer.publicKey, [updateStratToExpanderIx]);
    const updateStratToExpanderTransactionV0 = new VersionedTransaction(updateStratToExpanderTx);
    updateStratToExpanderTransactionV0.sign([signer]);
    //@ts-ignore
    txHash = await sendAndConfirmTransaction(kamino._connection, updateStratToExpanderTransactionV0);
    console.log('update strategy to expander tx hash', txHash);

    // read the pool price so we calculate the position based on the exact pool price; this is needed when the rebalance strategy relies on pool price
    const expanderRebalanceMethod = kamino.getRebalanceMethodFromRebalanceFields(defaultExpanderRebalanceFields);
    poolPrice = await kamino.getCurrentPrice(newStrategy.publicKey);
    const updatedAllExpanderFieldInfos = await kamino.getFieldsForRebalanceMethod(
      expanderRebalanceMethod,
      dex,
      defaultExpanderRebalanceFields,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      poolPrice
    );

    newPriceLower = new Decimal(updatedAllExpanderFieldInfos.find((field) => field.label === 'rangePriceLower')!.value);
    newPriceUpper = new Decimal(updatedAllExpanderFieldInfos.find((field) => field.label === 'rangePriceUpper')!.value);
    console.log(
      `rebalance to expander rebalance newPriceLower ${newPriceLower.toString()} newPriceUpper ${newPriceUpper.toString()}`
    );

    newPosition = Keypair.generate();
    const expanderIxns = await kamino.rebalance(
      newStrategy.publicKey,
      newPosition.publicKey,
      newPriceLower,
      newPriceUpper
    );
    const rebalanceMessageExpander = await kamino.getTransactionV2Message(
      signer.publicKey,
      [...getComputeBudgetAndPriorityFeeIxns(1_400_000), ...expanderIxns],
      [...(await kamino.getMainLookupTablePks()), strategyLookupTable]
    );
    const rebalanceExpanderTx = new VersionedTransaction(rebalanceMessageExpander);
    rebalanceExpanderTx.sign([signer, newPosition]);

    //@ts-ignore
    const rebalanceExpanderTxId = await sendAndConfirmTransaction(
      //@ts-ignore
      kamino._connection,
      rebalanceExpanderTx
    );
    console.log('rebalance to Expander TxId', rebalanceExpanderTxId);
  });
});
