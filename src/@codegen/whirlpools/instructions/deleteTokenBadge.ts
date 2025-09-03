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

export interface DeleteTokenBadgeAccounts {
  whirlpoolsConfig: Address
  whirlpoolsConfigExtension: Address
  tokenBadgeAuthority: TransactionSigner
  tokenMint: Address
  tokenBadge: Address
  receiver: Address
}

export function deleteTokenBadge(
  accounts: DeleteTokenBadgeAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.whirlpoolsConfigExtension, role: 0 },
    {
      address: accounts.tokenBadgeAuthority.address,
      role: 2,
      signer: accounts.tokenBadgeAuthority,
    },
    { address: accounts.tokenMint, role: 0 },
    { address: accounts.tokenBadge, role: 1 },
    { address: accounts.receiver, role: 1 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([53, 146, 68, 8, 18, 117, 17, 185])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
