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

export const layout = borsh.struct([borsh.u16("protocolFeeRate")])

/**
 * Sets the protocol fee rate for a Whirlpool.
 * Protocol fee rate is represented as a basis point.
 * Only the current fee authority has permission to invoke this instruction.
 *
 * ### Authority
 * - "fee_authority" - Set authority that can modify pool fees in the WhirlpoolConfig
 *
 * ### Parameters
 * - `protocol_fee_rate` - The rate that the pool will use to calculate protocol fees going onwards.
 *
 * #### Special Errors
 * - `ProtocolFeeRateMaxExceeded` - If the provided default_protocol_fee_rate exceeds MAX_PROTOCOL_FEE_RATE.
 */
export function setProtocolFeeRate(
  args: SetProtocolFeeRateArgs,
  accounts: SetProtocolFeeRateAccounts,
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
