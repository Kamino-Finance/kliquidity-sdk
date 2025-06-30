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

export interface SetRewardEmissionsSuperAuthorityAccounts {
  whirlpoolsConfig: Address
  rewardEmissionsSuperAuthority: TransactionSigner
  newRewardEmissionsSuperAuthority: Address
}

/**
 * Set the whirlpool reward super authority for a WhirlpoolConfig
 * Only the current reward super authority has permission to invoke this instruction.
 * This instruction will not change the authority on any `WhirlpoolRewardInfo` whirlpool rewards.
 *
 * ### Authority
 * - "reward_emissions_super_authority" - Set authority that can control reward authorities for all pools in this config space.
 */
export function setRewardEmissionsSuperAuthority(
  accounts: SetRewardEmissionsSuperAuthorityAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 1 },
    {
      address: accounts.rewardEmissionsSuperAuthority.address,
      role: 2,
      signer: accounts.rewardEmissionsSuperAuthority,
    },
    { address: accounts.newRewardEmissionsSuperAuthority, role: 0 },
  ]
  const identifier = Buffer.from([207, 5, 200, 209, 122, 56, 82, 183])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
