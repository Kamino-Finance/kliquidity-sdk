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

export interface TwoHopSwapV2Args {
  amount: BN
  otherAmountThreshold: BN
  amountSpecifiedIsInput: boolean
  aToBOne: boolean
  aToBTwo: boolean
  sqrtPriceLimitOne: BN
  sqrtPriceLimitTwo: BN
  remainingAccountsInfo: types.RemainingAccountsInfoFields | null
}

export interface TwoHopSwapV2Accounts {
  whirlpoolOne: Address
  whirlpoolTwo: Address
  tokenMintInput: Address
  tokenMintIntermediate: Address
  tokenMintOutput: Address
  tokenProgramInput: Address
  tokenProgramIntermediate: Address
  tokenProgramOutput: Address
  tokenOwnerAccountInput: Address
  tokenVaultOneInput: Address
  tokenVaultOneIntermediate: Address
  tokenVaultTwoIntermediate: Address
  tokenVaultTwoOutput: Address
  tokenOwnerAccountOutput: Address
  tokenAuthority: TransactionSigner
  tickArrayOne0: Address
  tickArrayOne1: Address
  tickArrayOne2: Address
  tickArrayTwo0: Address
  tickArrayTwo1: Address
  tickArrayTwo2: Address
  oracleOne: Address
  oracleTwo: Address
  memoProgram: Address
}

export const layout = borsh.struct([
  borsh.u64("amount"),
  borsh.u64("otherAmountThreshold"),
  borsh.bool("amountSpecifiedIsInput"),
  borsh.bool("aToBOne"),
  borsh.bool("aToBTwo"),
  borsh.u128("sqrtPriceLimitOne"),
  borsh.u128("sqrtPriceLimitTwo"),
  borsh.option(types.RemainingAccountsInfo.layout(), "remainingAccountsInfo"),
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
export function twoHopSwapV2(
  args: TwoHopSwapV2Args,
  accounts: TwoHopSwapV2Accounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolOne, role: 1 },
    { address: accounts.whirlpoolTwo, role: 1 },
    { address: accounts.tokenMintInput, role: 0 },
    { address: accounts.tokenMintIntermediate, role: 0 },
    { address: accounts.tokenMintOutput, role: 0 },
    { address: accounts.tokenProgramInput, role: 0 },
    { address: accounts.tokenProgramIntermediate, role: 0 },
    { address: accounts.tokenProgramOutput, role: 0 },
    { address: accounts.tokenOwnerAccountInput, role: 1 },
    { address: accounts.tokenVaultOneInput, role: 1 },
    { address: accounts.tokenVaultOneIntermediate, role: 1 },
    { address: accounts.tokenVaultTwoIntermediate, role: 1 },
    { address: accounts.tokenVaultTwoOutput, role: 1 },
    { address: accounts.tokenOwnerAccountOutput, role: 1 },
    {
      address: accounts.tokenAuthority.address,
      role: 2,
      signer: accounts.tokenAuthority,
    },
    { address: accounts.tickArrayOne0, role: 1 },
    { address: accounts.tickArrayOne1, role: 1 },
    { address: accounts.tickArrayOne2, role: 1 },
    { address: accounts.tickArrayTwo0, role: 1 },
    { address: accounts.tickArrayTwo1, role: 1 },
    { address: accounts.tickArrayTwo2, role: 1 },
    { address: accounts.oracleOne, role: 1 },
    { address: accounts.oracleTwo, role: 1 },
    { address: accounts.memoProgram, role: 0 },
  ]
  const identifier = Buffer.from([186, 143, 209, 29, 254, 2, 194, 117])
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
      remainingAccountsInfo:
        (args.remainingAccountsInfo &&
          types.RemainingAccountsInfo.toEncodable(
            args.remainingAccountsInfo
          )) ||
        null,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
