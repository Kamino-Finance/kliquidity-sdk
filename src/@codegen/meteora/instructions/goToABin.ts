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

export interface GoToABinArgs {
  binId: number
}

export interface GoToABinAccounts {
  lbPair: Address
  binArrayBitmapExtension: Option<Address>
  fromBinArray: Option<Address>
  toBinArray: Option<Address>
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct<GoToABinArgs>([borsh.i32("binId")])

export function goToABin(
  args: GoToABinArgs,
  accounts: GoToABinAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    isSome(accounts.binArrayBitmapExtension)
      ? { address: accounts.binArrayBitmapExtension.value, role: 0 }
      : { address: programAddress, role: 0 },
    isSome(accounts.fromBinArray)
      ? { address: accounts.fromBinArray.value, role: 0 }
      : { address: programAddress, role: 0 },
    isSome(accounts.toBinArray)
      ? { address: accounts.toBinArray.value, role: 0 }
      : { address: programAddress, role: 0 },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([146, 72, 174, 224, 40, 253, 84, 174])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      binId: args.binId,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
