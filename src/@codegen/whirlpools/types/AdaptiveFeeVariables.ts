import { address, Address } from "@solana/kit" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"
import { borshAddress } from "../utils"

export interface AdaptiveFeeVariablesFields {
  lastReferenceUpdateTimestamp: BN
  lastMajorSwapTimestamp: BN
  volatilityReference: number
  tickGroupIndexReference: number
  volatilityAccumulator: number
  reserved: Array<number>
}

export interface AdaptiveFeeVariablesJSON {
  lastReferenceUpdateTimestamp: string
  lastMajorSwapTimestamp: string
  volatilityReference: number
  tickGroupIndexReference: number
  volatilityAccumulator: number
  reserved: Array<number>
}

export class AdaptiveFeeVariables {
  readonly lastReferenceUpdateTimestamp: BN
  readonly lastMajorSwapTimestamp: BN
  readonly volatilityReference: number
  readonly tickGroupIndexReference: number
  readonly volatilityAccumulator: number
  readonly reserved: Array<number>

  constructor(fields: AdaptiveFeeVariablesFields) {
    this.lastReferenceUpdateTimestamp = fields.lastReferenceUpdateTimestamp
    this.lastMajorSwapTimestamp = fields.lastMajorSwapTimestamp
    this.volatilityReference = fields.volatilityReference
    this.tickGroupIndexReference = fields.tickGroupIndexReference
    this.volatilityAccumulator = fields.volatilityAccumulator
    this.reserved = fields.reserved
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.u64("lastReferenceUpdateTimestamp"),
        borsh.u64("lastMajorSwapTimestamp"),
        borsh.u32("volatilityReference"),
        borsh.i32("tickGroupIndexReference"),
        borsh.u32("volatilityAccumulator"),
        borsh.array(borsh.u8(), 16, "reserved"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new AdaptiveFeeVariables({
      lastReferenceUpdateTimestamp: obj.lastReferenceUpdateTimestamp,
      lastMajorSwapTimestamp: obj.lastMajorSwapTimestamp,
      volatilityReference: obj.volatilityReference,
      tickGroupIndexReference: obj.tickGroupIndexReference,
      volatilityAccumulator: obj.volatilityAccumulator,
      reserved: obj.reserved,
    })
  }

  static toEncodable(fields: AdaptiveFeeVariablesFields) {
    return {
      lastReferenceUpdateTimestamp: fields.lastReferenceUpdateTimestamp,
      lastMajorSwapTimestamp: fields.lastMajorSwapTimestamp,
      volatilityReference: fields.volatilityReference,
      tickGroupIndexReference: fields.tickGroupIndexReference,
      volatilityAccumulator: fields.volatilityAccumulator,
      reserved: fields.reserved,
    }
  }

  toJSON(): AdaptiveFeeVariablesJSON {
    return {
      lastReferenceUpdateTimestamp:
        this.lastReferenceUpdateTimestamp.toString(),
      lastMajorSwapTimestamp: this.lastMajorSwapTimestamp.toString(),
      volatilityReference: this.volatilityReference,
      tickGroupIndexReference: this.tickGroupIndexReference,
      volatilityAccumulator: this.volatilityAccumulator,
      reserved: this.reserved,
    }
  }

  static fromJSON(obj: AdaptiveFeeVariablesJSON): AdaptiveFeeVariables {
    return new AdaptiveFeeVariables({
      lastReferenceUpdateTimestamp: new BN(obj.lastReferenceUpdateTimestamp),
      lastMajorSwapTimestamp: new BN(obj.lastMajorSwapTimestamp),
      volatilityReference: obj.volatilityReference,
      tickGroupIndexReference: obj.tickGroupIndexReference,
      volatilityAccumulator: obj.volatilityAccumulator,
      reserved: obj.reserved,
    })
  }

  toEncodable() {
    return AdaptiveFeeVariables.toEncodable(this)
  }
}
