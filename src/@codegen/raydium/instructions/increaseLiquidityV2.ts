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
  133, 29, 89, 223, 69, 238, 176, 10,
])

export interface IncreaseLiquidityV2Args {
  liquidity: bigint
  amount0Max: bigint
  amount1Max: bigint
  baseFlag: boolean | null
}

export interface IncreaseLiquidityV2Accounts {
  nftOwner: TransactionSigner
  nftAccount: Address
  poolState: Address
  protocolPosition: Address
  personalPosition: Address
  tickArrayLower: Address
  tickArrayUpper: Address
  tokenAccount0: Address
  tokenAccount1: Address
  tokenVault0: Address
  tokenVault1: Address
  tokenProgram: Address
  tokenProgram2022: Address
  vault0Mint: Address
  vault1Mint: Address
}

export const layout = borsh.struct([
  borsh.u128("liquidity"),
  borsh.u64("amount0Max"),
  borsh.u64("amount1Max"),
  borsh.option(borsh.bool(), "baseFlag"),
])

export function increaseLiquidityV2(
  args: IncreaseLiquidityV2Args,
  accounts: IncreaseLiquidityV2Accounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.nftOwner.address, role: 2, signer: accounts.nftOwner },
    { address: accounts.nftAccount, role: 0 },
    { address: accounts.poolState, role: 1 },
    { address: accounts.protocolPosition, role: 1 },
    { address: accounts.personalPosition, role: 1 },
    { address: accounts.tickArrayLower, role: 1 },
    { address: accounts.tickArrayUpper, role: 1 },
    { address: accounts.tokenAccount0, role: 1 },
    { address: accounts.tokenAccount1, role: 1 },
    { address: accounts.tokenVault0, role: 1 },
    { address: accounts.tokenVault1, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenProgram2022, role: 0 },
    { address: accounts.vault0Mint, role: 0 },
    { address: accounts.vault1Mint, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      liquidity: args.liquidity,
      amount0Max: args.amount0Max,
      amount1Max: args.amount1Max,
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
