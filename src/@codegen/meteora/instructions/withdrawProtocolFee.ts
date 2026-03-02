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
  158, 201, 158, 189, 33, 93, 162, 103,
])

export interface WithdrawProtocolFeeArgs {
  amountX: bigint
  amountY: bigint
}

export interface WithdrawProtocolFeeAccounts {
  lbPair: Address
  reserveX: Address
  reserveY: Address
  tokenXMint: Address
  tokenYMint: Address
  receiverTokenX: Address
  receiverTokenY: Address
  tokenXProgram: Address
  tokenYProgram: Address
}

export const layout = borsh.struct([borsh.u64("amountX"), borsh.u64("amountY")])

export function withdrawProtocolFee(
  args: WithdrawProtocolFeeArgs,
  accounts: WithdrawProtocolFeeAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    { address: accounts.reserveX, role: 1 },
    { address: accounts.reserveY, role: 1 },
    { address: accounts.tokenXMint, role: 0 },
    { address: accounts.tokenYMint, role: 0 },
    { address: accounts.receiverTokenX, role: 1 },
    { address: accounts.receiverTokenY, role: 1 },
    { address: accounts.tokenXProgram, role: 0 },
    { address: accounts.tokenYProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      amountX: args.amountX,
      amountY: args.amountY,
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
