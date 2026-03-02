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
  207, 224, 170, 143, 189, 159, 46, 150,
])

export interface SetLockReleaseSlotArgs {
  newLockReleaseSlot: bigint
}

export interface SetLockReleaseSlotAccounts {
  position: Address
  lbPair: Address
  sender: TransactionSigner
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct([borsh.u64("newLockReleaseSlot")])

export function setLockReleaseSlot(
  args: SetLockReleaseSlotArgs,
  accounts: SetLockReleaseSlotAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.position, role: 1 },
    { address: accounts.lbPair, role: 0 },
    { address: accounts.sender.address, role: 2, signer: accounts.sender },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      newLockReleaseSlot: args.newLockReleaseSlot,
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
