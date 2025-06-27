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

export interface SetFeeAuthorityAccounts {
  whirlpoolsConfig: Address
  feeAuthority: TransactionSigner
  newFeeAuthority: Address
}

/**
 * Sets the fee authority for a WhirlpoolConfig.
 * The fee authority can set the fee & protocol fee rate for individual pools or
 * set the default fee rate for newly minted pools.
 * Only the current fee authority has permission to invoke this instruction.
 *
 * ### Authority
 * - "fee_authority" - Set authority that can modify pool fees in the WhirlpoolConfig
 */
export function setFeeAuthority(
  accounts: SetFeeAuthorityAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 1 },
    {
      address: accounts.feeAuthority.address,
      role: 2,
      signer: accounts.feeAuthority,
    },
    { address: accounts.newFeeAuthority, role: 0 },
  ]
  const identifier = Buffer.from([31, 1, 50, 87, 237, 101, 97, 132])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
