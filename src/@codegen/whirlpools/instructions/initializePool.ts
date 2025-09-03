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

export interface InitializePoolArgs {
  bumps: types.WhirlpoolBumpsFields
  tickSpacing: number
  initialSqrtPrice: BN
}

export interface InitializePoolAccounts {
  whirlpoolsConfig: Address
  tokenMintA: Address
  tokenMintB: Address
  funder: TransactionSigner
  whirlpool: Address
  tokenVaultA: TransactionSigner
  tokenVaultB: TransactionSigner
  feeTier: Address
  tokenProgram: Address
  systemProgram: Address
  rent: Address
}

export const layout = borsh.struct<InitializePoolArgs>([
  types.WhirlpoolBumps.layout("bumps"),
  borsh.u16("tickSpacing"),
  borsh.u128("initialSqrtPrice"),
])

export function initializePool(
  args: InitializePoolArgs,
  accounts: InitializePoolAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.tokenMintA, role: 0 },
    { address: accounts.tokenMintB, role: 0 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.whirlpool, role: 1 },
    {
      address: accounts.tokenVaultA.address,
      role: 3,
      signer: accounts.tokenVaultA,
    },
    {
      address: accounts.tokenVaultB.address,
      role: 3,
      signer: accounts.tokenVaultB,
    },
    { address: accounts.feeTier, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([95, 180, 10, 172, 84, 174, 232, 40])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      bumps: types.WhirlpoolBumps.toEncodable(args.bumps),
      tickSpacing: args.tickSpacing,
      initialSqrtPrice: args.initialSqrtPrice,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
