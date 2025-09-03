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

export interface SetRewardAuthorityBySuperAuthorityArgs {
  rewardIndex: number
}

export interface SetRewardAuthorityBySuperAuthorityAccounts {
  whirlpoolsConfig: Address
  whirlpool: Address
  rewardEmissionsSuperAuthority: TransactionSigner
  newRewardAuthority: Address
}

export const layout = borsh.struct<SetRewardAuthorityBySuperAuthorityArgs>([
  borsh.u8("rewardIndex"),
])

export function setRewardAuthorityBySuperAuthority(
  args: SetRewardAuthorityBySuperAuthorityArgs,
  accounts: SetRewardAuthorityBySuperAuthorityAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.whirlpool, role: 1 },
    {
      address: accounts.rewardEmissionsSuperAuthority.address,
      role: 2,
      signer: accounts.rewardEmissionsSuperAuthority,
    },
    { address: accounts.newRewardAuthority, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([240, 154, 201, 198, 148, 93, 56, 25])
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
