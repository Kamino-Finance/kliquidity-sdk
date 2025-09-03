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

export interface SetPreActivationSlotDurationArgs {
  preActivationSlotDuration: number
}

export interface SetPreActivationSlotDurationAccounts {
  lbPair: Address
  creator: TransactionSigner
}

export const layout = borsh.struct<SetPreActivationSlotDurationArgs>([
  borsh.u16("preActivationSlotDuration"),
])

export function setPreActivationSlotDuration(
  args: SetPreActivationSlotDurationArgs,
  accounts: SetPreActivationSlotDurationAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    { address: accounts.creator.address, role: 2, signer: accounts.creator },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([24, 213, 73, 145, 1, 149, 127, 37])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      preActivationSlotDuration: args.preActivationSlotDuration,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
