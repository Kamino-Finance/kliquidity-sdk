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

export interface OpenPositionWithTokenExtensionsArgs {
  tickLowerIndex: number
  tickUpperIndex: number
  withTokenMetadataExtension: boolean
}

export interface OpenPositionWithTokenExtensionsAccounts {
  funder: TransactionSigner
  owner: Address
  position: Address
  positionMint: TransactionSigner
  positionTokenAccount: Address
  whirlpool: Address
  token2022Program: Address
  systemProgram: Address
  associatedTokenProgram: Address
  metadataUpdateAuth: Address
}

export const layout = borsh.struct([
  borsh.i32("tickLowerIndex"),
  borsh.i32("tickUpperIndex"),
  borsh.bool("withTokenMetadataExtension"),
])

/**
 * Open a position in a Whirlpool. A unique token will be minted to represent the position
 * in the users wallet. Additional TokenMetadata extension is initialized to identify the token.
 * Mint and TokenAccount are based on Token-2022.
 * The position will start off with 0 liquidity.
 *
 * ### Parameters
 * - `tick_lower_index` - The tick specifying the lower end of the position range.
 * - `tick_upper_index` - The tick specifying the upper end of the position range.
 * - `with_token_metadata_extension` - If true, the token metadata extension will be initialized.
 *
 * #### Special Errors
 * - `InvalidTickIndex` - If a provided tick is out of bounds, out of order or not a multiple of
 * the tick-spacing in this pool.
 */
export function openPositionWithTokenExtensions(
  args: OpenPositionWithTokenExtensionsArgs,
  accounts: OpenPositionWithTokenExtensionsAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.funder.address, role: 3, signer: accounts.funder },
    { address: accounts.owner, role: 0 },
    { address: accounts.position, role: 1 },
    {
      address: accounts.positionMint.address,
      role: 3,
      signer: accounts.positionMint,
    },
    { address: accounts.positionTokenAccount, role: 1 },
    { address: accounts.whirlpool, role: 0 },
    { address: accounts.token2022Program, role: 0 },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.associatedTokenProgram, role: 0 },
    { address: accounts.metadataUpdateAuth, role: 0 },
  ]
  const identifier = Buffer.from([212, 47, 95, 92, 114, 102, 131, 250])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      tickLowerIndex: args.tickLowerIndex,
      tickUpperIndex: args.tickUpperIndex,
      withTokenMetadataExtension: args.withTokenMetadataExtension,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
