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

export const DISCRIMINATOR = new Uint8Array([183, 74, 156, 160, 112, 2, 42, 30])

export interface InitializeFeeTierArgs {
  tickSpacing: number
  defaultFeeRate: number
}

export interface InitializeFeeTierAccounts {
  config: Address
  feeTier: Address
  funder: TransactionSigner
  feeAuthority: TransactionSigner
  systemProgram: Address
}

export const layout = borsh.struct([
  borsh.u16("tickSpacing"),
  borsh.u16("defaultFeeRate"),
])

export function initializeFeeTier(
  args: InitializeFeeTierArgs,
  accounts: InitializeFeeTierAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.config, role: 0 },
    { address: accounts.feeTier, role: 1 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    {
      address: accounts.feeAuthority.address,
      role: 2,
      signer: accounts.feeAuthority,
    },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      tickSpacing: args.tickSpacing,
      defaultFeeRate: args.defaultFeeRate,
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
