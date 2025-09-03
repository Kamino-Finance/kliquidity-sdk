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

export interface ClosePresetParameterAccounts {
  presetParameter: Address
  admin: TransactionSigner
  rentReceiver: Address
}

export function closePresetParameter(
  accounts: ClosePresetParameterAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.presetParameter, role: 1 },
    { address: accounts.admin.address, role: 3, signer: accounts.admin },
    { address: accounts.rentReceiver, role: 1 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([4, 148, 145, 100, 134, 26, 181, 61])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
