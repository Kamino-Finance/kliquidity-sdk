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

export interface SetDefaultBaseFeeRateArgs {
  defaultBaseFeeRate: number
}

export interface SetDefaultBaseFeeRateAccounts {
  whirlpoolsConfig: Address
  adaptiveFeeTier: Address
  feeAuthority: TransactionSigner
}

export const layout = borsh.struct([borsh.u16("defaultBaseFeeRate")])

/**
 * Set the default_base_fee_rate for an AdaptiveFeeTier
 * Only the current fee authority in WhirlpoolsConfig has permission to invoke this instruction.
 *
 * ### Authority
 * - "fee_authority" - Set authority in the WhirlpoolConfig
 *
 * ### Parameters
 * - `default_base_fee_rate` - The default base fee rate that a pool will use if the pool uses this
 * adaptive fee-tier during initialization.
 *
 * #### Special Errors
 * - `FeeRateMaxExceeded` - If the provided default_fee_rate exceeds MAX_FEE_RATE.
 */
export function setDefaultBaseFeeRate(
  args: SetDefaultBaseFeeRateArgs,
  accounts: SetDefaultBaseFeeRateAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.adaptiveFeeTier, role: 1 },
    {
      address: accounts.feeAuthority.address,
      role: 2,
      signer: accounts.feeAuthority,
    },
  ]
  const identifier = Buffer.from([229, 66, 84, 251, 164, 134, 183, 7])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      defaultBaseFeeRate: args.defaultBaseFeeRate,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
