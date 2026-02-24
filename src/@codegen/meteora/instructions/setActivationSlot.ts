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

export const DISCRIMINATOR = new Uint8Array([200, 227, 90, 83, 27, 79, 191, 88])

export interface SetActivationSlotArgs {
  activationSlot: bigint
}

export interface SetActivationSlotAccounts {
  lbPair: Address
  admin: TransactionSigner
}

export const layout = borsh.struct([borsh.u64("activationSlot")])

export function setActivationSlot(
  args: SetActivationSlotArgs,
  accounts: SetActivationSlotAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    { address: accounts.admin.address, role: 3, signer: accounts.admin },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      activationSlot: args.activationSlot,
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
