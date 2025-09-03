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

export interface SetLockReleaseSlotArgs {
  newLockReleaseSlot: BN
}

export interface SetLockReleaseSlotAccounts {
  position: Address
  lbPair: Address
  sender: TransactionSigner
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct<SetLockReleaseSlotArgs>([
  borsh.u64("newLockReleaseSlot"),
])

export function setLockReleaseSlot(
  args: SetLockReleaseSlotArgs,
  accounts: SetLockReleaseSlotAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.position, role: 1 },
    { address: accounts.lbPair, role: 0 },
    { address: accounts.sender.address, role: 2, signer: accounts.sender },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([207, 224, 170, 143, 189, 159, 46, 150])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      newLockReleaseSlot: args.newLockReleaseSlot,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
