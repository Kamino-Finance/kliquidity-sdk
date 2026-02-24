/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Address,
  isSome,
  AccountMeta,
  AccountSignerMeta,
  Instruction,
  Option,
  TransactionSigner,
} from "@solana/kit"
/* eslint-enable @typescript-eslint/no-unused-vars */
import * as borsh from "../utils/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export const DISCRIMINATOR = new Uint8Array([
  251, 189, 190, 244, 117, 254, 35, 148,
])

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

export const layout = borsh.struct([
  borsh.i32("lowerBinId"),
  borsh.i32("width"),
  borshAddress("owner"),
  borshAddress("feeOwner"),
])

export function initializePositionByOperator(
  args: InitializePositionByOperatorArgs,
  accounts: InitializePositionByOperatorAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
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
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      lowerBinId: args.lowerBinId,
      width: args.width,
      owner: args.owner,
      feeOwner: args.feeOwner,
    },
    buffer
  )
  const data = (() => {
    const d = new Uint8Array(8 + len)
    d.set(DISCRIMINATOR)
    d.set(buffer.subarray(0, len), 8)
    return d
  })()
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
