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
  liquidity: BN
  amount0Max: BN
  amount1Max: BN
}

export interface IncreaseLiquidityAccounts {
  nftOwner: TransactionSigner
  nftAccount: Address
  poolState: Address
  protocolPosition: Address
  personalPosition: Address
  tickArrayLower: Address
  tickArrayUpper: Address
  tokenAccount0: Address
  tokenAccount1: Address
  tokenVault0: Address
  tokenVault1: Address
  tokenProgram: Address
}

export const layout = borsh.struct<IncreaseLiquidityArgs>([
  borsh.u128("liquidity"),
  borsh.u64("amount0Max"),
  borsh.u64("amount1Max"),
])

export function increaseLiquidity(
  args: IncreaseLiquidityArgs,
  accounts: IncreaseLiquidityAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.nftOwner.address, role: 2, signer: accounts.nftOwner },
    { address: accounts.nftAccount, role: 0 },
    { address: accounts.poolState, role: 1 },
    { address: accounts.protocolPosition, role: 1 },
    { address: accounts.personalPosition, role: 1 },
    { address: accounts.tickArrayLower, role: 1 },
    { address: accounts.tickArrayUpper, role: 1 },
    { address: accounts.tokenAccount0, role: 1 },
    { address: accounts.tokenAccount1, role: 1 },
    { address: accounts.tokenVault0, role: 1 },
    { address: accounts.tokenVault1, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([46, 156, 243, 118, 13, 205, 251, 178])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      liquidity: args.liquidity,
      amount0Max: args.amount0Max,
      amount1Max: args.amount1Max,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
