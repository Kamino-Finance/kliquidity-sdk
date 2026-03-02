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
  253, 77, 205, 95, 27, 224, 89, 223,
])

export interface InitializeTokenBadgeAccounts {
  whirlpoolsConfig: Address
  whirlpoolsConfigExtension: Address
  tokenBadgeAuthority: TransactionSigner
  tokenMint: Address
  tokenBadge: Address
  funder: TransactionSigner
  systemProgram: Address
}

export function initializeTokenBadge(
  accounts: InitializeTokenBadgeAccounts,
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
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
