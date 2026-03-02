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
  195, 96, 237, 108, 68, 162, 219, 230,
])

export interface TwoHopSwapArgs {
  amount: bigint
  otherAmountThreshold: bigint
  amountSpecifiedIsInput: boolean
  aToBOne: boolean
  aToBTwo: boolean
  sqrtPriceLimitOne: bigint
  sqrtPriceLimitTwo: bigint
}

export interface TwoHopSwapAccounts {
  tokenProgram: Address
  tokenAuthority: TransactionSigner
  whirlpoolOne: Address
  whirlpoolTwo: Address
  tokenOwnerAccountOneA: Address
  tokenVaultOneA: Address
  tokenOwnerAccountOneB: Address
  tokenVaultOneB: Address
  tokenOwnerAccountTwoA: Address
  tokenVaultTwoA: Address
  tokenOwnerAccountTwoB: Address
  tokenVaultTwoB: Address
  tickArrayOne0: Address
  tickArrayOne1: Address
  tickArrayOne2: Address
  tickArrayTwo0: Address
  tickArrayTwo1: Address
  tickArrayTwo2: Address
  oracleOne: Address
  oracleTwo: Address
}

export const layout = borsh.struct([
  borsh.u64("amount"),
  borsh.u64("otherAmountThreshold"),
  borsh.bool("amountSpecifiedIsInput"),
  borsh.bool("aToBOne"),
  borsh.bool("aToBTwo"),
  borsh.u128("sqrtPriceLimitOne"),
  borsh.u128("sqrtPriceLimitTwo"),
])

export function twoHopSwap(
  args: TwoHopSwapArgs,
  accounts: TwoHopSwapAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.tokenProgram, role: 0 },
    {
      address: accounts.tokenAuthority.address,
      role: 2,
      signer: accounts.tokenAuthority,
    },
    { address: accounts.whirlpoolOne, role: 1 },
    { address: accounts.whirlpoolTwo, role: 1 },
    { address: accounts.tokenOwnerAccountOneA, role: 1 },
    { address: accounts.tokenVaultOneA, role: 1 },
    { address: accounts.tokenOwnerAccountOneB, role: 1 },
    { address: accounts.tokenVaultOneB, role: 1 },
    { address: accounts.tokenOwnerAccountTwoA, role: 1 },
    { address: accounts.tokenVaultTwoA, role: 1 },
    { address: accounts.tokenOwnerAccountTwoB, role: 1 },
    { address: accounts.tokenVaultTwoB, role: 1 },
    { address: accounts.tickArrayOne0, role: 1 },
    { address: accounts.tickArrayOne1, role: 1 },
    { address: accounts.tickArrayOne2, role: 1 },
    { address: accounts.tickArrayTwo0, role: 1 },
    { address: accounts.tickArrayTwo1, role: 1 },
    { address: accounts.tickArrayTwo2, role: 1 },
    { address: accounts.oracleOne, role: 0 },
    { address: accounts.oracleTwo, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      amount: args.amount,
      otherAmountThreshold: args.otherAmountThreshold,
      amountSpecifiedIsInput: args.amountSpecifiedIsInput,
      aToBOne: args.aToBOne,
      aToBTwo: args.aToBTwo,
      sqrtPriceLimitOne: args.sqrtPriceLimitOne,
      sqrtPriceLimitTwo: args.sqrtPriceLimitTwo,
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
