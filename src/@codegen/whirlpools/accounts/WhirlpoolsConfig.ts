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

export interface WhirlpoolsConfigFields {
  feeAuthority: Address
  collectProtocolFeesAuthority: Address
  rewardEmissionsSuperAuthority: Address
  defaultProtocolFeeRate: number
}

export interface WhirlpoolsConfigJSON {
  feeAuthority: string
  collectProtocolFeesAuthority: string
  rewardEmissionsSuperAuthority: string
  defaultProtocolFeeRate: number
}

export class WhirlpoolsConfig {
  readonly feeAuthority: Address
  readonly collectProtocolFeesAuthority: Address
  readonly rewardEmissionsSuperAuthority: Address
  readonly defaultProtocolFeeRate: number

  static readonly discriminator = Buffer.from([
    157, 20, 49, 224, 217, 87, 193, 254,
  ])

  static readonly layout = borsh.struct<WhirlpoolsConfig>([
    borshAddress("feeAuthority"),
    borshAddress("collectProtocolFeesAuthority"),
    borshAddress("rewardEmissionsSuperAuthority"),
    borsh.u16("defaultProtocolFeeRate"),
  ])

  constructor(fields: WhirlpoolsConfigFields) {
    this.feeAuthority = fields.feeAuthority
    this.collectProtocolFeesAuthority = fields.collectProtocolFeesAuthority
    this.rewardEmissionsSuperAuthority = fields.rewardEmissionsSuperAuthority
    this.defaultProtocolFeeRate = fields.defaultProtocolFeeRate
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<WhirlpoolsConfig | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `WhirlpoolsConfigFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<WhirlpoolsConfig | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `WhirlpoolsConfigFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): WhirlpoolsConfig {
    if (!data.slice(0, 8).equals(WhirlpoolsConfig.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = WhirlpoolsConfig.layout.decode(data.slice(8))

    return new WhirlpoolsConfig({
      feeAuthority: dec.feeAuthority,
      collectProtocolFeesAuthority: dec.collectProtocolFeesAuthority,
      rewardEmissionsSuperAuthority: dec.rewardEmissionsSuperAuthority,
      defaultProtocolFeeRate: dec.defaultProtocolFeeRate,
    })
  }

  toJSON(): WhirlpoolsConfigJSON {
    return {
      feeAuthority: this.feeAuthority,
      collectProtocolFeesAuthority: this.collectProtocolFeesAuthority,
      rewardEmissionsSuperAuthority: this.rewardEmissionsSuperAuthority,
      defaultProtocolFeeRate: this.defaultProtocolFeeRate,
    }
  }

  static fromJSON(obj: WhirlpoolsConfigJSON): WhirlpoolsConfig {
    return new WhirlpoolsConfig({
      feeAuthority: address(obj.feeAuthority),
      collectProtocolFeesAuthority: address(obj.collectProtocolFeesAuthority),
      rewardEmissionsSuperAuthority: address(obj.rewardEmissionsSuperAuthority),
      defaultProtocolFeeRate: obj.defaultProtocolFeeRate,
    })
  }
}
