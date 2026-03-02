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
  169, 32, 79, 137, 136, 232, 70, 137,
])

export interface ClaimFeeAccounts {
  lbPair: Address
  position: Address
  binArrayLower: Address
  binArrayUpper: Address
  sender: TransactionSigner
  reserveX: Address
  reserveY: Address
  userTokenX: Address
  userTokenY: Address
  tokenXMint: Address
  tokenYMint: Address
  tokenProgram: Address
  eventAuthority: Address
  program: Address
}

export function claimFee(
  accounts: ClaimFeeAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    { address: accounts.position, role: 1 },
    { address: accounts.binArrayLower, role: 1 },
    { address: accounts.binArrayUpper, role: 1 },
    { address: accounts.sender.address, role: 2, signer: accounts.sender },
    { address: accounts.reserveX, role: 1 },
    { address: accounts.reserveY, role: 1 },
    { address: accounts.userTokenX, role: 1 },
    { address: accounts.userTokenY, role: 1 },
    { address: accounts.tokenXMint, role: 0 },
    { address: accounts.tokenYMint, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
