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
  18, 237, 166, 197, 34, 16, 213, 144,
])

export interface CollectRemainingRewardsArgs {
  rewardIndex: number
}

export interface CollectRemainingRewardsAccounts {
  rewardFunder: TransactionSigner
  funderTokenAccount: Address
  poolState: Address
  rewardTokenVault: Address
  rewardVaultMint: Address
  tokenProgram: Address
  tokenProgram2022: Address
  memoProgram: Address
}

export const layout = borsh.struct([borsh.u8("rewardIndex")])

export function collectRemainingRewards(
  args: CollectRemainingRewardsArgs,
  accounts: CollectRemainingRewardsAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    {
      address: accounts.rewardFunder.address,
      role: 2,
      signer: accounts.rewardFunder,
    },
    { address: accounts.funderTokenAccount, role: 1 },
    { address: accounts.poolState, role: 1 },
    { address: accounts.rewardTokenVault, role: 0 },
    { address: accounts.rewardVaultMint, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenProgram2022, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      rewardIndex: args.rewardIndex,
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
