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

export interface MigratePositionAccounts {
  positionV2: TransactionSigner
  positionV1: Address
  lbPair: Address
  binArrayLower: Address
  binArrayUpper: Address
  owner: TransactionSigner
  systemProgram: Address
  rentReceiver: Address
  eventAuthority: Address
  program: Address
}

export function migratePosition(
  accounts: MigratePositionAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.positionV2.address,
      role: 3,
      signer: accounts.positionV2,
    },
    { address: accounts.positionV1, role: 1 },
    { address: accounts.lbPair, role: 0 },
    { address: accounts.binArrayLower, role: 1 },
    { address: accounts.binArrayUpper, role: 1 },
    { address: accounts.owner.address, role: 3, signer: accounts.owner },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rentReceiver, role: 1 },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([15, 132, 59, 50, 199, 6, 251, 46])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
