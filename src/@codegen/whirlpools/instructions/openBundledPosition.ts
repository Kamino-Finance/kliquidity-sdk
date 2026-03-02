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
  169, 113, 126, 171, 213, 172, 212, 49,
])

export interface OpenBundledPositionArgs {
  bundleIndex: number
  tickLowerIndex: number
  tickUpperIndex: number
}

export interface OpenBundledPositionAccounts {
  bundledPosition: Address
  positionBundle: Address
  positionBundleTokenAccount: Address
  positionBundleAuthority: TransactionSigner
  whirlpool: Address
  funder: TransactionSigner
  systemProgram: Address
  rent: Address
}

export const layout = borsh.struct([
  borsh.u16("bundleIndex"),
  borsh.i32("tickLowerIndex"),
  borsh.i32("tickUpperIndex"),
])

export function openBundledPosition(
  args: OpenBundledPositionArgs,
  accounts: OpenBundledPositionAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.bundledPosition, role: 1 },
    { address: accounts.positionBundle, role: 1 },
    { address: accounts.positionBundleTokenAccount, role: 0 },
    {
      address: accounts.positionBundleAuthority.address,
      role: 2,
      signer: accounts.positionBundleAuthority,
    },
    { address: accounts.whirlpool, role: 0 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      bundleIndex: args.bundleIndex,
      tickLowerIndex: args.tickLowerIndex,
      tickUpperIndex: args.tickUpperIndex,
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
