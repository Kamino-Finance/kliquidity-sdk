/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface BinLiquidityReductionFields {
  binId: number
  bpsToRemove: number
}

export interface BinLiquidityReductionJSON {
  binId: number
  bpsToRemove: number
}

export class BinLiquidityReduction {
  readonly binId: number
  readonly bpsToRemove: number

  constructor(fields: BinLiquidityReductionFields) {
    this.binId = fields.binId
    this.bpsToRemove = fields.bpsToRemove
  }

  static layout(property?: string) {
    return borsh.struct(
      [borsh.i32("binId"), borsh.u16("bpsToRemove")],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new BinLiquidityReduction({
      binId: obj.binId,
      bpsToRemove: obj.bpsToRemove,
    })
  }

  static toEncodable(fields: BinLiquidityReductionFields) {
    return {
      binId: fields.binId,
      bpsToRemove: fields.bpsToRemove,
    }
  }

  toJSON(): BinLiquidityReductionJSON {
    return {
      binId: this.binId,
      bpsToRemove: this.bpsToRemove,
    }
  }

  static fromJSON(obj: BinLiquidityReductionJSON): BinLiquidityReduction {
    return new BinLiquidityReduction({
      binId: obj.binId,
      bpsToRemove: obj.bpsToRemove,
    })
  }

  toEncodable() {
    return BinLiquidityReduction.toEncodable(this)
  }
}
