import {
  AccountInfo,
  Commitment,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Signer,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
} from '@solana/web3.js';
import { sleep } from './utils';
import { WhirlpoolStrategy } from '../kamino-client/accounts';
import { tickIndexToPrice } from '@orca-so/whirlpool-sdk';
import Decimal from 'decimal.js';
import { CollateralInfo } from '../kamino-client/types';
import { getPriceOfBinByBinIdWithDecimals } from './meteora';
import { getAssociatedTokenAddress as getAta, unpackMint } from '@solana/spl-token';

export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

export const SOL_MINTS = [
  new PublicKey('So11111111111111111111111111111111111111111'),
  new PublicKey('So11111111111111111111111111111111111111112'),
];
export const DECIMALS_SOL = 9;

export async function getAssociatedTokenAddressAndData(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  programId = TOKEN_PROGRAM_ID
): Promise<[PublicKey, AccountInfo<Buffer> | null]> {
  const ata = await getAssociatedTokenAddress(mint, owner, true, programId);
  const data = await connection.getAccountInfo(ata);
  return [ata, data];
}

export function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = true,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<PublicKey> {
  return getAta(mint, owner, allowOwnerOffCurve, programId, associatedTokenProgramId);
}

export function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedToken, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: associatedTokenProgramId,
    data: Buffer.alloc(0),
  });
}

export function createAddExtraComputeUnitsIx(units: number): TransactionInstruction {
  return ComputeBudgetProgram.setComputeUnitLimit({ units });
}

export function createTransactionWithExtraBudget(extraUnits: number = 400000) {
  return new Transaction().add(createAddExtraComputeUnitsIx(extraUnits));
}

export async function assignBlockInfoToTransaction(connection: Connection, transaction: Transaction, payer: PublicKey) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  return transaction;
}

export async function sendTransactionWithLogs(
  connection: Connection,
  tx: Transaction,
  payer: PublicKey,
  signers: Signer[],
  commitment: Commitment = 'processed',
  skipPreflight: boolean = false
): Promise<TransactionSignature | null> {
  const txn = await assignBlockInfoToTransaction(connection, tx, payer);
  try {
    const res = await sendAndConfirmTransaction(connection, txn, signers, {
      commitment: commitment,
      skipPreflight: skipPreflight,
    });

    return res;
  } catch (e) {
    console.log('ERROR:', e);
    await sleep(5000);
    // @ts-ignore
    const sig = e.toString().split(' failed ')[0].split('Transaction ')[1];
    const res = await connection.getTransaction(sig, { commitment: 'confirmed' });
    if (res && res.meta) {
      console.log('Txn', res.meta.logMessages);
    }
    return null;
  }
}

export function getStrategyPriceRangeOrca(
  tickLowerIndex: number,
  tickUpperIndex: number,
  strategy: WhirlpoolStrategy,
  poolPrice: Decimal
) {
  const { priceLower, priceUpper } = getPriceLowerUpper(
    tickLowerIndex,
    tickUpperIndex,
    Number(strategy.tokenAMintDecimals.toString()),
    Number(strategy.tokenBMintDecimals.toString())
  );
  const strategyOutOfRange = poolPrice.lt(priceLower) || poolPrice.gt(priceUpper);
  return { priceLower, poolPrice, priceUpper, strategyOutOfRange };
}

export function getStrategyPriceRangeRaydium(
  tickLowerIndex: number,
  tickUpperIndex: number,
  tickCurrent: number,
  tokenADecimals: number,
  tokenBDecimals: number
) {
  const { priceLower, priceUpper } = getPriceLowerUpper(tickLowerIndex, tickUpperIndex, tokenADecimals, tokenBDecimals);
  const poolPrice = tickIndexToPrice(tickCurrent, tokenADecimals, tokenBDecimals);
  const strategyOutOfRange = poolPrice.lt(priceLower) || poolPrice.gt(priceUpper);
  return { priceLower, poolPrice, priceUpper, strategyOutOfRange };
}

export function getStrategyPriceRangeMeteora(
  priceLower: Decimal,
  priceUpper: Decimal,
  activeBinId: number,
  binStep: number,
  decimalsA: number,
  decimalsB: number
) {
  const poolPrice = getPriceOfBinByBinIdWithDecimals(activeBinId, binStep, decimalsA, decimalsB);
  const strategyOutOfRange = poolPrice.lt(priceLower) || poolPrice.gt(priceUpper);
  return { priceLower, poolPrice, priceUpper, strategyOutOfRange };
}

export function getMeteoraPriceLowerUpper(
  tickLowerIndex: number,
  tickUpperIndex: number,
  tokenAMintDecimals: number,
  tokenBMintDecimals: number,
  binStep: number
) {
  const priceLower = getPriceOfBinByBinIdWithDecimals(tickLowerIndex, binStep, tokenAMintDecimals, tokenBMintDecimals);
  const priceUpper = getPriceOfBinByBinIdWithDecimals(tickUpperIndex, binStep, tokenAMintDecimals, tokenBMintDecimals);
  return { priceLower, priceUpper };
}

export function getPriceLowerUpper(
  tickLowerIndex: number,
  tickUpperIndex: number,
  tokenAMintDecimals: number,
  tokenBMintDecimals: number
) {
  const priceLower = tickIndexToPrice(
    tickLowerIndex,
    Number(tokenAMintDecimals.toString()),
    Number(tokenBMintDecimals.toString())
  );
  const priceUpper = tickIndexToPrice(
    tickUpperIndex,
    Number(tokenAMintDecimals.toString()),
    Number(tokenBMintDecimals.toString())
  );
  return { priceLower, priceUpper };
}

export function getTokenNameFromCollateralInfo(collateralInfo: CollateralInfo) {
  return String.fromCharCode(...collateralInfo.name.filter((x) => x > 0));
}

export const isSOLMint = (mint: PublicKey): boolean => {
  return SOL_MINTS.filter((m) => m.equals(mint)).length > 0;
};

export async function getMintDecimals(connection: Connection, mint: PublicKey): Promise<number> {
  if (isSOLMint(mint)) {
    return DECIMALS_SOL;
  }
  const acc = await connection.getAccountInfo(mint);
  if (!acc) {
    throw new Error(`Mint ${mint.toBase58()} not found`);
  }
  const mintInfo = unpackMint(mint, acc, acc.owner);
  return mintInfo.decimals;
}

export function removeBudgetAndAtaIxns(ixns: TransactionInstruction[], mints: PublicKey[]): TransactionInstruction[] {
  return ixns.filter((ixn) => {
    const { programId, keys } = ixn;

    if (programId.equals(ComputeBudgetProgram.programId)) {
      return false;
    }

    if (programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
      const mint = keys[3];

      return !mints.includes(mint.pubkey);
    }

    return true;
  });
}
