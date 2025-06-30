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

export interface SetCollectProtocolFeesAuthorityAccounts {
  whirlpoolsConfig: Address
  collectProtocolFeesAuthority: TransactionSigner
  newCollectProtocolFeesAuthority: Address
}

/**
 * Sets the fee authority to collect protocol fees for a WhirlpoolConfig.
 * Only the current collect protocol fee authority has permission to invoke this instruction.
 *
 * ### Authority
 * - "fee_authority" - Set authority that can collect protocol fees in the WhirlpoolConfig
 */
export function setCollectProtocolFeesAuthority(
  accounts: SetCollectProtocolFeesAuthorityAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 1 },
    {
      address: accounts.collectProtocolFeesAuthority.address,
      role: 2,
      signer: accounts.collectProtocolFeesAuthority,
    },
    { address: accounts.newCollectProtocolFeesAuthority, role: 0 },
  ]
  const identifier = Buffer.from([34, 150, 93, 244, 139, 225, 233, 67])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
