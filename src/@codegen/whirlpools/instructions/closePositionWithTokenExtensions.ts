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

export interface ClosePositionWithTokenExtensionsAccounts {
  positionAuthority: TransactionSigner
  receiver: Address
  position: Address
  positionMint: Address
  positionTokenAccount: Address
  token2022Program: Address
}

/**
 * Close a position in a Whirlpool. Burns the position token in the owner's wallet.
 * Mint and TokenAccount are based on Token-2022. And Mint accout will be also closed.
 *
 * ### Authority
 * - "position_authority" - The authority that owns the position token.
 *
 * #### Special Errors
 * - `ClosePositionNotEmpty` - The provided position account is not empty.
 */
export function closePositionWithTokenExtensions(
  accounts: ClosePositionWithTokenExtensionsAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.positionAuthority.address,
      role: 2,
      signer: accounts.positionAuthority,
    },
    { address: accounts.receiver, role: 1 },
    { address: accounts.position, role: 1 },
    { address: accounts.positionMint, role: 1 },
    { address: accounts.positionTokenAccount, role: 1 },
    { address: accounts.token2022Program, role: 0 },
  ]
  const identifier = Buffer.from([1, 182, 135, 59, 155, 25, 99, 223])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
