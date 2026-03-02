/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface TickStateFields {
  tick: number
  liquidityNet: bigint
  liquidityGross: bigint
  feeGrowthOutside0X64: bigint
  feeGrowthOutside1X64: bigint
  rewardGrowthsOutsideX64: Array<bigint>
  padding: Array<number>
}

export interface TickStateJSON {
  tick: number
  liquidityNet: string
  liquidityGross: string
  feeGrowthOutside0X64: string
  feeGrowthOutside1X64: string
  rewardGrowthsOutsideX64: Array<string>
  padding: Array<number>
}

export class TickState {
  readonly tick: number
  readonly liquidityNet: bigint
  readonly liquidityGross: bigint
  readonly feeGrowthOutside0X64: bigint
  readonly feeGrowthOutside1X64: bigint
  readonly rewardGrowthsOutsideX64: Array<bigint>
  readonly padding: Array<number>

  constructor(fields: TickStateFields) {
    this.tick = fields.tick
    this.liquidityNet = fields.liquidityNet
    this.liquidityGross = fields.liquidityGross
    this.feeGrowthOutside0X64 = fields.feeGrowthOutside0X64
    this.feeGrowthOutside1X64 = fields.feeGrowthOutside1X64
    this.rewardGrowthsOutsideX64 = fields.rewardGrowthsOutsideX64
    this.padding = fields.padding
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.i32("tick"),
        borsh.i128("liquidityNet"),
        borsh.u128("liquidityGross"),
        borsh.u128("feeGrowthOutside0X64"),
        borsh.u128("feeGrowthOutside1X64"),
        borsh.array(borsh.u128(), 3, "rewardGrowthsOutsideX64"),
        borsh.array(borsh.u32(), 13, "padding"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new TickState({
      tick: obj.tick,
      liquidityNet: obj.liquidityNet,
      liquidityGross: obj.liquidityGross,
      feeGrowthOutside0X64: obj.feeGrowthOutside0X64,
      feeGrowthOutside1X64: obj.feeGrowthOutside1X64,
      rewardGrowthsOutsideX64: obj.rewardGrowthsOutsideX64,
      padding: obj.padding,
    })
  }

  static toEncodable(fields: TickStateFields) {
    return {
      tick: fields.tick,
      liquidityNet: fields.liquidityNet,
      liquidityGross: fields.liquidityGross,
      feeGrowthOutside0X64: fields.feeGrowthOutside0X64,
      feeGrowthOutside1X64: fields.feeGrowthOutside1X64,
      rewardGrowthsOutsideX64: fields.rewardGrowthsOutsideX64,
      padding: fields.padding,
    }
  }

  toJSON(): TickStateJSON {
    return {
      tick: this.tick,
      liquidityNet: this.liquidityNet.toString(),
      liquidityGross: this.liquidityGross.toString(),
      feeGrowthOutside0X64: this.feeGrowthOutside0X64.toString(),
      feeGrowthOutside1X64: this.feeGrowthOutside1X64.toString(),
      rewardGrowthsOutsideX64: this.rewardGrowthsOutsideX64.map((item) =>
        item.toString()
      ),
      padding: this.padding,
    }
  }

  static fromJSON(obj: TickStateJSON): TickState {
    return new TickState({
      tick: obj.tick,
      liquidityNet: BigInt(obj.liquidityNet),
      liquidityGross: BigInt(obj.liquidityGross),
      feeGrowthOutside0X64: BigInt(obj.feeGrowthOutside0X64),
      feeGrowthOutside1X64: BigInt(obj.feeGrowthOutside1X64),
      rewardGrowthsOutsideX64: obj.rewardGrowthsOutsideX64.map((item) =>
        BigInt(item)
      ),
      padding: obj.padding,
    })
  }

  toEncodable() {
    return TickState.toEncodable(this)
  }
}
