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

export const layout = borsh.struct<InitializeFeeTierArgs>([
  borsh.u16("tickSpacing"),
  borsh.u16("defaultFeeRate"),
])

export function initializeFeeTier(
  args: InitializeFeeTierArgs,
  accounts: InitializeFeeTierAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
  const identifier = Buffer.from([183, 74, 156, 160, 112, 2, 42, 30])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      tickSpacing: args.tickSpacing,
      defaultFeeRate: args.defaultFeeRate,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
