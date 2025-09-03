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

export interface FundRewardArgs {
  rewardIndex: BN
  amount: BN
  carryForward: boolean
}

export interface FundRewardAccounts {
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

export const layout = borsh.struct<FundRewardArgs>([
  borsh.u64("rewardIndex"),
  borsh.u64("amount"),
  borsh.bool("carryForward"),
])

export function fundReward(
  args: FundRewardArgs,
  accounts: FundRewardAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
  const identifier = Buffer.from([188, 50, 249, 165, 93, 151, 38, 63])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      rewardIndex: args.rewardIndex,
      amount: args.amount,
      carryForward: args.carryForward,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
