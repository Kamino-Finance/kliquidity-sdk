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

export const DISCRIMINATOR = new Uint8Array([81, 217, 177, 65, 40, 227, 8, 165])

export interface UpdateStrategyConfigArgs {
  mode: number
  value: Array<number>
}

export interface UpdateStrategyConfigAccounts {
  adminAuthority: TransactionSigner
  newAccount: Address
  strategy: Address
  globalConfig: Address
  systemProgram: Address
}

export const layout = borsh.struct([
  borsh.u16("mode"),
  borsh.array(borsh.u8(), 128, "value"),
])

export function updateStrategyConfig(
  args: UpdateStrategyConfigArgs,
  accounts: UpdateStrategyConfigAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 2,
      signer: accounts.adminAuthority,
    },
    { address: accounts.newAccount, role: 0 },
    { address: accounts.strategy, role: 1 },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      mode: args.mode,
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
