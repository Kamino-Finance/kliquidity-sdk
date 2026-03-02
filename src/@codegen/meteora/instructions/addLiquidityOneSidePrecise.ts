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
  161, 194, 103, 84, 171, 71, 250, 154,
])

export interface AddLiquidityOneSidePreciseArgs {
  parameter: types.AddLiquiditySingleSidePreciseParameterFields
}

export interface AddLiquidityOneSidePreciseAccounts {
  position: Address
  lbPair: Address
  binArrayBitmapExtension: Option<Address>
  userToken: Address
  reserve: Address
  tokenMint: Address
  binArrayLower: Address
  binArrayUpper: Address
  sender: TransactionSigner
  tokenProgram: Address
  eventAuthority: Address
  program: Address
}

export const layout = borsh.struct([
  types.AddLiquiditySingleSidePreciseParameter.layout("parameter"),
])

export function addLiquidityOneSidePrecise(
  args: AddLiquidityOneSidePreciseArgs,
  accounts: AddLiquidityOneSidePreciseAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.position, role: 1 },
    { address: accounts.lbPair, role: 1 },
    isSome(accounts.binArrayBitmapExtension)
      ? { address: accounts.binArrayBitmapExtension.value, role: 1 }
      : { address: programAddress, role: 0 },
    { address: accounts.userToken, role: 1 },
    { address: accounts.reserve, role: 1 },
    { address: accounts.tokenMint, role: 0 },
    { address: accounts.binArrayLower, role: 1 },
    { address: accounts.binArrayUpper, role: 1 },
    { address: accounts.sender.address, role: 2, signer: accounts.sender },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.eventAuthority, role: 0 },
    { address: accounts.program, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      parameter: types.AddLiquiditySingleSidePreciseParameter.toEncodable(
        args.parameter
      ),
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
