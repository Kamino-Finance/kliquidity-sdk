/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface WithdrawalCapsFields {
  configCapacity: bigint
  currentTotal: bigint
  lastIntervalStartTimestamp: bigint
  configIntervalLengthSeconds: bigint
}

export interface WithdrawalCapsJSON {
  configCapacity: string
  currentTotal: string
  lastIntervalStartTimestamp: string
  configIntervalLengthSeconds: string
}

export class WithdrawalCaps {
  readonly configCapacity: bigint
  readonly currentTotal: bigint
  readonly lastIntervalStartTimestamp: bigint
  readonly configIntervalLengthSeconds: bigint

  constructor(fields: WithdrawalCapsFields) {
    this.configCapacity = fields.configCapacity
    this.currentTotal = fields.currentTotal
    this.lastIntervalStartTimestamp = fields.lastIntervalStartTimestamp
    this.configIntervalLengthSeconds = fields.configIntervalLengthSeconds
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.i64("configCapacity"),
        borsh.i64("currentTotal"),
        borsh.u64("lastIntervalStartTimestamp"),
        borsh.u64("configIntervalLengthSeconds"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new WithdrawalCaps({
      configCapacity: obj.configCapacity,
      currentTotal: obj.currentTotal,
      lastIntervalStartTimestamp: obj.lastIntervalStartTimestamp,
      configIntervalLengthSeconds: obj.configIntervalLengthSeconds,
    })
  }

  static toEncodable(fields: WithdrawalCapsFields) {
    return {
      configCapacity: fields.configCapacity,
      currentTotal: fields.currentTotal,
      lastIntervalStartTimestamp: fields.lastIntervalStartTimestamp,
      configIntervalLengthSeconds: fields.configIntervalLengthSeconds,
    }
  }

  toJSON(): WithdrawalCapsJSON {
    return {
      configCapacity: this.configCapacity.toString(),
      currentTotal: this.currentTotal.toString(),
      lastIntervalStartTimestamp: this.lastIntervalStartTimestamp.toString(),
      configIntervalLengthSeconds: this.configIntervalLengthSeconds.toString(),
    }
  }

  static fromJSON(obj: WithdrawalCapsJSON): WithdrawalCaps {
    return new WithdrawalCaps({
      configCapacity: BigInt(obj.configCapacity),
      currentTotal: BigInt(obj.currentTotal),
      lastIntervalStartTimestamp: BigInt(obj.lastIntervalStartTimestamp),
      configIntervalLengthSeconds: BigInt(obj.configIntervalLengthSeconds),
    })
  }

  toEncodable() {
    return WithdrawalCaps.toEncodable(this)
  }
}
