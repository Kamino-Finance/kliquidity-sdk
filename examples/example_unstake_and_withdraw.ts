import { address, generateKeyPairSigner, KeyPairSigner } from '@solana/kit';
import {
  collToLamportsDecimal,
  createComputeUnitLimitIx,
  getAssociatedTokenAddressAndAccount,
  Kamino,
  StrategyWithAddress,
} from '@kamino-finance/kliquidity-sdk';
import { getConnection, getLegacyConnection, getWsConnection } from './utils/connection';
import { DEFAULT_ADDRESS } from '@orca-so/whirlpools/dist';
import { getFarmUnstakeAndWithdrawIxs, getStakedTokens } from './utils/farms';
import { sendAndConfirmTx } from './utils/tx';

(async () => {
  // Create a new keypair for the user (in real world this is the wallet of the user who deposits into the strategy)
  // to read from file you can use getKeypair()

  const keypair: KeyPairSigner = await generateKeyPairSigner();
  // the strategy to deposit into
  const strategyWithFarm = address('BLP7UHUg1yNry94Qk3sM8pAfEyDhTZirwFghw9DoBjn7');

  const cluster = 'mainnet-beta';
  const kamino = new Kamino(cluster, getConnection(), getLegacyConnection());

  const strategyState = (await kamino.getStrategiesWithAddresses([strategyWithFarm]))[0];
  if (!strategyState) {
    throw new Error('Strategy not found');
  }

  const sharesStaked = await getStakedTokens(kamino.getConnection(), keypair.address, strategyState.strategy.farm);

  // in this example we withdraw everything staked; if the user tries to withdraw more than the shares they have staked + the shares they have in the ATA, the txn will fail
  const sharesToBurn = sharesStaked;

  const strategyWithAddress: StrategyWithAddress = {
    address: strategyWithFarm,
    strategy: strategyState.strategy,
  };

  const [sharesAta, sharesMintData] = await getAssociatedTokenAddressAndAccount(
    kamino.getConnection(),
    strategyState.strategy.sharesMint,
    keypair.address
  );
  const [tokenAAta, tokenAData] = await getAssociatedTokenAddressAndAccount(
    kamino.getConnection(),
    strategyState.strategy.tokenAMint,
    keypair.address
  );
  const [tokenBAta, tokenBData] = await getAssociatedTokenAddressAndAccount(
    kamino.getConnection(),
    strategyState.strategy.tokenBMint,
    keypair.address
  );

  const createAtasIxs = await kamino.getCreateAssociatedTokenAccountInstructionsIfNotExist(
    keypair,
    strategyWithAddress,
    tokenAData,
    tokenAAta,
    tokenBData,
    tokenBAta,
    sharesMintData,
    sharesAta
  );

  console.log('Shares ATA: ', sharesAta.toString());
  const sharesBalance = await kamino.getTokenAccountBalanceOrZero(sharesAta);

  const tx = [createComputeUnitLimitIx(1_400_000)];
  tx.push(...createAtasIxs);
  const stratHasFarm = strategyState.strategy.farm !== DEFAULT_ADDRESS;

  // if the user has enough shares in their ATA withdraw them and not unstake the staked ones

  if (sharesBalance.lt(sharesToBurn) && stratHasFarm) {
    console.log('in the if for unstake');
    const sharesToUnstake = sharesToBurn.sub(sharesBalance);
    console.log('sharesToUnstake', sharesToUnstake.toString());
    const shareLamportsToUnstake = collToLamportsDecimal(
      sharesToUnstake,
      strategyState.strategy.sharesMintDecimals.toNumber()
    );
    console.log('shareLamportsToUnstake', shareLamportsToUnstake.toString());
    const unstakeIxs = await getFarmUnstakeAndWithdrawIxs(
      kamino.getConnection(),
      keypair,
      strategyState.strategy.farm,
      shareLamportsToUnstake
    );
    tx.push(...unstakeIxs);
  }

  const withdrawIx = await kamino.withdrawShares(strategyWithAddress, sharesToBurn, keypair);
  tx.push(...withdrawIx.prerequisiteIxs);
  tx.push(withdrawIx.withdrawIx);
  if (withdrawIx.closeSharesAtaIx) {
    tx.push(withdrawIx.closeSharesAtaIx);
  }

  const signature = await sendAndConfirmTx(
    { rpc: kamino.getConnection(), wsRpc: getWsConnection() },
    keypair,
    tx,
    [],
    [strategyState.strategy.strategyLookupTable]
  );

  console.log('Signature: ', signature);
})().catch(async (e) => {
  console.error(e);
});
