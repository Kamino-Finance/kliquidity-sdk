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

export interface InitializePoolV2Args {
  tickSpacing: number
  initialSqrtPrice: BN
}

export interface InitializePoolV2Accounts {
  whirlpoolsConfig: Address
  tokenMintA: Address
  tokenMintB: Address
  tokenBadgeA: Address
  tokenBadgeB: Address
  funder: TransactionSigner
  whirlpool: Address
  tokenVaultA: TransactionSigner
  tokenVaultB: TransactionSigner
  feeTier: Address
  tokenProgramA: Address
  tokenProgramB: Address
  systemProgram: Address
  rent: Address
}

export const layout = borsh.struct([
  borsh.u16("tickSpacing"),
  borsh.u128("initialSqrtPrice"),
])

/**
 * Initializes a Whirlpool account.
 * Fee rate is set to the default values on the config and supplied fee_tier.
 *
 * ### Parameters
 * - `bumps` - The bump value when deriving the PDA of the Whirlpool address.
 * - `tick_spacing` - The desired tick spacing for this pool.
 * - `initial_sqrt_price` - The desired initial sqrt-price for this pool
 *
 * #### Special Errors
 * `InvalidTokenMintOrder` - The order of mints have to be ordered by
 * `SqrtPriceOutOfBounds` - provided initial_sqrt_price is not between 2^-64 to 2^64
 *
 */
export function initializePoolV2(
  args: InitializePoolV2Args,
  accounts: InitializePoolV2Accounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.tokenMintA, role: 0 },
    { address: accounts.tokenMintB, role: 0 },
    { address: accounts.tokenBadgeA, role: 0 },
    { address: accounts.tokenBadgeB, role: 0 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.whirlpool, role: 1 },
    {
      address: accounts.tokenVaultA.address,
      role: 3,
      signer: accounts.tokenVaultA,
    },
    {
      address: accounts.tokenVaultB.address,
      role: 3,
      signer: accounts.tokenVaultB,
    },
    { address: accounts.feeTier, role: 0 },
    { address: accounts.tokenProgramA, role: 0 },
    { address: accounts.tokenProgramB, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
  ]
  const identifier = Buffer.from([207, 45, 87, 242, 27, 63, 204, 67])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      tickSpacing: args.tickSpacing,
      initialSqrtPrice: args.initialSqrtPrice,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
