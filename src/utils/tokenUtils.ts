import {
  Address,
  Instruction,
  address,
  TransactionSigner,
  Rpc,
  GetAccountInfoApi,
  Account,
  SolanaRpcApi,
} from '@solana/kit';
import { WhirlpoolStrategy } from '../@codegen/kliquidity/accounts';
import Decimal from 'decimal.js';
import { CollateralInfo } from '../@codegen/kliquidity/types';
import { getPriceOfBinByBinIdWithDecimals } from './meteora';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  fetchMaybeMint,
  fetchMaybeToken,
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstruction,
  Token,
} from '@solana-program/token-2022';
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { getSetComputeUnitLimitInstruction } from '@solana-program/compute-budget';
import { tickIndexToPrice } from '@orca-so/whirlpools-core';

export const SOL_MINT = address('So11111111111111111111111111111111111111111');
export const WSOL_MINT = address('So11111111111111111111111111111111111111112');

export const SOL_MINTS = [SOL_MINT, WSOL_MINT];
export const DECIMALS_SOL = 9;

export async function getAssociatedTokenAddressAndAccount(
  connection: Rpc<GetAccountInfoApi>,
  mint: Address,
  owner: Address,
  programId: Address = TOKEN_PROGRAM_ADDRESS
): Promise<[Address, Account<Token> | null]> {
  const ata = await getAssociatedTokenAddress(mint, owner, programId);
  const account = await fetchMaybeToken(connection, ata);
  return [ata, account.exists ? account : null];
}

export async function getAssociatedTokenAddress(
  mint: Address,
  owner: Address,
  programId: Address = TOKEN_PROGRAM_ADDRESS,
  associatedTokenProgramId: Address = ASSOCIATED_TOKEN_PROGRAM_ADDRESS
): Promise<Address> {
  const [ata] = await findAssociatedTokenPda(
    {
      mint,
      owner,
      tokenProgram: programId,
    },
    { programAddress: associatedTokenProgramId }
  );
  return ata;
}

export function createAssociatedTokenAccountInstruction(
  payer: TransactionSigner,
  associatedTokenAddress: Address,
  owner: Address,
  mint: Address,
  programId: Address = TOKEN_PROGRAM_ADDRESS,
  associatedTokenProgramId: Address = ASSOCIATED_TOKEN_PROGRAM_ADDRESS
): Instruction {
  return getCreateAssociatedTokenInstruction(
    {
      mint,
      owner,
      ata: associatedTokenAddress,
      payer: payer,
      tokenProgram: programId,
      systemProgram: SYSTEM_PROGRAM_ADDRESS,
    },
    { programAddress: associatedTokenProgramId }
  );
}

export function createComputeUnitLimitIx(units: number = 400000): Instruction {
  return getSetComputeUnitLimitInstruction({ units });
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
  const poolPrice = new Decimal(tickIndexToPrice(tickCurrent, tokenADecimals, tokenBDecimals));
  const strategyOutOfRange = poolPrice.lt(priceLower) || poolPrice.gt(priceUpper);
  return { priceLower: new Decimal(priceLower), poolPrice, priceUpper: new Decimal(priceUpper), strategyOutOfRange };
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

export const isSOLMint = (mint: Address): boolean => {
  return SOL_MINTS.filter((m) => m === mint).length > 0;
};

export async function getMintDecimals(rpc: Rpc<GetAccountInfoApi>, mint: Address): Promise<number> {
  if (isSOLMint(mint)) {
    return DECIMALS_SOL;
  }
  const acc = await fetchMaybeMint(rpc, mint);
  if (!acc.exists) {
    throw new Error(`Mint ${mint} not found`);
  }
  return acc.data.decimals;
}

export function solToWSol(mint: Address): Address {
  if (mint === SOL_MINT) {
    return WSOL_MINT;
  }
  return mint;
}

export async function getTokenAccountBalance(rpc: Rpc<SolanaRpcApi>, tokenAccount: Address): Promise<Decimal> {
  const tokenAccountBalance = await rpc.getTokenAccountBalance(tokenAccount).send();
  if (!tokenAccountBalance.value) {
    throw new Error(`Could not get token account balance for ${tokenAccount.toString()}.`);
  }
  return new Decimal(tokenAccountBalance.value.uiAmountString!);
}

export async function getTokenAccountBalanceLamports(rpc: Rpc<SolanaRpcApi>, tokenAccount: Address): Promise<number> {
  const tokenAccountBalance = await rpc.getTokenAccountBalance(tokenAccount).send();
  if (!tokenAccountBalance.value) {
    throw new Error(`Could not get token account balance for ${tokenAccount.toString()}.`);
  }
  return Number(tokenAccountBalance.value.amount);
}
