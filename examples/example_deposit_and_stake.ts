import Decimal from 'decimal.js';
import { address, generateKeyPairSigner, KeyPairSigner } from '@solana/kit';
import {
  createAssociatedTokenAccountInstruction,
  createComputeUnitLimitIx,
  getAssociatedTokenAddress,
  Kamino,
  StrategyWithAddress,
  U64_MAX,
} from '@kamino-finance/kliquidity-sdk';
import { getConnection, getLegacyConnection, getWsConnection } from './utils/connection';
import { DEFAULT_ADDRESS } from '@orca-so/whirlpools/dist';
import { getFarmStakeIxs } from './utils/farms';
import { fromLegacyTransactionInstruction } from '@solana/compat/';
import { getCloseAccountInstruction } from '@solana-program/token';
import { sendAndConfirmTx } from './utils/tx';

(async () => {
  // Create a new keypair for the user (in real world this is the wallet of the user who deposits into the strategy)
  // to read from file you can use getKeypair()
  const keypair: KeyPairSigner = await generateKeyPairSigner();
  // the strategy to deposit into
  const strategyWithFarm = address('BLP7UHUg1yNry94Qk3sM8pAfEyDhTZirwFghw9DoBjn7');
  // the amounts to deposit, in tokens
  const amountA = new Decimal(0.1);
  const amountB = new Decimal(0.1);

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

  const tx = [createComputeUnitLimitIx(1_400_000)];

  const sharesAta = await getAssociatedTokenAddress(strategyState.strategy.sharesMint, keypair.address);

  const createAtaIx = createAssociatedTokenAccountInstruction(
    keypair,
    sharesAta,
    keypair.address,
    strategyState.strategy.sharesMint
  );
  tx.push(createAtaIx);

  const depositIx = await kamino.deposit(strategyWithAddress, amountA, amountB, keypair);
  tx.push(depositIx);

  // if the strategy has farm, stake all user shares
  if (strategyState.strategy.farm !== DEFAULT_ADDRESS) {
    const stakeIxs = await getFarmStakeIxs(
      kamino.getLegacyConnection(),
      keypair.address,
      new Decimal(U64_MAX.toString()),
      strategyState.strategy.farm
    );
    tx.push(...stakeIxs.map(fromLegacyTransactionInstruction));
  }

  // optionally we can close the user shares ATA
  const closeAtaIx = getCloseAccountInstruction({
    owner: keypair.address,
    account: sharesAta,
    destination: keypair.address,
  });
  tx.push(closeAtaIx);

  // send the transaction using strategy's LUT so it fit in a single transaction
  // Use custom function that allows noop signer for construction but real signer for signing

  const signature = await sendAndConfirmTx(
    { rpc: kamino.getConnection(), wsRpc: getWsConnection() },
    keypair,
    tx,
    [],
    [strategyState.strategy.strategyLookupTable]
  );

  console.log('signature', signature);
})().catch(async (e) => {
  console.error(e);
});
