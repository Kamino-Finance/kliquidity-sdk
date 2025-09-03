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

export interface InitializeBinArrayBitmapExtensionAccounts {
  lbPair: Address
  /** Initialize an account to store if a bin array is initialized. */
  binArrayBitmapExtension: Address
  funder: TransactionSigner
  systemProgram: Address
  rent: Address
}

export function initializeBinArrayBitmapExtension(
  accounts: InitializeBinArrayBitmapExtensionAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.lbPair, role: 0 },
    { address: accounts.binArrayBitmapExtension, role: 1 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([47, 157, 226, 180, 12, 240, 33, 71])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
