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
  liquidityAmount: bigint
  tokenMinA: bigint
  tokenMinB: bigint
}

export interface DecreaseLiquidityAccounts {
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
  borsh.u64("tokenMinA"),
  borsh.u64("tokenMinB"),
])

export function decreaseLiquidity(
  args: DecreaseLiquidityArgs,
  accounts: DecreaseLiquidityAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
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
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      liquidityAmount: args.liquidityAmount,
      tokenMinA: args.tokenMinA,
      tokenMinB: args.tokenMinB,
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
