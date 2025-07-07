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

export interface IncreaseLiquidityV2Args {
  liquidityAmount: BN
  tokenMaxA: BN
  tokenMaxB: BN
  remainingAccountsInfo: types.RemainingAccountsInfoFields | null
}

export interface IncreaseLiquidityV2Accounts {
  whirlpool: Address
  tokenProgramA: Address
  tokenProgramB: Address
  memoProgram: Address
  positionAuthority: TransactionSigner
  position: Address
  positionTokenAccount: Address
  tokenMintA: Address
  tokenMintB: Address
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
  borsh.option(types.RemainingAccountsInfo.layout(), "remainingAccountsInfo"),
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
export function increaseLiquidityV2(
  args: IncreaseLiquidityV2Args,
  accounts: IncreaseLiquidityV2Accounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpool, role: 1 },
    { address: accounts.tokenProgramA, role: 0 },
    { address: accounts.tokenProgramB, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    {
      address: accounts.positionAuthority.address,
      role: 2,
      signer: accounts.positionAuthority,
    },
    { address: accounts.position, role: 1 },
    { address: accounts.positionTokenAccount, role: 0 },
    { address: accounts.tokenMintA, role: 0 },
    { address: accounts.tokenMintB, role: 0 },
    { address: accounts.tokenOwnerAccountA, role: 1 },
    { address: accounts.tokenOwnerAccountB, role: 1 },
    { address: accounts.tokenVaultA, role: 1 },
    { address: accounts.tokenVaultB, role: 1 },
    { address: accounts.tickArrayLower, role: 1 },
    { address: accounts.tickArrayUpper, role: 1 },
  ]
  const identifier = Buffer.from([133, 29, 89, 223, 69, 238, 176, 10])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      liquidityAmount: args.liquidityAmount,
      tokenMaxA: args.tokenMaxA,
      tokenMaxB: args.tokenMaxB,
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
