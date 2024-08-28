import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface UpdateStrategyAdminAccounts {
  pendingAdmin: PublicKey
  strategy: PublicKey
}

export function updateStrategyAdmin(
  accounts: UpdateStrategyAdminAccounts,
  programId: PublicKey = PROGRAM_ID
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.pendingAdmin, isSigner: true, isWritable: true },
    { pubkey: accounts.strategy, isSigner: false, isWritable: true },
  ]
  const identifier = Buffer.from([13, 227, 164, 236, 32, 39, 6, 255])
  const data = identifier
  const ix = new TransactionInstruction({ keys, programId, data })
  return ix
}
