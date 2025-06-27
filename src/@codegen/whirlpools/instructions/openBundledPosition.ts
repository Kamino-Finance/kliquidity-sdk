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

/**
 * Open a bundled position in a Whirlpool. No new tokens are issued
 * because the owner of the position bundle becomes the owner of the position.
 * The position will start off with 0 liquidity.
 *
 * ### Authority
 * - `position_bundle_authority` - authority that owns the token corresponding to this desired position bundle.
 *
 * ### Parameters
 * - `bundle_index` - The bundle index that we'd like to open.
 * - `tick_lower_index` - The tick specifying the lower end of the position range.
 * - `tick_upper_index` - The tick specifying the upper end of the position range.
 *
 * #### Special Errors
 * - `InvalidBundleIndex` - If the provided bundle index is out of bounds.
 * - `InvalidTickIndex` - If a provided tick is out of bounds, out of order or not a multiple of
 * the tick-spacing in this pool.
 */
export function openBundledPosition(
  args: OpenBundledPositionArgs,
  accounts: OpenBundledPositionAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
  ]
  const identifier = Buffer.from([169, 113, 126, 171, 213, 172, 212, 49])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      bundleIndex: args.bundleIndex,
      tickLowerIndex: args.tickLowerIndex,
      tickUpperIndex: args.tickUpperIndex,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
