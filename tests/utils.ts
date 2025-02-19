import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { StrategyConfigOptionKind, UpdateCollateralInfoModeKind } from '../src/kamino-client/types';
import * as Instructions from '../src/kamino-client/instructions';
import { Transaction, TransactionInstruction } from '@solana/web3.js';
import { getMintDecimals } from '../src/utils';

import Decimal from 'decimal.js';
import { CollateralInfos, GlobalConfig, WhirlpoolStrategy } from '../src/kamino-client/accounts';
import {
  collToLamportsDecimal,
  DepositAmountsForSwap,
  Dex,
  getAssociatedTokenAddress,
  getUpdateStrategyConfigIx,
  isSOLMint,
  sendTransactionWithLogs,
  sleep,
  TOKEN_PROGRAM_ID,
  ZERO,
} from '../src';
import { getTickArrayPubkeysFromRangeRaydium } from './raydium_utils';
import { getTickArrayPubkeysFromRangeOrca } from './orca_utils';
import { collateralTokenToNumber, CollateralToken } from './token_utils';
import { checkIfAccountExists } from '../src/utils/transactions';
import { FullBPS } from '../src/utils/CreationParameters';
import {
  createAssociatedTokenAccountInstruction,
  createBurnInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
} from '@solana/spl-token';

export const GlobalConfigMainnet = new PublicKey('GKnHiWh3RRrE1zsNzWxRkomymHc374TvJPSTv2wPeYdB');
export const GlobalConfigStaging = new PublicKey('7D9KE8xxqvsSsPbpTK9DbvkYaodda1wVevPvZJbLGJ71');
export const KaminoProgramIdMainnet = new PublicKey('6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc');
export const KaminoProgramIdStaging = new PublicKey('SKY3EZaE5p8iXG1ed4kiandK1wnwwqxmWBhjEFykaHB');
export const SOLMintMainnet = new PublicKey('So11111111111111111111111111111111111111112');
export const USDCMintMainnet = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const USDHMintMainnet = new PublicKey('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX');
export const UsdcUsdhShadowStrategyMainnet = new PublicKey('E7K2S9qhypk9S1EaGKWaXyN9rP2RmPPmwHKWGQuVZHNm');
export const SolUsdcShadowStrategyMainnet = new PublicKey('Cgb4iehuTNAgaafXF9Y9e8N3wFpcrqbHC2vvCoBdBJXY');

// Seconds
export const DEFAULT_MAX_PRICE_AGE = 60 * 3;

export async function accountExist(connection: anchor.web3.Connection, account: anchor.web3.PublicKey) {
  const info = await connection.getAccountInfo(account);
  if (info == null || info.data.length == 0) {
    return false;
  }
  return true;
}

export function range(start: number, end: number, step: number): number[] {
  if (end === start || step === 0) {
    return [start];
  }
  if (step < 0) {
    step = -step;
  }

  const stepNumOfDecimal = step.toString().split('.')[1]?.length || 0;
  const endNumOfDecimal = end.toString().split('.')[1]?.length || 0;
  const maxNumOfDecimal = Math.max(stepNumOfDecimal, endNumOfDecimal);
  const power = Math.pow(10, maxNumOfDecimal);
  const diff = Math.abs(end - start);
  const count = Math.trunc(diff / step + 1);
  step = end - start > 0 ? step : -step;

  const intStart = Math.trunc(start * power);
  return Array.from(Array(count).keys()).map((x) => {
    const increment = Math.trunc(x * step * power);
    const value = intStart + increment;
    return Math.trunc(value) / power;
  });
}

export async function updateStrategyConfig(
  connection: Connection,
  signer: Keypair,
  strategy: PublicKey,
  mode: StrategyConfigOptionKind,
  amount: Decimal,
  newAccount: PublicKey = PublicKey.default
) {
  const strategyState = await WhirlpoolStrategy.fetch(connection, strategy);
  if (strategyState == null) {
    throw new Error(`strategy ${strategy} doesn't exist`);
  }

  const updateCapIx = await getUpdateStrategyConfigIx(
    signer.publicKey,
    strategyState.globalConfig,
    strategy,
    mode,
    amount,
    newAccount
  );

  const tx = new Transaction();
  tx.add(updateCapIx);

  const sig = await sendTransactionWithLogs(connection, tx, signer.publicKey, [signer]);
  console.log('Update Strategy Config ', mode.toJSON(), sig?.toString());
}

export async function updateTreasuryFeeVault(
  connection: Connection,
  signer: Keypair,
  globalConfig: PublicKey,
  collateralToken: CollateralToken,
  tokenMint: PublicKey,
  treasuryFeeTokenVault: PublicKey,
  treasuryFeeVaultAuthority: PublicKey
): Promise<string> {
  const args: Instructions.UpdateTreasuryFeeVaultArgs = {
    collateralId: collateralTokenToNumber(collateralToken),
  };

  const config = await GlobalConfig.fetch(connection, globalConfig);
  if (!config) {
    throw new Error(`Error retrieving the config ${globalConfig.toString()}`);
  }

  const accounts: Instructions.UpdateTreasuryFeeVaultAccounts = {
    signer: config.adminAuthority,
    globalConfig: globalConfig,
    feeMint: tokenMint,
    treasuryFeeVault: treasuryFeeTokenVault,
    treasuryFeeVaultAuthority: treasuryFeeVaultAuthority,
    tokenInfos: config.tokenInfos,
    systemProgram: anchor.web3.SystemProgram.programId,
    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    tokenProgram: TOKEN_PROGRAM_ID,
  };

  const tx = new Transaction();
  const ix = Instructions.updateTreasuryFeeVault(args, accounts);
  tx.add(ix);

  const hash = await sendTransactionWithLogs(connection, tx, signer.publicKey, [signer]);
  console.log('updateTreasuryFeeVault ix:', hash);
  if (!hash) {
    throw new Error('Hash for updateTreasuryFeeVault tx not found');
  }
  return hash;
}

export async function getTickArrayPubkeysFromRange(
  connection: Connection,
  dex: Dex,
  pool: PublicKey,
  tickLowerIndex: number,
  tickUpperIndex: number
) {
  if (dex == 'ORCA') {
    return getTickArrayPubkeysFromRangeOrca(connection, pool, tickLowerIndex, tickUpperIndex);
  } else if (dex == 'RAYDIUM') {
    return getTickArrayPubkeysFromRangeRaydium(connection, pool, tickLowerIndex, tickUpperIndex);
  } else {
    throw new Error('Invalid dex');
  }
}

export async function createUser(
  connection: Connection,
  signer: Keypair,
  strategy: PublicKey,
  solAirdropAmount: Decimal,
  aAirdropAmount: Decimal,
  bAirdropAmount: Decimal,
  user?: Keypair
): Promise<User> {
  const wallet = new anchor.Wallet(signer);
  const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());
  if (!user) {
    user = new anchor.web3.Keypair();
  }

  await sleep(1000);

  if (solAirdropAmount.gt(0)) {
    await solAirdrop(connection, provider, user.publicKey, solAirdropAmount);
    await sleep(1000);
  }

  const whirlpoolStrategyState = await WhirlpoolStrategy.fetch(connection, strategy);
  if (whirlpoolStrategyState == null) {
    throw new Error(`Strategy ${strategy.toString()} does not exist`);
  }

  const aAta = await setupAta(connection, signer, whirlpoolStrategyState.tokenAMint, user);
  const bAta = await setupAta(connection, signer, whirlpoolStrategyState.tokenBMint, user);
  const sharesAta = await setupAta(connection, signer, whirlpoolStrategyState.sharesMint, user);

  const tokenADecimals = await getMintDecimals(connection, whirlpoolStrategyState.tokenAMint);
  const tokenBDecimals = await getMintDecimals(connection, whirlpoolStrategyState.tokenBMint);

  await sleep(3000);
  if (aAirdropAmount.gt(0)) {
    await mintTo(
      connection,
      signer,
      whirlpoolStrategyState.tokenAMint,
      aAta,
      collToLamportsDecimal(aAirdropAmount, tokenADecimals).toNumber()
    );
  }
  if (bAirdropAmount.gt(0)) {
    await mintTo(
      connection,
      signer,
      whirlpoolStrategyState.tokenBMint,
      bAta,
      collToLamportsDecimal(bAirdropAmount, tokenBDecimals).toNumber()
    );
  }

  const testingUser: User = {
    tokenAAta: aAta,
    tokenBAta: bAta,
    sharesAta,
    owner: user,
  };
  return testingUser;
}

export async function solAirdrop(
  connection: Connection,
  provider: anchor.Provider,
  account: PublicKey,
  solAirdrop: Decimal
): Promise<Decimal> {
  const airdropTxnId = await connection.requestAirdrop(account, collToLamportsDecimal(solAirdrop, 9).toNumber());
  await connection.confirmTransaction(airdropTxnId);
  return await getSolBalance(provider, account);
}

export async function mintTo(
  connection: Connection,
  signer: Keypair,
  mintPubkey: PublicKey,
  tokenAccount: PublicKey,
  amount: number
) {
  console.log(`mintTo ${tokenAccount.toString()} mint ${mintPubkey.toString()} amount ${amount}`);
  const mintToIx = getMintToIx(signer.publicKey, mintPubkey, tokenAccount, amount);

  const tx = new Transaction().add(mintToIx);

  const res = await sendTransactionWithLogs(connection, tx, signer.publicKey, [signer]);
  console.log(`token ${mintPubkey.toString()} mint to ATA ${tokenAccount.toString()} tx hash: ${res}`);
}

export function getMintToIx(
  signer: PublicKey,
  mintPubkey: PublicKey,
  tokenAccount: PublicKey,
  amount: number
): TransactionInstruction {
  const ix = createMintToInstruction(
    mintPubkey, // mint
    tokenAccount, // receiver (sholud be a token account)
    signer, // mint authority
    amount, // amount. if your decimals is 8, you mint 10^8 for 1 token.
    [], // only multisig account will use. leave it empty now.
    TOKEN_PROGRAM_ID // always TOKEN_PROGRAM_ID
  );

  return ix;
}

export function getBurnFromIx(
  signer: PublicKey,
  mintPubkey: PublicKey,
  tokenAccount: PublicKey,
  amount: number
): TransactionInstruction {
  console.log(`burnFrom ${tokenAccount.toString()} mint ${mintPubkey.toString()} amount ${amount}`);
  const ix = createBurnInstruction(tokenAccount, mintPubkey, signer, amount, [], TOKEN_PROGRAM_ID);

  return ix;
}

export async function burnFrom(
  connection: Connection,
  signer: Keypair,
  mintPubkey: PublicKey,
  tokenAccount: PublicKey,
  amount: number
): Promise<string | null> {
  console.log(`burnFrom ${tokenAccount.toString()} mint ${mintPubkey.toString()} amount ${amount}`);
  const ix = getBurnFromIx(signer.publicKey, mintPubkey, tokenAccount, amount);
  const tx = new Transaction().add(ix);
  return sendTransactionWithLogs(connection, tx, signer.publicKey, [signer]);
}

export async function setupAta(
  connection: Connection,
  payer: Keypair,
  tokenMintAddress: PublicKey,
  user: Keypair
): Promise<PublicKey> {
  const ata = await getAssociatedTokenAddress(tokenMintAddress, user.publicKey);
  if (!(await checkIfAccountExists(connection, ata))) {
    const ix = await createAtaInstruction(user.publicKey, tokenMintAddress, ata);
    const tx = new Transaction().add(ix);
    const wallet = new anchor.Wallet(payer);
    const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());
    const res = await provider.connection.sendTransaction(tx, [user]);
    console.log(`setup ATA=${ata.toString()} for ${tokenMintAddress.toString()} tx hash ${res}`);
  }
  return ata;
}

export async function createAtaInstruction(
  owner: PublicKey,
  tokenMintAddress: PublicKey,
  ata: PublicKey
): Promise<TransactionInstruction> {
  return createAssociatedTokenAccountInstruction(
    owner, // fee payer
    ata, // ata
    owner, // owner of token account
    tokenMintAddress, // mint
    TOKEN_PROGRAM_ID // always TOKEN_PROGRAM_ID
  );
}

export async function getSolBalance(provider: anchor.Provider, account: PublicKey): Promise<Decimal> {
  const balance = new Decimal(await getSolBalanceInLamports(provider, account));
  return lamportsToCollDecimal(balance, 9);
}

export async function getSolBalanceInLamports(provider: anchor.Provider, account: PublicKey): Promise<number> {
  let balance: number | undefined = undefined;
  while (balance === undefined) {
    balance = (await provider.connection.getAccountInfo(account))?.lamports;
  }

  return balance;
}

export function lamportsToCollDecimal(amount: Decimal, decimals: number): Decimal {
  const factor = new Decimal(10).pow(decimals);
  return amount.div(factor);
}

export async function createMint(connection: Connection, signer: Keypair, decimals: number = 6): Promise<PublicKey> {
  const mint = anchor.web3.Keypair.generate();
  return await createMintFromKeypair(connection, signer, mint, decimals);
}

export async function createMintFromKeypair(
  connection: Connection,
  signer: Keypair,
  mint: Keypair,
  decimals: number = 6
): Promise<PublicKey> {
  const instructions = await createMintInstructions(connection, signer, mint.publicKey, decimals);

  const tx = new anchor.web3.Transaction();
  tx.add(...instructions);

  await sendTransactionWithLogs(connection, tx, signer.publicKey, [signer, mint]);
  return mint.publicKey;
}

async function createMintInstructions(
  connection: Connection,
  signer: Keypair,
  mint: PublicKey,
  decimals: number
): Promise<TransactionInstruction[]> {
  return [
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: signer.publicKey,
      newAccountPubkey: mint,
      space: 82,
      lamports: await connection.getMinimumBalanceForRentExemption(82),
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(mint, decimals, signer.publicKey, null, TOKEN_PROGRAM_ID),
  ];
}

export type DeployedPool = {
  pool: PublicKey;
  tokenMintA: PublicKey;
  tokenMintB: PublicKey;
  admin: PublicKey;
};

export interface User {
  owner: Keypair;
  tokenAAta: PublicKey;
  tokenBAta: PublicKey;
  sharesAta: PublicKey;
}

export function getCollInfoEncodedName(token: string): Uint8Array {
  const maxArray = new Uint8Array(32);
  const s: Uint8Array = new TextEncoder().encode(token);
  maxArray.set(s);
  return maxArray;
}

export function getCollInfoEncodedChainFromIndexes(indexes: number[]): Uint8Array {
  const u16MAX = 65535;
  const chain = [u16MAX, u16MAX, u16MAX, u16MAX];
  for (let i = 0; i < indexes.length; i++) {
    chain[i] = indexes[i];
  }
  const encodedChain = u16ArrayToU8Array(Uint16Array.from(chain));
  return encodedChain;
}

export async function updateCollateralInfo(
  connection: Connection,
  signer: Keypair,
  globalConfig: PublicKey,
  collateralToken: CollateralToken | number,
  mode: UpdateCollateralInfoModeKind,
  value: bigint | PublicKey | Uint16Array | Uint8Array
) {
  console.log('Mode ', mode.discriminator);
  console.log('value', value);
  const config: GlobalConfig | null = await GlobalConfig.fetch(connection, globalConfig);
  if (config == null) {
    throw new Error('Global config not found');
  }

  let collateralNumber: number;
  if (typeof collateralToken == 'number') {
    collateralNumber = collateralToken;
  } else {
    const collInfos = await CollateralInfos.fetch(connection, new PublicKey(config.tokenInfos));
    if (collInfos == null) {
      throw new Error('CollateralInfos config not found');
    }

    collateralNumber = collateralTokenToNumber(collateralToken);
  }
  const argValue = toCollateralInfoValue(value);

  console.log(
    `UpdateCollateralInfo`,
    mode.toJSON(),
    `for ${collateralToken} with value ${value} encoded as ${argValue}`
  );

  const args: Instructions.UpdateCollateralInfoArgs = {
    index: new anchor.BN(collateralNumber),
    mode: new anchor.BN(mode.discriminator),
    value: argValue,
  };

  const accounts: Instructions.UpdateCollateralInfoAccounts = {
    adminAuthority: config.adminAuthority,
    globalConfig,
    tokenInfos: config.tokenInfos,
  };

  const tx = new Transaction();
  const ix = Instructions.updateCollateralInfo(args, accounts);
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = config.adminAuthority;
  tx.add(ix);

  const sig = await sendAndConfirmTransaction(connection, tx, [signer]);
  console.log('Update Collateral Info txn: ' + sig.toString());
}

export function toCollateralInfoValue(value: bigint | PublicKey | Uint16Array | Uint8Array | number[]): number[] {
  let buffer: Buffer;
  if (typeof value === 'bigint') {
    buffer = Buffer.alloc(32);
    buffer.writeBigUInt64LE(value); // Because we send 32 bytes and a u64 has 8 bytes, we write it in LE
  } else if (value.constructor === Uint16Array) {
    buffer = Buffer.alloc(32);
    const val = u16ArrayToU8Array(value);
    for (let i = 0; i < val.length; i++) {
      buffer[i] = value[i];
    }
  } else if (value.constructor === Uint8Array) {
    buffer = Buffer.alloc(32);
    for (let i = 0; i < value.length; i++) {
      buffer[i] = value[i];
    }
  } else if (value.constructor.name === 'PublicKey') {
    buffer = (value as PublicKey).toBuffer();
  } else {
    throw 'Bad type ' + value + ' ' + typeof value;
  }
  return [...buffer];
}

export function u16ArrayToU8Array(x: Uint16Array): Uint8Array {
  const arr: number[] = [];
  for (const v of x) {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16LE(v);
    const bytes = Array.from(buffer);
    arr.push(...(bytes as number[]));
  }

  const uint8array = new Uint8Array(arr.flat());
  return uint8array;
}

export function getCollInfoEncodedChain(token: number): Uint8Array {
  const u16MAX = 65535;
  const chain = [token, u16MAX, u16MAX, u16MAX];

  const encodedChain = u16ArrayToU8Array(Uint16Array.from(chain));
  return encodedChain;
}

export async function getLocalSwapIxs(
  input: DepositAmountsForSwap,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  user: PublicKey,
  slippageBps: Decimal,
  mintAuthority?: PublicKey
): Promise<[TransactionInstruction[], PublicKey[]]> {
  const mintAuth = mintAuthority ? mintAuthority : user;

  let swapIxs: TransactionInstruction[] = [];
  if (input.tokenAToSwapAmount.lt(ZERO)) {
    swapIxs = await getSwapAToBWithSlippageBPSIxs(input, tokenAMint, tokenBMint, slippageBps, user, mintAuth);
  } else {
    swapIxs = await getSwapBToAWithSlippageBPSIxs(input, tokenAMint, tokenBMint, slippageBps, user, mintAuth);
  }

  return [swapIxs, []];
}

async function getSwapAToBWithSlippageBPSIxs(
  input: DepositAmountsForSwap,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  slippageBps: Decimal,
  user: PublicKey,
  mintAuthority: PublicKey
): Promise<TransactionInstruction[]> {
  // multiply the tokens to swap by -1 to get the positive sign because we represent as negative numbers what we have to sell
  const tokensToBurn = -input.tokenAToSwapAmount.toNumber();

  const [tokenAAta, tokenBAta] = await Promise.all([
    getAssociatedTokenAddress(tokenAMint, user),
    getAssociatedTokenAddress(tokenBMint, user),
  ]);

  const bToRecieve = input.tokenBToSwapAmount.mul(new Decimal(FullBPS).sub(slippageBps)).div(FullBPS);
  const mintToIx = getMintToIx(mintAuthority, tokenBMint, tokenBAta, bToRecieve.floor().toNumber());
  const burnFromIx = getBurnFromIx(user, tokenAMint, tokenAAta, Math.ceil(tokensToBurn));

  return [mintToIx, burnFromIx];
}

async function getSwapBToAWithSlippageBPSIxs(
  input: DepositAmountsForSwap,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  slippage: Decimal,
  owner: PublicKey,
  mintAuthority: PublicKey
) {
  // multiply the tokens to swap by -1 to get the positive sign because we represent as negative numbers what we have to sell
  const tokensToBurn = -input.tokenBToSwapAmount.toNumber();

  const [tokenAAta, tokenBAta] = await Promise.all([
    getAssociatedTokenAddress(tokenAMint, owner),
    getAssociatedTokenAddress(tokenBMint, owner),
  ]);

  const aToRecieve = input.tokenAToSwapAmount.mul(new Decimal(FullBPS).sub(slippage)).div(FullBPS);
  const mintToIx = getMintToIx(mintAuthority, tokenAMint, tokenAAta, aToRecieve.toNumber());
  const burnFromIx = getBurnFromIx(owner, tokenBMint, tokenBAta, tokensToBurn);

  return [mintToIx, burnFromIx];
}

export const balance = async (
  connection: Connection,
  user: Keypair,
  mint: PublicKey,
  ifSolGetWsolBalance: boolean = false
) => {
  if (isSOLMint(mint) && !ifSolGetWsolBalance) {
    const balance = (await connection.getBalance(user.publicKey)) / LAMPORTS_PER_SOL;
    return balance;
  }

  const ata = await getAssociatedTokenAddress(mint, user.publicKey);
  if (await checkIfAccountExists(connection, ata)) {
    const balance = await connection.getTokenAccountBalance(ata);
    return balance.value.uiAmount;
  }

  return 0;
};

export const toJson = (object: any): string => {
  return JSON.stringify(object, null, 2);
};
