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

export interface SetPresetAdaptiveFeeConstantsArgs {
  filterPeriod: number
  decayPeriod: number
  reductionFactor: number
  adaptiveFeeControlFactor: number
  maxVolatilityAccumulator: number
  tickGroupSize: number
  majorSwapThresholdTicks: number
}

export interface SetPresetAdaptiveFeeConstantsAccounts {
  whirlpoolsConfig: Address
  adaptiveFeeTier: Address
  feeAuthority: TransactionSigner
}

export const layout = borsh.struct([
  borsh.u16("filterPeriod"),
  borsh.u16("decayPeriod"),
  borsh.u16("reductionFactor"),
  borsh.u32("adaptiveFeeControlFactor"),
  borsh.u32("maxVolatilityAccumulator"),
  borsh.u16("tickGroupSize"),
  borsh.u16("majorSwapThresholdTicks"),
])

/**
 * Sets the adaptive fee constants for an AdaptiveFeeTier.
 * Only the current fee authority in WhirlpoolsConfig has permission to invoke this instruction.
 *
 * ### Authority
 * - "fee_authority" - Set authority in the WhirlpoolConfig
 *
 * ### Parameters
 * - `filter_period` - Period determine high frequency trading time window. (seconds)
 * - `decay_period` - Period determine when the adaptive fee start decrease. (seconds)
 * - `reduction_factor` - Adaptive fee rate decrement rate.
 * - `adaptive_fee_control_factor` - Adaptive fee control factor.
 * - `max_volatility_accumulator` - Max volatility accumulator.
 * - `tick_group_size` - Tick group size to define tick group index.
 * - `major_swap_threshold_ticks` - Major swap threshold ticks to define major swap.
 */
export function setPresetAdaptiveFeeConstants(
  args: SetPresetAdaptiveFeeConstantsArgs,
  accounts: SetPresetAdaptiveFeeConstantsAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.adaptiveFeeTier, role: 1 },
    {
      address: accounts.feeAuthority.address,
      role: 2,
      signer: accounts.feeAuthority,
    },
  ]
  const identifier = Buffer.from([132, 185, 66, 148, 83, 88, 134, 198])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      filterPeriod: args.filterPeriod,
      decayPeriod: args.decayPeriod,
      reductionFactor: args.reductionFactor,
      adaptiveFeeControlFactor: args.adaptiveFeeControlFactor,
      maxVolatilityAccumulator: args.maxVolatilityAccumulator,
      tickGroupSize: args.tickGroupSize,
      majorSwapThresholdTicks: args.majorSwapThresholdTicks,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
