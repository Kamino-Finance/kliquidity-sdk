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

export const DISCRIMINATOR = new Uint8Array([24, 213, 73, 145, 1, 149, 127, 37])

export interface SetPreActivationSlotDurationArgs {
  preActivationSlotDuration: number
}

export interface SetPreActivationSlotDurationAccounts {
  lbPair: Address
  creator: TransactionSigner
}

export const layout = borsh.struct([borsh.u16("preActivationSlotDuration")])

export function setPreActivationSlotDuration(
  args: SetPreActivationSlotDurationArgs,
  accounts: SetPreActivationSlotDurationAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    { address: accounts.creator.address, role: 2, signer: accounts.creator },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      preActivationSlotDuration: args.preActivationSlotDuration,
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
