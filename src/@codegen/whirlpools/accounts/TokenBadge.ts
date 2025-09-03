/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  address,
  Address,
  fetchEncodedAccount,
  fetchEncodedAccounts,
  GetAccountInfoApi,
  GetMultipleAccountsApi,
  Rpc,
} from "@solana/kit"
/* eslint-enable @typescript-eslint/no-unused-vars */
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface TokenBadgeFields {
  whirlpoolsConfig: Address
  tokenMint: Address
}

export interface TokenBadgeJSON {
  whirlpoolsConfig: string
  tokenMint: string
}

export class TokenBadge {
  readonly whirlpoolsConfig: Address
  readonly tokenMint: Address

  static readonly discriminator = Buffer.from([
    116, 219, 204, 229, 249, 116, 255, 150,
  ])

  static readonly layout = borsh.struct<TokenBadge>([
    borshAddress("whirlpoolsConfig"),
    borshAddress("tokenMint"),
  ])

  constructor(fields: TokenBadgeFields) {
    this.whirlpoolsConfig = fields.whirlpoolsConfig
    this.tokenMint = fields.tokenMint
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<TokenBadge | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `TokenBadgeFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<TokenBadge | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `TokenBadgeFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): TokenBadge {
    if (!data.slice(0, 8).equals(TokenBadge.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = TokenBadge.layout.decode(data.slice(8))

    return new TokenBadge({
      whirlpoolsConfig: dec.whirlpoolsConfig,
      tokenMint: dec.tokenMint,
    })
  }

  toJSON(): TokenBadgeJSON {
    return {
      whirlpoolsConfig: this.whirlpoolsConfig,
      tokenMint: this.tokenMint,
    }
  }

  static fromJSON(obj: TokenBadgeJSON): TokenBadge {
    return new TokenBadge({
      whirlpoolsConfig: address(obj.whirlpoolsConfig),
      tokenMint: address(obj.tokenMint),
    })
  }
}
