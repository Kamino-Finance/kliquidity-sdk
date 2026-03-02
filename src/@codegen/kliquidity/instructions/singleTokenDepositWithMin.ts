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
  250, 142, 102, 160, 72, 12, 83, 139,
])

export interface SingleTokenDepositWithMinArgs {
  tokenAMinPostDepositBalance: bigint
  tokenBMinPostDepositBalance: bigint
}

export interface SingleTokenDepositWithMinAccounts {
  user: TransactionSigner
  strategy: Address
  globalConfig: Address
  pool: Address
  position: Address
  tickArrayLower: Address
  tickArrayUpper: Address
  tokenAVault: Address
  tokenBVault: Address
  baseVaultAuthority: Address
  tokenAAta: Address
  tokenBAta: Address
  tokenAMint: Address
  tokenBMint: Address
  userSharesAta: Address
  sharesMint: Address
  sharesMintAuthority: Address
  scopePrices: Address
  tokenInfos: Address
  tokenProgram: Address
  tokenATokenProgram: Address
  tokenBTokenProgram: Address
  instructionSysvarAccount: Address
}

export const layout = borsh.struct([
  borsh.u64("tokenAMinPostDepositBalance"),
  borsh.u64("tokenBMinPostDepositBalance"),
])

export function singleTokenDepositWithMin(
  args: SingleTokenDepositWithMinArgs,
  accounts: SingleTokenDepositWithMinAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.user.address, role: 3, signer: accounts.user },
    { address: accounts.strategy, role: 1 },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.pool, role: 0 },
    { address: accounts.position, role: 0 },
    { address: accounts.tickArrayLower, role: 0 },
    { address: accounts.tickArrayUpper, role: 0 },
    { address: accounts.tokenAVault, role: 1 },
    { address: accounts.tokenBVault, role: 1 },
    { address: accounts.baseVaultAuthority, role: 0 },
    { address: accounts.tokenAAta, role: 1 },
    { address: accounts.tokenBAta, role: 1 },
    { address: accounts.tokenAMint, role: 0 },
    { address: accounts.tokenBMint, role: 0 },
    { address: accounts.userSharesAta, role: 1 },
    { address: accounts.sharesMint, role: 1 },
    { address: accounts.sharesMintAuthority, role: 0 },
    { address: accounts.scopePrices, role: 0 },
    { address: accounts.tokenInfos, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenATokenProgram, role: 0 },
    { address: accounts.tokenBTokenProgram, role: 0 },
    { address: accounts.instructionSysvarAccount, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      tokenAMinPostDepositBalance: args.tokenAMinPostDepositBalance,
      tokenBMinPostDepositBalance: args.tokenBMinPostDepositBalance,
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
