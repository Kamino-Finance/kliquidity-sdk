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
  155, 34, 122, 165, 245, 137, 147, 107,
])

export interface UpdateSharesMetadataArgs {
  name: string
  symbol: string
  uri: string
}

export interface UpdateSharesMetadataAccounts {
  adminAuthority: TransactionSigner
  strategy: Address
  globalConfig: Address
  sharesMint: Address
  sharesMetadata: Address
  sharesMintAuthority: Address
  metadataProgram: Address
}

export const layout = borsh.struct([
  borsh.str("name"),
  borsh.str("symbol"),
  borsh.str("uri"),
])

export function updateSharesMetadata(
  args: UpdateSharesMetadataArgs,
  accounts: UpdateSharesMetadataAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 3,
      signer: accounts.adminAuthority,
    },
    { address: accounts.strategy, role: 0 },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.sharesMint, role: 0 },
    { address: accounts.sharesMetadata, role: 1 },
    { address: accounts.sharesMintAuthority, role: 0 },
    { address: accounts.metadataProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      name: args.name,
      symbol: args.symbol,
      uri: args.uri,
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
