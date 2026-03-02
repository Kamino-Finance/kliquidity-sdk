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

export const DISCRIMINATOR = new Uint8Array([108, 102, 213, 85, 251, 3, 53, 21])

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

export const layout = borsh.struct([
  types.InitPermissionPairIx.layout("ixData"),
])

export function initializePermissionLbPair(
  args: InitializePermissionLbPairArgs,
  accounts: InitializePermissionLbPairAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
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
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      ixData: types.InitPermissionPairIx.toEncodable(args.ixData),
    },
    buffer
  )
  const data = (() => {
    const d = new Uint8Array(8 + len)
    d.set(DISCRIMINATOR)
    d.set(buffer.subarray(0, len), 8)
    return d
  })()
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
