/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface LiquidityParameterByWeightFields {
  /** Amount of X token to deposit */
  amountX: bigint
  /** Amount of Y token to deposit */
  amountY: bigint
  /** Active bin that integrator observe off-chain */
  activeId: number
  /** max active bin slippage allowed */
  maxActiveBinSlippage: number
  /** Liquidity distribution to each bins */
  binLiquidityDist: Array<types.BinLiquidityDistributionByWeightFields>
}

export interface LiquidityParameterByWeightJSON {
  /** Amount of X token to deposit */
  amountX: string
  /** Amount of Y token to deposit */
  amountY: string
  /** Active bin that integrator observe off-chain */
  activeId: number
  /** max active bin slippage allowed */
  maxActiveBinSlippage: number
  /** Liquidity distribution to each bins */
  binLiquidityDist: Array<types.BinLiquidityDistributionByWeightJSON>
}

export class LiquidityParameterByWeight {
  /** Amount of X token to deposit */
  readonly amountX: bigint
  /** Amount of Y token to deposit */
  readonly amountY: bigint
  /** Active bin that integrator observe off-chain */
  readonly activeId: number
  /** max active bin slippage allowed */
  readonly maxActiveBinSlippage: number
  /** Liquidity distribution to each bins */
  readonly binLiquidityDist: Array<types.BinLiquidityDistributionByWeight>

  constructor(fields: LiquidityParameterByWeightFields) {
    this.amountX = fields.amountX
    this.amountY = fields.amountY
    this.activeId = fields.activeId
    this.maxActiveBinSlippage = fields.maxActiveBinSlippage
    this.binLiquidityDist = fields.binLiquidityDist.map(
      (item) => new types.BinLiquidityDistributionByWeight({ ...item })
    )
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.u64("amountX"),
        borsh.u64("amountY"),
        borsh.i32("activeId"),
        borsh.i32("maxActiveBinSlippage"),
        borsh.vec(
          types.BinLiquidityDistributionByWeight.layout(),
          "binLiquidityDist"
        ),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new LiquidityParameterByWeight({
      amountX: obj.amountX,
      amountY: obj.amountY,
      activeId: obj.activeId,
      maxActiveBinSlippage: obj.maxActiveBinSlippage,
      binLiquidityDist: obj.binLiquidityDist.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => types.BinLiquidityDistributionByWeight.fromDecoded(item)
      ),
    })
  }

  static toEncodable(fields: LiquidityParameterByWeightFields) {
    return {
      amountX: fields.amountX,
      amountY: fields.amountY,
      activeId: fields.activeId,
      maxActiveBinSlippage: fields.maxActiveBinSlippage,
      binLiquidityDist: fields.binLiquidityDist.map((item) =>
        types.BinLiquidityDistributionByWeight.toEncodable(item)
      ),
    }
  }

  toJSON(): LiquidityParameterByWeightJSON {
    return {
      amountX: this.amountX.toString(),
      amountY: this.amountY.toString(),
      activeId: this.activeId,
      maxActiveBinSlippage: this.maxActiveBinSlippage,
      binLiquidityDist: this.binLiquidityDist.map((item) => item.toJSON()),
    }
  }

  static fromJSON(
    obj: LiquidityParameterByWeightJSON
  ): LiquidityParameterByWeight {
    return new LiquidityParameterByWeight({
      amountX: BigInt(obj.amountX),
      amountY: BigInt(obj.amountY),
      activeId: obj.activeId,
      maxActiveBinSlippage: obj.maxActiveBinSlippage,
      binLiquidityDist: obj.binLiquidityDist.map((item) =>
        types.BinLiquidityDistributionByWeight.fromJSON(item)
      ),
    })
  }

  toEncodable() {
    return LiquidityParameterByWeight.toEncodable(this)
  }
}
