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
  26, 82, 102, 152, 240, 74, 105, 26,
])

export interface RemoveLiquidityByRangeArgs {
  fromBinId: number
  toBinId: number
  bpsToRemove: number
}

export interface RemoveLiquidityByRangeAccounts {
  position: Address
  lbPair: Address
  binArrayBitmapExtension: Option<Address>
  userTokenX: Address
  userTokenY: Address
  reserveX: Address
  reserveY: Address
  tokenXMint: Address
  tokenYMint: Address
  binArrayLower: Address
  binArrayUpper: Address
  sender: TransactionSigner
  tokenXProgram: Address
  tokenYProgram: Address
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct([
  borsh.i32("fromBinId"),
  borsh.i32("toBinId"),
  borsh.u16("bpsToRemove"),
])

export function removeLiquidityByRange(
  args: RemoveLiquidityByRangeArgs,
  accounts: RemoveLiquidityByRangeAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.position, role: 1 },
    { address: accounts.lbPair, role: 1 },
    isSome(accounts.binArrayBitmapExtension)
      ? { address: accounts.binArrayBitmapExtension.value, role: 1 }
      : { address: programAddress, role: 0 },
    { address: accounts.userTokenX, role: 1 },
    { address: accounts.userTokenY, role: 1 },
    { address: accounts.reserveX, role: 1 },
    { address: accounts.reserveY, role: 1 },
    { address: accounts.tokenXMint, role: 0 },
    { address: accounts.tokenYMint, role: 0 },
    { address: accounts.binArrayLower, role: 1 },
    { address: accounts.binArrayUpper, role: 1 },
    { address: accounts.sender.address, role: 2, signer: accounts.sender },
    { address: accounts.tokenXProgram, role: 0 },
    { address: accounts.tokenYProgram, role: 0 },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      fromBinId: args.fromBinId,
      toBinId: args.toBinId,
      bpsToRemove: args.bpsToRemove,
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
