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
  135, 128, 47, 77, 15, 152, 240, 49,
])

export interface OpenPositionArgs {
  bumps: types.OpenPositionBumpsFields
  tickLowerIndex: number
  tickUpperIndex: number
}

export interface OpenPositionAccounts {
  funder: TransactionSigner
  owner: Address
  position: Address
  positionMint: TransactionSigner
  positionTokenAccount: Address
  whirlpool: Address
  tokenProgram: Address
  systemProgram: Address
  rent: Address
  associatedTokenProgram: Address
}

export const layout = borsh.struct([
  types.OpenPositionBumps.layout("bumps"),
  borsh.i32("tickLowerIndex"),
  borsh.i32("tickUpperIndex"),
])

export function openPosition(
  args: OpenPositionArgs,
  accounts: OpenPositionAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.owner, role: 0 },
    { address: accounts.position, role: 1 },
    {
      address: accounts.positionMint.address,
      role: 3,
      signer: accounts.positionMint,
    },
    { address: accounts.positionTokenAccount, role: 1 },
    { address: accounts.whirlpool, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.associatedTokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      bumps: types.OpenPositionBumps.toEncodable(args.bumps),
      tickLowerIndex: args.tickLowerIndex,
      tickUpperIndex: args.tickUpperIndex,
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
