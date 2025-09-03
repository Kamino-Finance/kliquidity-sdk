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

export interface UpdateOperationAccountArgs {
  param: number
  keys: Array<Address>
}

export interface UpdateOperationAccountAccounts {
  owner: TransactionSigner
  operationState: Address
  systemProgram: Address
}

export const layout = borsh.struct<UpdateOperationAccountArgs>([
  borsh.u8("param"),
  borsh.vec(borshAddress(), "keys"),
])

export function updateOperationAccount(
  args: UpdateOperationAccountArgs,
  accounts: UpdateOperationAccountAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.owner.address, role: 2, signer: accounts.owner },
    { address: accounts.operationState, role: 1 },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([127, 70, 119, 40, 188, 227, 61, 7])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      param: args.param,
      keys: args.keys,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
