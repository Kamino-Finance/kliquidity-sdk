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
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
  const identifier = Buffer.from([169, 32, 79, 137, 136, 232, 70, 137])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
