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

export interface DecreaseLiquidityV2Args {
  liquidity: BN
  amount0Min: BN
  amount1Min: BN
}

export interface DecreaseLiquidityV2Accounts {
  nftOwner: TransactionSigner
  nftAccount: Address
  personalPosition: Address
  poolState: Address
  protocolPosition: Address
  tokenVault0: Address
  tokenVault1: Address
  tickArrayLower: Address
  tickArrayUpper: Address
  recipientTokenAccount0: Address
  recipientTokenAccount1: Address
  tokenProgram: Address
  tokenProgram2022: Address
  memoProgram: Address
  vault0Mint: Address
  vault1Mint: Address
}

export const layout = borsh.struct<DecreaseLiquidityV2Args>([
  borsh.u128("liquidity"),
  borsh.u64("amount0Min"),
  borsh.u64("amount1Min"),
])

export function decreaseLiquidityV2(
  args: DecreaseLiquidityV2Args,
  accounts: DecreaseLiquidityV2Accounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.nftOwner.address, role: 2, signer: accounts.nftOwner },
    { address: accounts.nftAccount, role: 0 },
    { address: accounts.personalPosition, role: 1 },
    { address: accounts.poolState, role: 1 },
    { address: accounts.protocolPosition, role: 1 },
    { address: accounts.tokenVault0, role: 1 },
    { address: accounts.tokenVault1, role: 1 },
    { address: accounts.tickArrayLower, role: 1 },
    { address: accounts.tickArrayUpper, role: 1 },
    { address: accounts.recipientTokenAccount0, role: 1 },
    { address: accounts.recipientTokenAccount1, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenProgram2022, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    { address: accounts.vault0Mint, role: 0 },
    { address: accounts.vault1Mint, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([58, 127, 188, 62, 79, 82, 196, 96])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      liquidity: args.liquidity,
      amount0Min: args.amount0Min,
      amount1Min: args.amount1Min,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
