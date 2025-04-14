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

export interface InsertCollateralInfoArgs {
  index: BN
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
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    {
      address: accounts.adminAuthority.address,
      role: 3,
      signer: accounts.adminAuthority,
    },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.tokenInfos, role: 1 },
  ]
  const identifier = Buffer.from([22, 97, 4, 78, 166, 188, 51, 190])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      index: args.index,
      params: types.CollateralInfoParams.toEncodable(args.params),
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
