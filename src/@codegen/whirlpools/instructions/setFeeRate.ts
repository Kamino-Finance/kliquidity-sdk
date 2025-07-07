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

export interface SetFeeRateArgs {
  feeRate: number
}

export interface SetFeeRateAccounts {
  whirlpoolsConfig: Address
  whirlpool: Address
  feeAuthority: TransactionSigner
}

export const layout = borsh.struct([borsh.u16("feeRate")])

/**
 * Sets the fee rate for a Whirlpool.
 * Fee rate is represented as hundredths of a basis point.
 * Only the current fee authority has permission to invoke this instruction.
 *
 * ### Authority
 * - "fee_authority" - Set authority that can modify pool fees in the WhirlpoolConfig
 *
 * ### Parameters
 * - `fee_rate` - The rate that the pool will use to calculate fees going onwards.
 *
 * #### Special Errors
 * - `FeeRateMaxExceeded` - If the provided fee_rate exceeds MAX_FEE_RATE.
 */
export function setFeeRate(
  args: SetFeeRateArgs,
  accounts: SetFeeRateAccounts,
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
  ]
  const identifier = Buffer.from([53, 243, 137, 65, 8, 140, 158, 6])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      feeRate: args.feeRate,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
