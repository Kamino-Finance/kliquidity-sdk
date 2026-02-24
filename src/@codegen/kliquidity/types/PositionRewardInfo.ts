/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface PositionRewardInfoFields {
  growthInsideCheckpoint: bigint
  amountOwed: bigint
}

export interface PositionRewardInfoJSON {
  growthInsideCheckpoint: string
  amountOwed: string
}

export class PositionRewardInfo {
  readonly growthInsideCheckpoint: bigint
  readonly amountOwed: bigint

  constructor(fields: PositionRewardInfoFields) {
    this.growthInsideCheckpoint = fields.growthInsideCheckpoint
    this.amountOwed = fields.amountOwed
  }

  static layout(property?: string) {
    return borsh.struct(
      [borsh.u128("growthInsideCheckpoint"), borsh.u64("amountOwed")],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new PositionRewardInfo({
      growthInsideCheckpoint: obj.growthInsideCheckpoint,
      amountOwed: obj.amountOwed,
    })
  }

  static toEncodable(fields: PositionRewardInfoFields) {
    return {
      growthInsideCheckpoint: fields.growthInsideCheckpoint,
      amountOwed: fields.amountOwed,
    }
  }

  toJSON(): PositionRewardInfoJSON {
    return {
      growthInsideCheckpoint: this.growthInsideCheckpoint.toString(),
      amountOwed: this.amountOwed.toString(),
    }
  }

  static fromJSON(obj: PositionRewardInfoJSON): PositionRewardInfo {
    return new PositionRewardInfo({
      growthInsideCheckpoint: BigInt(obj.growthInsideCheckpoint),
      amountOwed: BigInt(obj.amountOwed),
    })
  }

  toEncodable() {
    return PositionRewardInfo.toEncodable(this)
  }
}
