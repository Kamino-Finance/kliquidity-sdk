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

export interface InitializePresetParameterArgs {
  ix: types.InitPresetParametersIxFields
}

export interface InitializePresetParameterAccounts {
  presetParameter: Address
  admin: TransactionSigner
  systemProgram: Address
  rent: Address
}

export const layout = borsh.struct<InitializePresetParameterArgs>([
  types.InitPresetParametersIx.layout("ix"),
])

export function initializePresetParameter(
  args: InitializePresetParameterArgs,
  accounts: InitializePresetParameterAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.presetParameter, role: 1 },
    { address: accounts.admin.address, role: 3, signer: accounts.admin },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([66, 188, 71, 211, 98, 109, 14, 186])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      ix: types.InitPresetParametersIx.toEncodable(args.ix),
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
