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

export const layout = borsh.struct([
  types.InitializeRewardParam.layout("param"),
])

export function initializeReward(
  args: InitializeRewardArgs,
  accounts: InitializeRewardAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
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
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      param: types.InitializeRewardParam.toEncodable(args.param),
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
