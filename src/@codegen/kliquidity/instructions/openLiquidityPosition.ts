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

export interface OpenLiquidityPositionArgs {
  tickLowerIndex: BN
  tickUpperIndex: BN
  bump: number
}

export interface OpenLiquidityPositionAccounts {
  adminAuthority: TransactionSigner
  strategy: Address
  globalConfig: Address
  pool: Address
  tickArrayLower: Address
  tickArrayUpper: Address
  baseVaultAuthority: Address
  position: Address
  positionMint: Address
  positionMetadataAccount: Address
  positionTokenAccount: Address
  rent: Address
  system: Address
  tokenProgram: Address
  tokenProgram2022: Address
  tokenATokenProgram: Address
  tokenBTokenProgram: Address
  memoProgram: Address
  associatedTokenProgram: Address
  poolProgram: Address
  oldTickArrayLowerOrBaseVaultAuthority: Address
  oldTickArrayUpperOrBaseVaultAuthority: Address
  oldPositionOrBaseVaultAuthority: Address
  oldPositionMintOrBaseVaultAuthority: Address
  oldPositionTokenAccountOrBaseVaultAuthority: Address
  tokenAVault: Address
  tokenBVault: Address
  tokenAMint: Address
  tokenBMint: Address
  poolTokenVaultA: Address
  poolTokenVaultB: Address
  scopePrices: Address
  tokenInfos: Address
  eventAuthority: Option<Address>
  consensusAccount: Address
}

export const layout = borsh.struct<OpenLiquidityPositionArgs>([
  borsh.i64("tickLowerIndex"),
  borsh.i64("tickUpperIndex"),
  borsh.u8("bump"),
])

export function openLiquidityPosition(
  args: OpenLiquidityPositionArgs,
  accounts: OpenLiquidityPositionAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 3,
      signer: accounts.adminAuthority,
    },
    { address: accounts.strategy, role: 1 },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.pool, role: 1 },
    { address: accounts.tickArrayLower, role: 1 },
    { address: accounts.tickArrayUpper, role: 1 },
    { address: accounts.baseVaultAuthority, role: 1 },
    { address: accounts.position, role: 1 },
    { address: accounts.positionMint, role: 1 },
    { address: accounts.positionMetadataAccount, role: 1 },
    { address: accounts.positionTokenAccount, role: 1 },
    { address: accounts.rent, role: 0 },
    { address: accounts.system, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.tokenProgram2022, role: 0 },
    { address: accounts.tokenATokenProgram, role: 0 },
    { address: accounts.tokenBTokenProgram, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    { address: accounts.associatedTokenProgram, role: 0 },
    { address: accounts.poolProgram, role: 0 },
    { address: accounts.oldTickArrayLowerOrBaseVaultAuthority, role: 1 },
    { address: accounts.oldTickArrayUpperOrBaseVaultAuthority, role: 1 },
    { address: accounts.oldPositionOrBaseVaultAuthority, role: 1 },
    { address: accounts.oldPositionMintOrBaseVaultAuthority, role: 1 },
    { address: accounts.oldPositionTokenAccountOrBaseVaultAuthority, role: 1 },
    { address: accounts.tokenAVault, role: 1 },
    { address: accounts.tokenBVault, role: 1 },
    { address: accounts.tokenAMint, role: 0 },
    { address: accounts.tokenBMint, role: 0 },
    { address: accounts.poolTokenVaultA, role: 1 },
    { address: accounts.poolTokenVaultB, role: 1 },
    { address: accounts.scopePrices, role: 0 },
    { address: accounts.tokenInfos, role: 0 },
    isSome(accounts.eventAuthority)
      ? { address: accounts.eventAuthority.value, role: 0 }
      : { address: programAddress, role: 0 },
    { address: accounts.consensusAccount, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([204, 234, 204, 219, 6, 91, 96, 241])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      tickLowerIndex: args.tickLowerIndex,
      tickUpperIndex: args.tickUpperIndex,
      bump: args.bump,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
