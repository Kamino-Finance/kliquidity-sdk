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
  69, 125, 115, 218, 245, 186, 242, 196,
])

export interface SwapRouterBaseInArgs {
  amountIn: bigint
  amountOutMinimum: bigint
}

export interface SwapRouterBaseInAccounts {
  payer: TransactionSigner
  inputTokenAccount: Address
  inputTokenMint: Address
  tokenProgram: Address
  tokenProgram2022: Address
  memoProgram: Address
}

export const layout = borsh.struct([
  borsh.u64("amountIn"),
  borsh.u64("amountOutMinimum"),
])

export function swapRouterBaseIn(
  args: SwapRouterBaseInArgs,
  accounts: SwapRouterBaseInAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.payer.address, role: 2, signer: accounts.payer },
    { address: accounts.inputTokenAccount, role: 1 },
    { address: accounts.inputTokenMint, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenProgram2022, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      amountIn: args.amountIn,
      amountOutMinimum: args.amountOutMinimum,
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
