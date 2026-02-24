/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface TickFields {
  initialized: boolean
  liquidityNet: bigint
  liquidityGross: bigint
  feeGrowthOutsideA: bigint
  feeGrowthOutsideB: bigint
  rewardGrowthsOutside: Array<bigint>
}

export interface TickJSON {
  initialized: boolean
  liquidityNet: string
  liquidityGross: string
  feeGrowthOutsideA: string
  feeGrowthOutsideB: string
  rewardGrowthsOutside: Array<string>
}

export class Tick {
  readonly initialized: boolean
  readonly liquidityNet: bigint
  readonly liquidityGross: bigint
  readonly feeGrowthOutsideA: bigint
  readonly feeGrowthOutsideB: bigint
  readonly rewardGrowthsOutside: Array<bigint>

  constructor(fields: TickFields) {
    this.initialized = fields.initialized
    this.liquidityNet = fields.liquidityNet
    this.liquidityGross = fields.liquidityGross
    this.feeGrowthOutsideA = fields.feeGrowthOutsideA
    this.feeGrowthOutsideB = fields.feeGrowthOutsideB
    this.rewardGrowthsOutside = fields.rewardGrowthsOutside
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.bool("initialized"),
        borsh.i128("liquidityNet"),
        borsh.u128("liquidityGross"),
        borsh.u128("feeGrowthOutsideA"),
        borsh.u128("feeGrowthOutsideB"),
        borsh.array(borsh.u128(), 3, "rewardGrowthsOutside"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new Tick({
      initialized: obj.initialized,
      liquidityNet: obj.liquidityNet,
      liquidityGross: obj.liquidityGross,
      feeGrowthOutsideA: obj.feeGrowthOutsideA,
      feeGrowthOutsideB: obj.feeGrowthOutsideB,
      rewardGrowthsOutside: obj.rewardGrowthsOutside,
    })
  }

  static toEncodable(fields: TickFields) {
    return {
      initialized: fields.initialized,
      liquidityNet: fields.liquidityNet,
      liquidityGross: fields.liquidityGross,
      feeGrowthOutsideA: fields.feeGrowthOutsideA,
      feeGrowthOutsideB: fields.feeGrowthOutsideB,
      rewardGrowthsOutside: fields.rewardGrowthsOutside,
    }
  }

  toJSON(): TickJSON {
    return {
      initialized: this.initialized,
      liquidityNet: this.liquidityNet.toString(),
      liquidityGross: this.liquidityGross.toString(),
      feeGrowthOutsideA: this.feeGrowthOutsideA.toString(),
      feeGrowthOutsideB: this.feeGrowthOutsideB.toString(),
      rewardGrowthsOutside: this.rewardGrowthsOutside.map((item) =>
        item.toString()
      ),
    }
  }

  static fromJSON(obj: TickJSON): Tick {
    return new Tick({
      initialized: obj.initialized,
      liquidityNet: BigInt(obj.liquidityNet),
      liquidityGross: BigInt(obj.liquidityGross),
      feeGrowthOutsideA: BigInt(obj.feeGrowthOutsideA),
      feeGrowthOutsideB: BigInt(obj.feeGrowthOutsideB),
      rewardGrowthsOutside: obj.rewardGrowthsOutside.map((item) =>
        BigInt(item)
      ),
    })
  }

  toEncodable() {
    return Tick.toEncodable(this)
  }
}
