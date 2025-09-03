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

export interface InitializeSharesMetadataArgs {
  name: string
  symbol: string
  uri: string
}

export interface InitializeSharesMetadataAccounts {
  adminAuthority: TransactionSigner
  strategy: Address
  globalConfig: Address
  sharesMint: Address
  sharesMetadata: Address
  sharesMintAuthority: Address
  systemProgram: Address
  rent: Address
  metadataProgram: Address
}

export const layout = borsh.struct<InitializeSharesMetadataArgs>([
  borsh.str("name"),
  borsh.str("symbol"),
  borsh.str("uri"),
])

export function initializeSharesMetadata(
  args: InitializeSharesMetadataArgs,
  accounts: InitializeSharesMetadataAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
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
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.metadataProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([3, 15, 172, 114, 200, 0, 131, 32])
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
