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

export interface OpenPositionArgs {
  bumps: types.OpenPositionBumpsFields
  tickLowerIndex: number
  tickUpperIndex: number
}

export interface OpenPositionAccounts {
  funder: TransactionSigner
  owner: Address
  position: Address
  positionMint: TransactionSigner
  positionTokenAccount: Address
  whirlpool: Address
  tokenProgram: Address
  systemProgram: Address
  rent: Address
  associatedTokenProgram: Address
}

export const layout = borsh.struct([
  types.OpenPositionBumps.layout("bumps"),
  borsh.i32("tickLowerIndex"),
  borsh.i32("tickUpperIndex"),
])

/**
 * Open a position in a Whirlpool. A unique token will be minted to represent the position
 * in the users wallet. The position will start off with 0 liquidity.
 *
 * ### Parameters
 * - `tick_lower_index` - The tick specifying the lower end of the position range.
 * - `tick_upper_index` - The tick specifying the upper end of the position range.
 *
 * #### Special Errors
 * - `InvalidTickIndex` - If a provided tick is out of bounds, out of order or not a multiple of
 * the tick-spacing in this pool.
 */
export function openPosition(
  args: OpenPositionArgs,
  accounts: OpenPositionAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.owner, role: 0 },
    { address: accounts.position, role: 1 },
    {
      address: accounts.positionMint.address,
      role: 3,
      signer: accounts.positionMint,
    },
    { address: accounts.positionTokenAccount, role: 1 },
    { address: accounts.whirlpool, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.associatedTokenProgram, role: 0 },
  ]
  const identifier = Buffer.from([135, 128, 47, 77, 15, 152, 240, 49])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      bumps: types.OpenPositionBumps.toEncodable(args.bumps),
      tickLowerIndex: args.tickLowerIndex,
      tickUpperIndex: args.tickUpperIndex,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
