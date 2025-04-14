import {
  Address,
  IInstruction,
  TransactionSigner,
  generateKeyPairSigner,
  getProgramDerivedAddress,
  getAddressEncoder,
  Rpc,
  GetAccountInfoApi,
} from '@solana/kit';
import { DeployedPool, range } from './utils';
import * as WhirlpoolInstructions from '../../src/@codegen/whirlpools/instructions';
import * as anchor from '@coral-xyz/anchor';
import { PROGRAM_ID_CLI as WHIRLPOOL_PROGRAM_ID } from '../../src/@codegen/whirlpools/programId';
import { orderMints } from './raydium_utils';
import Decimal from 'decimal.js';
import { getStartTickIndex, priceToSqrtX64 } from '@orca-so/whirlpool-sdk';
import { Whirlpool } from '../../src/@codegen/whirlpools/accounts';
import { Env } from './env';
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { sendAndConfirmTx } from './tx';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { SYSVAR_RENT_ADDRESS } from '@solana/sysvars';
import { ProgramDerivedAddress } from '@solana/addresses/dist/types/program-derived-address';

const addressEncoder = getAddressEncoder();

export async function initializeWhirlpool(
  env: Env,
  tickSize: number,
  tokenMintA: Address,
  tokenMintB: Address
): Promise<DeployedPool> {
  const config = await generateKeyPairSigner();

  {
    const initialiseConfigArgs: WhirlpoolInstructions.InitializeConfigArgs = {
      feeAuthority: env.admin.address,
      collectProtocolFeesAuthority: env.admin.address,
      rewardEmissionsSuperAuthority: env.admin.address,
      defaultProtocolFeeRate: 0,
    };

    const initialiseConfigAccounts: WhirlpoolInstructions.InitializeConfigAccounts = {
      config: config,
      funder: env.admin,
      systemProgram: SYSTEM_PROGRAM_ADDRESS,
    };

    const initializeIx = WhirlpoolInstructions.initializeConfig(initialiseConfigArgs, initialiseConfigAccounts);
    const sig = await sendAndConfirmTx(env.c, env.admin, [initializeIx]);
    console.log('InitializeConfig:', sig);
  }

  const [feeTierPk] = await getProgramDerivedAddress({
    seeds: [
      Buffer.from('fee_tier'),
      addressEncoder.encode(config.address),
      new anchor.BN(tickSize).toArrayLike(Buffer, 'le', 2),
    ],
    programAddress: WHIRLPOOL_PROGRAM_ID,
  });

  {
    const initialiseFeeTierArgs: WhirlpoolInstructions.InitializeFeeTierArgs = {
      tickSpacing: tickSize,
      defaultFeeRate: 0,
    };

    const initialiseFeeTierAccounts: WhirlpoolInstructions.InitializeFeeTierAccounts = {
      config: config.address,
      feeTier: feeTierPk,
      funder: env.admin,
      feeAuthority: env.admin,
      systemProgram: SYSTEM_PROGRAM_ADDRESS,
    };

    const initializeIx = WhirlpoolInstructions.initializeFeeTier(initialiseFeeTierArgs, initialiseFeeTierAccounts);
    const sig = await sendAndConfirmTx(env.c, env.admin, [initializeIx]);
    console.log('InitializeFeeTier:', sig);
  }

  const tokens = orderMints(tokenMintA, tokenMintB);
  tokenMintA = tokens[0];
  tokenMintB = tokens[1];

  const [whirlpool] = await getWhirlpool(WHIRLPOOL_PROGRAM_ID, config.address, tokenMintA, tokenMintB, tickSize);

  const [tokenBadgeA] = await getTokenBadge(WHIRLPOOL_PROGRAM_ID, config.address, tokenMintA);
  const [tokenBadgeB] = await getTokenBadge(WHIRLPOOL_PROGRAM_ID, config.address, tokenMintB);

  {
    const tokenAVault = await generateKeyPairSigner();
    const tokenBVault = await generateKeyPairSigner();

    const initialPrice = 1.0;
    const initialisePoolArgs: WhirlpoolInstructions.InitializePoolV2Args = {
      tickSpacing: tickSize,
      initialSqrtPrice: new anchor.BN(priceToSqrtX64(new Decimal(initialPrice), 6, 6)),
    };

    const initializePoolAccounts: WhirlpoolInstructions.InitializePoolV2Accounts = {
      whirlpoolsConfig: config.address,
      tokenMintA: tokenMintA,
      tokenMintB: tokenMintB,
      funder: env.admin,
      whirlpool: whirlpool,
      tokenVaultA: tokenAVault,
      tokenVaultB: tokenBVault,
      feeTier: feeTierPk,
      tokenBadgeA,
      tokenBadgeB,
      tokenProgramA: TOKEN_PROGRAM_ADDRESS,
      tokenProgramB: TOKEN_PROGRAM_ADDRESS,
      systemProgram: SYSTEM_PROGRAM_ADDRESS,
      rent: SYSVAR_RENT_ADDRESS,
    };

    const initializeIx = WhirlpoolInstructions.initializePoolV2(initialisePoolArgs, initializePoolAccounts);
    const sig = await sendAndConfirmTx(env.c, env.admin, [initializeIx]);
    console.log('InitializePoolV2:', sig);
  }

  {
    const tx = await initTickArrayForTicks(env.admin, whirlpool, range(-300, 300, 40), tickSize, WHIRLPOOL_PROGRAM_ID);

    const sig = await sendAndConfirmTx(env.c, env.admin, tx);
    console.log('InitializeTickArray:', sig);
  }

  const pool: DeployedPool = {
    pool: whirlpool,
    tokenMintA,
    tokenMintB,
    admin: env.admin.address,
  };

  return pool;
}

async function getWhirlpool(
  programId: Address,
  whirlpoolsConfigKey: Address,
  tokenMintAKey: Address,
  tokenMintBKey: Address,
  tickSpacing: number
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    seeds: [
      Buffer.from('whirlpool'),
      addressEncoder.encode(whirlpoolsConfigKey),
      addressEncoder.encode(tokenMintAKey),
      addressEncoder.encode(tokenMintBKey),
      new anchor.BN(tickSpacing).toArrayLike(Buffer, 'le', 2),
    ],
    programAddress: programId,
  });
}

export async function initTickArrayForTicks(
  signer: TransactionSigner,
  whirlpool: Address,
  ticks: number[],
  tickSpacing: number,
  programId: Address
): Promise<IInstruction[]> {
  const startTicks = ticks.map((tick) => getStartTickIndex(tick, tickSpacing));
  const tx: IInstruction[] = [];
  const initializedArrayTicks: number[] = [];

  for (let i = 0; i < startTicks.length; i++) {
    const startTick = startTicks[i];
    if (initializedArrayTicks.includes(startTick)) {
      continue;
    }
    initializedArrayTicks.push(startTick);
    const initIx = await initTickArrayInstruction(signer, whirlpool, startTick, programId);
    tx.push(initIx);
  }
  return tx;
}

export async function initTickArrayInstruction(
  signer: TransactionSigner,
  whirlpool: Address,
  startTick: number,
  programId: Address
): Promise<IInstruction> {
  const [tickArrayPda] = await getTickArray(programId, whirlpool, startTick);

  const initTickArrayArgs: WhirlpoolInstructions.InitializeTickArrayArgs = {
    startTickIndex: startTick,
  };
  const initTickArrayAccounts: WhirlpoolInstructions.InitializeTickArrayAccounts = {
    whirlpool: whirlpool,
    funder: signer,
    tickArray: tickArrayPda,
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
  };
  return WhirlpoolInstructions.initializeTickArray(initTickArrayArgs, initTickArrayAccounts);
}

async function getTickArray(
  programId: Address,
  whirlpoolAddress: Address,
  startTick: number
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    seeds: [Buffer.from('tick_array'), addressEncoder.encode(whirlpoolAddress), Buffer.from(startTick.toString())],
    programAddress: programId,
  });
}

async function getTokenBadge(
  programId: Address,
  whirlpoolsConfigAddress: Address,
  tokenMintKey: Address
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    seeds: [
      Buffer.from('token_badge'),
      addressEncoder.encode(whirlpoolsConfigAddress),
      addressEncoder.encode(tokenMintKey),
    ],
    programAddress: programId,
  });
}

export async function getTickArrayPubkeysFromRangeOrca(
  rpc: Rpc<GetAccountInfoApi>,
  whirlpool: Address,
  tickLowerIndex: number,
  tickUpperIndex: number
): Promise<[Address, Address]> {
  const whirlpoolState = await Whirlpool.fetch(rpc, whirlpool);
  if (whirlpoolState == null) {
    throw new Error(`Raydium Pool ${whirlpool} doesn't exist`);
  }

  const startTickIndex = getStartTickIndex(tickLowerIndex, whirlpoolState.tickSpacing, 0);
  const endTickIndex = getStartTickIndex(tickUpperIndex, whirlpoolState.tickSpacing, 0);

  const [startTickIndexPk] = await getProgramDerivedAddress({
    seeds: [Buffer.from('tick_array'), addressEncoder.encode(whirlpool), Buffer.from(startTickIndex.toString())],
    programAddress: WHIRLPOOL_PROGRAM_ID,
  });
  const [endTickIndexPk] = await getProgramDerivedAddress({
    seeds: [Buffer.from('tick_array'), addressEncoder.encode(whirlpool), Buffer.from(endTickIndex.toString())],
    programAddress: WHIRLPOOL_PROGRAM_ID,
  });
  return [startTickIndexPk, endTickIndexPk];
}
