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
  34, 150, 93, 244, 139, 225, 233, 67,
])

export interface SetCollectProtocolFeesAuthorityAccounts {
  whirlpoolsConfig: Address
  collectProtocolFeesAuthority: TransactionSigner
  newCollectProtocolFeesAuthority: Address
}

export function setCollectProtocolFeesAuthority(
  accounts: SetCollectProtocolFeesAuthorityAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 1 },
    {
      address: accounts.collectProtocolFeesAuthority.address,
      role: 2,
      signer: accounts.collectProtocolFeesAuthority,
    },
    { address: accounts.newCollectProtocolFeesAuthority, role: 0 },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
