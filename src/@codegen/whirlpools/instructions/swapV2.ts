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

export interface SwapV2Args {
  amount: BN
  otherAmountThreshold: BN
  sqrtPriceLimit: BN
  amountSpecifiedIsInput: boolean
  aToB: boolean
  remainingAccountsInfo: types.RemainingAccountsInfoFields | null
}

export interface SwapV2Accounts {
  tokenProgramA: Address
  tokenProgramB: Address
  memoProgram: Address
  tokenAuthority: TransactionSigner
  whirlpool: Address
  tokenMintA: Address
  tokenMintB: Address
  tokenOwnerAccountA: Address
  tokenVaultA: Address
  tokenOwnerAccountB: Address
  tokenVaultB: Address
  tickArray0: Address
  tickArray1: Address
  tickArray2: Address
  oracle: Address
}

export const layout = borsh.struct([
  borsh.u64("amount"),
  borsh.u64("otherAmountThreshold"),
  borsh.u128("sqrtPriceLimit"),
  borsh.bool("amountSpecifiedIsInput"),
  borsh.bool("aToB"),
  borsh.option(types.RemainingAccountsInfo.layout(), "remainingAccountsInfo"),
])

/**
 * Perform a swap in this Whirlpool
 *
 * ### Authority
 * - "token_authority" - The authority to withdraw tokens from the input token account.
 *
 * ### Parameters
 * - `amount` - The amount of input or output token to swap from (depending on amount_specified_is_input).
 * - `other_amount_threshold` - The maximum/minimum of input/output token to swap into (depending on amount_specified_is_input).
 * - `sqrt_price_limit` - The maximum/minimum price the swap will swap to.
 * - `amount_specified_is_input` - Specifies the token the parameter `amount`represents. If true, the amount represents the input token of the swap.
 * - `a_to_b` - The direction of the swap. True if swapping from A to B. False if swapping from B to A.
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
 */
export function swapV2(
  args: SwapV2Args,
  accounts: SwapV2Accounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.tokenProgramA, role: 0 },
    { address: accounts.tokenProgramB, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    {
      address: accounts.tokenAuthority.address,
      role: 2,
      signer: accounts.tokenAuthority,
    },
    { address: accounts.whirlpool, role: 1 },
    { address: accounts.tokenMintA, role: 0 },
    { address: accounts.tokenMintB, role: 0 },
    { address: accounts.tokenOwnerAccountA, role: 1 },
    { address: accounts.tokenVaultA, role: 1 },
    { address: accounts.tokenOwnerAccountB, role: 1 },
    { address: accounts.tokenVaultB, role: 1 },
    { address: accounts.tickArray0, role: 1 },
    { address: accounts.tickArray1, role: 1 },
    { address: accounts.tickArray2, role: 1 },
    { address: accounts.oracle, role: 1 },
  ]
  const identifier = Buffer.from([43, 4, 237, 11, 26, 201, 30, 98])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      amount: args.amount,
      otherAmountThreshold: args.otherAmountThreshold,
      sqrtPriceLimit: args.sqrtPriceLimit,
      amountSpecifiedIsInput: args.amountSpecifiedIsInput,
      aToB: args.aToB,
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
