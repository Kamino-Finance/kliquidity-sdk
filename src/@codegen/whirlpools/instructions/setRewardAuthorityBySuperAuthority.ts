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
  240, 154, 201, 198, 148, 93, 56, 25,
])

export interface SetRewardAuthorityBySuperAuthorityArgs {
  rewardIndex: number
}

export interface SetRewardAuthorityBySuperAuthorityAccounts {
  whirlpoolsConfig: Address
  whirlpool: Address
  rewardEmissionsSuperAuthority: TransactionSigner
  newRewardAuthority: Address
}

export const layout = borsh.struct([borsh.u8("rewardIndex")])

export function setRewardAuthorityBySuperAuthority(
  args: SetRewardAuthorityBySuperAuthorityArgs,
  accounts: SetRewardAuthorityBySuperAuthorityAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
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
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      rewardIndex: args.rewardIndex,
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
