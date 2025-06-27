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

export interface IncreaseLiquidityArgs {
  liquidityAmount: BN
  tokenMaxA: BN
  tokenMaxB: BN
}

export interface IncreaseLiquidityAccounts {
  whirlpool: Address
  tokenProgram: Address
  positionAuthority: TransactionSigner
  position: Address
  positionTokenAccount: Address
  tokenOwnerAccountA: Address
  tokenOwnerAccountB: Address
  tokenVaultA: Address
  tokenVaultB: Address
  tickArrayLower: Address
  tickArrayUpper: Address
}

export const layout = borsh.struct([
  borsh.u128("liquidityAmount"),
  borsh.u64("tokenMaxA"),
  borsh.u64("tokenMaxB"),
])

/**
 * Add liquidity to a position in the Whirlpool. This call also updates the position's accrued fees and rewards.
 *
 * ### Authority
 * - `position_authority` - authority that owns the token corresponding to this desired position.
 *
 * ### Parameters
 * - `liquidity_amount` - The total amount of Liquidity the user is willing to deposit.
 * - `token_max_a` - The maximum amount of tokenA the user is willing to deposit.
 * - `token_max_b` - The maximum amount of tokenB the user is willing to deposit.
 *
 * #### Special Errors
 * - `LiquidityZero` - Provided liquidity amount is zero.
 * - `LiquidityTooHigh` - Provided liquidity exceeds u128::max.
 * - `TokenMaxExceeded` - The required token to perform this operation exceeds the user defined amount.
 */
export function increaseLiquidity(
  args: IncreaseLiquidityArgs,
  accounts: IncreaseLiquidityAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpool, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    {
      address: accounts.positionAuthority.address,
      role: 2,
      signer: accounts.positionAuthority,
    },
    { address: accounts.position, role: 1 },
    { address: accounts.positionTokenAccount, role: 0 },
    { address: accounts.tokenOwnerAccountA, role: 1 },
    { address: accounts.tokenOwnerAccountB, role: 1 },
    { address: accounts.tokenVaultA, role: 1 },
    { address: accounts.tokenVaultB, role: 1 },
    { address: accounts.tickArrayLower, role: 1 },
    { address: accounts.tickArrayUpper, role: 1 },
  ]
  const identifier = Buffer.from([46, 156, 243, 118, 13, 205, 251, 178])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      liquidityAmount: args.liquidityAmount,
      tokenMaxA: args.tokenMaxA,
      tokenMaxB: args.tokenMaxB,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
