import { address, Address } from "@solana/kit" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"
import { borshAddress } from "../utils"

export interface AdaptiveFeeConstantsFields {
  filterPeriod: number
  decayPeriod: number
  reductionFactor: number
  adaptiveFeeControlFactor: number
  maxVolatilityAccumulator: number
  tickGroupSize: number
  majorSwapThresholdTicks: number
  reserved: Array<number>
}

export interface AdaptiveFeeConstantsJSON {
  filterPeriod: number
  decayPeriod: number
  reductionFactor: number
  adaptiveFeeControlFactor: number
  maxVolatilityAccumulator: number
  tickGroupSize: number
  majorSwapThresholdTicks: number
  reserved: Array<number>
}

export class AdaptiveFeeConstants {
  readonly filterPeriod: number
  readonly decayPeriod: number
  readonly reductionFactor: number
  readonly adaptiveFeeControlFactor: number
  readonly maxVolatilityAccumulator: number
  readonly tickGroupSize: number
  readonly majorSwapThresholdTicks: number
  readonly reserved: Array<number>

  constructor(fields: AdaptiveFeeConstantsFields) {
    this.filterPeriod = fields.filterPeriod
    this.decayPeriod = fields.decayPeriod
    this.reductionFactor = fields.reductionFactor
    this.adaptiveFeeControlFactor = fields.adaptiveFeeControlFactor
    this.maxVolatilityAccumulator = fields.maxVolatilityAccumulator
    this.tickGroupSize = fields.tickGroupSize
    this.majorSwapThresholdTicks = fields.majorSwapThresholdTicks
    this.reserved = fields.reserved
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.u16("filterPeriod"),
        borsh.u16("decayPeriod"),
        borsh.u16("reductionFactor"),
        borsh.u32("adaptiveFeeControlFactor"),
        borsh.u32("maxVolatilityAccumulator"),
        borsh.u16("tickGroupSize"),
        borsh.u16("majorSwapThresholdTicks"),
        borsh.array(borsh.u8(), 16, "reserved"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new AdaptiveFeeConstants({
      filterPeriod: obj.filterPeriod,
      decayPeriod: obj.decayPeriod,
      reductionFactor: obj.reductionFactor,
      adaptiveFeeControlFactor: obj.adaptiveFeeControlFactor,
      maxVolatilityAccumulator: obj.maxVolatilityAccumulator,
      tickGroupSize: obj.tickGroupSize,
      majorSwapThresholdTicks: obj.majorSwapThresholdTicks,
      reserved: obj.reserved,
    })
  }

  static toEncodable(fields: AdaptiveFeeConstantsFields) {
    return {
      filterPeriod: fields.filterPeriod,
      decayPeriod: fields.decayPeriod,
      reductionFactor: fields.reductionFactor,
      adaptiveFeeControlFactor: fields.adaptiveFeeControlFactor,
      maxVolatilityAccumulator: fields.maxVolatilityAccumulator,
      tickGroupSize: fields.tickGroupSize,
      majorSwapThresholdTicks: fields.majorSwapThresholdTicks,
      reserved: fields.reserved,
    }
  }

  toJSON(): AdaptiveFeeConstantsJSON {
    return {
      filterPeriod: this.filterPeriod,
      decayPeriod: this.decayPeriod,
      reductionFactor: this.reductionFactor,
      adaptiveFeeControlFactor: this.adaptiveFeeControlFactor,
      maxVolatilityAccumulator: this.maxVolatilityAccumulator,
      tickGroupSize: this.tickGroupSize,
      majorSwapThresholdTicks: this.majorSwapThresholdTicks,
      reserved: this.reserved,
    }
  }

  static fromJSON(obj: AdaptiveFeeConstantsJSON): AdaptiveFeeConstants {
    return new AdaptiveFeeConstants({
      filterPeriod: obj.filterPeriod,
      decayPeriod: obj.decayPeriod,
      reductionFactor: obj.reductionFactor,
      adaptiveFeeControlFactor: obj.adaptiveFeeControlFactor,
      maxVolatilityAccumulator: obj.maxVolatilityAccumulator,
      tickGroupSize: obj.tickGroupSize,
      majorSwapThresholdTicks: obj.majorSwapThresholdTicks,
      reserved: obj.reserved,
    })
  }

  toEncodable() {
    return AdaptiveFeeConstants.toEncodable(this)
  }
}
