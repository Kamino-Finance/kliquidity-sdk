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

export interface AmmConfigFields {
  bump: number
  index: number
  owner: Address
  protocolFeeRate: number
  tradeFeeRate: number
  tickSpacing: number
  fundFeeRate: number
  paddingU32: number
  fundOwner: Address
  padding: Array<BN>
}

export interface AmmConfigJSON {
  bump: number
  index: number
  owner: string
  protocolFeeRate: number
  tradeFeeRate: number
  tickSpacing: number
  fundFeeRate: number
  paddingU32: number
  fundOwner: string
  padding: Array<string>
}

export class AmmConfig {
  readonly bump: number
  readonly index: number
  readonly owner: Address
  readonly protocolFeeRate: number
  readonly tradeFeeRate: number
  readonly tickSpacing: number
  readonly fundFeeRate: number
  readonly paddingU32: number
  readonly fundOwner: Address
  readonly padding: Array<BN>

  static readonly discriminator = Buffer.from([
    218, 244, 33, 104, 203, 203, 43, 111,
  ])

  static readonly layout = borsh.struct<AmmConfig>([
    borsh.u8("bump"),
    borsh.u16("index"),
    borshAddress("owner"),
    borsh.u32("protocolFeeRate"),
    borsh.u32("tradeFeeRate"),
    borsh.u16("tickSpacing"),
    borsh.u32("fundFeeRate"),
    borsh.u32("paddingU32"),
    borshAddress("fundOwner"),
    borsh.array(borsh.u64(), 3, "padding"),
  ])

  constructor(fields: AmmConfigFields) {
    this.bump = fields.bump
    this.index = fields.index
    this.owner = fields.owner
    this.protocolFeeRate = fields.protocolFeeRate
    this.tradeFeeRate = fields.tradeFeeRate
    this.tickSpacing = fields.tickSpacing
    this.fundFeeRate = fields.fundFeeRate
    this.paddingU32 = fields.paddingU32
    this.fundOwner = fields.fundOwner
    this.padding = fields.padding
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<AmmConfig | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `AmmConfigFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<AmmConfig | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `AmmConfigFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): AmmConfig {
    if (!data.slice(0, 8).equals(AmmConfig.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = AmmConfig.layout.decode(data.slice(8))

    return new AmmConfig({
      bump: dec.bump,
      index: dec.index,
      owner: dec.owner,
      protocolFeeRate: dec.protocolFeeRate,
      tradeFeeRate: dec.tradeFeeRate,
      tickSpacing: dec.tickSpacing,
      fundFeeRate: dec.fundFeeRate,
      paddingU32: dec.paddingU32,
      fundOwner: dec.fundOwner,
      padding: dec.padding,
    })
  }

  toJSON(): AmmConfigJSON {
    return {
      bump: this.bump,
      index: this.index,
      owner: this.owner,
      protocolFeeRate: this.protocolFeeRate,
      tradeFeeRate: this.tradeFeeRate,
      tickSpacing: this.tickSpacing,
      fundFeeRate: this.fundFeeRate,
      paddingU32: this.paddingU32,
      fundOwner: this.fundOwner,
      padding: this.padding.map((item) => item.toString()),
    }
  }

  static fromJSON(obj: AmmConfigJSON): AmmConfig {
    return new AmmConfig({
      bump: obj.bump,
      index: obj.index,
      owner: address(obj.owner),
      protocolFeeRate: obj.protocolFeeRate,
      tradeFeeRate: obj.tradeFeeRate,
      tickSpacing: obj.tickSpacing,
      fundFeeRate: obj.fundFeeRate,
      paddingU32: obj.paddingU32,
      fundOwner: address(obj.fundOwner),
      padding: obj.padding.map((item) => new BN(item)),
    })
  }
}
