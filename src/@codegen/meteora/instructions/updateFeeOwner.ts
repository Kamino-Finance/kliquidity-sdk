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

export interface UpdateFeeOwnerAccounts {
  lbPair: Address
  newFeeOwner: Address
  admin: TransactionSigner
}

export function updateFeeOwner(
  accounts: UpdateFeeOwnerAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    { address: accounts.newFeeOwner, role: 0 },
    { address: accounts.admin.address, role: 2, signer: accounts.admin },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([60, 63, 17, 64, 13, 196, 166, 243])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
