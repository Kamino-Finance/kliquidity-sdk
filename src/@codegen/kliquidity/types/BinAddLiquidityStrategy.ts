/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export type UniformFields = {
  currentBinIndex: number
  lowerBinIndex: number
  upperBinIndex: number
  amountXtoDeposit: bigint
  amountYtoDeposit: bigint
  xCurrentBin: bigint
  yCurrentBin: bigint
}
export type UniformValue = {
  currentBinIndex: number
  lowerBinIndex: number
  upperBinIndex: number
  amountXtoDeposit: bigint
  amountYtoDeposit: bigint
  xCurrentBin: bigint
  yCurrentBin: bigint
}

export interface UniformJSON {
  kind: "Uniform"
  value: {
    currentBinIndex: number
    lowerBinIndex: number
    upperBinIndex: number
    amountXtoDeposit: string
    amountYtoDeposit: string
    xCurrentBin: string
    yCurrentBin: string
  }
}

export class Uniform {
  static readonly discriminator = 0
  static readonly kind = "Uniform"
  readonly discriminator = 0
  readonly kind = "Uniform"
  readonly value: UniformValue

  constructor(value: UniformFields) {
    this.value = {
      currentBinIndex: value.currentBinIndex,
      lowerBinIndex: value.lowerBinIndex,
      upperBinIndex: value.upperBinIndex,
      amountXtoDeposit: value.amountXtoDeposit,
      amountYtoDeposit: value.amountYtoDeposit,
      xCurrentBin: value.xCurrentBin,
      yCurrentBin: value.yCurrentBin,
    }
  }

  toJSON(): UniformJSON {
    return {
      kind: "Uniform",
      value: {
        currentBinIndex: this.value.currentBinIndex,
        lowerBinIndex: this.value.lowerBinIndex,
        upperBinIndex: this.value.upperBinIndex,
        amountXtoDeposit: this.value.amountXtoDeposit.toString(),
        amountYtoDeposit: this.value.amountYtoDeposit.toString(),
        xCurrentBin: this.value.xCurrentBin.toString(),
        yCurrentBin: this.value.yCurrentBin.toString(),
      },
    }
  }

  toEncodable() {
    return {
      Uniform: {
        currentBinIndex: this.value.currentBinIndex,
        lowerBinIndex: this.value.lowerBinIndex,
        upperBinIndex: this.value.upperBinIndex,
        amountXToDeposit: this.value.amountXtoDeposit,
        amountYToDeposit: this.value.amountYtoDeposit,
        xCurrentBin: this.value.xCurrentBin,
        yCurrentBin: this.value.yCurrentBin,
      },
    }
  }
}

export type CurrentTickFields = [number]
export type CurrentTickValue = [number]

export interface CurrentTickJSON {
  kind: "CurrentTick"
  value: [number]
}

export class CurrentTick {
  static readonly discriminator = 1
  static readonly kind = "CurrentTick"
  readonly discriminator = 1
  readonly kind = "CurrentTick"
  readonly value: CurrentTickValue

  constructor(value: CurrentTickFields) {
    this.value = [value[0]]
  }

  toJSON(): CurrentTickJSON {
    return {
      kind: "CurrentTick",
      value: [this.value[0]],
    }
  }

  toEncodable() {
    return {
      CurrentTick: {
        _0: this.value[0],
      },
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromDecoded(obj: any): types.BinAddLiquidityStrategyKind {
  if (typeof obj !== "object") {
    throw new Error("Invalid enum object")
  }

  if ("Uniform" in obj) {
    const val = obj["Uniform"]
    return new Uniform({
      currentBinIndex: val["currentBinIndex"],
      lowerBinIndex: val["lowerBinIndex"],
      upperBinIndex: val["upperBinIndex"],
      amountXtoDeposit: val["amountXToDeposit"],
      amountYtoDeposit: val["amountYToDeposit"],
      xCurrentBin: val["xCurrentBin"],
      yCurrentBin: val["yCurrentBin"],
    })
  }
  if ("CurrentTick" in obj) {
    const val = obj["CurrentTick"]
    return new CurrentTick([val["_0"]])
  }

  throw new Error("Invalid enum object")
}

export function fromJSON(
  obj: types.BinAddLiquidityStrategyJSON
): types.BinAddLiquidityStrategyKind {
  switch (obj.kind) {
    case "Uniform": {
      return new Uniform({
        currentBinIndex: obj.value.currentBinIndex,
        lowerBinIndex: obj.value.lowerBinIndex,
        upperBinIndex: obj.value.upperBinIndex,
        amountXtoDeposit: BigInt(obj.value.amountXtoDeposit),
        amountYtoDeposit: BigInt(obj.value.amountYtoDeposit),
        xCurrentBin: BigInt(obj.value.xCurrentBin),
        yCurrentBin: BigInt(obj.value.yCurrentBin),
      })
    }
    case "CurrentTick": {
      return new CurrentTick([obj.value[0]])
    }
  }
}

export function layout(property?: string) {
  const ret = borsh.rustEnum([
    borsh.struct(
      [
        borsh.i32("currentBinIndex"),
        borsh.i32("lowerBinIndex"),
        borsh.i32("upperBinIndex"),
        borsh.u64("amountXToDeposit"),
        borsh.u64("amountYToDeposit"),
        borsh.u64("xCurrentBin"),
        borsh.u64("yCurrentBin"),
      ],
      "Uniform"
    ),
    borsh.struct([borsh.i32("_0")], "CurrentTick"),
  ])
  if (property !== undefined) {
    return ret.replicate(property)
  }
  return ret
}
