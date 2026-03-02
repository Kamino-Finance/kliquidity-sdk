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

export const DISCRIMINATOR = new Uint8Array([211, 28, 48, 32, 215, 160, 35, 23])

export interface UpdateRewardFunderArgs {
  rewardIndex: bigint
  newFunder: Address
}

export interface UpdateRewardFunderAccounts {
  lbPair: Address
  admin: TransactionSigner
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct([
  borsh.u64("rewardIndex"),
  borshAddress("newFunder"),
])

export function updateRewardFunder(
  args: UpdateRewardFunderArgs,
  accounts: UpdateRewardFunderAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    { address: accounts.admin.address, role: 2, signer: accounts.admin },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      rewardIndex: args.rewardIndex,
      newFunder: args.newFunder,
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
