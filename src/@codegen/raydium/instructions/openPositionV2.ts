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
  77, 184, 74, 214, 112, 86, 241, 199,
])

export interface OpenPositionV2Args {
  tickLowerIndex: number
  tickUpperIndex: number
  tickArrayLowerStartIndex: number
  tickArrayUpperStartIndex: number
  liquidity: bigint
  amount0Max: bigint
  amount1Max: bigint
  withMatedata: boolean
  baseFlag: boolean | null
}

export interface OpenPositionV2Accounts {
  payer: TransactionSigner
  positionNftOwner: Address
  positionNftMint: TransactionSigner
  positionNftAccount: Address
  metadataAccount: Address
  poolState: Address
  protocolPosition: Address
  tickArrayLower: Address
  tickArrayUpper: Address
  personalPosition: Address
  tokenAccount0: Address
  tokenAccount1: Address
  tokenVault0: Address
  tokenVault1: Address
  rent: Address
  systemProgram: Address
  tokenProgram: Address
  associatedTokenProgram: Address
  metadataProgram: Address
  tokenProgram2022: Address
  vault0Mint: Address
  vault1Mint: Address
}

export const layout = borsh.struct([
  borsh.i32("tickLowerIndex"),
  borsh.i32("tickUpperIndex"),
  borsh.i32("tickArrayLowerStartIndex"),
  borsh.i32("tickArrayUpperStartIndex"),
  borsh.u128("liquidity"),
  borsh.u64("amount0Max"),
  borsh.u64("amount1Max"),
  borsh.bool("withMatedata"),
  borsh.option(borsh.bool(), "baseFlag"),
])

export function openPositionV2(
  args: OpenPositionV2Args,
  accounts: OpenPositionV2Accounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.payer.address, role: 3, signer: accounts.payer },
    { address: accounts.positionNftOwner, role: 0 },
    {
      address: accounts.positionNftMint.address,
      role: 3,
      signer: accounts.positionNftMint,
    },
    { address: accounts.positionNftAccount, role: 1 },
    { address: accounts.metadataAccount, role: 1 },
    { address: accounts.poolState, role: 1 },
    { address: accounts.protocolPosition, role: 1 },
    { address: accounts.tickArrayLower, role: 1 },
    { address: accounts.tickArrayUpper, role: 1 },
    { address: accounts.personalPosition, role: 1 },
    { address: accounts.tokenAccount0, role: 1 },
    { address: accounts.tokenAccount1, role: 1 },
    { address: accounts.tokenVault0, role: 1 },
    { address: accounts.tokenVault1, role: 1 },
    { address: accounts.rent, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.associatedTokenProgram, role: 0 },
    { address: accounts.metadataProgram, role: 0 },
    { address: accounts.tokenProgram2022, role: 0 },
    { address: accounts.vault0Mint, role: 0 },
    { address: accounts.vault1Mint, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      tickLowerIndex: args.tickLowerIndex,
      tickUpperIndex: args.tickUpperIndex,
      tickArrayLowerStartIndex: args.tickArrayLowerStartIndex,
      tickArrayUpperStartIndex: args.tickArrayUpperStartIndex,
      liquidity: args.liquidity,
      amount0Max: args.amount0Max,
      amount1Max: args.amount1Max,
      withMatedata: args.withMatedata,
      baseFlag: args.baseFlag,
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
