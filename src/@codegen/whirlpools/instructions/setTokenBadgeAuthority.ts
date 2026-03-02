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

export const DISCRIMINATOR = new Uint8Array([207, 202, 4, 32, 205, 79, 13, 178])

export interface SetTokenBadgeAuthorityAccounts {
  whirlpoolsConfig: Address
  whirlpoolsConfigExtension: Address
  configExtensionAuthority: TransactionSigner
  newTokenBadgeAuthority: Address
}

export function setTokenBadgeAuthority(
  accounts: SetTokenBadgeAuthorityAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.whirlpoolsConfigExtension, role: 1 },
    {
      address: accounts.configExtensionAuthority.address,
      role: 2,
      signer: accounts.configExtensionAuthority,
    },
    { address: accounts.newTokenBadgeAuthority, role: 0 },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
