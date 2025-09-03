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

export interface SetDefaultFeeRateArgs {
  defaultFeeRate: number
}

export interface SetDefaultFeeRateAccounts {
  whirlpoolsConfig: Address
  feeTier: Address
  feeAuthority: TransactionSigner
}

export const layout = borsh.struct<SetDefaultFeeRateArgs>([
  borsh.u16("defaultFeeRate"),
])

export function setDefaultFeeRate(
  args: SetDefaultFeeRateArgs,
  accounts: SetDefaultFeeRateAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.feeTier, role: 1 },
    {
      address: accounts.feeAuthority.address,
      role: 2,
      signer: accounts.feeAuthority,
    },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([118, 215, 214, 157, 182, 229, 208, 228])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      defaultFeeRate: args.defaultFeeRate,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
