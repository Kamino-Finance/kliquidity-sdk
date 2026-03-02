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
  207, 117, 95, 191, 229, 180, 226, 15,
])

export interface CollectFeesV2Args {
  remainingAccountsInfo: types.RemainingAccountsInfoFields | null
}

export interface CollectFeesV2Accounts {
  whirlpool: Address
  positionAuthority: TransactionSigner
  position: Address
  positionTokenAccount: Address
  tokenMintA: Address
  tokenMintB: Address
  tokenOwnerAccountA: Address
  tokenVaultA: Address
  tokenOwnerAccountB: Address
  tokenVaultB: Address
  tokenProgramA: Address
  tokenProgramB: Address
  memoProgram: Address
}

export const layout = borsh.struct([
  borsh.option(types.RemainingAccountsInfo.layout(), "remainingAccountsInfo"),
])

export function collectFeesV2(
  args: CollectFeesV2Args,
  accounts: CollectFeesV2Accounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.whirlpool, role: 0 },
    {
      address: accounts.positionAuthority.address,
      role: 2,
      signer: accounts.positionAuthority,
    },
    { address: accounts.position, role: 1 },
    { address: accounts.positionTokenAccount, role: 0 },
    { address: accounts.tokenMintA, role: 0 },
    { address: accounts.tokenMintB, role: 0 },
    { address: accounts.tokenOwnerAccountA, role: 1 },
    { address: accounts.tokenVaultA, role: 1 },
    { address: accounts.tokenOwnerAccountB, role: 1 },
    { address: accounts.tokenVaultB, role: 1 },
    { address: accounts.tokenProgramA, role: 0 },
    { address: accounts.tokenProgramB, role: 0 },
    { address: accounts.memoProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
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
  const data = (() => {
    const d = new Uint8Array(8 + len)
    d.set(DISCRIMINATOR)
    d.set(buffer.subarray(0, len), 8)
    return d
  })()
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
