/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface AddLiquiditySingleSidePreciseParameterFields {
  bins: Array<types.CompressedBinDepositAmountFields>
  decompressMultiplier: bigint
}

export interface AddLiquiditySingleSidePreciseParameterJSON {
  bins: Array<types.CompressedBinDepositAmountJSON>
  decompressMultiplier: string
}

export class AddLiquiditySingleSidePreciseParameter {
  readonly bins: Array<types.CompressedBinDepositAmount>
  readonly decompressMultiplier: bigint

  constructor(fields: AddLiquiditySingleSidePreciseParameterFields) {
    this.bins = fields.bins.map(
      (item) => new types.CompressedBinDepositAmount({ ...item })
    )
    this.decompressMultiplier = fields.decompressMultiplier
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.vec(types.CompressedBinDepositAmount.layout(), "bins"),
        borsh.u64("decompressMultiplier"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new AddLiquiditySingleSidePreciseParameter({
      bins: obj.bins.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => types.CompressedBinDepositAmount.fromDecoded(item)
      ),
      decompressMultiplier: obj.decompressMultiplier,
    })
  }

  static toEncodable(fields: AddLiquiditySingleSidePreciseParameterFields) {
    return {
      bins: fields.bins.map((item) =>
        types.CompressedBinDepositAmount.toEncodable(item)
      ),
      decompressMultiplier: fields.decompressMultiplier,
    }
  }

  toJSON(): AddLiquiditySingleSidePreciseParameterJSON {
    return {
      bins: this.bins.map((item) => item.toJSON()),
      decompressMultiplier: this.decompressMultiplier.toString(),
    }
  }

  static fromJSON(
    obj: AddLiquiditySingleSidePreciseParameterJSON
  ): AddLiquiditySingleSidePreciseParameter {
    return new AddLiquiditySingleSidePreciseParameter({
      bins: obj.bins.map((item) =>
        types.CompressedBinDepositAmount.fromJSON(item)
      ),
      decompressMultiplier: BigInt(obj.decompressMultiplier),
    })
  }

  toEncodable() {
    return AddLiquiditySingleSidePreciseParameter.toEncodable(this)
  }
}
