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

export interface UpdateRewardDurationArgs {
  rewardIndex: BN
  newDuration: BN
}

export interface UpdateRewardDurationAccounts {
  lbPair: Address
  admin: TransactionSigner
  binArray: Address
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct<UpdateRewardDurationArgs>([
  borsh.u64("rewardIndex"),
  borsh.u64("newDuration"),
])

export function updateRewardDuration(
  args: UpdateRewardDurationArgs,
  accounts: UpdateRewardDurationAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    { address: accounts.admin.address, role: 2, signer: accounts.admin },
    { address: accounts.binArray, role: 1 },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([138, 174, 196, 169, 213, 235, 254, 107])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      rewardIndex: args.rewardIndex,
      newDuration: args.newDuration,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
