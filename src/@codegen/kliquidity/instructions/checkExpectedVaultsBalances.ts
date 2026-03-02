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

export const DISCRIMINATOR = new Uint8Array([75, 151, 187, 125, 50, 4, 11, 71])

export interface CheckExpectedVaultsBalancesArgs {
  tokenAAtaBalance: bigint
  tokenBAtaBalance: bigint
}

export interface CheckExpectedVaultsBalancesAccounts {
  user: TransactionSigner
  tokenAAta: Address
  tokenBAta: Address
}

export const layout = borsh.struct([
  borsh.u64("tokenAAtaBalance"),
  borsh.u64("tokenBAtaBalance"),
])

export function checkExpectedVaultsBalances(
  args: CheckExpectedVaultsBalancesArgs,
  accounts: CheckExpectedVaultsBalancesAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.user.address, role: 3, signer: accounts.user },
    { address: accounts.tokenAAta, role: 0 },
    { address: accounts.tokenBAta, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      tokenAAtaBalance: args.tokenAAtaBalance,
      tokenBAtaBalance: args.tokenBAtaBalance,
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
