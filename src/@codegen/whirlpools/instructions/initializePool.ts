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
  95, 180, 10, 172, 84, 174, 232, 40,
])

export interface InitializePoolArgs {
  bumps: types.WhirlpoolBumpsFields
  tickSpacing: number
  initialSqrtPrice: bigint
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

export const layout = borsh.struct([
  types.WhirlpoolBumps.layout("bumps"),
  borsh.u16("tickSpacing"),
  borsh.u128("initialSqrtPrice"),
])

export function initializePool(
  args: InitializePoolArgs,
  accounts: InitializePoolAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
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
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      bumps: types.WhirlpoolBumps.toEncodable(args.bumps),
      tickSpacing: args.tickSpacing,
      initialSqrtPrice: args.initialSqrtPrice,
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
