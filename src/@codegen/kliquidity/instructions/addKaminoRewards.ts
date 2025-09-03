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

export interface AddKaminoRewardsArgs {
  kaminoRewardIndex: BN
  amount: BN
}

export interface AddKaminoRewardsAccounts {
  adminAuthority: TransactionSigner
  strategy: Address
  rewardMint: Address
  rewardVault: Address
  baseVaultAuthority: Address
  rewardAta: Address
  tokenProgram: Address
}

export const layout = borsh.struct<AddKaminoRewardsArgs>([
  borsh.u64("kaminoRewardIndex"),
  borsh.u64("amount"),
])

export function addKaminoRewards(
  args: AddKaminoRewardsArgs,
  accounts: AddKaminoRewardsAccounts,
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
    { address: accounts.rewardMint, role: 0 },
    { address: accounts.rewardVault, role: 1 },
    { address: accounts.baseVaultAuthority, role: 1 },
    { address: accounts.rewardAta, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([174, 174, 142, 193, 47, 77, 235, 65])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      kaminoRewardIndex: args.kaminoRewardIndex,
      amount: args.amount,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
