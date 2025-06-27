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

export interface SetRewardEmissionsArgs {
  rewardIndex: number
  emissionsPerSecondX64: BN
}

export interface SetRewardEmissionsAccounts {
  whirlpool: Address
  rewardAuthority: TransactionSigner
  rewardVault: Address
}

export const layout = borsh.struct([
  borsh.u8("rewardIndex"),
  borsh.u128("emissionsPerSecondX64"),
])

/**
 * Set the reward emissions for a reward in a Whirlpool.
 *
 * ### Authority
 * - "reward_authority" - assigned authority by the reward_super_authority for the specified
 * reward-index in this Whirlpool
 *
 * ### Parameters
 * - `reward_index` - The reward index (0 <= index <= NUM_REWARDS) that we'd like to modify.
 * - `emissions_per_second_x64` - The amount of rewards emitted in this pool.
 *
 * #### Special Errors
 * - `RewardVaultAmountInsufficient` - The amount of rewards in the reward vault cannot emit
 * more than a day of desired emissions.
 * - `InvalidTimestamp` - Provided timestamp is not in order with the previous timestamp.
 * - `InvalidRewardIndex` - If the provided reward index doesn't match the lowest uninitialized
 * index in this pool, or exceeds NUM_REWARDS, or
 * all reward slots for this pool has been initialized.
 */
export function setRewardEmissions(
  args: SetRewardEmissionsArgs,
  accounts: SetRewardEmissionsAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpool, role: 1 },
    {
      address: accounts.rewardAuthority.address,
      role: 2,
      signer: accounts.rewardAuthority,
    },
    { address: accounts.rewardVault, role: 0 },
  ]
  const identifier = Buffer.from([13, 197, 86, 168, 109, 176, 27, 244])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      rewardIndex: args.rewardIndex,
      emissionsPerSecondX64: args.emissionsPerSecondX64,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
