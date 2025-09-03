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

export interface UpdateCollateralInfoArgs {
  index: BN
  mode: BN
  value: Array<number>
}

export interface UpdateCollateralInfoAccounts {
  adminAuthority: TransactionSigner
  globalConfig: Address
  tokenInfos: Address
}

export const layout = borsh.struct<UpdateCollateralInfoArgs>([
  borsh.u64("index"),
  borsh.u64("mode"),
  borsh.array(borsh.u8(), 32, "value"),
])

export function updateCollateralInfo(
  args: UpdateCollateralInfoArgs,
  accounts: UpdateCollateralInfoAccounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
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
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([76, 94, 131, 44, 137, 61, 161, 110])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      index: args.index,
      mode: args.mode,
      value: args.value,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
