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

export interface InitializeConfigExtensionAccounts {
  config: Address
  configExtension: Address
  funder: TransactionSigner
  feeAuthority: TransactionSigner
  systemProgram: Address
}

export function initializeConfigExtension(
  accounts: InitializeConfigExtensionAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.config, role: 0 },
    { address: accounts.configExtension, role: 1 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    {
      address: accounts.feeAuthority.address,
      role: 2,
      signer: accounts.feeAuthority,
    },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([55, 9, 53, 9, 114, 57, 209, 52])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
