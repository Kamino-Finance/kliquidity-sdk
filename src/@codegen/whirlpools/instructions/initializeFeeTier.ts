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

export const layout = borsh.struct([
  borsh.u16("tickSpacing"),
  borsh.u16("defaultFeeRate"),
])

/**
 * Initializes a fee_tier account usable by Whirlpools in a WhirlpoolConfig space.
 *
 * ### Authority
 * - "fee_authority" - Set authority in the WhirlpoolConfig
 *
 * ### Parameters
 * - `tick_spacing` - The tick-spacing that this fee-tier suggests the default_fee_rate for.
 * - `default_fee_rate` - The default fee rate that a pool will use if the pool uses this
 * fee tier during initialization.
 *
 * #### Special Errors
 * - `InvalidTickSpacing` - If the provided tick_spacing is 0.
 * - `FeeRateMaxExceeded` - If the provided default_fee_rate exceeds MAX_FEE_RATE.
 */
export function initializeFeeTier(
  args: InitializeFeeTierArgs,
  accounts: InitializeFeeTierAccounts,
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
