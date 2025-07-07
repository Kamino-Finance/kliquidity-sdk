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

export interface ResetPositionRangeArgs {
  newTickLowerIndex: number
  newTickUpperIndex: number
}

export interface ResetPositionRangeAccounts {
  funder: TransactionSigner
  positionAuthority: TransactionSigner
  whirlpool: Address
  position: Address
  positionTokenAccount: Address
  systemProgram: Address
}

export const layout = borsh.struct([
  borsh.i32("newTickLowerIndex"),
  borsh.i32("newTickUpperIndex"),
])

/**
 * Reset the position range to a new range.
 *
 * ### Authority
 * - `position_authority` - The authority that owns the position token.
 *
 * ### Parameters
 * - `new_tick_lower_index` - The new tick specifying the lower end of the position range.
 * - `new_tick_upper_index` - The new tick specifying the upper end of the position range.
 *
 * #### Special Errors
 * - `InvalidTickIndex` - If a provided tick is out of bounds, out of order or not a multiple of
 * the tick-spacing in this pool.
 * - `ClosePositionNotEmpty` - The provided position account is not empty.
 * - `SameTickRangeNotAllowed` - The provided tick range is the same as the current tick range.
 */
export function resetPositionRange(
  args: ResetPositionRangeArgs,
  accounts: ResetPositionRangeAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    {
      address: accounts.positionAuthority.address,
      role: 2,
      signer: accounts.positionAuthority,
    },
    { address: accounts.whirlpool, role: 0 },
    { address: accounts.position, role: 1 },
    { address: accounts.positionTokenAccount, role: 0 },
    { address: accounts.systemProgram, role: 0 },
  ]
  const identifier = Buffer.from([164, 123, 180, 141, 194, 100, 160, 175])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      newTickLowerIndex: args.newTickLowerIndex,
      newTickUpperIndex: args.newTickUpperIndex,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
