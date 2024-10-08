import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface DecreaseLiquidityV2Args {
  liquidityAmount: BN
  tokenMinA: BN
  tokenMinB: BN
  remainingAccountsInfo: types.RemainingAccountsInfoFields | null
}

export interface DecreaseLiquidityV2Accounts {
  whirlpool: PublicKey
  tokenProgramA: PublicKey
  tokenProgramB: PublicKey
  memoProgram: PublicKey
  positionAuthority: PublicKey
  position: PublicKey
  positionTokenAccount: PublicKey
  tokenMintA: PublicKey
  tokenMintB: PublicKey
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
  borsh.option(types.RemainingAccountsInfo.layout(), "remainingAccountsInfo"),
])

export function decreaseLiquidityV2(
  args: DecreaseLiquidityV2Args,
  accounts: DecreaseLiquidityV2Accounts,
  programId: PublicKey = PROGRAM_ID
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.whirlpool, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenProgramA, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenProgramB, isSigner: false, isWritable: false },
    { pubkey: accounts.memoProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.positionAuthority, isSigner: true, isWritable: false },
    { pubkey: accounts.position, isSigner: false, isWritable: true },
    {
      pubkey: accounts.positionTokenAccount,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: accounts.tokenMintA, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenMintB, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenOwnerAccountA, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenOwnerAccountB, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenVaultA, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenVaultB, isSigner: false, isWritable: true },
    { pubkey: accounts.tickArrayLower, isSigner: false, isWritable: true },
    { pubkey: accounts.tickArrayUpper, isSigner: false, isWritable: true },
  ]
  const identifier = Buffer.from([58, 127, 188, 62, 79, 82, 196, 96])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      liquidityAmount: args.liquidityAmount,
      tokenMinA: args.tokenMinA,
      tokenMinB: args.tokenMinB,
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
  const ix = new TransactionInstruction({ keys, programId, data })
  return ix
}
