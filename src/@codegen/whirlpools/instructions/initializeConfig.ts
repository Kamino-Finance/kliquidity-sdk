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
  208, 127, 21, 1, 194, 190, 196, 70,
])

export interface InitializeConfigArgs {
  feeAuthority: Address
  collectProtocolFeesAuthority: Address
  rewardEmissionsSuperAuthority: Address
  defaultProtocolFeeRate: number
}

export interface InitializeConfigAccounts {
  config: TransactionSigner
  funder: TransactionSigner
  systemProgram: Address
}

export const layout = borsh.struct([
  borshAddress("feeAuthority"),
  borshAddress("collectProtocolFeesAuthority"),
  borshAddress("rewardEmissionsSuperAuthority"),
  borsh.u16("defaultProtocolFeeRate"),
])

export function initializeConfig(
  args: InitializeConfigArgs,
  accounts: InitializeConfigAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.config.address, role: 3, signer: accounts.config },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      feeAuthority: args.feeAuthority,
      collectProtocolFeesAuthority: args.collectProtocolFeesAuthority,
      rewardEmissionsSuperAuthority: args.rewardEmissionsSuperAuthority,
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
