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

export const DISCRIMINATOR = new Uint8Array([13, 227, 164, 236, 32, 39, 6, 255])

export interface UpdateStrategyAdminAccounts {
  pendingAdmin: TransactionSigner
  strategy: Address
}

export function updateStrategyAdmin(
  accounts: UpdateStrategyAdminAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    {
      address: accounts.pendingAdmin.address,
      role: 3,
      signer: accounts.pendingAdmin,
    },
    { address: accounts.strategy, role: 1 },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
