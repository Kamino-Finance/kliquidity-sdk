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
  100, 25, 99, 2, 217, 239, 124, 173,
])

export interface DeletePositionBundleAccounts {
  positionBundle: Address
  positionBundleMint: Address
  positionBundleTokenAccount: Address
  positionBundleOwner: TransactionSigner
  receiver: Address
  tokenProgram: Address
}

export function deletePositionBundle(
  accounts: DeletePositionBundleAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.positionBundle, role: 1 },
    { address: accounts.positionBundleMint, role: 1 },
    { address: accounts.positionBundleTokenAccount, role: 1 },
    {
      address: accounts.positionBundleOwner.address,
      role: 2,
      signer: accounts.positionBundleOwner,
    },
    { address: accounts.receiver, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
