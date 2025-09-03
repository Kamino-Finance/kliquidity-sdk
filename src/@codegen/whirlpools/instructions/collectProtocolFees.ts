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
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
  const identifier = Buffer.from([22, 67, 23, 98, 150, 178, 70, 220])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
