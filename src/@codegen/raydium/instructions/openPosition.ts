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

export interface OpenPositionArgs {
  tickLowerIndex: number
  tickUpperIndex: number
  tickArrayLowerStartIndex: number
  tickArrayUpperStartIndex: number
  liquidity: BN
  amount0Max: BN
  amount1Max: BN
}

export interface OpenPositionAccounts {
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
}

export const layout = borsh.struct<OpenPositionArgs>([
  borsh.i32("tickLowerIndex"),
  borsh.i32("tickUpperIndex"),
  borsh.i32("tickArrayLowerStartIndex"),
  borsh.i32("tickArrayUpperStartIndex"),
  borsh.u128("liquidity"),
  borsh.u64("amount0Max"),
  borsh.u64("amount1Max"),
])

export function openPosition(
  args: OpenPositionArgs,
  accounts: OpenPositionAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([135, 128, 47, 77, 15, 152, 240, 49])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      tickLowerIndex: args.tickLowerIndex,
      tickUpperIndex: args.tickUpperIndex,
      tickArrayLowerStartIndex: args.tickArrayLowerStartIndex,
      tickArrayUpperStartIndex: args.tickArrayUpperStartIndex,
      liquidity: args.liquidity,
      amount0Max: args.amount0Max,
      amount1Max: args.amount1Max,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
