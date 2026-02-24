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
  146, 72, 174, 224, 40, 253, 84, 174,
])

export interface GoToABinArgs {
  binId: number
}

export interface GoToABinAccounts {
  lbPair: Address
  binArrayBitmapExtension: Option<Address>
  fromBinArray: Option<Address>
  toBinArray: Option<Address>
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct([borsh.i32("binId")])

export function goToABin(
  args: GoToABinArgs,
  accounts: GoToABinAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    isSome(accounts.binArrayBitmapExtension)
      ? { address: accounts.binArrayBitmapExtension.value, role: 0 }
      : { address: programAddress, role: 0 },
    isSome(accounts.fromBinArray)
      ? { address: accounts.fromBinArray.value, role: 0 }
      : { address: programAddress, role: 0 },
    isSome(accounts.toBinArray)
      ? { address: accounts.toBinArray.value, role: 0 }
      : { address: programAddress, role: 0 },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      binId: args.binId,
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
