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

export interface LockPositionArgs {
  lockType: types.LockTypeKind
}

export interface LockPositionAccounts {
  funder: TransactionSigner
  positionAuthority: TransactionSigner
  position: Address
  positionMint: Address
  positionTokenAccount: Address
  lockConfig: Address
  whirlpool: Address
  token2022Program: Address
  systemProgram: Address
}

export const layout = borsh.struct([types.LockType.layout("lockType")])

/**
 * Lock the position to prevent any liquidity changes.
 *
 * ### Authority
 * - `position_authority` - The authority that owns the position token.
 *
 * #### Special Errors
 * - `PositionAlreadyLocked` - The provided position is already locked.
 * - `PositionNotLockable` - The provided position is not lockable (e.g. An empty position).
 */
export function lockPosition(
  args: LockPositionArgs,
  accounts: LockPositionAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    {
      address: accounts.positionAuthority.address,
      role: 2,
      signer: accounts.positionAuthority,
    },
    { address: accounts.position, role: 0 },
    { address: accounts.positionMint, role: 0 },
    { address: accounts.positionTokenAccount, role: 1 },
    { address: accounts.lockConfig, role: 1 },
    { address: accounts.whirlpool, role: 0 },
    { address: accounts.token2022Program, role: 0 },
    { address: accounts.systemProgram, role: 0 },
  ]
  const identifier = Buffer.from([227, 62, 2, 252, 247, 10, 171, 185])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      lockType: args.lockType.toEncodable(),
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
