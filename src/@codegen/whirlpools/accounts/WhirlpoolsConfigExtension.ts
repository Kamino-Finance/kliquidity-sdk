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

export interface WhirlpoolsConfigExtensionFields {
  whirlpoolsConfig: Address
  configExtensionAuthority: Address
  tokenBadgeAuthority: Address
}

export interface WhirlpoolsConfigExtensionJSON {
  whirlpoolsConfig: string
  configExtensionAuthority: string
  tokenBadgeAuthority: string
}

export class WhirlpoolsConfigExtension {
  readonly whirlpoolsConfig: Address
  readonly configExtensionAuthority: Address
  readonly tokenBadgeAuthority: Address

  static readonly discriminator = Buffer.from([
    2, 99, 215, 163, 240, 26, 153, 58,
  ])

  static readonly layout = borsh.struct<WhirlpoolsConfigExtension>([
    borshAddress("whirlpoolsConfig"),
    borshAddress("configExtensionAuthority"),
    borshAddress("tokenBadgeAuthority"),
  ])

  constructor(fields: WhirlpoolsConfigExtensionFields) {
    this.whirlpoolsConfig = fields.whirlpoolsConfig
    this.configExtensionAuthority = fields.configExtensionAuthority
    this.tokenBadgeAuthority = fields.tokenBadgeAuthority
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<WhirlpoolsConfigExtension | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `WhirlpoolsConfigExtensionFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<WhirlpoolsConfigExtension | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `WhirlpoolsConfigExtensionFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): WhirlpoolsConfigExtension {
    if (!data.slice(0, 8).equals(WhirlpoolsConfigExtension.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = WhirlpoolsConfigExtension.layout.decode(data.slice(8))

    return new WhirlpoolsConfigExtension({
      whirlpoolsConfig: dec.whirlpoolsConfig,
      configExtensionAuthority: dec.configExtensionAuthority,
      tokenBadgeAuthority: dec.tokenBadgeAuthority,
    })
  }

  toJSON(): WhirlpoolsConfigExtensionJSON {
    return {
      whirlpoolsConfig: this.whirlpoolsConfig,
      configExtensionAuthority: this.configExtensionAuthority,
      tokenBadgeAuthority: this.tokenBadgeAuthority,
    }
  }

  static fromJSON(
    obj: WhirlpoolsConfigExtensionJSON
  ): WhirlpoolsConfigExtension {
    return new WhirlpoolsConfigExtension({
      whirlpoolsConfig: address(obj.whirlpoolsConfig),
      configExtensionAuthority: address(obj.configExtensionAuthority),
      tokenBadgeAuthority: address(obj.tokenBadgeAuthority),
    })
  }
}
