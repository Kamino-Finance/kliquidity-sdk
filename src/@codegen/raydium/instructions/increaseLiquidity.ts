/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Address,
  isSome,
  AccountMeta,
  AccountSignerMeta,
  Instruction,
  Option,
  TransactionSigner,
} from "@solana/kit"
/* eslint-enable @typescript-eslint/no-unused-vars */
import * as borsh from "../utils/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export const DISCRIMINATOR = new Uint8Array([
  46, 156, 243, 118, 13, 205, 251, 178,
])

export interface IncreaseLiquidityArgs {
  liquidity: bigint
  amount0Max: bigint
  amount1Max: bigint
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

export const layout = borsh.struct([
  borsh.u128("liquidity"),
  borsh.u64("amount0Max"),
  borsh.u64("amount1Max"),
])

export function increaseLiquidity(
  args: IncreaseLiquidityArgs,
  accounts: IncreaseLiquidityAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
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
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      liquidity: args.liquidity,
      amount0Max: args.amount0Max,
      amount1Max: args.amount1Max,
    },
    buffer
  )
  const data = (() => {
    const d = new Uint8Array(8 + len)
    d.set(DISCRIMINATOR)
    d.set(buffer.subarray(0, len), 8)
    return d
  })()
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
