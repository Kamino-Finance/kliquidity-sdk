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
  159, 39, 110, 137, 100, 234, 204, 141,
])

export interface ExecutiveWithdrawArgs {
  action: number
}

export interface ExecutiveWithdrawAccounts {
  adminAuthority: TransactionSigner
  strategy: Address
  globalConfig: Address
  pool: Address
  position: Address
  raydiumProtocolPositionOrBaseVaultAuthority: Address
  positionTokenAccount: Address
  tickArrayLower: Address
  tickArrayUpper: Address
  tokenAVault: Address
  tokenBVault: Address
  baseVaultAuthority: Address
  poolTokenVaultA: Address
  poolTokenVaultB: Address
  tokenAMint: Address
  tokenBMint: Address
  scopePrices: Address
  tokenInfos: Address
  tokenATokenProgram: Address
  tokenBTokenProgram: Address
  memoProgram: Address
  tokenProgram: Address
  tokenProgram2022: Address
  poolProgram: Address
  eventAuthority: Option<Address>
}

export const layout = borsh.struct([borsh.u8("action")])

export function executiveWithdraw(
  args: ExecutiveWithdrawArgs,
  accounts: ExecutiveWithdrawAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 3,
      signer: accounts.adminAuthority,
    },
    { address: accounts.strategy, role: 1 },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.pool, role: 1 },
    { address: accounts.position, role: 1 },
    { address: accounts.raydiumProtocolPositionOrBaseVaultAuthority, role: 1 },
    { address: accounts.positionTokenAccount, role: 0 },
    { address: accounts.tickArrayLower, role: 1 },
    { address: accounts.tickArrayUpper, role: 1 },
    { address: accounts.tokenAVault, role: 1 },
    { address: accounts.tokenBVault, role: 1 },
    { address: accounts.baseVaultAuthority, role: 0 },
    { address: accounts.poolTokenVaultA, role: 1 },
    { address: accounts.poolTokenVaultB, role: 1 },
    { address: accounts.tokenAMint, role: 0 },
    { address: accounts.tokenBMint, role: 0 },
    { address: accounts.scopePrices, role: 0 },
    { address: accounts.tokenInfos, role: 0 },
    { address: accounts.tokenATokenProgram, role: 0 },
    { address: accounts.tokenBTokenProgram, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenProgram2022, role: 0 },
    { address: accounts.poolProgram, role: 0 },
    isSome(accounts.eventAuthority)
      ? { address: accounts.eventAuthority.value, role: 0 }
      : { address: programAddress, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      action: args.action,
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
