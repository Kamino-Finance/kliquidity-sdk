/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface ObservationFields {
  blockTimestamp: number
  sqrtPriceX64: bigint
  cumulativeTimePriceX64: bigint
  padding: bigint
}

export interface ObservationJSON {
  blockTimestamp: number
  sqrtPriceX64: string
  cumulativeTimePriceX64: string
  padding: string
}

export class Observation {
  readonly blockTimestamp: number
  readonly sqrtPriceX64: bigint
  readonly cumulativeTimePriceX64: bigint
  readonly padding: bigint

  constructor(fields: ObservationFields) {
    this.blockTimestamp = fields.blockTimestamp
    this.sqrtPriceX64 = fields.sqrtPriceX64
    this.cumulativeTimePriceX64 = fields.cumulativeTimePriceX64
    this.padding = fields.padding
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.u32("blockTimestamp"),
        borsh.u128("sqrtPriceX64"),
        borsh.u128("cumulativeTimePriceX64"),
        borsh.u128("padding"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new Observation({
      blockTimestamp: obj.blockTimestamp,
      sqrtPriceX64: obj.sqrtPriceX64,
      cumulativeTimePriceX64: obj.cumulativeTimePriceX64,
      padding: obj.padding,
    })
  }

  static toEncodable(fields: ObservationFields) {
    return {
      blockTimestamp: fields.blockTimestamp,
      sqrtPriceX64: fields.sqrtPriceX64,
      cumulativeTimePriceX64: fields.cumulativeTimePriceX64,
      padding: fields.padding,
    }
  }

  toJSON(): ObservationJSON {
    return {
      blockTimestamp: this.blockTimestamp,
      sqrtPriceX64: this.sqrtPriceX64.toString(),
      cumulativeTimePriceX64: this.cumulativeTimePriceX64.toString(),
      padding: this.padding.toString(),
    }
  }

  static fromJSON(obj: ObservationJSON): Observation {
    return new Observation({
      blockTimestamp: obj.blockTimestamp,
      sqrtPriceX64: BigInt(obj.sqrtPriceX64),
      cumulativeTimePriceX64: BigInt(obj.cumulativeTimePriceX64),
      padding: BigInt(obj.padding),
    })
  }

  toEncodable() {
    return Observation.toEncodable(this)
  }
}
