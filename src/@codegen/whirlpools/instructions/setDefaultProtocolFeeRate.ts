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

export const layout = borsh.struct([borsh.u16("defaultProtocolFeeRate")])

/**
 * Sets the default protocol fee rate for a WhirlpoolConfig
 * Protocol fee rate is represented as a basis point.
 * Only the current fee authority has permission to invoke this instruction.
 *
 * ### Authority
 * - "fee_authority" - Set authority that can modify pool fees in the WhirlpoolConfig
 *
 * ### Parameters
 * - `default_protocol_fee_rate` - Rate that is referenced during the initialization of a Whirlpool using this config.
 *
 * #### Special Errors
 * - `ProtocolFeeRateMaxExceeded` - If the provided default_protocol_fee_rate exceeds MAX_PROTOCOL_FEE_RATE.
 */
export function setDefaultProtocolFeeRate(
  args: SetDefaultProtocolFeeRateArgs,
  accounts: SetDefaultProtocolFeeRateAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 1 },
    {
      address: accounts.feeAuthority.address,
      role: 2,
      signer: accounts.feeAuthority,
    },
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
