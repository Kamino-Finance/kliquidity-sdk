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

export interface InitializeKaminoRewardArgs {
  kaminoRewardIndex: BN
  collateralToken: BN
}

export interface InitializeKaminoRewardAccounts {
  adminAuthority: TransactionSigner
  strategy: Address
  globalConfig: Address
  rewardMint: Address
  rewardVault: TransactionSigner
  tokenInfos: Address
  baseVaultAuthority: Address
  systemProgram: Address
  rent: Address
  tokenProgram: Address
}

export const layout = borsh.struct<InitializeKaminoRewardArgs>([
  borsh.u64("kaminoRewardIndex"),
  borsh.u64("collateralToken"),
])

export function initializeKaminoReward(
  args: InitializeKaminoRewardArgs,
  accounts: InitializeKaminoRewardAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 3,
      signer: accounts.adminAuthority,
    },
    { address: accounts.strategy, role: 1 },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.rewardMint, role: 0 },
    {
      address: accounts.rewardVault.address,
      role: 3,
      signer: accounts.rewardVault,
    },
    { address: accounts.tokenInfos, role: 0 },
    { address: accounts.baseVaultAuthority, role: 1 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([203, 212, 8, 90, 91, 118, 111, 50])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      kaminoRewardIndex: args.kaminoRewardIndex,
      collateralToken: args.collateralToken,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
