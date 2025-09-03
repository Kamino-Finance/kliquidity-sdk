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

export const layout = borsh.struct<AddLiquidityOneSidePreciseArgs>([
  types.AddLiquiditySingleSidePreciseParameter.layout("parameter"),
])

export function addLiquidityOneSidePrecise(
  args: AddLiquidityOneSidePreciseArgs,
  accounts: AddLiquidityOneSidePreciseAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
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
  const identifier = Buffer.from([161, 194, 103, 84, 171, 71, 250, 154])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      parameter: types.AddLiquiditySingleSidePreciseParameter.toEncodable(
        args.parameter
      ),
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
