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

export interface InitializeRewardArgs {
  param: types.InitializeRewardParamFields
}

export interface InitializeRewardAccounts {
  rewardFunder: TransactionSigner
  funderTokenAccount: Address
  ammConfig: Address
  poolState: Address
  operationState: Address
  rewardTokenMint: Address
  rewardTokenVault: Address
  rewardTokenProgram: Address
  systemProgram: Address
  rent: Address
}

export const layout = borsh.struct<InitializeRewardArgs>([
  types.InitializeRewardParam.layout("param"),
])

export function initializeReward(
  args: InitializeRewardArgs,
  accounts: InitializeRewardAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.rewardFunder.address,
      role: 3,
      signer: accounts.rewardFunder,
    },
    { address: accounts.funderTokenAccount, role: 1 },
    { address: accounts.ammConfig, role: 0 },
    { address: accounts.poolState, role: 1 },
    { address: accounts.operationState, role: 0 },
    { address: accounts.rewardTokenMint, role: 0 },
    { address: accounts.rewardTokenVault, role: 1 },
    { address: accounts.rewardTokenProgram, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([95, 135, 192, 196, 242, 129, 230, 68])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      param: types.InitializeRewardParam.toEncodable(args.param),
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
