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

export interface CreatePoolArgs {
  sqrtPriceX64: BN
  openTime: BN
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

export const layout = borsh.struct<CreatePoolArgs>([
  borsh.u128("sqrtPriceX64"),
  borsh.u64("openTime"),
])

export function createPool(
  args: CreatePoolArgs,
  accounts: CreatePoolAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
  const identifier = Buffer.from([233, 146, 209, 142, 207, 104, 64, 188])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      sqrtPriceX64: args.sqrtPriceX64,
      openTime: args.openTime,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
