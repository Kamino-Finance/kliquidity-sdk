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

export interface InitializePositionBundleWithMetadataAccounts {
  positionBundle: Address
  positionBundleMint: TransactionSigner
  /** https://github.com/metaplex-foundation/metaplex-program-library/blob/773a574c4b34e5b9f248a81306ec24db064e255f/token-metadata/program/src/utils/metadata.rs#L100 */
  positionBundleMetadata: Address
  positionBundleTokenAccount: Address
  positionBundleOwner: Address
  funder: TransactionSigner
  metadataUpdateAuth: Address
  tokenProgram: Address
  systemProgram: Address
  rent: Address
  associatedTokenProgram: Address
  metadataProgram: Address
}

/**
 * Initializes a PositionBundle account that bundles several positions.
 * A unique token will be minted to represent the position bundle in the users wallet.
 * Additional Metaplex metadata is appended to identify the token.
 */
export function initializePositionBundleWithMetadata(
  accounts: InitializePositionBundleWithMetadataAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.positionBundle, role: 1 },
    {
      address: accounts.positionBundleMint.address,
      role: 3,
      signer: accounts.positionBundleMint,
    },
    { address: accounts.positionBundleMetadata, role: 1 },
    { address: accounts.positionBundleTokenAccount, role: 1 },
    { address: accounts.positionBundleOwner, role: 0 },
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.metadataUpdateAuth, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.rent, role: 0 },
    { address: accounts.associatedTokenProgram, role: 0 },
    { address: accounts.metadataProgram, role: 0 },
  ]
  const identifier = Buffer.from([93, 124, 16, 179, 249, 131, 115, 245])
  const data = identifier
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
