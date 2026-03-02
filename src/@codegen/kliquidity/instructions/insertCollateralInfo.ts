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

export const DISCRIMINATOR = new Uint8Array([22, 97, 4, 78, 166, 188, 51, 190])

export interface InsertCollateralInfoArgs {
  index: bigint
  params: types.CollateralInfoParamsFields
}

export interface InsertCollateralInfoAccounts {
  adminAuthority: TransactionSigner
  globalConfig: Address
  tokenInfos: Address
}

export const layout = borsh.struct([
  borsh.u64("index"),
  types.CollateralInfoParams.layout("params"),
])

export function insertCollateralInfo(
  args: InsertCollateralInfoArgs,
  accounts: InsertCollateralInfoAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 3,
      signer: accounts.adminAuthority,
    },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.tokenInfos, role: 1 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      index: args.index,
      params: types.CollateralInfoParams.toEncodable(args.params),
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
