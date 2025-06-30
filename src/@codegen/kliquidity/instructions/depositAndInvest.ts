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

export interface DepositAndInvestArgs {
  tokenMaxA: BN
  tokenMaxB: BN
}

export interface DepositAndInvestAccounts {
  user: TransactionSigner
  strategy: Address
  globalConfig: Address
  /** check that the pool is owned either by orca or by raydium */
  pool: Address
  position: Address
  raydiumProtocolPositionOrBaseVaultAuthority: Address
  positionTokenAccount: Address
  tokenAVault: Address
  tokenBVault: Address
  poolTokenVaultA: Address
  poolTokenVaultB: Address
  tickArrayLower: Address
  tickArrayUpper: Address
  baseVaultAuthority: Address
  tokenAAta: Address
  tokenBAta: Address
  tokenAMint: Address
  tokenBMint: Address
  userSharesAta: Address
  sharesMint: Address
  sharesMintAuthority: Address
  scopePricesA: Address
  scopePricesB: Address
  tokenInfos: Address
  tokenProgram: Address
  tokenProgram2022: Address
  tokenATokenProgram: Address
  tokenBTokenProgram: Address
  memoProgram: Address
  poolProgram: Address
  instructionSysvarAccount: Address
  eventAuthority: Option<Address>
}

export const layout = borsh.struct([
  borsh.u64("tokenMaxA"),
  borsh.u64("tokenMaxB"),
])

export function depositAndInvest(
  args: DepositAndInvestArgs,
  accounts: DepositAndInvestAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.user.address, role: 3, signer: accounts.user },
    { address: accounts.strategy, role: 1 },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.pool, role: 1 },
    { address: accounts.position, role: 1 },
    { address: accounts.raydiumProtocolPositionOrBaseVaultAuthority, role: 1 },
    { address: accounts.positionTokenAccount, role: 1 },
    { address: accounts.tokenAVault, role: 1 },
    { address: accounts.tokenBVault, role: 1 },
    { address: accounts.poolTokenVaultA, role: 1 },
    { address: accounts.poolTokenVaultB, role: 1 },
    { address: accounts.tickArrayLower, role: 1 },
    { address: accounts.tickArrayUpper, role: 1 },
    { address: accounts.baseVaultAuthority, role: 1 },
    { address: accounts.tokenAAta, role: 1 },
    { address: accounts.tokenBAta, role: 1 },
    { address: accounts.tokenAMint, role: 0 },
    { address: accounts.tokenBMint, role: 0 },
    { address: accounts.userSharesAta, role: 1 },
    { address: accounts.sharesMint, role: 1 },
    { address: accounts.sharesMintAuthority, role: 0 },
    { address: accounts.scopePricesA, role: 0 },
    { address: accounts.scopePricesB, role: 0 },
    { address: accounts.tokenInfos, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenProgram2022, role: 0 },
    { address: accounts.tokenATokenProgram, role: 0 },
    { address: accounts.tokenBTokenProgram, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    { address: accounts.poolProgram, role: 0 },
    { address: accounts.instructionSysvarAccount, role: 0 },
    isSome(accounts.eventAuthority)
      ? { address: accounts.eventAuthority.value, role: 0 }
      : { address: programAddress, role: 0 },
  ]
  const identifier = Buffer.from([22, 157, 173, 6, 187, 25, 86, 109])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      tokenMaxA: args.tokenMaxA,
      tokenMaxB: args.tokenMaxB,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
