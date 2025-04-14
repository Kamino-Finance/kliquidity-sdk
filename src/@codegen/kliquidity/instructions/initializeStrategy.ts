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

export interface InitializeStrategyArgs {
  strategyType: BN
  tokenACollateralId: BN
  tokenBCollateralId: BN
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
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
  ]
  const identifier = Buffer.from([208, 119, 144, 145, 178, 57, 105, 252])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      strategyType: args.strategyType,
      tokenACollateralId: args.tokenACollateralId,
      tokenBCollateralId: args.tokenBCollateralId,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
