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

/**
 * Close a bundled position in a Whirlpool.
 *
 * ### Authority
 * - `position_bundle_authority` - authority that owns the token corresponding to this desired position bundle.
 *
 * ### Parameters
 * - `bundle_index` - The bundle index that we'd like to close.
 *
 * #### Special Errors
 * - `InvalidBundleIndex` - If the provided bundle index is out of bounds.
 * - `ClosePositionNotEmpty` - The provided position account is not empty.
 */
export function closeBundledPosition(
  args: CloseBundledPositionArgs,
  accounts: CloseBundledPositionAccounts,
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
    { address: accounts.receiver, role: 1 },
  ]
  const identifier = Buffer.from([41, 36, 216, 245, 27, 85, 103, 67])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      bundleIndex: args.bundleIndex,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
