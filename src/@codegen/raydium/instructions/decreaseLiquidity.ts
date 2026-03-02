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

export const DISCRIMINATOR = new Uint8Array([160, 38, 208, 111, 104, 91, 44, 1])

export interface DecreaseLiquidityArgs {
  liquidity: bigint
  amount0Min: bigint
  amount1Min: bigint
}

export interface DecreaseLiquidityAccounts {
  nftOwner: TransactionSigner
  nftAccount: Address
  personalPosition: Address
  poolState: Address
  protocolPosition: Address
  tokenVault0: Address
  tokenVault1: Address
  tickArrayLower: Address
  tickArrayUpper: Address
  recipientTokenAccount0: Address
  recipientTokenAccount1: Address
  tokenProgram: Address
}

export const layout = borsh.struct([
  borsh.u128("liquidity"),
  borsh.u64("amount0Min"),
  borsh.u64("amount1Min"),
])

export function decreaseLiquidity(
  args: DecreaseLiquidityArgs,
  accounts: DecreaseLiquidityAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.nftOwner.address, role: 2, signer: accounts.nftOwner },
    { address: accounts.nftAccount, role: 0 },
    { address: accounts.personalPosition, role: 1 },
    { address: accounts.poolState, role: 1 },
    { address: accounts.protocolPosition, role: 1 },
    { address: accounts.tokenVault0, role: 1 },
    { address: accounts.tokenVault1, role: 1 },
    { address: accounts.tickArrayLower, role: 1 },
    { address: accounts.tickArrayUpper, role: 1 },
    { address: accounts.recipientTokenAccount0, role: 1 },
    { address: accounts.recipientTokenAccount1, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      liquidity: args.liquidity,
      amount0Min: args.amount0Min,
      amount1Min: args.amount1Min,
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
