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

export interface InitializeConfigArgs {
  feeAuthority: Address
  collectProtocolFeesAuthority: Address
  rewardEmissionsSuperAuthority: Address
  defaultProtocolFeeRate: number
}

export interface InitializeConfigAccounts {
  config: TransactionSigner
  funder: TransactionSigner
  systemProgram: Address
}

export const layout = borsh.struct<InitializeConfigArgs>([
  borshAddress("feeAuthority"),
  borshAddress("collectProtocolFeesAuthority"),
  borshAddress("rewardEmissionsSuperAuthority"),
  borsh.u16("defaultProtocolFeeRate"),
])

export function initializeConfig(
  args: InitializeConfigArgs,
  accounts: InitializeConfigAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.config.address, role: 3, signer: accounts.config },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([208, 127, 21, 1, 194, 190, 196, 70])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      feeAuthority: args.feeAuthority,
      collectProtocolFeesAuthority: args.collectProtocolFeesAuthority,
      rewardEmissionsSuperAuthority: args.rewardEmissionsSuperAuthority,
      defaultProtocolFeeRate: args.defaultProtocolFeeRate,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
