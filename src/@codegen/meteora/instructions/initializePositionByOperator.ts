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

export interface InitializePositionByOperatorArgs {
  lowerBinId: number
  width: number
  owner: Address
  feeOwner: Address
}

export interface InitializePositionByOperatorAccounts {
  payer: TransactionSigner
  base: TransactionSigner
  position: Address
  lbPair: Address
  /** operator */
  operator: TransactionSigner
  systemProgram: Address
  rent: Address
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct<InitializePositionByOperatorArgs>([
  borsh.i32("lowerBinId"),
  borsh.i32("width"),
  borshAddress("owner"),
  borshAddress("feeOwner"),
])

export function initializePositionByOperator(
  args: InitializePositionByOperatorArgs,
  accounts: InitializePositionByOperatorAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.payer.address, role: 3, signer: accounts.payer },
    { address: accounts.base.address, role: 2, signer: accounts.base },
    { address: accounts.position, role: 1 },
    { address: accounts.lbPair, role: 0 },
    { address: accounts.operator.address, role: 2, signer: accounts.operator },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([251, 189, 190, 244, 117, 254, 35, 148])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      lowerBinId: args.lowerBinId,
      width: args.width,
      owner: args.owner,
      feeOwner: args.feeOwner,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
