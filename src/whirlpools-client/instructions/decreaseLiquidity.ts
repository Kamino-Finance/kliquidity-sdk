import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface DecreaseLiquidityArgs {
  liquidityAmount: BN
  tokenMinA: BN
  tokenMinB: BN
}

export interface DecreaseLiquidityAccounts {
  whirlpool: PublicKey
  tokenProgram: PublicKey
  positionAuthority: PublicKey
  position: PublicKey
  positionTokenAccount: PublicKey
  tokenOwnerAccountA: PublicKey
  tokenOwnerAccountB: PublicKey
  tokenVaultA: PublicKey
  tokenVaultB: PublicKey
  tickArrayLower: PublicKey
  tickArrayUpper: PublicKey
}

export const layout = borsh.struct([
  borsh.u128("liquidityAmount"),
  borsh.u64("tokenMinA"),
  borsh.u64("tokenMinB"),
])

export function decreaseLiquidity(
  args: DecreaseLiquidityArgs,
  accounts: DecreaseLiquidityAccounts,
  programId: PublicKey = PROGRAM_ID
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.whirlpool, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.positionAuthority, isSigner: true, isWritable: false },
    { pubkey: accounts.position, isSigner: false, isWritable: true },
    {
      pubkey: accounts.positionTokenAccount,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: accounts.tokenOwnerAccountA, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenOwnerAccountB, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenVaultA, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenVaultB, isSigner: false, isWritable: true },
    { pubkey: accounts.tickArrayLower, isSigner: false, isWritable: true },
    { pubkey: accounts.tickArrayUpper, isSigner: false, isWritable: true },
  ]
  const identifier = Buffer.from([160, 38, 208, 111, 104, 91, 44, 1])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      liquidityAmount: args.liquidityAmount,
      tokenMinA: args.tokenMinA,
      tokenMinB: args.tokenMinB,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId, data })
  return ix
}
