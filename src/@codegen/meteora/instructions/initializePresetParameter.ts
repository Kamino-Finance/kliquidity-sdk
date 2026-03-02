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
  66, 188, 71, 211, 98, 109, 14, 186,
])

export interface InitializePresetParameterArgs {
  ix: types.InitPresetParametersIxFields
}

export interface InitializePresetParameterAccounts {
  presetParameter: Address
  admin: TransactionSigner
  systemProgram: Address
  rent: Address
}

export const layout = borsh.struct([types.InitPresetParametersIx.layout("ix")])

export function initializePresetParameter(
  args: InitializePresetParameterArgs,
  accounts: InitializePresetParameterAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.presetParameter, role: 1 },
    { address: accounts.admin.address, role: 3, signer: accounts.admin },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      ix: types.InitPresetParametersIx.toEncodable(args.ix),
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
