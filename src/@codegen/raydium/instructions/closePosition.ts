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

export const DISCRIMINATOR = new Uint8Array([123, 134, 81, 0, 49, 68, 98, 98])

export interface ClosePositionAccounts {
  nftOwner: TransactionSigner
  positionNftMint: Address
  positionNftAccount: Address
  personalPosition: Address
  systemProgram: Address
  tokenProgram: Address
}

export function closePosition(
  accounts: ClosePositionAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.nftOwner.address, role: 3, signer: accounts.nftOwner },
    { address: accounts.positionNftMint, role: 1 },
    { address: accounts.positionNftAccount, role: 1 },
    { address: accounts.personalPosition, role: 1 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
