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

export interface TwoHopSwapArgs {
  amount: BN
  otherAmountThreshold: BN
  amountSpecifiedIsInput: boolean
  aToBOne: boolean
  aToBTwo: boolean
  sqrtPriceLimitOne: BN
  sqrtPriceLimitTwo: BN
}

export interface TwoHopSwapAccounts {
  tokenProgram: Address
  tokenAuthority: TransactionSigner
  whirlpoolOne: Address
  whirlpoolTwo: Address
  tokenOwnerAccountOneA: Address
  tokenVaultOneA: Address
  tokenOwnerAccountOneB: Address
  tokenVaultOneB: Address
  tokenOwnerAccountTwoA: Address
  tokenVaultTwoA: Address
  tokenOwnerAccountTwoB: Address
  tokenVaultTwoB: Address
  tickArrayOne0: Address
  tickArrayOne1: Address
  tickArrayOne2: Address
  tickArrayTwo0: Address
  tickArrayTwo1: Address
  tickArrayTwo2: Address
  oracleOne: Address
  oracleTwo: Address
}

export const layout = borsh.struct([
  borsh.u64("amount"),
  borsh.u64("otherAmountThreshold"),
  borsh.bool("amountSpecifiedIsInput"),
  borsh.bool("aToBOne"),
  borsh.bool("aToBTwo"),
  borsh.u128("sqrtPriceLimitOne"),
  borsh.u128("sqrtPriceLimitTwo"),
])

/**
 * Perform a two-hop swap in this Whirlpool
 *
 * ### Authority
 * - "token_authority" - The authority to withdraw tokens from the input token account.
 *
 * ### Parameters
 * - `amount` - The amount of input or output token to swap from (depending on amount_specified_is_input).
 * - `other_amount_threshold` - The maximum/minimum of input/output token to swap into (depending on amount_specified_is_input).
 * - `amount_specified_is_input` - Specifies the token the parameter `amount`represents. If true, the amount represents the input token of the swap.
 * - `a_to_b_one` - The direction of the swap of hop one. True if swapping from A to B. False if swapping from B to A.
 * - `a_to_b_two` - The direction of the swap of hop two. True if swapping from A to B. False if swapping from B to A.
 * - `sqrt_price_limit_one` - The maximum/minimum price the swap will swap to in the first hop.
 * - `sqrt_price_limit_two` - The maximum/minimum price the swap will swap to in the second hop.
 *
 * #### Special Errors
 * - `ZeroTradableAmount` - User provided parameter `amount` is 0.
 * - `InvalidSqrtPriceLimitDirection` - User provided parameter `sqrt_price_limit` does not match the direction of the trade.
 * - `SqrtPriceOutOfBounds` - User provided parameter `sqrt_price_limit` is over Whirlppool's max/min bounds for sqrt-price.
 * - `InvalidTickArraySequence` - User provided tick-arrays are not in sequential order required to proceed in this trade direction.
 * - `TickArraySequenceInvalidIndex` - The swap loop attempted to access an invalid array index during the query of the next initialized tick.
 * - `TickArrayIndexOutofBounds` - The swap loop attempted to access an invalid array index during tick crossing.
 * - `LiquidityOverflow` - Liquidity value overflowed 128bits during tick crossing.
 * - `InvalidTickSpacing` - The swap pool was initialized with tick-spacing of 0.
 * - `InvalidIntermediaryMint` - Error if the intermediary mint between hop one and two do not equal.
 * - `DuplicateTwoHopPool` - Error if whirlpool one & two are the same pool.
 */
export function twoHopSwap(
  args: TwoHopSwapArgs,
  accounts: TwoHopSwapAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.tokenProgram, role: 0 },
    {
      address: accounts.tokenAuthority.address,
      role: 2,
      signer: accounts.tokenAuthority,
    },
    { address: accounts.whirlpoolOne, role: 1 },
    { address: accounts.whirlpoolTwo, role: 1 },
    { address: accounts.tokenOwnerAccountOneA, role: 1 },
    { address: accounts.tokenVaultOneA, role: 1 },
    { address: accounts.tokenOwnerAccountOneB, role: 1 },
    { address: accounts.tokenVaultOneB, role: 1 },
    { address: accounts.tokenOwnerAccountTwoA, role: 1 },
    { address: accounts.tokenVaultTwoA, role: 1 },
    { address: accounts.tokenOwnerAccountTwoB, role: 1 },
    { address: accounts.tokenVaultTwoB, role: 1 },
    { address: accounts.tickArrayOne0, role: 1 },
    { address: accounts.tickArrayOne1, role: 1 },
    { address: accounts.tickArrayOne2, role: 1 },
    { address: accounts.tickArrayTwo0, role: 1 },
    { address: accounts.tickArrayTwo1, role: 1 },
    { address: accounts.tickArrayTwo2, role: 1 },
    { address: accounts.oracleOne, role: 0 },
    { address: accounts.oracleTwo, role: 0 },
  ]
  const identifier = Buffer.from([195, 96, 237, 108, 68, 162, 219, 230])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      amount: args.amount,
      otherAmountThreshold: args.otherAmountThreshold,
      amountSpecifiedIsInput: args.amountSpecifiedIsInput,
      aToBOne: args.aToBOne,
      aToBTwo: args.aToBTwo,
      sqrtPriceLimitOne: args.sqrtPriceLimitOne,
      sqrtPriceLimitTwo: args.sqrtPriceLimitTwo,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
