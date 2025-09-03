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

export interface ChangePoolAccounts {
  adminAuthority: TransactionSigner
  strategy: Address
  oldPosition: Address
  baseVaultAuthority: Address
  newPool: Address
  strategyRewardVault0OrBaseVaultAuthority: Address
  strategyRewardVault1OrBaseVaultAuthority: Address
  strategyRewardVault2OrBaseVaultAuthority: Address
}

export function changePool(
  accounts: ChangePoolAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 3,
      signer: accounts.adminAuthority,
    },
    { address: accounts.strategy, role: 1 },
    { address: accounts.oldPosition, role: 0 },
    { address: accounts.baseVaultAuthority, role: 0 },
    { address: accounts.newPool, role: 0 },
    { address: accounts.strategyRewardVault0OrBaseVaultAuthority, role: 0 },
    { address: accounts.strategyRewardVault1OrBaseVaultAuthority, role: 0 },
    { address: accounts.strategyRewardVault2OrBaseVaultAuthority, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([141, 221, 123, 235, 35, 9, 145, 201])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
