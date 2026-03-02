/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface RebalancePricePercentageStateFields {
  lastRebalanceLowerPoolPrice: bigint
  lastRebalanceUpperPoolPrice: bigint
}

export interface RebalancePricePercentageStateJSON {
  lastRebalanceLowerPoolPrice: string
  lastRebalanceUpperPoolPrice: string
}

export class RebalancePricePercentageState {
  readonly lastRebalanceLowerPoolPrice: bigint
  readonly lastRebalanceUpperPoolPrice: bigint

  constructor(fields: RebalancePricePercentageStateFields) {
    this.lastRebalanceLowerPoolPrice = fields.lastRebalanceLowerPoolPrice
    this.lastRebalanceUpperPoolPrice = fields.lastRebalanceUpperPoolPrice
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.u128("lastRebalanceLowerPoolPrice"),
        borsh.u128("lastRebalanceUpperPoolPrice"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new RebalancePricePercentageState({
      lastRebalanceLowerPoolPrice: obj.lastRebalanceLowerPoolPrice,
      lastRebalanceUpperPoolPrice: obj.lastRebalanceUpperPoolPrice,
    })
  }

  static toEncodable(fields: RebalancePricePercentageStateFields) {
    return {
      lastRebalanceLowerPoolPrice: fields.lastRebalanceLowerPoolPrice,
      lastRebalanceUpperPoolPrice: fields.lastRebalanceUpperPoolPrice,
    }
  }

  toJSON(): RebalancePricePercentageStateJSON {
    return {
      lastRebalanceLowerPoolPrice: this.lastRebalanceLowerPoolPrice.toString(),
      lastRebalanceUpperPoolPrice: this.lastRebalanceUpperPoolPrice.toString(),
    }
  }

  static fromJSON(
    obj: RebalancePricePercentageStateJSON
  ): RebalancePricePercentageState {
    return new RebalancePricePercentageState({
      lastRebalanceLowerPoolPrice: BigInt(obj.lastRebalanceLowerPoolPrice),
      lastRebalanceUpperPoolPrice: BigInt(obj.lastRebalanceUpperPoolPrice),
    })
  }

  toEncodable() {
    return RebalancePricePercentageState.toEncodable(this)
  }
}
