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
  73, 226, 248, 215, 5, 197, 211, 229,
])

export interface EmergencySwapArgs {
  aToB: boolean
  targetLimitBps: bigint
}

export interface EmergencySwapAccounts {
  adminAuthority: TransactionSigner
  strategy: Address
  globalConfig: Address
  tokenAMint: Address
  tokenBMint: Address
  tokenAVault: Address
  tokenBVault: Address
  baseVaultAuthority: Address
  pool: Address
  position: Address
  poolTokenVaultA: Address
  poolTokenVaultB: Address
  /** Payer must send this correctly. */
  tickArray0: Address
  /** Payer must send this correctly. */
  tickArray1: Address
  /** Payer must send this correctly. */
  tickArray2: Address
  oracle: Address
  poolProgram: Address
  scopePrices: Address
  tokenInfos: Address
  tokenATokenProgram: Address
  tokenBTokenProgram: Address
  memoProgram: Address
}

export const layout = borsh.struct([
  borsh.bool("aToB"),
  borsh.u64("targetLimitBps"),
])

export function emergencySwap(
  args: EmergencySwapArgs,
  accounts: EmergencySwapAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 3,
      signer: accounts.adminAuthority,
    },
    { address: accounts.strategy, role: 1 },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.tokenAMint, role: 0 },
    { address: accounts.tokenBMint, role: 0 },
    { address: accounts.tokenAVault, role: 1 },
    { address: accounts.tokenBVault, role: 1 },
    { address: accounts.baseVaultAuthority, role: 1 },
    { address: accounts.pool, role: 1 },
    { address: accounts.position, role: 1 },
    { address: accounts.poolTokenVaultA, role: 1 },
    { address: accounts.poolTokenVaultB, role: 1 },
    { address: accounts.tickArray0, role: 1 },
    { address: accounts.tickArray1, role: 1 },
    { address: accounts.tickArray2, role: 1 },
    { address: accounts.oracle, role: 1 },
    { address: accounts.poolProgram, role: 0 },
    { address: accounts.scopePrices, role: 0 },
    { address: accounts.tokenInfos, role: 0 },
    { address: accounts.tokenATokenProgram, role: 0 },
    { address: accounts.tokenBTokenProgram, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      aToB: args.aToB,
      targetLimitBps: args.targetLimitBps,
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
