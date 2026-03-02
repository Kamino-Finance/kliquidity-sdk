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
  amountIn: bigint
  minAmountOut: bigint
}

export interface SwapAccounts {
  lbPair: Address
  binArrayBitmapExtension: Option<Address>
  reserveX: Address
  reserveY: Address
  userTokenIn: Address
  userTokenOut: Address
  tokenXMint: Address
  tokenYMint: Address
  oracle: Address
  hostFeeIn: Option<Address>
  user: TransactionSigner
  tokenXProgram: Address
  tokenYProgram: Address
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct([
  borsh.u64("amountIn"),
  borsh.u64("minAmountOut"),
])

export function swap(
  args: SwapArgs,
  accounts: SwapAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.lbPair, role: 1 },
    isSome(accounts.binArrayBitmapExtension)
      ? { address: accounts.binArrayBitmapExtension.value, role: 0 }
      : { address: programAddress, role: 0 },
    { address: accounts.reserveX, role: 1 },
    { address: accounts.reserveY, role: 1 },
    { address: accounts.userTokenIn, role: 1 },
    { address: accounts.userTokenOut, role: 1 },
    { address: accounts.tokenXMint, role: 0 },
    { address: accounts.tokenYMint, role: 0 },
    { address: accounts.oracle, role: 1 },
    isSome(accounts.hostFeeIn)
      ? { address: accounts.hostFeeIn.value, role: 1 }
      : { address: programAddress, role: 0 },
    { address: accounts.user.address, role: 2, signer: accounts.user },
    { address: accounts.tokenXProgram, role: 0 },
    { address: accounts.tokenYProgram, role: 0 },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      amountIn: args.amountIn,
      minAmountOut: args.minAmountOut,
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
