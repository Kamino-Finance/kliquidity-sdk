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

export interface CloseStrategyAccounts {
  adminAuthority: TransactionSigner
  strategy: Address
  oldPositionOrBaseVaultAuthority: Address
  oldPositionMintOrBaseVaultAuthority: Address
  oldPositionTokenAccountOrBaseVaultAuthority: Address
  oldTickArrayLowerOrBaseVaultAuthority: Address
  oldTickArrayUpperOrBaseVaultAuthority: Address
  pool: Address
  tokenAVault: Address
  tokenBVault: Address
  userTokenAAta: Address
  userTokenBAta: Address
  tokenAMint: Address
  tokenBMint: Address
  /** If rewards are uninitialized, pass this as strategy. */
  reward0Vault: Address
  /** If rewards are uninitialized, pass this as strategy. */
  reward1Vault: Address
  /** If rewards are uninitialized, pass this as strategy. */
  reward2Vault: Address
  /** If rewards are uninitialized, pass this as strategy. */
  kaminoReward0Vault: Address
  /** If rewards are uninitialized, pass this as strategy. */
  kaminoReward1Vault: Address
  /** If rewards are uninitialized, pass this as strategy. */
  kaminoReward2Vault: Address
  /** If rewards are uninitialized, pass this as strategy. */
  userReward0Ata: Address
  /** If rewards are uninitialized, pass this as strategy. */
  userReward1Ata: Address
  /** If rewards are uninitialized, pass this as strategy. */
  userReward2Ata: Address
  /** If rewards are uninitialized, pass this as strategy. */
  userKaminoReward0Ata: Address
  /** If rewards are uninitialized, pass this as strategy. */
  userKaminoReward1Ata: Address
  /** If rewards are uninitialized, pass this as strategy. */
  userKaminoReward2Ata: Address
  baseVaultAuthority: Address
  poolProgram: Address
  tokenProgram: Address
  tokenATokenProgram: Address
  tokenBTokenProgram: Address
  system: Address
  eventAuthority: Option<Address>
}

export function closeStrategy(
  accounts: CloseStrategyAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 3,
      signer: accounts.adminAuthority,
    },
    { address: accounts.strategy, role: 1 },
    { address: accounts.oldPositionOrBaseVaultAuthority, role: 1 },
    { address: accounts.oldPositionMintOrBaseVaultAuthority, role: 1 },
    { address: accounts.oldPositionTokenAccountOrBaseVaultAuthority, role: 1 },
    { address: accounts.oldTickArrayLowerOrBaseVaultAuthority, role: 1 },
    { address: accounts.oldTickArrayUpperOrBaseVaultAuthority, role: 1 },
    { address: accounts.pool, role: 0 },
    { address: accounts.tokenAVault, role: 1 },
    { address: accounts.tokenBVault, role: 1 },
    { address: accounts.userTokenAAta, role: 1 },
    { address: accounts.userTokenBAta, role: 1 },
    { address: accounts.tokenAMint, role: 1 },
    { address: accounts.tokenBMint, role: 1 },
    { address: accounts.reward0Vault, role: 1 },
    { address: accounts.reward1Vault, role: 1 },
    { address: accounts.reward2Vault, role: 1 },
    { address: accounts.kaminoReward0Vault, role: 1 },
    { address: accounts.kaminoReward1Vault, role: 1 },
    { address: accounts.kaminoReward2Vault, role: 1 },
    { address: accounts.userReward0Ata, role: 1 },
    { address: accounts.userReward1Ata, role: 1 },
    { address: accounts.userReward2Ata, role: 1 },
    { address: accounts.userKaminoReward0Ata, role: 1 },
    { address: accounts.userKaminoReward1Ata, role: 1 },
    { address: accounts.userKaminoReward2Ata, role: 1 },
    { address: accounts.baseVaultAuthority, role: 1 },
    { address: accounts.poolProgram, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenATokenProgram, role: 0 },
    { address: accounts.tokenBTokenProgram, role: 0 },
    { address: accounts.system, role: 0 },
    isSome(accounts.eventAuthority)
      ? { address: accounts.eventAuthority.value, role: 0 }
      : { address: programAddress, role: 0 },
  ]
  const identifier = Buffer.from([56, 247, 170, 246, 89, 221, 134, 200])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
