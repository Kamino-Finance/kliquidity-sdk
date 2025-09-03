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

export interface InitializePositionBundleAccounts {
  positionBundle: Address
  positionBundleMint: TransactionSigner
  positionBundleTokenAccount: Address
  positionBundleOwner: Address
  funder: TransactionSigner
  tokenProgram: Address
  systemProgram: Address
  rent: Address
  associatedTokenProgram: Address
}

export function initializePositionBundle(
  accounts: InitializePositionBundleAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.positionBundle, role: 1 },
    {
      address: accounts.positionBundleMint.address,
      role: 3,
      signer: accounts.positionBundleMint,
    },
    { address: accounts.positionBundleTokenAccount, role: 1 },
    { address: accounts.positionBundleOwner, role: 0 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.associatedTokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([117, 45, 241, 149, 24, 18, 194, 65])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
