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

export interface SetProtocolFeeRateArgs {
  protocolFeeRate: number
}

export interface SetProtocolFeeRateAccounts {
  whirlpoolsConfig: Address
  whirlpool: Address
  feeAuthority: TransactionSigner
}

export const layout = borsh.struct<SetProtocolFeeRateArgs>([
  borsh.u16("protocolFeeRate"),
])

export function setProtocolFeeRate(
  args: SetProtocolFeeRateArgs,
  accounts: SetProtocolFeeRateAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.whirlpool, role: 1 },
    {
      address: accounts.feeAuthority.address,
      role: 2,
      signer: accounts.feeAuthority,
    },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([95, 7, 4, 50, 154, 79, 156, 131])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      protocolFeeRate: args.protocolFeeRate,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
