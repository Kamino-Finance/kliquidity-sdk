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

export interface TokenInfosInitScopeFeedArgs {
  scopeFeed: Address
}

export interface TokenInfosInitScopeFeedAccounts {
  signer: TransactionSigner
  globalConfig: Address
  tokenInfos: Address
}

export const layout = borsh.struct([borshAddress("scopeFeed")])

export function tokenInfosInitScopeFeed(
  args: TokenInfosInitScopeFeedArgs,
  accounts: TokenInfosInitScopeFeedAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.signer.address, role: 3, signer: accounts.signer },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.tokenInfos, role: 1 },
  ]
  const identifier = Buffer.from([75, 226, 181, 9, 8, 69, 196, 237])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      scopeFeed: args.scopeFeed,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
