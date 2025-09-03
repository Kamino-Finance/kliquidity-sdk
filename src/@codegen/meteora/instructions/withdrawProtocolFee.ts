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

export interface WithdrawProtocolFeeArgs {
  amountX: BN
  amountY: BN
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

export const layout = borsh.struct<WithdrawProtocolFeeArgs>([
  borsh.u64("amountX"),
  borsh.u64("amountY"),
])

export function withdrawProtocolFee(
  args: WithdrawProtocolFeeArgs,
  accounts: WithdrawProtocolFeeAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
  const identifier = Buffer.from([158, 201, 158, 189, 33, 93, 162, 103])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      amountX: args.amountX,
      amountY: args.amountY,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
