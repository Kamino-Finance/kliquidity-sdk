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

export interface UpdateGlobalConfigArgs {
  key: number
  index: number
  value: Array<number>
}

export interface UpdateGlobalConfigAccounts {
  adminAuthority: TransactionSigner
  globalConfig: Address
  systemProgram: Address
}

export const layout = borsh.struct<UpdateGlobalConfigArgs>([
  borsh.u16("key"),
  borsh.u16("index"),
  borsh.array(borsh.u8(), 32, "value"),
])

export function updateGlobalConfig(
  args: UpdateGlobalConfigArgs,
  accounts: UpdateGlobalConfigAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 2,
      signer: accounts.adminAuthority,
    },
    { address: accounts.globalConfig, role: 1 },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([164, 84, 130, 189, 111, 58, 250, 200])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      key: args.key,
      index: args.index,
      value: args.value,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
