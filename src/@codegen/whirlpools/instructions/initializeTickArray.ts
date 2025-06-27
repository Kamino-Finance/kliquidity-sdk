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

export interface InitializeTickArrayArgs {
  startTickIndex: number
}

export interface InitializeTickArrayAccounts {
  whirlpool: Address
  funder: TransactionSigner
  tickArray: Address
  systemProgram: Address
}

export const layout = borsh.struct([borsh.i32("startTickIndex")])

/**
 * Initializes a fixed-length tick_array account to represent a tick-range in a Whirlpool.
 *
 * ### Parameters
 * - `start_tick_index` - The starting tick index for this tick-array.
 * Has to be a multiple of TickArray size & the tick spacing of this pool.
 *
 * #### Special Errors
 * - `InvalidStartTick` - if the provided start tick is out of bounds or is not a multiple of
 * TICK_ARRAY_SIZE * tick spacing.
 */
export function initializeTickArray(
  args: InitializeTickArrayArgs,
  accounts: InitializeTickArrayAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpool, role: 0 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.tickArray, role: 1 },
    { address: accounts.systemProgram, role: 0 },
  ]
  const identifier = Buffer.from([11, 188, 193, 214, 141, 91, 149, 184])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      startTickIndex: args.startTickIndex,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
