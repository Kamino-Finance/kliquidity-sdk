import {
  address,
  Address,
  airdropFactory,
  generateKeyPairSigner,
  GetAccountInfoApi,
  getAddressEncoder,
  GetBalanceApi,
  GetTokenAccountBalanceApi,
  Instruction,
  isAddress,
  lamports,
  Lamports,
  Rpc,
  Signature,
  TransactionSigner,
} from '@solana/kit';
import * as anchor from '@coral-xyz/anchor';
import { StrategyConfigOptionKind, UpdateCollateralInfoModeKind } from '../../src/@codegen/kliquidity/types';
import * as Instructions from '../../src/@codegen/kliquidity/instructions';
import { getMintDecimals } from '../../src/utils';

import Decimal from 'decimal.js';
import { CollateralInfos, GlobalConfig, WhirlpoolStrategy } from '../../src/@codegen/kliquidity/accounts';
import {
  collToLamportsDecimal,
  DepositAmountsForSwap,
  getAssociatedTokenAddress,
  getUpdateStrategyConfigIx,
  isSOLMint,
  sleep,
  ZERO,
} from '../../src';
import { collateralTokenToNumber, CollateralToken } from './token_utils';
import { checkIfAccountExists } from '../../src/utils/transactions';
import { FullBPS } from '../../src/utils/CreationParameters';
import { Env } from './env';
import { ConnectionPool, sendAndConfirmTx } from './tx';
import { getCreateAccountInstruction, SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  getBurnInstruction,
  getCreateAssociatedTokenInstruction,
  getInitializeMint2Instruction,
  getMintToInstruction,
} from '@solana-program/token-2022';
import { DEFAULT_PUBLIC_KEY } from '../../src/constants/pubkeys';
import { SYSVAR_RENT_ADDRESS } from '@solana/sysvars';

export const GlobalConfigMainnet: Address = address('GKnHiWh3RRrE1zsNzWxRkomymHc374TvJPSTv2wPeYdB');
export const GlobalConfigStaging: Address = address('7D9KE8xxqvsSsPbpTK9DbvkYaodda1wVevPvZJbLGJ71');
export const KaminoProgramIdStaging: Address = address('SKY3EZaE5p8iXG1ed4kiandK1wnwwqxmWBhjEFykaHB');
export const SOLMintMainnet: Address = address('So11111111111111111111111111111111111111112');
export const USDCMintMainnet: Address = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const USDHMintMainnet: Address = address('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX');
export const UsdcUsdhShadowStrategyMainnet: Address = address('E7K2S9qhypk9S1EaGKWaXyN9rP2RmPPmwHKWGQuVZHNm');
export const SolUsdcShadowStrategyMainnet: Address = address('Cgb4iehuTNAgaafXF9Y9e8N3wFpcrqbHC2vvCoBdBJXY');

// Seconds
export const DEFAULT_MAX_PRICE_AGE = 60 * 3;

const LAMPORTS_PER_SOL = 1_000_000_000;

export async function accountExist(rpc: Rpc<GetAccountInfoApi>, account: Address) {
  const info = await rpc.getAccountInfo(account).send();
  if (info.value == null || info.value.data.length == 0) {
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
  env: Env,
  strategy: Address,
  mode: StrategyConfigOptionKind,
  amount: Decimal,
  newAccount: Address = DEFAULT_PUBLIC_KEY
) {
  const strategyState = await WhirlpoolStrategy.fetch(env.c.rpc, strategy, env.kliquidityProgramId);
  if (strategyState == null) {
    throw new Error(`strategy ${strategy} doesn't exist`);
  }

  const updateCapIx = await getUpdateStrategyConfigIx(
    env.admin,
    strategyState.globalConfig,
    strategy,
    mode,
    amount,
    env.kliquidityProgramId,
    newAccount
  );

  const sig = await sendAndConfirmTx(env.c, env.admin, [updateCapIx]);
  console.log('Update Strategy Config ', mode.toJSON(), sig?.toString());
}

export async function updateTreasuryFeeVault(
  env: Env,
  globalConfig: Address,
  collateralToken: CollateralToken,
  tokenMint: Address,
  treasuryFeeTokenVault: Address,
  treasuryFeeVaultAuthority: Address
): Promise<string> {
  const args: Instructions.UpdateTreasuryFeeVaultArgs = {
    collateralId: collateralTokenToNumber(collateralToken),
  };

  const config = await GlobalConfig.fetch(env.c.rpc, globalConfig, env.kliquidityProgramId);
  if (!config) {
    throw new Error(`Error retrieving the config ${globalConfig.toString()}`);
  }

  const accounts: Instructions.UpdateTreasuryFeeVaultAccounts = {
    signer: env.admin,
    globalConfig: globalConfig,
    feeMint: tokenMint,
    treasuryFeeVault: treasuryFeeTokenVault,
    treasuryFeeVaultAuthority: treasuryFeeVaultAuthority,
    tokenInfos: config.tokenInfos,
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
    rent: SYSVAR_RENT_ADDRESS,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  };

  const ix = Instructions.updateTreasuryFeeVault(args, accounts, env.kliquidityProgramId);
  const hash = await sendAndConfirmTx(env.c, env.admin, [ix]);
  console.log('updateTreasuryFeeVault ix:', hash);
  if (!hash) {
    throw new Error('Hash for updateTreasuryFeeVault tx not found');
  }
  return hash;
}

export async function createUser(
  env: Env,
  strategy: Address,
  solAirdropAmount: Decimal,
  aAirdropAmount: Decimal,
  bAirdropAmount: Decimal,
  user?: TransactionSigner
): Promise<User> {
  const userKeypair = user ? user : await generateKeyPairSigner();
  if (solAirdropAmount.gt(0)) {
    await solAirdrop(env.c, userKeypair.address, solAirdropAmount);
    await sleep(1000);
  }

  const whirlpoolStrategyState = await WhirlpoolStrategy.fetch(env.c.rpc, strategy, env.kliquidityProgramId);
  if (whirlpoolStrategyState == null) {
    throw new Error(`Strategy ${strategy.toString()} does not exist`);
  }

  const aAta = await setupAta(env.c, env.admin, whirlpoolStrategyState.tokenAMint, userKeypair);
  const bAta = await setupAta(env.c, env.admin, whirlpoolStrategyState.tokenBMint, userKeypair);
  const sharesAta = await setupAta(env.c, env.admin, whirlpoolStrategyState.sharesMint, userKeypair);

  const tokenADecimals = await getMintDecimals(env.c.rpc, whirlpoolStrategyState.tokenAMint);
  const tokenBDecimals = await getMintDecimals(env.c.rpc, whirlpoolStrategyState.tokenBMint);

  await sleep(3000);
  if (aAirdropAmount.gt(0)) {
    await mintTo(
      env,
      whirlpoolStrategyState.tokenAMint,
      aAta,
      collToLamportsDecimal(aAirdropAmount, tokenADecimals).toNumber()
    );
  }
  if (bAirdropAmount.gt(0)) {
    await mintTo(
      env,
      whirlpoolStrategyState.tokenBMint,
      bAta,
      collToLamportsDecimal(bAirdropAmount, tokenBDecimals).toNumber()
    );
  }

  const testingUser: User = {
    tokenAAta: aAta,
    tokenBAta: bAta,
    sharesAta,
    owner: userKeypair,
  };
  return testingUser;
}

export async function solAirdrop(connection: ConnectionPool, account: Address, solAirdrop: Decimal): Promise<Decimal> {
  const f = airdropFactory({ rpc: connection.rpc, rpcSubscriptions: connection.wsRpc });
  await f({
    recipientAddress: account,
    commitment: 'processed',
    lamports: lamports(BigInt(collToLamportsDecimal(solAirdrop, 9).toString())),
  });
  return await getSolBalance(connection.rpc, account);
}

export async function mintTo(env: Env, mintPubkey: Address, tokenAccount: Address, amount: number): Promise<Signature> {
  console.log(`mintTo ${tokenAccount} mint ${mintPubkey} amount ${amount}`);
  const mintToIx = getMintToIx(env.admin, mintPubkey, tokenAccount, amount);
  const res = await sendAndConfirmTx(env.c, env.admin, [mintToIx]);
  console.log(`token ${mintPubkey} mint to ATA ${tokenAccount} tx hash: ${res}`);
  return res;
}

export function getMintToIx(
  authority: TransactionSigner,
  mint: Address,
  tokenAccount: Address,
  amount: number
): Instruction {
  return getMintToInstruction(
    {
      mint,
      amount: BigInt(amount),
      mintAuthority: authority,
      token: tokenAccount,
    },
    { programAddress: TOKEN_PROGRAM_ADDRESS }
  );
}

export function getBurnFromIx(
  signer: TransactionSigner,
  mintPubkey: Address,
  tokenAccount: Address,
  amount: number
): Instruction {
  console.log(`burnFrom ${tokenAccount.toString()} mint ${mintPubkey.toString()} amount ${amount}`);
  return getBurnInstruction(
    {
      mint: mintPubkey,
      amount: amount,
      authority: signer,
      account: tokenAccount,
    },
    { programAddress: TOKEN_PROGRAM_ADDRESS }
  );
}

export async function burnFrom(
  connection: ConnectionPool,
  signer: TransactionSigner,
  mintPubkey: Address,
  tokenAccount: Address,
  amount: number
): Promise<string | null> {
  const ix = getBurnFromIx(signer, mintPubkey, tokenAccount, amount);
  return sendAndConfirmTx(connection, signer, [ix]);
}

export async function setupAta(
  connection: ConnectionPool,
  payer: TransactionSigner,
  tokenMintAddress: Address,
  user: TransactionSigner = payer
): Promise<Address> {
  const ata = await getAssociatedTokenAddress(tokenMintAddress, user.address);
  if (!(await checkIfAccountExists(connection.rpc, ata))) {
    const ix = createAtaInstruction(user, tokenMintAddress, ata);
    const sig = await sendAndConfirmTx(connection, payer, [ix]);
    console.log(`setup ATA=${ata} for ${tokenMintAddress} tx hash ${sig}`);
  }
  return ata;
}

export function createAtaInstruction(
  payer: TransactionSigner,
  mint: Address,
  ata: Address,
  owner: Address = payer.address
): Instruction {
  return getCreateAssociatedTokenInstruction(
    {
      payer,
      owner,
      ata,
      mint,
      systemProgram: SYSTEM_PROGRAM_ADDRESS,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    },
    { programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS }
  );
}

export async function getSolBalance(rpc: Rpc<GetAccountInfoApi>, account: Address): Promise<Decimal> {
  const balance = new Decimal((await getSolBalanceInLamports(rpc, account)).toString());
  return lamportsToCollDecimal(balance, 9);
}

export async function getSolBalanceInLamports(rpc: Rpc<GetAccountInfoApi>, account: Address): Promise<Lamports> {
  let balance: Lamports | undefined = undefined;
  while (balance === undefined) {
    balance = (await rpc.getAccountInfo(account).send()).value?.lamports;
  }
  return balance;
}

export function lamportsToCollDecimal(amount: Decimal, decimals: number): Decimal {
  const factor = new Decimal(10).pow(decimals);
  return amount.div(factor);
}

export async function createMint(env: Env, decimals: number = 6): Promise<Address> {
  const mint = await generateKeyPairSigner();
  return await createMintFromKeypair(env, mint, decimals);
}

export async function createMintFromKeypair(env: Env, mint: TransactionSigner, decimals: number = 6): Promise<Address> {
  const instructions = await createMintInstructions(env, mint, decimals);
  await sendAndConfirmTx(env.c, env.admin, instructions);
  return mint.address;
}

async function createMintInstructions(env: Env, mint: TransactionSigner, decimals: number): Promise<Instruction[]> {
  return [
    getCreateAccountInstruction({
      payer: env.admin,
      space: 82n,
      lamports: await env.c.rpc.getMinimumBalanceForRentExemption(82n).send(),
      programAddress: TOKEN_PROGRAM_ADDRESS,
      newAccount: mint,
    }),
    getInitializeMint2Instruction(
      {
        mint: mint.address,
        decimals,
        mintAuthority: env.admin.address,
        freezeAuthority: null,
      },
      { programAddress: TOKEN_PROGRAM_ADDRESS }
    ),
  ];
}

export type DeployedPool = {
  pool: Address;
  tokenMintA: Address;
  tokenMintB: Address;
  admin: Address;
};

export interface User {
  owner: TransactionSigner;
  tokenAAta: Address;
  tokenBAta: Address;
  sharesAta: Address;
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
  env: Env,
  globalConfig: Address,
  collateralToken: CollateralToken | number,
  mode: UpdateCollateralInfoModeKind,
  value: bigint | Address | Uint16Array | Uint8Array
): Promise<Signature> {
  console.log('Mode ', mode.discriminator);
  console.log('value', value);
  const config: GlobalConfig | null = await GlobalConfig.fetch(env.c.rpc, globalConfig, env.kliquidityProgramId);
  if (config == null) {
    throw new Error(`Global config ${globalConfig} not found`);
  }

  let collateralNumber: number;
  if (typeof collateralToken == 'number') {
    collateralNumber = collateralToken;
  } else {
    const collInfos = await CollateralInfos.fetch(env.c.rpc, config.tokenInfos, env.kliquidityProgramId);
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
    adminAuthority: env.admin,
    globalConfig,
    tokenInfos: config.tokenInfos,
  };

  const ix = Instructions.updateCollateralInfo(args, accounts, env.kliquidityProgramId);
  const sig = await sendAndConfirmTx(env.c, env.admin, [ix]);
  console.log('Update Collateral Info txn: ' + sig.toString());
  return sig;
}

export function toCollateralInfoValue(value: bigint | Address | Uint16Array | Uint8Array | number[]): number[] {
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
  } else if (typeof value === 'string' && isAddress(value)) {
    buffer = Buffer.from(getAddressEncoder().encode(value));
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
  tokenAMint: Address,
  tokenBMint: Address,
  user: TransactionSigner,
  slippageBps: Decimal,
  mintAuthority: TransactionSigner = user
): Promise<[Instruction[], Address[]]> {
  let swapIxs: Instruction[] = [];
  if (input.tokenAToSwapAmount.lt(ZERO)) {
    swapIxs = await getSwapAToBWithSlippageBPSIxs(input, tokenAMint, tokenBMint, slippageBps, user, mintAuthority);
  } else {
    swapIxs = await getSwapBToAWithSlippageBPSIxs(input, tokenAMint, tokenBMint, slippageBps, user, mintAuthority);
  }
  return [swapIxs, []];
}

async function getSwapAToBWithSlippageBPSIxs(
  input: DepositAmountsForSwap,
  tokenAMint: Address,
  tokenBMint: Address,
  slippageBps: Decimal,
  user: TransactionSigner,
  mintAuthority: TransactionSigner
): Promise<Instruction[]> {
  // multiply the tokens to swap by -1 to get the positive sign because we represent as negative numbers what we have to sell
  const tokensToBurn = -input.tokenAToSwapAmount.toNumber();

  const [tokenAAta, tokenBAta] = await Promise.all([
    getAssociatedTokenAddress(tokenAMint, user.address),
    getAssociatedTokenAddress(tokenBMint, user.address),
  ]);

  const bToRecieve = input.tokenBToSwapAmount.mul(new Decimal(FullBPS).sub(slippageBps)).div(FullBPS);
  const mintToIx = getMintToIx(mintAuthority, tokenBMint, tokenBAta, bToRecieve.floor().toNumber());
  const burnFromIx = getBurnFromIx(user, tokenAMint, tokenAAta, Math.ceil(tokensToBurn));

  return [mintToIx, burnFromIx];
}

async function getSwapBToAWithSlippageBPSIxs(
  input: DepositAmountsForSwap,
  tokenAMint: Address,
  tokenBMint: Address,
  slippage: Decimal,
  owner: TransactionSigner,
  mintAuthority: TransactionSigner
) {
  // multiply the tokens to swap by -1 to get the positive sign because we represent as negative numbers what we have to sell
  const tokensToBurn = -input.tokenBToSwapAmount.toNumber();

  const [tokenAAta, tokenBAta] = await Promise.all([
    getAssociatedTokenAddress(tokenAMint, owner.address),
    getAssociatedTokenAddress(tokenBMint, owner.address),
  ]);

  const aToRecieve = input.tokenAToSwapAmount.mul(new Decimal(FullBPS).sub(slippage)).div(FullBPS);
  const mintToIx = getMintToIx(mintAuthority, tokenAMint, tokenAAta, aToRecieve.toNumber());
  const burnFromIx = getBurnFromIx(owner, tokenBMint, tokenBAta, tokensToBurn);

  return [mintToIx, burnFromIx];
}

export const balance = async (
  connection: Rpc<GetAccountInfoApi & GetBalanceApi & GetTokenAccountBalanceApi>,
  user: Address,
  mint: Address,
  ifSolGetWsolBalance: boolean = false
): Promise<number> => {
  if (isSOLMint(mint) && !ifSolGetWsolBalance) {
    const balance = new Decimal((await connection.getBalance(user).send()).value.toString()).div(LAMPORTS_PER_SOL);
    return balance.toNumber();
  }

  const ata = await getAssociatedTokenAddress(mint, user);
  if (await checkIfAccountExists(connection, ata)) {
    const balance = await connection.getTokenAccountBalance(ata).send();
    return balance.value.uiAmount!;
  }

  return 0;
};

export const toJson = (object: any): string => {
  return JSON.stringify(object, null, 2);
};
