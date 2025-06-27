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

export interface SetRewardAuthorityArgs {
  rewardIndex: number
}

export interface SetRewardAuthorityAccounts {
  whirlpool: Address
  rewardAuthority: TransactionSigner
  newRewardAuthority: Address
}

export const layout = borsh.struct([borsh.u8("rewardIndex")])

/**
 * Set the whirlpool reward authority at the provided `reward_index`.
 * Only the current reward authority for this reward index has permission to invoke this instruction.
 *
 * ### Authority
 * - "reward_authority" - Set authority that can control reward emission for this particular reward.
 *
 * #### Special Errors
 * - `InvalidRewardIndex` - If the provided reward index doesn't match the lowest uninitialized
 * index in this pool, or exceeds NUM_REWARDS, or
 * all reward slots for this pool has been initialized.
 */
export function setRewardAuthority(
  args: SetRewardAuthorityArgs,
  accounts: SetRewardAuthorityAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpool, role: 1 },
    {
      address: accounts.rewardAuthority.address,
      role: 2,
      signer: accounts.rewardAuthority,
    },
    { address: accounts.newRewardAuthority, role: 0 },
  ]
  const identifier = Buffer.from([34, 39, 183, 252, 83, 28, 85, 127])
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
