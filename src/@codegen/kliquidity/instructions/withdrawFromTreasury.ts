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

export const DISCRIMINATOR = new Uint8Array([0, 164, 86, 76, 56, 72, 12, 170])

export interface WithdrawFromTreasuryArgs {
  amount: bigint
}

export interface WithdrawFromTreasuryAccounts {
  adminAuthority: TransactionSigner
  globalConfig: Address
  mint: Address
  treasuryFeeVault: Address
  treasuryFeeVaultAuthority: Address
  tokenAccount: Address
  systemProgram: Address
  rent: Address
  tokenProgram: Address
}

export const layout = borsh.struct([borsh.u64("amount")])

export function withdrawFromTreasury(
  args: WithdrawFromTreasuryArgs,
  accounts: WithdrawFromTreasuryAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 3,
      signer: accounts.adminAuthority,
    },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.mint, role: 0 },
    { address: accounts.treasuryFeeVault, role: 1 },
    { address: accounts.treasuryFeeVaultAuthority, role: 1 },
    { address: accounts.tokenAccount, role: 1 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      amount: args.amount,
    },
    buffer
  )
  const data = (() => {
    const d = new Uint8Array(8 + len)
    d.set(DISCRIMINATOR)
    d.set(buffer.subarray(0, len), 8)
    return d
  })()
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
