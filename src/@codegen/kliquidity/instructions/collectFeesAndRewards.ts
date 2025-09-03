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

export interface CollectFeesAndRewardsAccounts {
  user: TransactionSigner
  strategy: Address
  globalConfig: Address
  baseVaultAuthority: Address
  pool: Address
  tickArrayLower: Address
  tickArrayUpper: Address
  position: Address
  raydiumProtocolPositionOrBaseVaultAuthority: Address
  positionTokenAccount: Address
  tokenAVault: Address
  poolTokenVaultA: Address
  tokenBVault: Address
  poolTokenVaultB: Address
  treasuryFeeTokenAVault: Address
  treasuryFeeTokenBVault: Address
  treasuryFeeVaultAuthority: Address
  /** If rewards are uninitialized, pass this as strategy. */
  reward0Vault: Address
  /** If rewards are uninitialized, pass this as strategy. */
  reward1Vault: Address
  /** If rewards are uninitialized, pass this as strategy. */
  reward2Vault: Address
  /** If rewards are uninitialized, pass this as strategy. */
  poolRewardVault0: Address
  /** If rewards are uninitialized, pass this as strategy. */
  poolRewardVault1: Address
  /** If rewards are uninitialized, pass this as strategy. */
  poolRewardVault2: Address
  tokenAMint: Address
  tokenBMint: Address
  tokenATokenProgram: Address
  tokenBTokenProgram: Address
  memoProgram: Address
  tokenProgram: Address
  tokenProgram2022: Address
  poolProgram: Address
  instructionSysvarAccount: Address
  eventAuthority: Option<Address>
}

export function collectFeesAndRewards(
  accounts: CollectFeesAndRewardsAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.user.address, role: 3, signer: accounts.user },
    { address: accounts.strategy, role: 1 },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.baseVaultAuthority, role: 1 },
    { address: accounts.pool, role: 1 },
    { address: accounts.tickArrayLower, role: 1 },
    { address: accounts.tickArrayUpper, role: 1 },
    { address: accounts.position, role: 1 },
    { address: accounts.raydiumProtocolPositionOrBaseVaultAuthority, role: 1 },
    { address: accounts.positionTokenAccount, role: 0 },
    { address: accounts.tokenAVault, role: 1 },
    { address: accounts.poolTokenVaultA, role: 1 },
    { address: accounts.tokenBVault, role: 1 },
    { address: accounts.poolTokenVaultB, role: 1 },
    { address: accounts.treasuryFeeTokenAVault, role: 1 },
    { address: accounts.treasuryFeeTokenBVault, role: 1 },
    { address: accounts.treasuryFeeVaultAuthority, role: 0 },
    { address: accounts.reward0Vault, role: 1 },
    { address: accounts.reward1Vault, role: 1 },
    { address: accounts.reward2Vault, role: 1 },
    { address: accounts.poolRewardVault0, role: 1 },
    { address: accounts.poolRewardVault1, role: 1 },
    { address: accounts.poolRewardVault2, role: 1 },
    { address: accounts.tokenAMint, role: 0 },
    { address: accounts.tokenBMint, role: 0 },
    { address: accounts.tokenATokenProgram, role: 0 },
    { address: accounts.tokenBTokenProgram, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenProgram2022, role: 0 },
    { address: accounts.poolProgram, role: 0 },
    { address: accounts.instructionSysvarAccount, role: 0 },
    isSome(accounts.eventAuthority)
      ? { address: accounts.eventAuthority.value, role: 0 }
      : { address: programAddress, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([113, 18, 75, 8, 182, 31, 105, 186])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
