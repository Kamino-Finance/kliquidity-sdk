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

export interface IncreaseOracleLengthArgs {
  lengthToAdd: BN
}

export interface IncreaseOracleLengthAccounts {
  oracle: Address
  funder: TransactionSigner
  systemProgram: Address
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct<IncreaseOracleLengthArgs>([
  borsh.u64("lengthToAdd"),
])

export function increaseOracleLength(
  args: IncreaseOracleLengthArgs,
  accounts: IncreaseOracleLengthAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.oracle, role: 1 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([190, 61, 125, 87, 103, 79, 158, 173])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      lengthToAdd: args.lengthToAdd,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
