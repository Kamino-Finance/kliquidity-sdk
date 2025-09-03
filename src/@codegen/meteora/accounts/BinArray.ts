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

export interface BinArrayFields {
  index: BN
  /** Version of binArray */
  version: number
  padding: Array<number>
  lbPair: Address
  bins: Array<types.BinFields>
}

export interface BinArrayJSON {
  index: string
  /** Version of binArray */
  version: number
  padding: Array<number>
  lbPair: string
  bins: Array<types.BinJSON>
}

/**
 * An account to contain a range of bin. For example: Bin 100 <-> 200.
 * For example:
 * BinArray index: 0 contains bin 0 <-> 599
 * index: 2 contains bin 600 <-> 1199, ...
 */
export class BinArray {
  readonly index: BN
  /** Version of binArray */
  readonly version: number
  readonly padding: Array<number>
  readonly lbPair: Address
  readonly bins: Array<types.Bin>

  static readonly discriminator = Buffer.from([
    92, 142, 92, 220, 5, 148, 70, 181,
  ])

  static readonly layout = borsh.struct<BinArray>([
    borsh.i64("index"),
    borsh.u8("version"),
    borsh.array(borsh.u8(), 7, "padding"),
    borshAddress("lbPair"),
    borsh.array(types.Bin.layout(), 70, "bins"),
  ])

  constructor(fields: BinArrayFields) {
    this.index = fields.index
    this.version = fields.version
    this.padding = fields.padding
    this.lbPair = fields.lbPair
    this.bins = fields.bins.map((item) => new types.Bin({ ...item }))
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<BinArray | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `BinArrayFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<BinArray | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `BinArrayFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): BinArray {
    if (!data.slice(0, 8).equals(BinArray.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = BinArray.layout.decode(data.slice(8))

    return new BinArray({
      index: dec.index,
      version: dec.version,
      padding: dec.padding,
      lbPair: dec.lbPair,
      bins: dec.bins.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => types.Bin.fromDecoded(item)
      ),
    })
  }

  toJSON(): BinArrayJSON {
    return {
      index: this.index.toString(),
      version: this.version,
      padding: this.padding,
      lbPair: this.lbPair,
      bins: this.bins.map((item) => item.toJSON()),
    }
  }

  static fromJSON(obj: BinArrayJSON): BinArray {
    return new BinArray({
      index: new BN(obj.index),
      version: obj.version,
      padding: obj.padding,
      lbPair: address(obj.lbPair),
      bins: obj.bins.map((item) => types.Bin.fromJSON(item)),
    })
  }
}
