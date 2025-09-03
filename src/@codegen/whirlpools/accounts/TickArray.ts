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

export interface TickArrayFields {
  startTickIndex: number
  ticks: Array<types.TickFields>
  whirlpool: Address
}

export interface TickArrayJSON {
  startTickIndex: number
  ticks: Array<types.TickJSON>
  whirlpool: string
}

export class TickArray {
  readonly startTickIndex: number
  readonly ticks: Array<types.Tick>
  readonly whirlpool: Address

  static readonly discriminator = Buffer.from([
    69, 97, 189, 190, 110, 7, 66, 187,
  ])

  static readonly layout = borsh.struct<TickArray>([
    borsh.i32("startTickIndex"),
    borsh.array(types.Tick.layout(), 88, "ticks"),
    borshAddress("whirlpool"),
  ])

  constructor(fields: TickArrayFields) {
    this.startTickIndex = fields.startTickIndex
    this.ticks = fields.ticks.map((item) => new types.Tick({ ...item }))
    this.whirlpool = fields.whirlpool
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<TickArray | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `TickArrayFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<TickArray | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `TickArrayFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): TickArray {
    if (!data.slice(0, 8).equals(TickArray.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = TickArray.layout.decode(data.slice(8))

    return new TickArray({
      startTickIndex: dec.startTickIndex,
      ticks: dec.ticks.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => types.Tick.fromDecoded(item)
      ),
      whirlpool: dec.whirlpool,
    })
  }

  toJSON(): TickArrayJSON {
    return {
      startTickIndex: this.startTickIndex,
      ticks: this.ticks.map((item) => item.toJSON()),
      whirlpool: this.whirlpool,
    }
  }

  static fromJSON(obj: TickArrayJSON): TickArray {
    return new TickArray({
      startTickIndex: obj.startTickIndex,
      ticks: obj.ticks.map((item) => types.Tick.fromJSON(item)),
      whirlpool: address(obj.whirlpool),
    })
  }
}
