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

export interface UpdatePoolStatusArgs {
  status: number
}

export interface UpdatePoolStatusAccounts {
  authority: TransactionSigner
  poolState: Address
}

export const layout = borsh.struct<UpdatePoolStatusArgs>([borsh.u8("status")])

export function updatePoolStatus(
  args: UpdatePoolStatusArgs,
  accounts: UpdatePoolStatusAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.authority.address,
      role: 2,
      signer: accounts.authority,
    },
    { address: accounts.poolState, role: 1 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([130, 87, 108, 6, 46, 224, 117, 123])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      status: args.status,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
