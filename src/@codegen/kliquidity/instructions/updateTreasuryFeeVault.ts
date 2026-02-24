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

export const DISCRIMINATOR = new Uint8Array([9, 241, 94, 91, 173, 74, 166, 119])

export interface UpdateTreasuryFeeVaultArgs {
  collateralId: number
}

export interface UpdateTreasuryFeeVaultAccounts {
  signer: TransactionSigner
  globalConfig: Address
  feeMint: Address
  treasuryFeeVault: Address
  treasuryFeeVaultAuthority: Address
  tokenInfos: Address
  systemProgram: Address
  rent: Address
  tokenProgram: Address
}

export const layout = borsh.struct([borsh.u16("collateralId")])

export function updateTreasuryFeeVault(
  args: UpdateTreasuryFeeVaultArgs,
  accounts: UpdateTreasuryFeeVaultAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.signer.address, role: 3, signer: accounts.signer },
    { address: accounts.globalConfig, role: 1 },
    { address: accounts.feeMint, role: 0 },
    { address: accounts.treasuryFeeVault, role: 1 },
    { address: accounts.treasuryFeeVaultAuthority, role: 0 },
    { address: accounts.tokenInfos, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = new Uint8Array(1000)
  const len = layout.encode(
    {
      collateralId: args.collateralId,
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
