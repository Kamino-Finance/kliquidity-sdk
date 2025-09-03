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

export interface SwapRouterBaseInArgs {
  amountIn: BN
  amountOutMinimum: BN
}

export interface SwapRouterBaseInAccounts {
  payer: TransactionSigner
  inputTokenAccount: Address
  inputTokenMint: Address
  tokenProgram: Address
  tokenProgram2022: Address
  memoProgram: Address
}

export const layout = borsh.struct<SwapRouterBaseInArgs>([
  borsh.u64("amountIn"),
  borsh.u64("amountOutMinimum"),
])

export function swapRouterBaseIn(
  args: SwapRouterBaseInArgs,
  accounts: SwapRouterBaseInAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.payer.address, role: 2, signer: accounts.payer },
    { address: accounts.inputTokenAccount, role: 1 },
    { address: accounts.inputTokenMint, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenProgram2022, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([69, 125, 115, 218, 245, 186, 242, 196])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      amountIn: args.amountIn,
      amountOutMinimum: args.amountOutMinimum,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
