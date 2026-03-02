/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface RebalancePricePercentageWithResetStateFields {
  lastRebalanceLowerResetPoolPrice: bigint
  lastRebalanceUpperResetPoolPrice: bigint
}

export interface RebalancePricePercentageWithResetStateJSON {
  lastRebalanceLowerResetPoolPrice: string
  lastRebalanceUpperResetPoolPrice: string
}

export class RebalancePricePercentageWithResetState {
  readonly lastRebalanceLowerResetPoolPrice: bigint
  readonly lastRebalanceUpperResetPoolPrice: bigint

  constructor(fields: RebalancePricePercentageWithResetStateFields) {
    this.lastRebalanceLowerResetPoolPrice =
      fields.lastRebalanceLowerResetPoolPrice
    this.lastRebalanceUpperResetPoolPrice =
      fields.lastRebalanceUpperResetPoolPrice
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.u128("lastRebalanceLowerResetPoolPrice"),
        borsh.u128("lastRebalanceUpperResetPoolPrice"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new RebalancePricePercentageWithResetState({
      lastRebalanceLowerResetPoolPrice: obj.lastRebalanceLowerResetPoolPrice,
      lastRebalanceUpperResetPoolPrice: obj.lastRebalanceUpperResetPoolPrice,
    })
  }

  static toEncodable(fields: RebalancePricePercentageWithResetStateFields) {
    return {
      lastRebalanceLowerResetPoolPrice: fields.lastRebalanceLowerResetPoolPrice,
      lastRebalanceUpperResetPoolPrice: fields.lastRebalanceUpperResetPoolPrice,
    }
  }

  toJSON(): RebalancePricePercentageWithResetStateJSON {
    return {
      lastRebalanceLowerResetPoolPrice:
        this.lastRebalanceLowerResetPoolPrice.toString(),
      lastRebalanceUpperResetPoolPrice:
        this.lastRebalanceUpperResetPoolPrice.toString(),
    }
  }

  static fromJSON(
    obj: RebalancePricePercentageWithResetStateJSON
  ): RebalancePricePercentageWithResetState {
    return new RebalancePricePercentageWithResetState({
      lastRebalanceLowerResetPoolPrice: BigInt(
        obj.lastRebalanceLowerResetPoolPrice
      ),
      lastRebalanceUpperResetPoolPrice: BigInt(
        obj.lastRebalanceUpperResetPoolPrice
      ),
    })
  }

  toEncodable() {
    return RebalancePricePercentageWithResetState.toEncodable(this)
  }
}
