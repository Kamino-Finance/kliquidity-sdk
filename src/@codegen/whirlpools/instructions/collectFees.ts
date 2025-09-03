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

export interface CollectFeesAccounts {
  whirlpool: Address
  positionAuthority: TransactionSigner
  position: Address
  positionTokenAccount: Address
  tokenOwnerAccountA: Address
  tokenVaultA: Address
  tokenOwnerAccountB: Address
  tokenVaultB: Address
  tokenProgram: Address
}

export function collectFees(
  accounts: CollectFeesAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpool, role: 0 },
    {
      address: accounts.positionAuthority.address,
      role: 2,
      signer: accounts.positionAuthority,
    },
    { address: accounts.position, role: 1 },
    { address: accounts.positionTokenAccount, role: 0 },
    { address: accounts.tokenOwnerAccountA, role: 1 },
    { address: accounts.tokenVaultA, role: 1 },
    { address: accounts.tokenOwnerAccountB, role: 1 },
    { address: accounts.tokenVaultB, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([164, 152, 207, 99, 30, 186, 19, 182])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
