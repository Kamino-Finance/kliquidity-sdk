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
  107, 205, 249, 226, 151, 35, 86, 0,
])

export interface SetDefaultProtocolFeeRateArgs {
  defaultProtocolFeeRate: number
}

export interface SetDefaultProtocolFeeRateAccounts {
  whirlpoolsConfig: Address
  feeAuthority: TransactionSigner
}

export const layout = borsh.struct([borsh.u16("defaultProtocolFeeRate")])

export function setDefaultProtocolFeeRate(
  args: SetDefaultProtocolFeeRateArgs,
  accounts: SetDefaultProtocolFeeRateAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 1 },
    {
      address: accounts.feeAuthority.address,
      role: 2,
      signer: accounts.feeAuthority,
    },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      defaultProtocolFeeRate: args.defaultProtocolFeeRate,
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
