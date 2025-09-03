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

export interface SetRewardParamsArgs {
  rewardIndex: number
  emissionsPerSecondX64: BN
  openTime: BN
  endTime: BN
}

export interface SetRewardParamsAccounts {
  authority: TransactionSigner
  ammConfig: Address
  poolState: Address
  operationState: Address
  tokenProgram: Address
  tokenProgram2022: Address
}

export const layout = borsh.struct<SetRewardParamsArgs>([
  borsh.u8("rewardIndex"),
  borsh.u128("emissionsPerSecondX64"),
  borsh.u64("openTime"),
  borsh.u64("endTime"),
])

export function setRewardParams(
  args: SetRewardParamsArgs,
  accounts: SetRewardParamsAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.authority.address,
      role: 2,
      signer: accounts.authority,
    },
    { address: accounts.ammConfig, role: 0 },
    { address: accounts.poolState, role: 1 },
    { address: accounts.operationState, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenProgram2022, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([112, 52, 167, 75, 32, 201, 211, 137])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      rewardIndex: args.rewardIndex,
      emissionsPerSecondX64: args.emissionsPerSecondX64,
      openTime: args.openTime,
      endTime: args.endTime,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
