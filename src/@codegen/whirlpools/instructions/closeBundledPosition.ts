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

export const DISCRIMINATOR = new Uint8Array([41, 36, 216, 245, 27, 85, 103, 67])

export interface CloseBundledPositionArgs {
  bundleIndex: number
}

export interface CloseBundledPositionAccounts {
  bundledPosition: Address
  positionBundle: Address
  positionBundleTokenAccount: Address
  positionBundleAuthority: TransactionSigner
  receiver: Address
}

export const layout = borsh.struct([borsh.u16("bundleIndex")])

export function closeBundledPosition(
  args: CloseBundledPositionArgs,
  accounts: CloseBundledPositionAccounts,
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
    { address: accounts.receiver, role: 1 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      bundleIndex: args.bundleIndex,
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
