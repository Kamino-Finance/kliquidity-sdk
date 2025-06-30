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

export interface UpdateFeesAndRewardsAccounts {
  whirlpool: Address
  position: Address
  tickArrayLower: Address
  tickArrayUpper: Address
}

/**
 * Update the accrued fees and rewards for a position.
 *
 * #### Special Errors
 * - `TickNotFound` - Provided tick array account does not contain the tick for this position.
 * - `LiquidityZero` - Position has zero liquidity and therefore already has the most updated fees and reward values.
 */
export function updateFeesAndRewards(
  accounts: UpdateFeesAndRewardsAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpool, role: 1 },
    { address: accounts.position, role: 1 },
    { address: accounts.tickArrayLower, role: 0 },
    { address: accounts.tickArrayUpper, role: 0 },
  ]
  const identifier = Buffer.from([154, 230, 250, 13, 236, 209, 75, 223])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
