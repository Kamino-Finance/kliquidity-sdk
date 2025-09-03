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

export const layout = borsh.struct<CollectRemainingRewardsArgs>([
  borsh.u8("rewardIndex"),
])

export function collectRemainingRewards(
  args: CollectRemainingRewardsArgs,
  accounts: CollectRemainingRewardsAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
  const identifier = Buffer.from([18, 237, 166, 197, 34, 16, 213, 144])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      rewardIndex: args.rewardIndex,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
