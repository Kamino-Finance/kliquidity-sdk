import Decimal from 'decimal.js';
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
import { getFarmUnstakeAndWithdrawIxs } from './utils/farms';
import { fromLegacyTransactionInstruction } from '@solana/compat/';
import { sendAndConfirmTx } from './utils/tx';

(async () => {
  // Create a new keypair for the user (in real world this is the wallet of the user who deposits into the strategy)
  // to read from file you can use getKeypair()

  const keypair: KeyPairSigner = await generateKeyPairSigner();
  // the strategy to deposit into
  const strategyWithFarm = address('BLP7UHUg1yNry94Qk3sM8pAfEyDhTZirwFghw9DoBjn7');
  // the amounts to withdraw, in tokens; for full withdraw U64_MAX can be used
  const sharesToBurn = new Decimal(0.00001);

  const cluster = 'mainnet-beta';
  const kamino = new Kamino(cluster, getConnection(), getLegacyConnection());

  const strategyState = (await kamino.getStrategiesWithAddresses([strategyWithFarm]))[0];
  if (!strategyState) {
    throw new Error('Strategy not found');
  }

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
      getLegacyConnection(),
      keypair.address,
      strategyState.strategy.farm,
      shareLamportsToUnstake
    );
    tx.push(...unstakeIxs.map(fromLegacyTransactionInstruction));
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
