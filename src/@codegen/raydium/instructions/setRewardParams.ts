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
  112, 52, 167, 75, 32, 201, 211, 137,
])

export interface SetRewardParamsArgs {
  rewardIndex: number
  emissionsPerSecondX64: bigint
  openTime: bigint
  endTime: bigint
}

export interface SetRewardParamsAccounts {
  authority: TransactionSigner
  ammConfig: Address
  poolState: Address
  operationState: Address
  tokenProgram: Address
  tokenProgram2022: Address
}

export const layout = borsh.struct([
  borsh.u8("rewardIndex"),
  borsh.u128("emissionsPerSecondX64"),
  borsh.u64("openTime"),
  borsh.u64("endTime"),
])

export function setRewardParams(
  args: SetRewardParamsArgs,
  accounts: SetRewardParamsAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
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
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      rewardIndex: args.rewardIndex,
      emissionsPerSecondX64: args.emissionsPerSecondX64,
      openTime: args.openTime,
      endTime: args.endTime,
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
