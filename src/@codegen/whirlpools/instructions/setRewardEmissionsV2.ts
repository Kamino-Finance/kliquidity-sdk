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

export interface SetRewardEmissionsV2Args {
  rewardIndex: number
  emissionsPerSecondX64: BN
}

export interface SetRewardEmissionsV2Accounts {
  whirlpool: Address
  rewardAuthority: TransactionSigner
  rewardVault: Address
}

export const layout = borsh.struct<SetRewardEmissionsV2Args>([
  borsh.u8("rewardIndex"),
  borsh.u128("emissionsPerSecondX64"),
])

export function setRewardEmissionsV2(
  args: SetRewardEmissionsV2Args,
  accounts: SetRewardEmissionsV2Accounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
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
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([114, 228, 72, 32, 193, 48, 160, 102])
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
