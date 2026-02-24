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
  207, 5, 200, 209, 122, 56, 82, 183,
])

export interface SetRewardEmissionsSuperAuthorityAccounts {
  whirlpoolsConfig: Address
  rewardEmissionsSuperAuthority: TransactionSigner
  newRewardEmissionsSuperAuthority: Address
}

export function setRewardEmissionsSuperAuthority(
  accounts: SetRewardEmissionsSuperAuthorityAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 1 },
    {
      address: accounts.rewardEmissionsSuperAuthority.address,
      role: 2,
      signer: accounts.rewardEmissionsSuperAuthority,
    },
    { address: accounts.newRewardEmissionsSuperAuthority, role: 0 },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
