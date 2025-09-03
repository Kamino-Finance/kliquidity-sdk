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

export interface InitializePermissionLbPairArgs {
  ixData: types.InitPermissionPairIxFields
}

export interface InitializePermissionLbPairAccounts {
  base: TransactionSigner
  lbPair: Address
  binArrayBitmapExtension: Option<Address>
  tokenMintX: Address
  tokenMintY: Address
  reserveX: Address
  reserveY: Address
  oracle: Address
  admin: TransactionSigner
  tokenProgram: Address
  systemProgram: Address
  rent: Address
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct<InitializePermissionLbPairArgs>([
  types.InitPermissionPairIx.layout("ixData"),
])

export function initializePermissionLbPair(
  args: InitializePermissionLbPairArgs,
  accounts: InitializePermissionLbPairAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.base.address, role: 2, signer: accounts.base },
    { address: accounts.lbPair, role: 1 },
    isSome(accounts.binArrayBitmapExtension)
      ? { address: accounts.binArrayBitmapExtension.value, role: 1 }
      : { address: programAddress, role: 0 },
    { address: accounts.tokenMintX, role: 0 },
    { address: accounts.tokenMintY, role: 0 },
    { address: accounts.reserveX, role: 1 },
    { address: accounts.reserveY, role: 1 },
    { address: accounts.oracle, role: 1 },
    { address: accounts.admin.address, role: 3, signer: accounts.admin },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([108, 102, 213, 85, 251, 3, 53, 21])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      ixData: types.InitPermissionPairIx.toEncodable(args.ixData),
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
