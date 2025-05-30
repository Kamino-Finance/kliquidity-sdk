import Decimal from 'decimal.js';
import {
  address,
  Address,
  generateKeyPairSigner,
  getAddressEncoder,
  IInstruction,
  isAddress,
  Signature,
  TransactionSigner,
} from '@solana/kit';
import {
  createComputeUnitLimitIx,
  getAssociatedTokenAddress,
  Kamino,
  StrategyWithAddress,
  U64_MAX,
} from '@kamino-finance/kliquidity-sdk';
import { getConnection, getLegacyConnection } from './utils/connection';
import { DEFAULT_ADDRESS } from '@orca-so/whirlpools/dist';
import { getFarmStakeIxs } from './utils/farms';
import { fromLegacyTransactionInstruction } from '@solana/compat/dist/types';
import { getCloseAccountInstruction } from '@solana-program/token';
import { sendAndConfirmTx } from './utils/tx';

async () => {
  // Create a new keypair for the user (in real world this is the wallet of the user who deposits into the strategy)
  const keypair = await generateKeyPairSigner();
  // the strategy to deposit into
  const strategyWithFarm = address('BLP7UHUg1yNry94Qk3sM8pAfEyDhTZirwFghw9DoBjn7');
  // the amounts to deposit, in tokens
  const amountA = new Decimal(0.01);
  const amountB = new Decimal(0.01);

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

  // create the ATAs if needed
  const createAtaIxs = await kamino.getCreateAssociatedTokenAccountInstructionsIfNotExist(
    keypair,
    strategyWithAddress,
    null,
    strategyState.strategy.tokenAMint,
    null,
    strategyState.strategy.tokenBMint,
    null,
    strategyState.strategy.sharesMint
  );
  tx.push(...createAtaIxs);

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
  const sharesAta = await getAssociatedTokenAddress(strategyState.strategy.sharesMint, keypair.address);
  const closeAtaIx = getCloseAccountInstruction({
    owner: keypair.address,
    account: sharesAta,
    destination: keypair.address,
  });
  tx.push(closeAtaIx);

  // send the transaction using strategy's LUT so it fit in a single transaction
  const wsConnection = 
  await sendAndConfirmTx({ rpc: kamino.getConnection(), wsRpc: kamino.getWsConnection() }, keypair, tx);
};
