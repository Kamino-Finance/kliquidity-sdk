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
  248, 198, 158, 145, 225, 117, 135, 200,
])

export interface SwapArgs {
  amount: bigint
  otherAmountThreshold: bigint
  sqrtPriceLimitX64: bigint
  isBaseInput: boolean
}

export interface SwapAccounts {
  payer: TransactionSigner
  ammConfig: Address
  poolState: Address
  inputTokenAccount: Address
  outputTokenAccount: Address
  inputVault: Address
  outputVault: Address
  observationState: Address
  tokenProgram: Address
  tickArray: Address
}

export const layout = borsh.struct([
  borsh.u64("amount"),
  borsh.u64("otherAmountThreshold"),
  borsh.u128("sqrtPriceLimitX64"),
  borsh.bool("isBaseInput"),
])

export function swap(
  args: SwapArgs,
  accounts: SwapAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.payer.address, role: 2, signer: accounts.payer },
    { address: accounts.ammConfig, role: 0 },
    { address: accounts.poolState, role: 1 },
    { address: accounts.inputTokenAccount, role: 1 },
    { address: accounts.outputTokenAccount, role: 1 },
    { address: accounts.inputVault, role: 1 },
    { address: accounts.outputVault, role: 1 },
    { address: accounts.observationState, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tickArray, role: 1 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      amount: args.amount,
      otherAmountThreshold: args.otherAmountThreshold,
      sqrtPriceLimitX64: args.sqrtPriceLimitX64,
      isBaseInput: args.isBaseInput,
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
