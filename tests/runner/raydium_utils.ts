import { PROGRAM_ID as RAYDIUM_PROGRAM_ID } from '../../src/@codegen/raydium/programId';
import * as anchor from '@coral-xyz/anchor';
import {
  Address,
  generateKeyPairSigner, GetAccountInfoApi,
  getAddressEncoder,
  getProgramDerivedAddress,
  Rpc,
  Signature,
} from '@solana/kit';
import * as RaydiumInstructions from '../../src/@codegen/raydium/instructions';
import { accountExist, DeployedPool } from './utils';
import Decimal from 'decimal.js';
import { PoolState } from '../../src/@codegen/raydium/accounts';
import { BN } from 'bn.js';
import { i32ToBytes, SqrtPriceMath, TickUtils } from '@raydium-io/raydium-sdk-v2/lib';
import { getCreateAccountInstruction, SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { SYSVAR_RENT_ADDRESS } from '@solana/sysvars';
import { sendAndConfirmTx } from './tx';
import { Env } from './env';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { ProgramDerivedAddress } from '@solana/addresses/dist/types/program-derived-address';

export const OBSERVATION_STATE_LEN = 52121n;
export const AMM_CONFIG_SEED = Buffer.from(anchor.utils.bytes.utf8.encode('amm_config'));
export const POOL_SEED = Buffer.from(anchor.utils.bytes.utf8.encode('pool'));
export const POOL_VAULT_SEED = Buffer.from(anchor.utils.bytes.utf8.encode('pool_vault'));
export const BITMAP_SEED = Buffer.from(anchor.utils.bytes.utf8.encode('pool_tick_array_bitmap_extension'));

const addressEncoder = getAddressEncoder();

export async function initializeRaydiumPool(
  env: Env,
  tickSize: number,
  tokenMintA: Address,
  tokenMintB: Address,
  configAcc?: Address,
  observationAcc?: Address,
  initialPrice: number = 1.0
): Promise<DeployedPool> {
  let config: Address;
  if (configAcc) {
    config = configAcc;
  } else {
    const [configPk, _] = await getAmmConfigAddress(0, RAYDIUM_PROGRAM_ID);
    if (!(await accountExist(env.c.rpc, configPk))) {
      await createAmmConfig(env, configPk, 0, tickSize, 100, 200, 400);
    }
    config = configPk;
  }

  let observation: Address;
  if (observationAcc) {
    observation = observationAcc;
  } else {
    const observationPk = await generateKeyPairSigner();
    observation = observationPk.address;
    {
      const createObvIx = getCreateAccountInstruction({
        payer: env.admin,
        newAccount: observationPk,
        lamports: await env.c.rpc.getMinimumBalanceForRentExemption(OBSERVATION_STATE_LEN).send(),
        space: OBSERVATION_STATE_LEN,
        programAddress: RAYDIUM_PROGRAM_ID,
      });
      const txHash = await sendAndConfirmTx(env.c, env.admin, [createObvIx]);
      console.log('Initialize Observer:', txHash);
    }
  }

  const sqrtPriceX64InitialPrice = SqrtPriceMath.priceToSqrtPriceX64(new Decimal(initialPrice), 6, 6);

  const tokens = orderMints(tokenMintA, tokenMintB);
  tokenMintA = tokens[0];
  tokenMintB = tokens[1];

  const [poolAddress, _bump1] = await getPoolAddress(config, tokenMintA, tokenMintB, RAYDIUM_PROGRAM_ID);
  const [bitmapPk, _] = await getBitmapAddress(poolAddress, RAYDIUM_PROGRAM_ID);

  const [tokenAVault, _bump2] = await getPoolVaultAddress(poolAddress, tokenMintA, RAYDIUM_PROGRAM_ID);
  const [tokenBVault, _bump3] = await getPoolVaultAddress(poolAddress, tokenMintB, RAYDIUM_PROGRAM_ID);

  {
    const createPoolArgs: RaydiumInstructions.CreatePoolArgs = {
      sqrtPriceX64: sqrtPriceX64InitialPrice,
      openTime: new BN(1684953391), // not relevant, it has to be a timestamp < current timestamp
    };
    const createPoolAccounts: RaydiumInstructions.CreatePoolAccounts = {
      poolCreator: env.admin,
      ammConfig: config,
      poolState: poolAddress,
      tokenMint0: tokenMintA,
      tokenMint1: tokenMintB,
      tokenVault0: tokenAVault,
      tokenVault1: tokenBVault,
      observationState: observation,
      systemProgram: SYSTEM_PROGRAM_ADDRESS,
      rent: SYSVAR_RENT_ADDRESS,
      tickArrayBitmap: bitmapPk,
      tokenProgram0: TOKEN_PROGRAM_ADDRESS,
      tokenProgram1: TOKEN_PROGRAM_ADDRESS,
    };

    const initializeTx = RaydiumInstructions.createPool(createPoolArgs, createPoolAccounts);
    const sig = await sendAndConfirmTx(env.c, env.admin, [initializeTx]);
    console.log('Initialize Raydium pool: ', sig);
  }

  const deployedPool: DeployedPool = {
    pool: poolAddress,
    tokenMintA,
    tokenMintB,
    admin: env.admin.address,
  };
  return deployedPool;
}

export async function getAmmConfigAddress(index: number, programId: Address): Promise<ProgramDerivedAddress> {
  const pda = await getProgramDerivedAddress({
    seeds: [AMM_CONFIG_SEED, u16ToBytes(index)],
    programAddress: programId,
  });
  console.log('config address ', pda[0]);
  return pda;
}

export async function getBitmapAddress(pool: Address, programId: Address): Promise<ProgramDerivedAddress> {
  const pda = await getProgramDerivedAddress({
    seeds: [BITMAP_SEED, addressEncoder.encode(pool)],
    programAddress: programId,
  });
  console.log('bitmap address ', pda[0]);
  return pda;
}

export function u16ToBytes(num: number) {
  const arr = new ArrayBuffer(2);
  const view = new DataView(arr);
  view.setUint16(0, num, false);
  return new Uint8Array(arr);
}

async function createAmmConfig(
  env: Env,
  config: Address,
  index: number,
  tickSpacing: number,
  tradeFeeRate: number,
  protocolFeeRate: number,
  fundFeeRate: number
): Promise<Signature> {
  const initConfigArgs: RaydiumInstructions.CreateAmmConfigArgs = {
    index: index,
    tickSpacing: tickSpacing,
    tradeFeeRate: tradeFeeRate,
    protocolFeeRate: protocolFeeRate,
    fundFeeRate: fundFeeRate,
  };
  const initConfigAccounts: RaydiumInstructions.CreateAmmConfigAccounts = {
    owner: env.admin,
    ammConfig: config,
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
  };

  const initializeTx = RaydiumInstructions.createAmmConfig(initConfigArgs, initConfigAccounts);
  const sig = await sendAndConfirmTx(env.c, env.admin, [initializeTx]);
  console.log('InitializeConfig:', sig);
  return sig;
}

export function orderMints(mintX: Address, mintY: Address): [Address, Address] {
  let mintA, mintB;
  if (Buffer.compare(Buffer.from(addressEncoder.encode(mintX)), Buffer.from(addressEncoder.encode(mintY))) < 0) {
    mintA = mintX;
    mintB = mintY;
  } else {
    mintA = mintY;
    mintB = mintX;
  }

  return [mintA, mintB];
}

export async function getPoolAddress(
  ammConfig: Address,
  tokenMint0: Address,
  tokenMint1: Address,
  programId: Address
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    seeds: [POOL_SEED, addressEncoder.encode(ammConfig), addressEncoder.encode(tokenMint0), addressEncoder.encode(tokenMint1)],
    programAddress: programId,
  });
}

export async function getPoolVaultAddress(
  pool: Address,
  vaultTokenMint: Address,
  programId: Address
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    seeds: [POOL_VAULT_SEED, addressEncoder.encode(pool), addressEncoder.encode(vaultTokenMint)],
    programAddress: programId,
  });
}

export async function getTickArrayPubkeysFromRangeRaydium(
  connection: Rpc<GetAccountInfoApi>,
  pool: Address,
  tickLowerIndex: number,
  tickUpperIndex: number
): Promise<[Address, Address]> {
  const poolState = await PoolState.fetch(connection, pool);
  if (poolState == null) {
    throw new Error(`Error fetching ${poolState}`);
  }

  const startTickIndex = TickUtils.getTickArrayStartIndexByTick(tickLowerIndex, poolState.tickSpacing);
  const endTickIndex = TickUtils.getTickArrayStartIndexByTick(tickUpperIndex, poolState.tickSpacing);

  const [startTickIndexPk] = await getProgramDerivedAddress({
    seeds: [Buffer.from('tick_array'), addressEncoder.encode(pool), i32ToBytes(startTickIndex)],
    programAddress: RAYDIUM_PROGRAM_ID,
  });
  const [endTickIndexPk] = await getProgramDerivedAddress({
    seeds: [Buffer.from('tick_array'), addressEncoder.encode(pool), i32ToBytes(endTickIndex)],
    programAddress: RAYDIUM_PROGRAM_ID,
  });

  return [startTickIndexPk, endTickIndexPk];
}
