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

export interface SetActivationSlotArgs {
  activationSlot: BN
}

export interface SetActivationSlotAccounts {
  lbPair: Address
  admin: TransactionSigner
}

export const layout = borsh.struct<SetActivationSlotArgs>([
  borsh.u64("activationSlot"),
])

export function setActivationSlot(
  args: SetActivationSlotArgs,
  accounts: SetActivationSlotAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    { address: accounts.admin.address, role: 3, signer: accounts.admin },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([200, 227, 90, 83, 27, 79, 191, 88])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      activationSlot: args.activationSlot,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
