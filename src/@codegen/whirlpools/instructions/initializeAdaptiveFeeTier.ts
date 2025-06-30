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

export interface InitializeAdaptiveFeeTierArgs {
  feeTierIndex: number
  tickSpacing: number
  initializePoolAuthority: Address
  delegatedFeeAuthority: Address
  defaultBaseFeeRate: number
  filterPeriod: number
  decayPeriod: number
  reductionFactor: number
  adaptiveFeeControlFactor: number
  maxVolatilityAccumulator: number
  tickGroupSize: number
  majorSwapThresholdTicks: number
}

export interface InitializeAdaptiveFeeTierAccounts {
  whirlpoolsConfig: Address
  adaptiveFeeTier: Address
  funder: TransactionSigner
  feeAuthority: TransactionSigner
  systemProgram: Address
}

export const layout = borsh.struct([
  borsh.u16("feeTierIndex"),
  borsh.u16("tickSpacing"),
  borshAddress("initializePoolAuthority"),
  borshAddress("delegatedFeeAuthority"),
  borsh.u16("defaultBaseFeeRate"),
  borsh.u16("filterPeriod"),
  borsh.u16("decayPeriod"),
  borsh.u16("reductionFactor"),
  borsh.u32("adaptiveFeeControlFactor"),
  borsh.u32("maxVolatilityAccumulator"),
  borsh.u16("tickGroupSize"),
  borsh.u16("majorSwapThresholdTicks"),
])

/**
 * Initializes an adaptive_fee_tier account usable by Whirlpools in a WhirlpoolConfig space.
 *
 * ### Authority
 * - "fee_authority" - Set authority in the WhirlpoolConfig
 *
 * ### Parameters
 * - `fee_tier_index` - The index of the fee-tier that this adaptive fee tier will be initialized.
 * - `tick_spacing` - The tick-spacing that this fee-tier suggests the default_fee_rate for.
 * - `initialize_pool_authority` - The authority that can initialize pools with this adaptive fee-tier.
 * - `delegated_fee_authority` - The authority that can set the base fee rate for pools using this adaptive fee-tier.
 * - `default_fee_rate` - The default fee rate that a pool will use if the pool uses this
 * fee tier during initialization.
 * - `filter_period` - Period determine high frequency trading time window. (seconds)
 * - `decay_period` - Period determine when the adaptive fee start decrease. (seconds)
 * - `reduction_factor` - Adaptive fee rate decrement rate.
 * - `adaptive_fee_control_factor` - Adaptive fee control factor.
 * - `max_volatility_accumulator` - Max volatility accumulator.
 * - `tick_group_size` - Tick group size to define tick group index.
 * - `major_swap_threshold_ticks` - Major swap threshold ticks to define major swap.
 *
 * #### Special Errors
 * - `InvalidTickSpacing` - If the provided tick_spacing is 0.
 * - `InvalidFeeTierIndex` - If the provided fee_tier_index is same to tick_spacing.
 * - `FeeRateMaxExceeded` - If the provided default_fee_rate exceeds MAX_FEE_RATE.
 * - `InvalidAdaptiveFeeConstants` - If the provided adaptive fee constants are invalid.
 */
export function initializeAdaptiveFeeTier(
  args: InitializeAdaptiveFeeTierArgs,
  accounts: InitializeAdaptiveFeeTierAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.adaptiveFeeTier, role: 1 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    {
      address: accounts.feeAuthority.address,
      role: 2,
      signer: accounts.feeAuthority,
    },
    { address: accounts.systemProgram, role: 0 },
  ]
  const identifier = Buffer.from([77, 99, 208, 200, 141, 123, 117, 48])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      feeTierIndex: args.feeTierIndex,
      tickSpacing: args.tickSpacing,
      initializePoolAuthority: args.initializePoolAuthority,
      delegatedFeeAuthority: args.delegatedFeeAuthority,
      defaultBaseFeeRate: args.defaultBaseFeeRate,
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
