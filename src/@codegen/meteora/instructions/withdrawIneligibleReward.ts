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
  148, 206, 42, 195, 247, 49, 103, 8,
])

export interface WithdrawIneligibleRewardArgs {
  rewardIndex: bigint
}

export interface WithdrawIneligibleRewardAccounts {
  lbPair: Address
  rewardVault: Address
  rewardMint: Address
  funderTokenAccount: Address
  funder: TransactionSigner
  binArray: Address
  tokenProgram: Address
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct([borsh.u64("rewardIndex")])

export function withdrawIneligibleReward(
  args: WithdrawIneligibleRewardArgs,
  accounts: WithdrawIneligibleRewardAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    { address: accounts.rewardVault, role: 1 },
    { address: accounts.rewardMint, role: 0 },
    { address: accounts.funderTokenAccount, role: 1 },
    { address: accounts.funder.address, role: 2, signer: accounts.funder },
    { address: accounts.binArray, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
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
