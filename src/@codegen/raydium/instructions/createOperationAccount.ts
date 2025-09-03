/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Address,
  isSome,
  IAccountMeta,
  IAccountSignerMeta,
  IInstruction,
  Option,
  TransactionSigner,
} from "@solana/kit"
/* eslint-enable @typescript-eslint/no-unused-vars */
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface CreateOperationAccountAccounts {
  owner: TransactionSigner
  operationState: Address
  systemProgram: Address
}

export function createOperationAccount(
  accounts: CreateOperationAccountAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.owner.address, role: 3, signer: accounts.owner },
    { address: accounts.operationState, role: 1 },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([63, 87, 148, 33, 109, 35, 8, 104])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
