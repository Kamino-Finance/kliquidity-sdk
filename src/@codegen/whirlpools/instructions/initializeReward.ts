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
  95, 135, 192, 196, 242, 129, 230, 68,
])

export interface InitializeRewardArgs {
  rewardIndex: number
}

export interface InitializeRewardAccounts {
  rewardAuthority: TransactionSigner
  funder: TransactionSigner
  whirlpool: Address
  rewardMint: Address
  rewardVault: TransactionSigner
  tokenProgram: Address
  systemProgram: Address
  rent: Address
}

export const layout = borsh.struct([borsh.u8("rewardIndex")])

export function initializeReward(
  args: InitializeRewardArgs,
  accounts: InitializeRewardAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    {
      address: accounts.rewardAuthority.address,
      role: 2,
      signer: accounts.rewardAuthority,
    },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.whirlpool, role: 1 },
    { address: accounts.rewardMint, role: 0 },
    {
      address: accounts.rewardVault.address,
      role: 3,
      signer: accounts.rewardVault,
    },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
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
