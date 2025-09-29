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

export interface CollateralInfosFields {
  infos: Array<types.CollateralInfoFields>
}

export interface CollateralInfosJSON {
  infos: Array<types.CollateralInfoJSON>
}

export class CollateralInfos {
  readonly infos: Array<types.CollateralInfo>

  static readonly discriminator = Buffer.from([
    127, 210, 52, 226, 74, 169, 111, 9,
  ])

  static readonly layout = borsh.struct<CollateralInfos>([
    borsh.array(types.CollateralInfo.layout(), 303, "infos"),
  ])

  constructor(fields: CollateralInfosFields) {
    this.infos = fields.infos.map(
      (item) => new types.CollateralInfo({ ...item })
    )
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<CollateralInfos | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `CollateralInfosFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<CollateralInfos | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `CollateralInfosFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): CollateralInfos {
    if (!data.slice(0, 8).equals(CollateralInfos.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = CollateralInfos.layout.decode(data.slice(8))

    return new CollateralInfos({
      infos: dec.infos.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => types.CollateralInfo.fromDecoded(item)
      ),
    })
  }

  toJSON(): CollateralInfosJSON {
    return {
      infos: this.infos.map((item) => item.toJSON()),
    }
  }

  static fromJSON(obj: CollateralInfosJSON): CollateralInfos {
    return new CollateralInfos({
      infos: obj.infos.map((item) => types.CollateralInfo.fromJSON(item)),
    })
  }
}
