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

export const DISCRIMINATOR = new Uint8Array([22, 67, 23, 98, 150, 178, 70, 220])

export interface CollectProtocolFeesAccounts {
  whirlpoolsConfig: Address
  whirlpool: Address
  collectProtocolFeesAuthority: TransactionSigner
  tokenVaultA: Address
  tokenVaultB: Address
  tokenDestinationA: Address
  tokenDestinationB: Address
  tokenProgram: Address
}

export function collectProtocolFees(
  accounts: CollectProtocolFeesAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.whirlpool, role: 1 },
    {
      address: accounts.collectProtocolFeesAuthority.address,
      role: 2,
      signer: accounts.collectProtocolFeesAuthority,
    },
    { address: accounts.tokenVaultA, role: 1 },
    { address: accounts.tokenVaultB, role: 1 },
    { address: accounts.tokenDestinationA, role: 1 },
    { address: accounts.tokenDestinationB, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
