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

export interface UpdateAmmConfigArgs {
  param: number
  value: number
}

export interface UpdateAmmConfigAccounts {
  owner: TransactionSigner
  ammConfig: Address
}

export const layout = borsh.struct<UpdateAmmConfigArgs>([
  borsh.u8("param"),
  borsh.u32("value"),
])

export function updateAmmConfig(
  args: UpdateAmmConfigArgs,
  accounts: UpdateAmmConfigAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.owner.address, role: 2, signer: accounts.owner },
    { address: accounts.ammConfig, role: 1 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([49, 60, 174, 136, 154, 28, 116, 200])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      param: args.param,
      value: args.value,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
