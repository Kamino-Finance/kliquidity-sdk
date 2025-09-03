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

export interface SetConfigExtensionAuthorityAccounts {
  whirlpoolsConfig: Address
  whirlpoolsConfigExtension: Address
  configExtensionAuthority: TransactionSigner
  newConfigExtensionAuthority: Address
}

export function setConfigExtensionAuthority(
  accounts: SetConfigExtensionAuthorityAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.whirlpoolsConfigExtension, role: 1 },
    {
      address: accounts.configExtensionAuthority.address,
      role: 2,
      signer: accounts.configExtensionAuthority,
    },
    { address: accounts.newConfigExtensionAuthority, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([44, 94, 241, 116, 24, 188, 60, 143])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
