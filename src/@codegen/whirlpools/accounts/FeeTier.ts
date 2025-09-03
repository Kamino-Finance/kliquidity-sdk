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

export interface FeeTierFields {
  whirlpoolsConfig: Address
  tickSpacing: number
  defaultFeeRate: number
}

export interface FeeTierJSON {
  whirlpoolsConfig: string
  tickSpacing: number
  defaultFeeRate: number
}

export class FeeTier {
  readonly whirlpoolsConfig: Address
  readonly tickSpacing: number
  readonly defaultFeeRate: number

  static readonly discriminator = Buffer.from([
    56, 75, 159, 76, 142, 68, 190, 105,
  ])

  static readonly layout = borsh.struct<FeeTier>([
    borshAddress("whirlpoolsConfig"),
    borsh.u16("tickSpacing"),
    borsh.u16("defaultFeeRate"),
  ])

  constructor(fields: FeeTierFields) {
    this.whirlpoolsConfig = fields.whirlpoolsConfig
    this.tickSpacing = fields.tickSpacing
    this.defaultFeeRate = fields.defaultFeeRate
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<FeeTier | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `FeeTierFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<FeeTier | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `FeeTierFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): FeeTier {
    if (!data.slice(0, 8).equals(FeeTier.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = FeeTier.layout.decode(data.slice(8))

    return new FeeTier({
      whirlpoolsConfig: dec.whirlpoolsConfig,
      tickSpacing: dec.tickSpacing,
      defaultFeeRate: dec.defaultFeeRate,
    })
  }

  toJSON(): FeeTierJSON {
    return {
      whirlpoolsConfig: this.whirlpoolsConfig,
      tickSpacing: this.tickSpacing,
      defaultFeeRate: this.defaultFeeRate,
    }
  }

  static fromJSON(obj: FeeTierJSON): FeeTier {
    return new FeeTier({
      whirlpoolsConfig: address(obj.whirlpoolsConfig),
      tickSpacing: obj.tickSpacing,
      defaultFeeRate: obj.defaultFeeRate,
    })
  }
}
