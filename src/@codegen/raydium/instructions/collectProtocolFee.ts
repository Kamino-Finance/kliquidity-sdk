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
  136, 136, 252, 221, 194, 66, 126, 89,
])

export interface CollectProtocolFeeArgs {
  amount0Requested: bigint
  amount1Requested: bigint
}

export interface CollectProtocolFeeAccounts {
  owner: TransactionSigner
  poolState: Address
  ammConfig: Address
  tokenVault0: Address
  tokenVault1: Address
  vault0Mint: Address
  vault1Mint: Address
  recipientTokenAccount0: Address
  recipientTokenAccount1: Address
  tokenProgram: Address
  tokenProgram2022: Address
}

export const layout = borsh.struct([
  borsh.u64("amount0Requested"),
  borsh.u64("amount1Requested"),
])

export function collectProtocolFee(
  args: CollectProtocolFeeArgs,
  accounts: CollectProtocolFeeAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.owner.address, role: 2, signer: accounts.owner },
    { address: accounts.poolState, role: 1 },
    { address: accounts.ammConfig, role: 0 },
    { address: accounts.tokenVault0, role: 1 },
    { address: accounts.tokenVault1, role: 1 },
    { address: accounts.vault0Mint, role: 0 },
    { address: accounts.vault1Mint, role: 0 },
    { address: accounts.recipientTokenAccount0, role: 1 },
    { address: accounts.recipientTokenAccount1, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenProgram2022, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      amount0Requested: args.amount0Requested,
      amount1Requested: args.amount1Requested,
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
