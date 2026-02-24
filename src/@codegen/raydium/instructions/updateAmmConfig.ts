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
  49, 60, 174, 136, 154, 28, 116, 200,
])

export interface UpdateAmmConfigArgs {
  param: number
  value: number
}

export interface UpdateAmmConfigAccounts {
  owner: TransactionSigner
  ammConfig: Address
}

export const layout = borsh.struct([borsh.u8("param"), borsh.u32("value")])

export function updateAmmConfig(
  args: UpdateAmmConfigArgs,
  accounts: UpdateAmmConfigAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.owner.address, role: 2, signer: accounts.owner },
    { address: accounts.ammConfig, role: 1 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      param: args.param,
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
