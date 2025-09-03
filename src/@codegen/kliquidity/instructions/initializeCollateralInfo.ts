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

export interface InitializeCollateralInfoAccounts {
  adminAuthority: TransactionSigner
  globalConfig: Address
  collInfo: Address
  systemProgram: Address
}

export function initializeCollateralInfo(
  accounts: InitializeCollateralInfoAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 3,
      signer: accounts.adminAuthority,
    },
    { address: accounts.globalConfig, role: 1 },
    { address: accounts.collInfo, role: 1 },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([74, 61, 216, 76, 244, 91, 18, 119])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
