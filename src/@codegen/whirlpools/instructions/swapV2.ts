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

export const DISCRIMINATOR = new Uint8Array([43, 4, 237, 11, 26, 201, 30, 98])

export interface SwapV2Args {
  amount: bigint
  otherAmountThreshold: bigint
  sqrtPriceLimit: bigint
  amountSpecifiedIsInput: boolean
  aToB: boolean
  remainingAccountsInfo: types.RemainingAccountsInfoFields | null
}

export interface SwapV2Accounts {
  tokenProgramA: Address
  tokenProgramB: Address
  memoProgram: Address
  tokenAuthority: TransactionSigner
  whirlpool: Address
  tokenMintA: Address
  tokenMintB: Address
  tokenOwnerAccountA: Address
  tokenVaultA: Address
  tokenOwnerAccountB: Address
  tokenVaultB: Address
  tickArray0: Address
  tickArray1: Address
  tickArray2: Address
  oracle: Address
}

export const layout = borsh.struct([
  borsh.u64("amount"),
  borsh.u64("otherAmountThreshold"),
  borsh.u128("sqrtPriceLimit"),
  borsh.bool("amountSpecifiedIsInput"),
  borsh.bool("aToB"),
  borsh.option(types.RemainingAccountsInfo.layout(), "remainingAccountsInfo"),
])

export function swapV2(
  args: SwapV2Args,
  accounts: SwapV2Accounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.tokenProgramA, role: 0 },
    { address: accounts.tokenProgramB, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    {
      address: accounts.tokenAuthority.address,
      role: 2,
      signer: accounts.tokenAuthority,
    },
    { address: accounts.whirlpool, role: 1 },
    { address: accounts.tokenMintA, role: 0 },
    { address: accounts.tokenMintB, role: 0 },
    { address: accounts.tokenOwnerAccountA, role: 1 },
    { address: accounts.tokenVaultA, role: 1 },
    { address: accounts.tokenOwnerAccountB, role: 1 },
    { address: accounts.tokenVaultB, role: 1 },
    { address: accounts.tickArray0, role: 1 },
    { address: accounts.tickArray1, role: 1 },
    { address: accounts.tickArray2, role: 1 },
    { address: accounts.oracle, role: 1 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      amount: args.amount,
      otherAmountThreshold: args.otherAmountThreshold,
      sqrtPriceLimit: args.sqrtPriceLimit,
      amountSpecifiedIsInput: args.amountSpecifiedIsInput,
      aToB: args.aToB,
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
