import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface SwapUnevenVaultsArgs {
  targetLimitBps: BN
}

export interface SwapUnevenVaultsAccounts {
  actionsAuthority: PublicKey
  strategy: PublicKey
  globalConfig: PublicKey
  tokenAVault: PublicKey
  tokenBVault: PublicKey
  tokenAMint: PublicKey
  tokenBMint: PublicKey
  baseVaultAuthority: PublicKey
  pool: PublicKey
  position: PublicKey
  raydiumPoolConfigOrBaseVaultAuthority: PublicKey
  poolTokenVaultA: PublicKey
  poolTokenVaultB: PublicKey
  /** Payer must send this correctly. */
  tickArray0: PublicKey
  /** Payer must send this correctly. */
  tickArray1: PublicKey
  /** Payer must send this correctly. */
  tickArray2: PublicKey
  oracle: PublicKey
  poolProgram: PublicKey
  scopePrices: PublicKey
  tokenInfos: PublicKey
  tickArrayLower: PublicKey
  tickArrayUpper: PublicKey
  tokenATokenProgram: PublicKey
  tokenBTokenProgram: PublicKey
  memoProgram: PublicKey
  tokenProgram: PublicKey
  tokenProgram2022: PublicKey
  instructionSysvarAccount: PublicKey
  consensusAccount: PublicKey
  eventAuthority: PublicKey
}

export const layout = borsh.struct([borsh.u64("targetLimitBps")])

export function swapUnevenVaults(
  args: SwapUnevenVaultsArgs,
  accounts: SwapUnevenVaultsAccounts,
  programId: PublicKey = PROGRAM_ID
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.actionsAuthority, isSigner: true, isWritable: true },
    { pubkey: accounts.strategy, isSigner: false, isWritable: true },
    { pubkey: accounts.globalConfig, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenAVault, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenBVault, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenAMint, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenBMint, isSigner: false, isWritable: false },
    { pubkey: accounts.baseVaultAuthority, isSigner: false, isWritable: true },
    { pubkey: accounts.pool, isSigner: false, isWritable: true },
    { pubkey: accounts.position, isSigner: false, isWritable: true },
    {
      pubkey: accounts.raydiumPoolConfigOrBaseVaultAuthority,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: accounts.poolTokenVaultA, isSigner: false, isWritable: true },
    { pubkey: accounts.poolTokenVaultB, isSigner: false, isWritable: true },
    { pubkey: accounts.tickArray0, isSigner: false, isWritable: true },
    { pubkey: accounts.tickArray1, isSigner: false, isWritable: true },
    { pubkey: accounts.tickArray2, isSigner: false, isWritable: true },
    { pubkey: accounts.oracle, isSigner: false, isWritable: true },
    { pubkey: accounts.poolProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.scopePrices, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenInfos, isSigner: false, isWritable: false },
    { pubkey: accounts.tickArrayLower, isSigner: false, isWritable: false },
    { pubkey: accounts.tickArrayUpper, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenATokenProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenBTokenProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.memoProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenProgram2022, isSigner: false, isWritable: false },
    {
      pubkey: accounts.instructionSysvarAccount,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: accounts.consensusAccount, isSigner: false, isWritable: false },
    { pubkey: accounts.eventAuthority, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([143, 212, 101, 95, 105, 209, 184, 1])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      targetLimitBps: args.targetLimitBps,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId, data })
  return ix
}