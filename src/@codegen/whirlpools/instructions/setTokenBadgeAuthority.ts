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

export interface SetTokenBadgeAuthorityAccounts {
  whirlpoolsConfig: Address
  whirlpoolsConfigExtension: Address
  configExtensionAuthority: TransactionSigner
  newTokenBadgeAuthority: Address
}

export function setTokenBadgeAuthority(
  accounts: SetTokenBadgeAuthorityAccounts,
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
    { address: accounts.newTokenBadgeAuthority, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([207, 202, 4, 32, 205, 79, 13, 178])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
