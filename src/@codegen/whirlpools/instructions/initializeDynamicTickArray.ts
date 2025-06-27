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

export interface InitializeDynamicTickArrayArgs {
  startTickIndex: number
  idempotent: boolean
}

export interface InitializeDynamicTickArrayAccounts {
  whirlpool: Address
  funder: TransactionSigner
  tickArray: Address
  systemProgram: Address
}

export const layout = borsh.struct([
  borsh.i32("startTickIndex"),
  borsh.bool("idempotent"),
])

/**
 * Initialize a variable-length tick array for a Whirlpool.
 *
 * ### Parameters
 * - `start_tick_index` - The starting tick index for this tick-array.
 * Has to be a multiple of TickArray size & the tick spacing of this pool.
 * - `idempotent` - If true, the instruction will not fail if the tick array already exists.
 * Note: The idempotent option exits successfully if a FixedTickArray is present as well as a DynamicTickArray.
 *
 * #### Special Errors
 * - `InvalidStartTick` - if the provided start tick is out of bounds or is not a multiple of
 * TICK_ARRAY_SIZE * tick spacing.
 */
export function initializeDynamicTickArray(
  args: InitializeDynamicTickArrayArgs,
  accounts: InitializeDynamicTickArrayAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpool, role: 0 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.tickArray, role: 1 },
    { address: accounts.systemProgram, role: 0 },
  ]
  const identifier = Buffer.from([41, 33, 165, 200, 120, 231, 142, 50])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      startTickIndex: args.startTickIndex,
      idempotent: args.idempotent,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
