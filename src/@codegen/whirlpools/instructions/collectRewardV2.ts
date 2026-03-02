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
  177, 107, 37, 180, 160, 19, 49, 209,
])

export interface CollectRewardV2Args {
  rewardIndex: number
  remainingAccountsInfo: types.RemainingAccountsInfoFields | null
}

export interface CollectRewardV2Accounts {
  whirlpool: Address
  positionAuthority: TransactionSigner
  position: Address
  positionTokenAccount: Address
  rewardOwnerAccount: Address
  rewardMint: Address
  rewardVault: Address
  rewardTokenProgram: Address
  memoProgram: Address
}

export const layout = borsh.struct([
  borsh.u8("rewardIndex"),
  borsh.option(types.RemainingAccountsInfo.layout(), "remainingAccountsInfo"),
])

export function collectRewardV2(
  args: CollectRewardV2Args,
  accounts: CollectRewardV2Accounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.whirlpool, role: 0 },
    {
      address: accounts.positionAuthority.address,
      role: 2,
      signer: accounts.positionAuthority,
    },
    { address: accounts.position, role: 1 },
    { address: accounts.positionTokenAccount, role: 0 },
    { address: accounts.rewardOwnerAccount, role: 1 },
    { address: accounts.rewardMint, role: 0 },
    { address: accounts.rewardVault, role: 1 },
    { address: accounts.rewardTokenProgram, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      rewardIndex: args.rewardIndex,
      remainingAccountsInfo:
        (args.remainingAccountsInfo &&
          types.RemainingAccountsInfo.toEncodable(
            args.remainingAccountsInfo
          )) ||
        null,
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
