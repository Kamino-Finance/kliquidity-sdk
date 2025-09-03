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

export interface SetDefaultProtocolFeeRateArgs {
  defaultProtocolFeeRate: number
}

export interface SetDefaultProtocolFeeRateAccounts {
  whirlpoolsConfig: Address
  feeAuthority: TransactionSigner
}

export const layout = borsh.struct<SetDefaultProtocolFeeRateArgs>([
  borsh.u16("defaultProtocolFeeRate"),
])

export function setDefaultProtocolFeeRate(
  args: SetDefaultProtocolFeeRateArgs,
  accounts: SetDefaultProtocolFeeRateAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 1 },
    {
      address: accounts.feeAuthority.address,
      role: 2,
      signer: accounts.feeAuthority,
    },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([107, 205, 249, 226, 151, 35, 86, 0])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      defaultProtocolFeeRate: args.defaultProtocolFeeRate,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
