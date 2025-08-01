import {
  Address,
  GetAccountInfoApi,
  GetTokenAccountBalanceApi,
  Instruction,
  Rpc,
  TransactionSigner,
} from '@solana/kit';
import Decimal from 'decimal.js';
import { DECIMALS_SOL, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from './tokenUtils';
import { collToLamportsDecimal } from './utils';
import { CreateAta } from './types';
import { DEFAULT_PUBLIC_KEY, WRAPPED_SOL_MINT } from '../constants/pubkeys';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import {
  COMPUTE_BUDGET_PROGRAM_ADDRESS,
  getSetComputeUnitLimitInstruction,
  getSetComputeUnitPriceInstruction,
} from '@solana-program/compute-budget';
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  fetchMaybeToken,
  getCloseAccountInstruction,
  getSyncNativeInstruction,
} from '@solana-program/token-2022';
import { getTransferSolInstruction } from '@solana-program/system';

export const MAX_ACCOUNTS_PER_TRANSACTION = 64;

export const getComputeBudgetAndPriorityFeeIxns = (units: number, priorityFeeLamports?: Decimal): Instruction[] => {
  const ixns: Instruction[] = [];

  ixns.push(getSetComputeUnitLimitInstruction({ units }));

  if (priorityFeeLamports && priorityFeeLamports.gt(0)) {
    const unitPrice = priorityFeeLamports.mul(10 ** 6).div(units);
    ixns.push(getSetComputeUnitPriceInstruction({ microLamports: BigInt(unitPrice.floor().toString()) }));
  }

  return ixns;
};

export const createAtaIfMissingIx = async (
  connection: Rpc<GetAccountInfoApi>,
  mint: Address,
  owner: TransactionSigner,
  programId: Address
): Promise<Instruction | undefined> => {
  const ata = await getAssociatedTokenAddress(mint, owner.address, programId);
  const doesAtaExist = Boolean(await checkIfAccountExists(connection, ata));
  const createIxn = !doesAtaExist
    ? createAssociatedTokenAccountInstruction(owner, ata, owner.address, mint, programId)
    : undefined;
  return createIxn;
};

export const getAtasWithCreateIxnsIfMissing = async (
  connection: Rpc<any>,
  mints: [Address, Address][],
  owner: TransactionSigner
): Promise<Instruction[]> => {
  const requests = mints.map(async ([mint, tokenProgram]) => {
    const createAtaIx = await createAtaIfMissingIx(connection, mint, owner, tokenProgram);
    if (createAtaIx) {
      return createAtaIx;
    }
    return undefined;
  });
  const result = (await Promise.all(requests.filter((x) => x !== undefined))).filter(
    (ix) => ix !== undefined
  ) as Instruction[];

  return result;
};

export const createWsolAtaIfMissing = async (
  rpc: Rpc<GetAccountInfoApi & GetTokenAccountBalanceApi>,
  amount: Decimal,
  owner: TransactionSigner,
  method: 'deposit' | 'withdraw' = 'deposit'
): Promise<CreateAta> => {
  const createIxns: Instruction[] = [];
  const closeIxns: Instruction[] = [];

  const wsolAta: Address = await getAssociatedTokenAddress(WRAPPED_SOL_MINT, owner.address);

  const solDeposit = amount.toNumber();
  const wsolAtaTokenAccount = await fetchMaybeToken(rpc, wsolAta);

  // This checks if we need to create it
  if (!wsolAtaTokenAccount.exists) {
    createIxns.push(
      createAssociatedTokenAccountInstruction(owner, wsolAta, owner.address, WRAPPED_SOL_MINT, TOKEN_PROGRAM_ADDRESS)
    );
  }

  let uiAmount = 0;
  try {
    if (wsolAtaTokenAccount.exists) {
      const tokenBalance = await findAtaBalance(rpc, wsolAta);
      uiAmount = tokenBalance === null ? 0 : tokenBalance;
    }
  } catch (err) {
    console.log('Err Token Balance', err);
  }

  if (solDeposit !== null && solDeposit > uiAmount && method === 'deposit') {
    createIxns.push(
      getTransferSolInstruction({
        amount: BigInt(
          collToLamportsDecimal(new Decimal(solDeposit - uiAmount), DECIMALS_SOL)
            .floor()
            .toString()
        ),
        source: owner,
        destination: wsolAta,
      })
    );
  }

  if (createIxns.length > 0) {
    createIxns.push(
      getSyncNativeInstruction(
        {
          account: wsolAta,
        },
        { programAddress: TOKEN_PROGRAM_ADDRESS }
      )
    );
  }

  closeIxns.push(
    getCloseAccountInstruction(
      { account: wsolAta, owner: owner, destination: owner.address, multiSigners: [] },
      { programAddress: TOKEN_PROGRAM_ADDRESS }
    )
  );

  return {
    ata: wsolAta,
    createIxns,
    closeIxns,
  };
};

export const isWsolInfoInvalid = (wsolAtaAccountInfo: any): boolean => {
  const res =
    wsolAtaAccountInfo === null ||
    (wsolAtaAccountInfo !== null &&
      wsolAtaAccountInfo.data.length === 0 &&
      wsolAtaAccountInfo.owner === DEFAULT_PUBLIC_KEY);

  return res;
};

export async function checkIfAccountExists(connection: Rpc<GetAccountInfoApi>, account: Address): Promise<boolean> {
  return (await connection.getAccountInfo(account, { encoding: 'base64' }).send()).value != null;
}

export function removeBudgetAndAtaIxns(ixns: Instruction[], mints: Address[]): Instruction[] {
  return ixns.filter((ixn) => {
    const { programAddress, accounts } = ixn;

    if (programAddress === COMPUTE_BUDGET_PROGRAM_ADDRESS) {
      return false;
    }

    if (programAddress === ASSOCIATED_TOKEN_PROGRAM_ADDRESS) {
      if (!accounts || accounts.length < 2) {
        return true;
      }
      const mint = accounts[3];
      return !mints.includes(mint.address);
    }

    return true;
  });
}

export const findAtaBalance = async (
  connection: Rpc<GetTokenAccountBalanceApi>,
  ata: Address
): Promise<number | null> => {
  const res = await connection.getTokenAccountBalance(ata).send();
  if (res && res.value) {
    return res.value.uiAmount;
  }
  return null;
};
