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
  117, 45, 241, 149, 24, 18, 194, 65,
])

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
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
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
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
