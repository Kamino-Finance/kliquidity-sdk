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

export interface CheckExpectedVaultsBalancesArgs {
  tokenAAtaBalance: BN
  tokenBAtaBalance: BN
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
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.user.address, role: 3, signer: accounts.user },
    { address: accounts.tokenAAta, role: 0 },
    { address: accounts.tokenBAta, role: 0 },
  ]
  const identifier = Buffer.from([75, 151, 187, 125, 50, 4, 11, 71])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      tokenAAtaBalance: args.tokenAAtaBalance,
      tokenBAtaBalance: args.tokenBAtaBalance,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
