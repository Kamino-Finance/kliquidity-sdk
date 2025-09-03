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

export interface SwapArgs {
  amountIn: BN
  minAmountOut: BN
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

export const layout = borsh.struct<SwapArgs>([
  borsh.u64("amountIn"),
  borsh.u64("minAmountOut"),
])

export function swap(
  args: SwapArgs,
  accounts: SwapAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
  const identifier = Buffer.from([248, 198, 158, 145, 225, 117, 135, 200])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      amountIn: args.amountIn,
      minAmountOut: args.minAmountOut,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
