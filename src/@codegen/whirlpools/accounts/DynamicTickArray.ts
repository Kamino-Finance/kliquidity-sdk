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

export interface DynamicTickArrayFields {
  startTickIndex: number
  whirlpool: Address
  tickBitmap: BN
  ticks: Array<types.DynamicTickKind>
}

export interface DynamicTickArrayJSON {
  startTickIndex: number
  whirlpool: string
  tickBitmap: string
  ticks: Array<types.DynamicTickJSON>
}

export class DynamicTickArray {
  readonly startTickIndex: number
  readonly whirlpool: Address
  readonly tickBitmap: BN
  readonly ticks: Array<types.DynamicTickKind>

  static readonly discriminator = Buffer.from([
    17, 216, 246, 142, 225, 199, 218, 56,
  ])

  static readonly layout = borsh.struct<DynamicTickArray>([
    borsh.i32("startTickIndex"),
    borshAddress("whirlpool"),
    borsh.u128("tickBitmap"),
    borsh.array(types.DynamicTick.layout(), 88, "ticks"),
  ])

  constructor(fields: DynamicTickArrayFields) {
    this.startTickIndex = fields.startTickIndex
    this.whirlpool = fields.whirlpool
    this.tickBitmap = fields.tickBitmap
    this.ticks = fields.ticks
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<DynamicTickArray | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error("account doesn't belong to this program")
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<DynamicTickArray | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error("account doesn't belong to this program")
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): DynamicTickArray {
    if (!data.slice(0, 8).equals(DynamicTickArray.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = DynamicTickArray.layout.decode(data.slice(8))

    return new DynamicTickArray({
      startTickIndex: dec.startTickIndex,
      whirlpool: dec.whirlpool,
      tickBitmap: dec.tickBitmap,
      ticks: dec.ticks.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => types.DynamicTick.fromDecoded(item)
      ),
    })
  }

  toJSON(): DynamicTickArrayJSON {
    return {
      startTickIndex: this.startTickIndex,
      whirlpool: this.whirlpool,
      tickBitmap: this.tickBitmap.toString(),
      ticks: this.ticks.map((item) => item.toJSON()),
    }
  }

  static fromJSON(obj: DynamicTickArrayJSON): DynamicTickArray {
    return new DynamicTickArray({
      startTickIndex: obj.startTickIndex,
      whirlpool: address(obj.whirlpool),
      tickBitmap: new BN(obj.tickBitmap),
      ticks: obj.ticks.map((item) => types.DynamicTick.fromJSON(item)),
    })
  }
}
