/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface ObservationFields {
  /** Cumulative active bin ID */
  cumulativeActiveBinId: bigint
  /** Observation sample created timestamp */
  createdAt: bigint
  /** Observation sample last updated timestamp */
  lastUpdatedAt: bigint
}

export interface ObservationJSON {
  /** Cumulative active bin ID */
  cumulativeActiveBinId: string
  /** Observation sample created timestamp */
  createdAt: string
  /** Observation sample last updated timestamp */
  lastUpdatedAt: string
}

export class Observation {
  /** Cumulative active bin ID */
  readonly cumulativeActiveBinId: bigint
  /** Observation sample created timestamp */
  readonly createdAt: bigint
  /** Observation sample last updated timestamp */
  readonly lastUpdatedAt: bigint

  constructor(fields: ObservationFields) {
    this.cumulativeActiveBinId = fields.cumulativeActiveBinId
    this.createdAt = fields.createdAt
    this.lastUpdatedAt = fields.lastUpdatedAt
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.i128("cumulativeActiveBinId"),
        borsh.i64("createdAt"),
        borsh.i64("lastUpdatedAt"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new Observation({
      cumulativeActiveBinId: obj.cumulativeActiveBinId,
      createdAt: obj.createdAt,
      lastUpdatedAt: obj.lastUpdatedAt,
    })
  }

  static toEncodable(fields: ObservationFields) {
    return {
      cumulativeActiveBinId: fields.cumulativeActiveBinId,
      createdAt: fields.createdAt,
      lastUpdatedAt: fields.lastUpdatedAt,
    }
  }

  toJSON(): ObservationJSON {
    return {
      cumulativeActiveBinId: this.cumulativeActiveBinId.toString(),
      createdAt: this.createdAt.toString(),
      lastUpdatedAt: this.lastUpdatedAt.toString(),
    }
  }

  static fromJSON(obj: ObservationJSON): Observation {
    return new Observation({
      cumulativeActiveBinId: BigInt(obj.cumulativeActiveBinId),
      createdAt: BigInt(obj.createdAt),
      lastUpdatedAt: BigInt(obj.lastUpdatedAt),
    })
  }

  toEncodable() {
    return Observation.toEncodable(this)
  }
}
