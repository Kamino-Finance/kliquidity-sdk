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
  233, 146, 209, 142, 207, 104, 64, 188,
])

export interface CreatePoolArgs {
  sqrtPriceX64: bigint
  openTime: bigint
}

export interface CreatePoolAccounts {
  poolCreator: TransactionSigner
  ammConfig: Address
  poolState: Address
  tokenMint0: Address
  tokenMint1: Address
  tokenVault0: Address
  tokenVault1: Address
  observationState: Address
  tickArrayBitmap: Address
  tokenProgram0: Address
  tokenProgram1: Address
  systemProgram: Address
  rent: Address
}

export const layout = borsh.struct([
  borsh.u128("sqrtPriceX64"),
  borsh.u64("openTime"),
])

export function createPool(
  args: CreatePoolArgs,
  accounts: CreatePoolAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    {
      address: accounts.poolCreator.address,
      role: 3,
      signer: accounts.poolCreator,
    },
    { address: accounts.ammConfig, role: 0 },
    { address: accounts.poolState, role: 1 },
    { address: accounts.tokenMint0, role: 0 },
    { address: accounts.tokenMint1, role: 0 },
    { address: accounts.tokenVault0, role: 1 },
    { address: accounts.tokenVault1, role: 1 },
    { address: accounts.observationState, role: 1 },
    { address: accounts.tickArrayBitmap, role: 1 },
    { address: accounts.tokenProgram0, role: 0 },
    { address: accounts.tokenProgram1, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      sqrtPriceX64: args.sqrtPriceX64,
      openTime: args.openTime,
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
