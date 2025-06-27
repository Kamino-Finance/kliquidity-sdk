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

export interface SetFeeRateByDelegatedFeeAuthorityArgs {
  feeRate: number
}

export interface SetFeeRateByDelegatedFeeAuthorityAccounts {
  whirlpool: Address
  adaptiveFeeTier: Address
  delegatedFeeAuthority: TransactionSigner
}

export const layout = borsh.struct([borsh.u16("feeRate")])

/**
 * Sets the fee rate for a Whirlpool by the delegated fee authority in AdaptiveFeeTier.
 * Fee rate is represented as hundredths of a basis point.
 *
 * ### Authority
 * - "delegated_fee_authority" - Set authority that can modify pool fees in the AdaptiveFeeTier
 *
 * ### Parameters
 * - `fee_rate` - The rate that the pool will use to calculate fees going onwards.
 *
 * #### Special Errors
 * - `FeeRateMaxExceeded` - If the provided fee_rate exceeds MAX_FEE_RATE.
 */
export function setFeeRateByDelegatedFeeAuthority(
  args: SetFeeRateByDelegatedFeeAuthorityArgs,
  accounts: SetFeeRateByDelegatedFeeAuthorityAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpool, role: 1 },
    { address: accounts.adaptiveFeeTier, role: 0 },
    {
      address: accounts.delegatedFeeAuthority.address,
      role: 2,
      signer: accounts.delegatedFeeAuthority,
    },
  ]
  const identifier = Buffer.from([121, 121, 54, 114, 131, 230, 162, 104])
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
