/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Address,
  isSome,
  AccountMeta,
  AccountSignerMeta,
  Instruction,
  Option,
  TransactionSigner,
} from "@solana/kit"
/* eslint-enable @typescript-eslint/no-unused-vars */
import * as borsh from "../utils/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export const DISCRIMINATOR = new Uint8Array([
  164, 84, 130, 189, 111, 58, 250, 200,
])

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

export const layout = borsh.struct([
  borsh.u16("key"),
  borsh.u16("index"),
  borsh.array(borsh.u8(), 32, "value"),
])

export function updateGlobalConfig(
  args: UpdateGlobalConfigArgs,
  accounts: UpdateGlobalConfigAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 2,
      signer: accounts.adminAuthority,
    },
    { address: accounts.globalConfig, role: 1 },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      key: args.key,
      index: args.index,
      value: args.value,
    },
    buffer
  )
  const data = (() => {
    const d = new Uint8Array(8 + len)
    d.set(DISCRIMINATOR)
    d.set(buffer.subarray(0, len), 8)
    return d
  })()
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
