import Decimal from 'decimal.js';
import {
  Address,
  address,
  generateKeyPairSigner,
  KeyPairSigner,
  SignatureDictionary,
  Transaction,
  TransactionPartialSigner,
  TransactionPartialSignerConfig,
  TransactionSigner,
} from '@solana/kit';
import {
  createAssociatedTokenAccountInstruction,
  createComputeUnitLimitIx,
  DEFAULT_PUBLIC_KEY,
  getAssociatedTokenAddress,
  Kamino,
  StrategyWithAddress,
  U64_MAX,
} from '@kamino-finance/kliquidity-sdk';
import { getConnection, getWsConnection } from './utils/connection';
import { getFarmStakeIxs } from './utils/farms';
import { getCloseAccountInstruction } from '@solana-program/token';
import { sendAndConfirmTx } from './utils/tx';

// noopSigner is to be used for transaction construction when the actual signer is not available (e.g. for multisig proposals)
(async () => {
  // Create a new keypair for the user (in real world this is the wallet of the user who deposits into the strategy)
  // to read from file you can use getKeypair()
  const keypairSigner: KeyPairSigner = await generateKeyPairSigner();
  const noop = noopSigner(keypairSigner.address);
  // the strategy to deposit into
  const strategyWithFarm = address('BLP7UHUg1yNry94Qk3sM8pAfEyDhTZirwFghw9DoBjn7');
  // the amounts to deposit, in tokens
  const amountA = new Decimal(0.1);
  const amountB = new Decimal(0.1);

  const cluster = 'mainnet-beta';
  const kamino = new Kamino(cluster, getConnection());

  const strategyState = (await kamino.getStrategiesWithAddresses([strategyWithFarm]))[0];
  if (!strategyState) {
    throw new Error('Strategy not found');
  }

  const strategyWithAddress: StrategyWithAddress = {
    address: strategyWithFarm,
    strategy: strategyState.strategy,
  };

  const tx = [createComputeUnitLimitIx(1_400_000)];

  const sharesAta = await getAssociatedTokenAddress(strategyState.strategy.sharesMint, noop.address);

  const createAtaIx = createAssociatedTokenAccountInstruction(
    noop,
    sharesAta,
    noop.address,
    strategyState.strategy.sharesMint
  );
  tx.push(createAtaIx);

  const depositIx = await kamino.deposit(strategyWithAddress, amountA, amountB, noop);
  tx.push(depositIx);

  // if the strategy has farm, stake all user shares
  if (strategyState.strategy.farm !== DEFAULT_PUBLIC_KEY) {
    const stakeIxs = await getFarmStakeIxs(
      kamino.getConnection(),
      noop,
      new Decimal(U64_MAX.toString()),
      strategyState.strategy.farm
    );
    tx.push(...stakeIxs);
  }

  // optionally we can close the user shares ATA
  const closeAtaIx = getCloseAccountInstruction({
    owner: noop.address,
    account: sharesAta,
    destination: noop.address,
  });
  tx.push(closeAtaIx);

  // send the transaction using strategy's LUT so it fit in a single transaction
  // Use custom function that allows noop signer for construction but real signer for signing

  const signature = await sendAndConfirmTx(
    { rpc: kamino.getConnection(), wsRpc: getWsConnection() },
    keypairSigner, // Noop signer for transaction construction
    tx,
    [],
    [strategyState.strategy.strategyLookupTable],
    noop
  );

  console.log('signature', signature);
})().catch(async (e) => {
  console.error(e);
});

export function noopSigner(address: Address): TransactionSigner {
  const signer: TransactionPartialSigner = {
    address,
    async signTransactions(
      _transactions: readonly Transaction[],
      _config?: TransactionPartialSignerConfig
    ): Promise<readonly SignatureDictionary[]> {
      // Return an array of empty SignatureDictionary objects — one per transaction
      return [];
    },
  };
  return signer;
}
