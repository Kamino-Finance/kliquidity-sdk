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

export const DISCRIMINATOR = new Uint8Array([53, 146, 68, 8, 18, 117, 17, 185])

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
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
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
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
