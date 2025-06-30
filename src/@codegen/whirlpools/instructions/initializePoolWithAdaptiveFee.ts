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

export interface InitializePoolWithAdaptiveFeeArgs {
  initialSqrtPrice: BN
  tradeEnableTimestamp: BN | null
}

export interface InitializePoolWithAdaptiveFeeAccounts {
  whirlpoolsConfig: Address
  tokenMintA: Address
  tokenMintB: Address
  tokenBadgeA: Address
  tokenBadgeB: Address
  funder: TransactionSigner
  initializePoolAuthority: TransactionSigner
  whirlpool: Address
  oracle: Address
  tokenVaultA: TransactionSigner
  tokenVaultB: TransactionSigner
  adaptiveFeeTier: Address
  tokenProgramA: Address
  tokenProgramB: Address
  systemProgram: Address
  rent: Address
}

export const layout = borsh.struct([
  borsh.u128("initialSqrtPrice"),
  borsh.option(borsh.u64(), "tradeEnableTimestamp"),
])

/**
 * Initializes a Whirlpool account and Oracle account with adaptive fee.
 *
 * ### Parameters
 * - `initial_sqrt_price` - The desired initial sqrt-price for this pool
 * - `trade_enable_timestamp` - The timestamp when trading is enabled for this pool (within 72 hours)
 *
 * #### Special Errors
 * `InvalidTokenMintOrder` - The order of mints have to be ordered by
 * `SqrtPriceOutOfBounds` - provided initial_sqrt_price is not between 2^-64 to 2^64
 * `InvalidTradeEnableTimestamp` - provided trade_enable_timestamp is not within 72 hours or the adaptive fee-tier is permission-less
 * `UnsupportedTokenMint` - The provided token mint is not supported by the program (e.g. it has risky token extensions)
 *
 */
export function initializePoolWithAdaptiveFee(
  args: InitializePoolWithAdaptiveFeeArgs,
  accounts: InitializePoolWithAdaptiveFeeAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.tokenMintA, role: 0 },
    { address: accounts.tokenMintB, role: 0 },
    { address: accounts.tokenBadgeA, role: 0 },
    { address: accounts.tokenBadgeB, role: 0 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    {
      address: accounts.initializePoolAuthority.address,
      role: 2,
      signer: accounts.initializePoolAuthority,
    },
    { address: accounts.whirlpool, role: 1 },
    { address: accounts.oracle, role: 1 },
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
    { address: accounts.adaptiveFeeTier, role: 0 },
    { address: accounts.tokenProgramA, role: 0 },
    { address: accounts.tokenProgramB, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
  ]
  const identifier = Buffer.from([143, 94, 96, 76, 172, 124, 119, 199])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      initialSqrtPrice: args.initialSqrtPrice,
      tradeEnableTimestamp: args.tradeEnableTimestamp,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
