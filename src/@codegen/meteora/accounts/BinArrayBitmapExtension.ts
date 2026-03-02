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

export interface BinArrayBitmapExtensionFields {
  lbPair: Address
  /** Packed initialized bin array state for start_bin_index is positive */
  positiveBinArrayBitmap: Array<Array<bigint>>
  /** Packed initialized bin array state for start_bin_index is negative */
  negativeBinArrayBitmap: Array<Array<bigint>>
}

export interface BinArrayBitmapExtensionJSON {
  lbPair: string
  /** Packed initialized bin array state for start_bin_index is positive */
  positiveBinArrayBitmap: Array<Array<string>>
  /** Packed initialized bin array state for start_bin_index is negative */
  negativeBinArrayBitmap: Array<Array<string>>
}

export class BinArrayBitmapExtension {
  readonly lbPair: Address
  /** Packed initialized bin array state for start_bin_index is positive */
  readonly positiveBinArrayBitmap: Array<Array<bigint>>
  /** Packed initialized bin array state for start_bin_index is negative */
  readonly negativeBinArrayBitmap: Array<Array<bigint>>

  static readonly discriminator = new Uint8Array([
    80, 111, 124, 113, 55, 237, 18, 5,
  ])

  static readonly layout = borsh.struct<BinArrayBitmapExtension>([
    borshAddress("lbPair"),
    borsh.array(borsh.array(borsh.u64(), 8), 12, "positiveBinArrayBitmap"),
    borsh.array(borsh.array(borsh.u64(), 8), 12, "negativeBinArrayBitmap"),
  ])

  constructor(fields: BinArrayBitmapExtensionFields) {
    this.lbPair = fields.lbPair
    this.positiveBinArrayBitmap = fields.positiveBinArrayBitmap
    this.negativeBinArrayBitmap = fields.negativeBinArrayBitmap
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<BinArrayBitmapExtension | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `BinArrayBitmapExtensionFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(new Uint8Array(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<BinArrayBitmapExtension | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `BinArrayBitmapExtensionFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(new Uint8Array(info.data))
    })
  }

  static decode(data: Uint8Array): BinArrayBitmapExtension {
    if (data.length < BinArrayBitmapExtension.discriminator.length) {
      throw new Error("invalid account discriminator")
    }
    for (let i = 0; i < BinArrayBitmapExtension.discriminator.length; i++) {
      if (data[i] !== BinArrayBitmapExtension.discriminator[i]) {
        throw new Error("invalid account discriminator")
      }
    }

    const dec = BinArrayBitmapExtension.layout.decode(
      data.subarray(BinArrayBitmapExtension.discriminator.length)
    )

    return new BinArrayBitmapExtension({
      lbPair: dec.lbPair,
      positiveBinArrayBitmap: dec.positiveBinArrayBitmap,
      negativeBinArrayBitmap: dec.negativeBinArrayBitmap,
    })
  }

  toJSON(): BinArrayBitmapExtensionJSON {
    return {
      lbPair: this.lbPair,
      positiveBinArrayBitmap: this.positiveBinArrayBitmap.map((item) =>
        item.map((item) => item.toString())
      ),
      negativeBinArrayBitmap: this.negativeBinArrayBitmap.map((item) =>
        item.map((item) => item.toString())
      ),
    }
  }

  static fromJSON(obj: BinArrayBitmapExtensionJSON): BinArrayBitmapExtension {
    return new BinArrayBitmapExtension({
      lbPair: address(obj.lbPair),
      positiveBinArrayBitmap: obj.positiveBinArrayBitmap.map((item) =>
        item.map((item) => BigInt(item))
      ),
      negativeBinArrayBitmap: obj.negativeBinArrayBitmap.map((item) =>
        item.map((item) => BigInt(item))
      ),
    })
  }
}
