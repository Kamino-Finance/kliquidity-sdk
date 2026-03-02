/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface PositionRewardInfoFields {
  growthInsideLastX64: bigint
  rewardAmountOwed: bigint
}

export interface PositionRewardInfoJSON {
  growthInsideLastX64: string
  rewardAmountOwed: string
}

export class PositionRewardInfo {
  readonly growthInsideLastX64: bigint
  readonly rewardAmountOwed: bigint

  constructor(fields: PositionRewardInfoFields) {
    this.growthInsideLastX64 = fields.growthInsideLastX64
    this.rewardAmountOwed = fields.rewardAmountOwed
  }

  static layout(property?: string) {
    return borsh.struct(
      [borsh.u128("growthInsideLastX64"), borsh.u64("rewardAmountOwed")],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new PositionRewardInfo({
      growthInsideLastX64: obj.growthInsideLastX64,
      rewardAmountOwed: obj.rewardAmountOwed,
    })
  }

  static toEncodable(fields: PositionRewardInfoFields) {
    return {
      growthInsideLastX64: fields.growthInsideLastX64,
      rewardAmountOwed: fields.rewardAmountOwed,
    }
  }

  toJSON(): PositionRewardInfoJSON {
    return {
      growthInsideLastX64: this.growthInsideLastX64.toString(),
      rewardAmountOwed: this.rewardAmountOwed.toString(),
    }
  }

  static fromJSON(obj: PositionRewardInfoJSON): PositionRewardInfo {
    return new PositionRewardInfo({
      growthInsideLastX64: BigInt(obj.growthInsideLastX64),
      rewardAmountOwed: BigInt(obj.rewardAmountOwed),
    })
  }

  toEncodable() {
    return PositionRewardInfo.toEncodable(this)
  }
}
