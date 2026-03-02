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
  174, 174, 142, 193, 47, 77, 235, 65,
])

export interface AddKaminoRewardsArgs {
  kaminoRewardIndex: bigint
  amount: bigint
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

export const layout = borsh.struct([
  borsh.u64("kaminoRewardIndex"),
  borsh.u64("amount"),
])

export function addKaminoRewards(
  args: AddKaminoRewardsArgs,
  accounts: AddKaminoRewardsAccounts,
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
    { address: accounts.rewardMint, role: 0 },
    { address: accounts.rewardVault, role: 1 },
    { address: accounts.baseVaultAuthority, role: 1 },
    { address: accounts.rewardAta, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      kaminoRewardIndex: args.kaminoRewardIndex,
      amount: args.amount,
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
