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

export interface CollectProtocolFeesV2Args {
  remainingAccountsInfo: types.RemainingAccountsInfoFields | null
}

export interface CollectProtocolFeesV2Accounts {
  whirlpoolsConfig: Address
  whirlpool: Address
  collectProtocolFeesAuthority: TransactionSigner
  tokenMintA: Address
  tokenMintB: Address
  tokenVaultA: Address
  tokenVaultB: Address
  tokenDestinationA: Address
  tokenDestinationB: Address
  tokenProgramA: Address
  tokenProgramB: Address
  memoProgram: Address
}

export const layout = borsh.struct([
  borsh.option(types.RemainingAccountsInfo.layout(), "remainingAccountsInfo"),
])

export function collectProtocolFeesV2(
  args: CollectProtocolFeesV2Args,
  accounts: CollectProtocolFeesV2Accounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolsConfig, role: 0 },
    { address: accounts.whirlpool, role: 1 },
    {
      address: accounts.collectProtocolFeesAuthority.address,
      role: 2,
      signer: accounts.collectProtocolFeesAuthority,
    },
    { address: accounts.tokenMintA, role: 0 },
    { address: accounts.tokenMintB, role: 0 },
    { address: accounts.tokenVaultA, role: 1 },
    { address: accounts.tokenVaultB, role: 1 },
    { address: accounts.tokenDestinationA, role: 1 },
    { address: accounts.tokenDestinationB, role: 1 },
    { address: accounts.tokenProgramA, role: 0 },
    { address: accounts.tokenProgramB, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([103, 128, 222, 134, 114, 200, 22, 200])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      remainingAccountsInfo:
        (args.remainingAccountsInfo &&
          types.RemainingAccountsInfo.toEncodable(
            args.remainingAccountsInfo
          )) ||
        null,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
