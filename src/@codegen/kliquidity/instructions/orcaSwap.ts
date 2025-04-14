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

export interface OrcaSwapArgs {
  amount: BN
  otherAmountThreshold: BN
  sqrtPriceLimit: BN
  amountSpecifiedIsInput: boolean
  aToB: boolean
}

export interface OrcaSwapAccounts {
  funder: TransactionSigner
  tokenATokenProgram: Address
  tokenBTokenProgram: Address
  memoProgram: Address
  tokenAuthority: Address
  whirlpool: Address
  tokenOwnerAccountA: Address
  tokenVaultA: Address
  tokenOwnerAccountB: Address
  tokenVaultB: Address
  tokenMintA: Address
  tokenMintB: Address
  tickArray0: Address
  tickArray1: Address
  tickArray2: Address
  oracle: Address
  whirlpoolProgram: Address
}

export const layout = borsh.struct([
  borsh.u64("amount"),
  borsh.u64("otherAmountThreshold"),
  borsh.u128("sqrtPriceLimit"),
  borsh.bool("amountSpecifiedIsInput"),
  borsh.bool("aToB"),
])

export function orcaSwap(
  args: OrcaSwapArgs,
  accounts: OrcaSwapAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.tokenATokenProgram, role: 0 },
    { address: accounts.tokenBTokenProgram, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    { address: accounts.tokenAuthority, role: 0 },
    { address: accounts.whirlpool, role: 0 },
    { address: accounts.tokenOwnerAccountA, role: 0 },
    { address: accounts.tokenVaultA, role: 0 },
    { address: accounts.tokenOwnerAccountB, role: 0 },
    { address: accounts.tokenVaultB, role: 0 },
    { address: accounts.tokenMintA, role: 0 },
    { address: accounts.tokenMintB, role: 0 },
    { address: accounts.tickArray0, role: 0 },
    { address: accounts.tickArray1, role: 0 },
    { address: accounts.tickArray2, role: 0 },
    { address: accounts.oracle, role: 0 },
    { address: accounts.whirlpoolProgram, role: 0 },
  ]
  const identifier = Buffer.from([33, 94, 249, 97, 250, 254, 198, 93])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      amount: args.amount,
      otherAmountThreshold: args.otherAmountThreshold,
      sqrtPriceLimit: args.sqrtPriceLimit,
      amountSpecifiedIsInput: args.amountSpecifiedIsInput,
      aToB: args.aToB,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
