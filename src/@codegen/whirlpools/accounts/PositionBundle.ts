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
import * as borsh from "../utils/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface PositionBundleFields {
  positionBundleMint: Address
  positionBitmap: Array<number>
}

export interface PositionBundleJSON {
  positionBundleMint: string
  positionBitmap: Array<number>
}

export class PositionBundle {
  readonly positionBundleMint: Address
  readonly positionBitmap: Array<number>

  static readonly discriminator = new Uint8Array([
    129, 169, 175, 65, 185, 95, 32, 100,
  ])

  static readonly layout = borsh.struct<PositionBundle>([
    borshAddress("positionBundleMint"),
    borsh.array(borsh.u8(), 32, "positionBitmap"),
  ])

  constructor(fields: PositionBundleFields) {
    this.positionBundleMint = fields.positionBundleMint
    this.positionBitmap = fields.positionBitmap
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<PositionBundle | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `PositionBundleFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(new Uint8Array(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<PositionBundle | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `PositionBundleFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(new Uint8Array(info.data))
    })
  }

  static decode(data: Uint8Array): PositionBundle {
    if (data.length < PositionBundle.discriminator.length) {
      throw new Error("invalid account discriminator")
    }
    for (let i = 0; i < PositionBundle.discriminator.length; i++) {
      if (data[i] !== PositionBundle.discriminator[i]) {
        throw new Error("invalid account discriminator")
      }
    }

    const dec = PositionBundle.layout.decode(
      data.subarray(PositionBundle.discriminator.length)
    )

    return new PositionBundle({
      positionBundleMint: dec.positionBundleMint,
      positionBitmap: dec.positionBitmap,
    })
  }

  toJSON(): PositionBundleJSON {
    return {
      positionBundleMint: this.positionBundleMint,
      positionBitmap: this.positionBitmap,
    }
  }

  static fromJSON(obj: PositionBundleJSON): PositionBundle {
    return new PositionBundle({
      positionBundleMint: address(obj.positionBundleMint),
      positionBitmap: obj.positionBitmap,
    })
  }
}
