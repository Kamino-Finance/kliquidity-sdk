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

export interface UpdateStrategyAdminAccounts {
  pendingAdmin: TransactionSigner
  strategy: Address
}

export function updateStrategyAdmin(
  accounts: UpdateStrategyAdminAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.pendingAdmin.address,
      role: 3,
      signer: accounts.pendingAdmin,
    },
    { address: accounts.strategy, role: 1 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([13, 227, 164, 236, 32, 39, 6, 255])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
