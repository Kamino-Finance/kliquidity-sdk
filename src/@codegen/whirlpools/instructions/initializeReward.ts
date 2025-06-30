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

export interface InitializeRewardArgs {
  rewardIndex: number
}

export interface InitializeRewardAccounts {
  rewardAuthority: TransactionSigner
  funder: TransactionSigner
  whirlpool: Address
  rewardMint: Address
  rewardVault: TransactionSigner
  tokenProgram: Address
  systemProgram: Address
  rent: Address
}

export const layout = borsh.struct([borsh.u8("rewardIndex")])

/**
 * Initialize reward for a Whirlpool. A pool can only support up to a set number of rewards.
 *
 * ### Authority
 * - "reward_authority" - assigned authority by the reward_super_authority for the specified
 * reward-index in this Whirlpool
 *
 * ### Parameters
 * - `reward_index` - The reward index that we'd like to initialize. (0 <= index <= NUM_REWARDS)
 *
 * #### Special Errors
 * - `InvalidRewardIndex` - If the provided reward index doesn't match the lowest uninitialized
 * index in this pool, or exceeds NUM_REWARDS, or
 * all reward slots for this pool has been initialized.
 */
export function initializeReward(
  args: InitializeRewardArgs,
  accounts: InitializeRewardAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.rewardAuthority.address,
      role: 2,
      signer: accounts.rewardAuthority,
    },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.whirlpool, role: 1 },
    { address: accounts.rewardMint, role: 0 },
    {
      address: accounts.rewardVault.address,
      role: 3,
      signer: accounts.rewardVault,
    },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
  ]
  const identifier = Buffer.from([95, 135, 192, 196, 242, 129, 230, 68])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      rewardIndex: args.rewardIndex,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
