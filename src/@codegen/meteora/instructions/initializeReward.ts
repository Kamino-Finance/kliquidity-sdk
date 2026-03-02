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
  rewardIndex: bigint
  rewardDuration: bigint
  funder: Address
}

export interface InitializeRewardAccounts {
  lbPair: Address
  rewardVault: Address
  rewardMint: Address
  admin: TransactionSigner
  tokenProgram: Address
  systemProgram: Address
  rent: Address
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct([
  borsh.u64("rewardIndex"),
  borsh.u64("rewardDuration"),
  borshAddress("funder"),
])

export function initializeReward(
  args: InitializeRewardArgs,
  accounts: InitializeRewardAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    { address: accounts.rewardVault, role: 1 },
    { address: accounts.rewardMint, role: 0 },
    { address: accounts.admin.address, role: 3, signer: accounts.admin },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      rewardIndex: args.rewardIndex,
      rewardDuration: args.rewardDuration,
      funder: args.funder,
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
