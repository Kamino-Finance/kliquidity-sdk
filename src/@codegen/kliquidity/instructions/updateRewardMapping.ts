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

export const DISCRIMINATOR = new Uint8Array([203, 37, 37, 96, 23, 85, 233, 42])

export interface UpdateRewardMappingArgs {
  rewardIndex: number
  collateralToken: number
}

export interface UpdateRewardMappingAccounts {
  payer: TransactionSigner
  strategy: Address
  globalConfig: Address
  pool: Address
  rewardMint: Address
  rewardVault: TransactionSigner
  baseVaultAuthority: Address
  tokenInfos: Address
  systemProgram: Address
  rent: Address
  tokenProgram: Address
}

export const layout = borsh.struct([
  borsh.u8("rewardIndex"),
  borsh.u8("collateralToken"),
])

export function updateRewardMapping(
  args: UpdateRewardMappingArgs,
  accounts: UpdateRewardMappingAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.payer.address, role: 3, signer: accounts.payer },
    { address: accounts.strategy, role: 1 },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.pool, role: 0 },
    { address: accounts.rewardMint, role: 0 },
    {
      address: accounts.rewardVault.address,
      role: 3,
      signer: accounts.rewardVault,
    },
    { address: accounts.baseVaultAuthority, role: 1 },
    { address: accounts.tokenInfos, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      rewardIndex: args.rewardIndex,
      collateralToken: args.collateralToken,
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
