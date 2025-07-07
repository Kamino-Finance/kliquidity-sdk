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

export interface TransferLockedPositionAccounts {
  positionAuthority: TransactionSigner
  receiver: Address
  position: Address
  positionMint: Address
  positionTokenAccount: Address
  destinationTokenAccount: Address
  lockConfig: Address
  token2022Program: Address
}

/**
 * Transfer a locked position to to a different token account.
 *
 * ### Authority
 * - `position_authority` - The authority that owns the position token.
 */
export function transferLockedPosition(
  accounts: TransferLockedPositionAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.positionAuthority.address,
      role: 2,
      signer: accounts.positionAuthority,
    },
    { address: accounts.receiver, role: 1 },
    { address: accounts.position, role: 0 },
    { address: accounts.positionMint, role: 0 },
    { address: accounts.positionTokenAccount, role: 1 },
    { address: accounts.destinationTokenAccount, role: 1 },
    { address: accounts.lockConfig, role: 1 },
    { address: accounts.token2022Program, role: 0 },
  ]
  const identifier = Buffer.from([179, 121, 229, 46, 67, 138, 194, 138])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
