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
  137, 52, 237, 212, 215, 117, 108, 104,
])

export interface CreateAmmConfigArgs {
  index: number
  tickSpacing: number
  tradeFeeRate: number
  protocolFeeRate: number
  fundFeeRate: number
}

export interface CreateAmmConfigAccounts {
  owner: TransactionSigner
  ammConfig: Address
  systemProgram: Address
}

export const layout = borsh.struct([
  borsh.u16("index"),
  borsh.u16("tickSpacing"),
  borsh.u32("tradeFeeRate"),
  borsh.u32("protocolFeeRate"),
  borsh.u32("fundFeeRate"),
])

export function createAmmConfig(
  args: CreateAmmConfigArgs,
  accounts: CreateAmmConfigAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.owner.address, role: 3, signer: accounts.owner },
    { address: accounts.ammConfig, role: 1 },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      index: args.index,
      tickSpacing: args.tickSpacing,
      tradeFeeRate: args.tradeFeeRate,
      protocolFeeRate: args.protocolFeeRate,
      fundFeeRate: args.fundFeeRate,
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
