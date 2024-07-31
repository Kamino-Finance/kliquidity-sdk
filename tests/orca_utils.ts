import { PublicKey, Connection, Transaction, TransactionInstruction, Keypair } from '@solana/web3.js';
import { DeployedPool, range } from './utils';
import * as WhirlpoolInstructions from '../src/whirlpools-client/instructions';
import * as anchor from '@coral-xyz/anchor';
import { sendTransactionWithLogs, TOKEN_PROGRAM_ID } from '../src';
import { PROGRAM_ID_CLI as WHIRLPOOL_PROGRAM_ID } from '../src/whirlpools-client/programId';
import { orderMints } from './raydium_utils';
import Decimal from 'decimal.js';
import { getStartTickIndex, priceToSqrtX64 } from '@orca-so/whirlpool-sdk';
import { Whirlpool } from '../src/whirlpools-client/accounts';

export async function initializeWhirlpool(
  connection: Connection,
  signer: Keypair,
  tickSize: number,
  tokenMintA: PublicKey,
  tokenMintB: PublicKey
): Promise<DeployedPool> {
  const config = Keypair.generate();

  {
    const initialiseConfigArgs: WhirlpoolInstructions.InitializeConfigArgs = {
      feeAuthority: signer.publicKey,
      collectProtocolFeesAuthority: signer.publicKey,
      rewardEmissionsSuperAuthority: signer.publicKey,
      defaultProtocolFeeRate: 0,
    };

    const initialiseConfigAccounts: WhirlpoolInstructions.InitializeConfigAccounts = {
      config: config.publicKey,
      funder: signer.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    const tx = new Transaction();
    const initializeIx = WhirlpoolInstructions.initializeConfig(initialiseConfigArgs, initialiseConfigAccounts);
    tx.add(initializeIx);

    const sig = await sendTransactionWithLogs(connection, tx, signer.publicKey, [signer, config]);
    console.log('InitializeConfig:', sig);
  }

  const [feeTierPk, _] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('fee_tier'), config.publicKey.toBuffer(), new anchor.BN(tickSize).toArrayLike(Buffer, 'le', 2)],
    WHIRLPOOL_PROGRAM_ID
  );

  {
    const initialiseFeeTierArgs: WhirlpoolInstructions.InitializeFeeTierArgs = {
      tickSpacing: tickSize,
      defaultFeeRate: 0,
    };

    const initialiseFeeTierAccounts: WhirlpoolInstructions.InitializeFeeTierAccounts = {
      config: config.publicKey,
      feeTier: feeTierPk,
      funder: signer.publicKey,
      feeAuthority: signer.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    const tx = new Transaction();
    const initializeIx = WhirlpoolInstructions.initializeFeeTier(initialiseFeeTierArgs, initialiseFeeTierAccounts);
    tx.add(initializeIx);

    const sig = await sendTransactionWithLogs(connection, tx, signer.publicKey, [signer]);
    console.log('InitializeFeeTier:', sig);
  }

  const tokens = orderMints(tokenMintA, tokenMintB);
  tokenMintA = tokens[0];
  tokenMintB = tokens[1];

  const [whirlpool] = await getWhirlpool(WHIRLPOOL_PROGRAM_ID, config.publicKey, tokenMintA, tokenMintB, tickSize);

  const [tokenBadgeA] = getTokenBadge(WHIRLPOOL_PROGRAM_ID, config.publicKey, tokenMintA);
  const [tokenBadgeB] = getTokenBadge(WHIRLPOOL_PROGRAM_ID, config.publicKey, tokenMintB);

  {
    const tokenAVault = Keypair.generate();
    const tokenBVault = Keypair.generate();

    const initialPrice = 1.0;
    const initialisePoolArgs: WhirlpoolInstructions.InitializePoolV2Args = {
      tickSpacing: tickSize,
      initialSqrtPrice: new anchor.BN(priceToSqrtX64(new Decimal(initialPrice), 6, 6)),
    };

    const initializePoolAccounts: WhirlpoolInstructions.InitializePoolV2Accounts = {
      whirlpoolsConfig: config.publicKey,
      tokenMintA: tokenMintA,
      tokenMintB: tokenMintB,
      funder: signer.publicKey,
      whirlpool: whirlpool,
      tokenVaultA: tokenAVault.publicKey,
      tokenVaultB: tokenBVault.publicKey,
      feeTier: feeTierPk,
      tokenBadgeA,
      tokenBadgeB,
      tokenProgramA: TOKEN_PROGRAM_ID,
      tokenProgramB: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    };

    const tx = new Transaction();
    const initializeIx = WhirlpoolInstructions.initializePoolV2(initialisePoolArgs, initializePoolAccounts);
    tx.add(initializeIx);

    const sig = await sendTransactionWithLogs(connection, tx, signer.publicKey, [signer, tokenAVault, tokenBVault]);
    console.log('InitializePoolV2:', sig);
  }

  {
    const tx = await initTickArrayForTicks(
      connection,
      signer,
      whirlpool,
      range(-300, 300, 40),
      tickSize,
      WHIRLPOOL_PROGRAM_ID
    );

    const sig = await sendTransactionWithLogs(connection, tx, signer.publicKey, [signer]);
    console.log('InitializeTickArray:', sig);
  }

  const pool: DeployedPool = {
    pool: whirlpool,
    tokenMintA,
    tokenMintB,
    admin: signer.publicKey,
  };

  return pool;
}

async function getWhirlpool(
  programId: PublicKey,
  whirlpoolsConfigKey: PublicKey,
  tokenMintAKey: PublicKey,
  tokenMintBKey: PublicKey,
  tickSpacing: number
): Promise<[anchor.web3.PublicKey, number]> {
  return anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('whirlpool'),
      whirlpoolsConfigKey.toBuffer(),
      tokenMintAKey.toBuffer(),
      tokenMintBKey.toBuffer(),
      new anchor.BN(tickSpacing).toArrayLike(Buffer, 'le', 2),
    ],
    programId
  );
}

export async function initTickArrayForTicks(
  connection: Connection,
  signer: Keypair,
  whirlpool: PublicKey,
  ticks: number[],
  tickSpacing: number,
  programId: PublicKey
): Promise<Transaction> {
  const startTicks = ticks.map((tick) => getStartTickIndex(tick, tickSpacing));
  const tx = new Transaction();
  const initializedArrayTicks: number[] = [];

  startTicks.forEach(async (startTick) => {
    if (initializedArrayTicks.includes(startTick)) {
      return;
    }
    initializedArrayTicks.push(startTick);
    const initIx = await initTickArrayInstruction(signer, whirlpool, startTick, programId);

    tx.add(initIx);
  });
  return tx;
}

export async function initTickArrayInstruction(
  signer: Keypair,
  whirlpool: PublicKey,
  startTick: number,
  programId: PublicKey
): Promise<TransactionInstruction> {
  const [tickArrayPda, _tickArrayPdaBump] = getTickArray(programId, whirlpool, startTick);

  const initTickArrayArgs: WhirlpoolInstructions.InitializeTickArrayArgs = {
    startTickIndex: startTick,
  };
  const initTickArrayAccounts: WhirlpoolInstructions.InitializeTickArrayAccounts = {
    whirlpool: whirlpool,
    funder: signer.publicKey,
    tickArray: tickArrayPda,
    systemProgram: anchor.web3.SystemProgram.programId,
  };
  return WhirlpoolInstructions.initializeTickArray(initTickArrayArgs, initTickArrayAccounts);
}

function getTickArray(programId: PublicKey, whirlpoolAddress: PublicKey, startTick: number): [PublicKey, number] {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('tick_array'), whirlpoolAddress.toBuffer(), Buffer.from(startTick.toString())],
    programId
  );
}

function getTokenBadge(
  programId: PublicKey,
  whirlpoolsConfigAddress: PublicKey,
  tokenMintKey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_badge'), whirlpoolsConfigAddress.toBuffer(), tokenMintKey.toBuffer()],
    programId
  );
}

export async function getTickArrayPubkeysFromRangeOrca(
  connection: Connection,
  whirlpool: PublicKey,
  tickLowerIndex: number,
  tickUpperIndex: number
) {
  const whirlpoolState = await Whirlpool.fetch(connection, whirlpool);
  if (whirlpoolState == null) {
    throw new Error(`Raydium Pool ${whirlpool} doesn't exist`);
  }

  const startTickIndex = getStartTickIndex(tickLowerIndex, whirlpoolState.tickSpacing, 0);
  const endTickIndex = getStartTickIndex(tickUpperIndex, whirlpoolState.tickSpacing, 0);

  const [startTickIndexPk, _startTickIndexBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('tick_array'), whirlpool.toBuffer(), Buffer.from(startTickIndex.toString())],
    WHIRLPOOL_PROGRAM_ID
  );
  const [endTickIndexPk, _endTickIndexBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('tick_array'), whirlpool.toBuffer(), Buffer.from(endTickIndex.toString())],
    WHIRLPOOL_PROGRAM_ID
  );
  return [startTickIndexPk, endTickIndexPk];
}
