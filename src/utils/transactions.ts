import {
  AccountInfo,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import Decimal from 'decimal.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  DECIMALS_SOL,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from './tokenUtils';
import { createCloseAccountInstruction, NATIVE_MINT, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { collToLamportsDecimal } from './utils';
import { CreateAta } from './types';

export const MAX_ACCOUNTS_PER_TRANSACTION = 64;

export const decodeSerializedTransaction = (tx: string | undefined) => {
  if (!tx) {
    return undefined;
  }
  return Transaction.from(Buffer.from(tx, 'base64'));
};

export const getComputeBudgetAndPriorityFeeIxns = (
  units: number,
  priorityFeeLamports?: Decimal
): TransactionInstruction[] => {
  const ixns: TransactionInstruction[] = [];
  ixns.push(ComputeBudgetProgram.setComputeUnitLimit({ units }));

  if (priorityFeeLamports && priorityFeeLamports.gt(0)) {
    const unitPrice = priorityFeeLamports.mul(10 ** 6).div(units);
    ixns.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: BigInt(unitPrice.floor().toString()) }));
  }

  return ixns;
};

export const createAtaIfMissingIx = async (
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  programId: PublicKey
): Promise<TransactionInstruction | undefined> => {
  const ata = await getAssociatedTokenAddress(mint, owner, true, programId);
  const doesAtaExist = Boolean(await checkIfAccountExists(connection, ata));
  const createIxn = !doesAtaExist
    ? createAssociatedTokenAccountInstruction(owner, ata, owner, mint, programId)
    : undefined;
  return createIxn;
};

export const getAtasWithCreateIxnsIfMissing = async (
  connection: Connection,
  mints: [PublicKey, PublicKey][],
  owner: PublicKey
): Promise<TransactionInstruction[]> => {
  const requests = mints.map(async ([mint, tokenProgram]) => {
    const createAtaIx = await createAtaIfMissingIx(connection, mint, owner, tokenProgram);
    if (createAtaIx) {
      return createAtaIx;
    }
    return undefined;
  });
  const result = (await Promise.all(requests.filter((x) => x !== undefined))).filter(
    (ix) => ix !== undefined
  ) as TransactionInstruction[];

  return result;
};

export const createWsolAtaIfMissing = async (
  connection: Connection,
  amount: Decimal,
  owner: PublicKey,
  method: 'deposit' | 'withdraw' = 'deposit'
): Promise<CreateAta> => {
  const createIxns: TransactionInstruction[] = [];
  const closeIxns: TransactionInstruction[] = [];

  const wsolAta: PublicKey = await getAssociatedTokenAddress(NATIVE_MINT, owner, true, TOKEN_PROGRAM_ID);

  const solDeposit = amount.toNumber();
  const wsolAtaAccountInfo: AccountInfo<Buffer> | null = await connection.getAccountInfo(wsolAta);

  // This checks if we need to create it
  if (isWsolInfoInvalid(wsolAtaAccountInfo)) {
    createIxns.push(createAssociatedTokenAccountInstruction(owner, wsolAta, owner, NATIVE_MINT, TOKEN_PROGRAM_ID));
  }

  let uiAmount = 0;
  try {
    if (wsolAtaAccountInfo != null) {
      const tokenBalance = await findAtaBalance(connection, wsolAta);
      uiAmount = tokenBalance === null ? 0 : tokenBalance;
    }
  } catch (err) {
    console.log('Err Token Balance', err);
  }

  if (solDeposit !== null && solDeposit > uiAmount && method === 'deposit') {
    createIxns.push(
      SystemProgram.transfer({
        fromPubkey: owner,
        toPubkey: wsolAta,
        lamports: BigInt(
          collToLamportsDecimal(new Decimal(solDeposit - uiAmount), DECIMALS_SOL)
            .floor()
            .toString()
        ),
      })
    );
  }

  if (createIxns.length > 0) {
    createIxns.push(
      // Sync Native instruction. @solana/spl-token will release it soon. Here use the raw instruction temporally.
      new TransactionInstruction({
        keys: [
          {
            pubkey: wsolAta,
            isSigner: false,
            isWritable: true,
          },
        ],
        data: Buffer.from(new Uint8Array([17])),
        programId: TOKEN_PROGRAM_ID,
      })
    );
  }

  closeIxns.push(createCloseAccountInstruction(wsolAta, owner, owner, [], TOKEN_PROGRAM_ID));

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
      wsolAtaAccountInfo.owner.toString() === '11111111111111111111111111111111');

  return res;
};

export async function checkIfAccountExists(connection: Connection, account: PublicKey): Promise<boolean> {
  return (await connection.getAccountInfo(account)) != null;
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

export const findAtaBalance = async (connection: Connection, ata: PublicKey): Promise<number | null> => {
  const res = await connection.getTokenAccountBalance(ata);
  if (res && res.value) {
    return res.value.uiAmount;
  }
  return null;
};
