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

export interface UpdateFeeParametersArgs {
  feeParameter: types.FeeParameterFields
}

export interface UpdateFeeParametersAccounts {
  lbPair: Address
  admin: TransactionSigner
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct<UpdateFeeParametersArgs>([
  types.FeeParameter.layout("feeParameter"),
])

export function updateFeeParameters(
  args: UpdateFeeParametersArgs,
  accounts: UpdateFeeParametersAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    { address: accounts.admin.address, role: 2, signer: accounts.admin },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([128, 128, 208, 91, 246, 53, 31, 176])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      feeParameter: types.FeeParameter.toEncodable(args.feeParameter),
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
