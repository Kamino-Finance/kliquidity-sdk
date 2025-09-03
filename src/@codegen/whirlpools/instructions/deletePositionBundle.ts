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
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
  const identifier = Buffer.from([100, 25, 99, 2, 217, 239, 124, 173])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
