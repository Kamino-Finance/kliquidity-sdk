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

export interface PermisionlessWithdrawFromTreasuryAccounts {
  signer: TransactionSigner
  globalConfig: Address
  mint: Address
  treasuryFeeVault: Address
  treasuryFeeVaultAuthority: Address
  tokenAccount: Address
  tokenProgram: Address
}

export function permisionlessWithdrawFromTreasury(
  accounts: PermisionlessWithdrawFromTreasuryAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.signer.address, role: 3, signer: accounts.signer },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.mint, role: 0 },
    { address: accounts.treasuryFeeVault, role: 1 },
    { address: accounts.treasuryFeeVaultAuthority, role: 1 },
    { address: accounts.tokenAccount, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([167, 36, 32, 79, 97, 170, 183, 108])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
