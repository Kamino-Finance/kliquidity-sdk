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
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.signer.address, role: 3, signer: accounts.signer },
    { address: accounts.globalConfig, role: 1 },
    { address: accounts.feeMint, role: 0 },
    { address: accounts.treasuryFeeVault, role: 1 },
    { address: accounts.treasuryFeeVaultAuthority, role: 0 },
    { address: accounts.tokenInfos, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
  ]
  const identifier = Buffer.from([9, 241, 94, 91, 173, 74, 166, 119])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      collateralId: args.collateralId,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
