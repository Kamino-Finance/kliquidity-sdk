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

export const layout = borsh.struct<CreateAmmConfigArgs>([
  borsh.u16("index"),
  borsh.u16("tickSpacing"),
  borsh.u32("tradeFeeRate"),
  borsh.u32("protocolFeeRate"),
  borsh.u32("fundFeeRate"),
])

export function createAmmConfig(
  args: CreateAmmConfigArgs,
  accounts: CreateAmmConfigAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.owner.address, role: 3, signer: accounts.owner },
    { address: accounts.ammConfig, role: 1 },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([137, 52, 237, 212, 215, 117, 108, 104])
  const buffer = Buffer.alloc(1000)
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
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
