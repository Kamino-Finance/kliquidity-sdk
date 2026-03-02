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

export const DISCRIMINATOR = new Uint8Array([35, 86, 19, 185, 78, 212, 75, 211])

export interface InitializeBinArrayArgs {
  index: bigint
}

export interface InitializeBinArrayAccounts {
  lbPair: Address
  binArray: Address
  funder: TransactionSigner
  systemProgram: Address
}

export const layout = borsh.struct([borsh.i64("index")])

export function initializeBinArray(
  args: InitializeBinArrayArgs,
  accounts: InitializeBinArrayAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.lbPair, role: 0 },
    { address: accounts.binArray, role: 1 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      index: args.index,
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
