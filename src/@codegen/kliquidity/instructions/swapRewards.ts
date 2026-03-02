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

export const DISCRIMINATOR = new Uint8Array([92, 41, 172, 30, 190, 65, 174, 90])

export interface SwapRewardsArgs {
  tokenAIn: bigint
  tokenBIn: bigint
  rewardIndex: bigint
  rewardCollateralId: bigint
  minCollateralTokenOut: bigint
}

export interface SwapRewardsAccounts {
  user: TransactionSigner
  strategy: Address
  globalConfig: Address
  pool: Address
  tokenAVault: Address
  tokenBVault: Address
  rewardVault: Address
  baseVaultAuthority: Address
  treasuryFeeTokenAVault: Address
  treasuryFeeTokenBVault: Address
  treasuryFeeVaultAuthority: Address
  tokenAMint: Address
  tokenBMint: Address
  rewardMint: Address
  userTokenAAta: Address
  userTokenBAta: Address
  userRewardTokenAccount: Address
  scopePrices: Address
  tokenInfos: Address
  systemProgram: Address
  tokenATokenProgram: Address
  tokenBTokenProgram: Address
  rewardTokenProgram: Address
  instructionSysvarAccount: Address
}

export const layout = borsh.struct([
  borsh.u64("tokenAIn"),
  borsh.u64("tokenBIn"),
  borsh.u64("rewardIndex"),
  borsh.u64("rewardCollateralId"),
  borsh.u64("minCollateralTokenOut"),
])

export function swapRewards(
  args: SwapRewardsArgs,
  accounts: SwapRewardsAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.user.address, role: 3, signer: accounts.user },
    { address: accounts.strategy, role: 1 },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.pool, role: 0 },
    { address: accounts.tokenAVault, role: 1 },
    { address: accounts.tokenBVault, role: 1 },
    { address: accounts.rewardVault, role: 1 },
    { address: accounts.baseVaultAuthority, role: 1 },
    { address: accounts.treasuryFeeTokenAVault, role: 1 },
    { address: accounts.treasuryFeeTokenBVault, role: 1 },
    { address: accounts.treasuryFeeVaultAuthority, role: 0 },
    { address: accounts.tokenAMint, role: 0 },
    { address: accounts.tokenBMint, role: 0 },
    { address: accounts.rewardMint, role: 0 },
    { address: accounts.userTokenAAta, role: 1 },
    { address: accounts.userTokenBAta, role: 1 },
    { address: accounts.userRewardTokenAccount, role: 1 },
    { address: accounts.scopePrices, role: 0 },
    { address: accounts.tokenInfos, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.tokenATokenProgram, role: 0 },
    { address: accounts.tokenBTokenProgram, role: 0 },
    { address: accounts.rewardTokenProgram, role: 0 },
    { address: accounts.instructionSysvarAccount, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      tokenAIn: args.tokenAIn,
      tokenBIn: args.tokenBIn,
      rewardIndex: args.rewardIndex,
      rewardCollateralId: args.rewardCollateralId,
      minCollateralTokenOut: args.minCollateralTokenOut,
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
