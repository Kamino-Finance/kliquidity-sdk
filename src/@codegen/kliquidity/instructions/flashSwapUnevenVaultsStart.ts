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
  129, 111, 174, 12, 10, 60, 149, 193,
])

export interface FlashSwapUnevenVaultsStartArgs {
  amount: bigint
  aToB: boolean
}

export interface FlashSwapUnevenVaultsStartAccounts {
  swapper: TransactionSigner
  strategy: Address
  globalConfig: Address
  tokenAVault: Address
  tokenBVault: Address
  tokenAAta: Address
  tokenBAta: Address
  baseVaultAuthority: Address
  pool: Address
  position: Address
  scopePrices: Address
  tokenInfos: Address
  tickArrayLower: Address
  tickArrayUpper: Address
  tokenAMint: Address
  tokenBMint: Address
  tokenATokenProgram: Address
  tokenBTokenProgram: Address
  instructionSysvarAccount: Address
  consensusAccount: Address
}

export const layout = borsh.struct([borsh.u64("amount"), borsh.bool("aToB")])

/**
 * Start of a Flash swap uneven vaults.
 *
 * This needs to be the first instruction of the transaction or preceded only by a
 * ComputeBudget.
 *
 * This ix has to be paired with a `flash_swap_uneven_vaults_end` (`FlashSwapUnevenVaultsEnd`)
 * as the last instruction of the transaction. No other instruction targeted the program is
 * allowed.
 * The instructions between the start and end instructions are expected to perform the swap.
 */
export function flashSwapUnevenVaultsStart(
  args: FlashSwapUnevenVaultsStartArgs,
  accounts: FlashSwapUnevenVaultsStartAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.swapper.address, role: 3, signer: accounts.swapper },
    { address: accounts.strategy, role: 1 },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.tokenAVault, role: 1 },
    { address: accounts.tokenBVault, role: 1 },
    { address: accounts.tokenAAta, role: 1 },
    { address: accounts.tokenBAta, role: 1 },
    { address: accounts.baseVaultAuthority, role: 1 },
    { address: accounts.pool, role: 1 },
    { address: accounts.position, role: 1 },
    { address: accounts.scopePrices, role: 0 },
    { address: accounts.tokenInfos, role: 0 },
    { address: accounts.tickArrayLower, role: 0 },
    { address: accounts.tickArrayUpper, role: 0 },
    { address: accounts.tokenAMint, role: 0 },
    { address: accounts.tokenBMint, role: 0 },
    { address: accounts.tokenATokenProgram, role: 0 },
    { address: accounts.tokenBTokenProgram, role: 0 },
    { address: accounts.instructionSysvarAccount, role: 0 },
    { address: accounts.consensusAccount, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      amount: args.amount,
      aToB: args.aToB,
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
