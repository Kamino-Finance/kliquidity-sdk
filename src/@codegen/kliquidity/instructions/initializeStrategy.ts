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
  208, 119, 144, 145, 178, 57, 105, 252,
])

export interface InitializeStrategyArgs {
  strategyType: bigint
  tokenACollateralId: bigint
  tokenBCollateralId: bigint
}

export interface InitializeStrategyAccounts {
  adminAuthority: TransactionSigner
  globalConfig: Address
  /** Program owner also checked. */
  pool: Address
  tokenAMint: Address
  tokenBMint: Address
  tokenAVault: Address
  tokenBVault: Address
  baseVaultAuthority: Address
  sharesMint: Address
  sharesMintAuthority: Address
  tokenInfos: Address
  systemProgram: Address
  rent: Address
  tokenProgram: Address
  tokenATokenProgram: Address
  tokenBTokenProgram: Address
  strategy: Address
}

export const layout = borsh.struct([
  borsh.u64("strategyType"),
  borsh.u64("tokenACollateralId"),
  borsh.u64("tokenBCollateralId"),
])

export function initializeStrategy(
  args: InitializeStrategyArgs,
  accounts: InitializeStrategyAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 3,
      signer: accounts.adminAuthority,
    },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.pool, role: 0 },
    { address: accounts.tokenAMint, role: 0 },
    { address: accounts.tokenBMint, role: 0 },
    { address: accounts.tokenAVault, role: 1 },
    { address: accounts.tokenBVault, role: 1 },
    { address: accounts.baseVaultAuthority, role: 1 },
    { address: accounts.sharesMint, role: 1 },
    { address: accounts.sharesMintAuthority, role: 1 },
    { address: accounts.tokenInfos, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenATokenProgram, role: 0 },
    { address: accounts.tokenBTokenProgram, role: 0 },
    { address: accounts.strategy, role: 1 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      strategyType: args.strategyType,
      tokenACollateralId: args.tokenACollateralId,
      tokenBCollateralId: args.tokenBCollateralId,
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
