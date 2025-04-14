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
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
  ]
  const identifier = Buffer.from([155, 34, 122, 165, 245, 137, 147, 107])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      name: args.name,
      symbol: args.symbol,
      uri: args.uri,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
