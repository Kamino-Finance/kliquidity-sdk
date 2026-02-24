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
  167, 36, 32, 79, 97, 170, 183, 108,
])

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
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.signer.address, role: 3, signer: accounts.signer },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.mint, role: 0 },
    { address: accounts.treasuryFeeVault, role: 1 },
    { address: accounts.treasuryFeeVaultAuthority, role: 1 },
    { address: accounts.tokenAccount, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
