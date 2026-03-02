/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface PriceFields {
  value: bigint
  exp: bigint
}

export interface PriceJSON {
  value: string
  exp: string
}

export class Price {
  readonly value: bigint
  readonly exp: bigint

  constructor(fields: PriceFields) {
    this.value = fields.value
    this.exp = fields.exp
  }

  static layout(property?: string) {
    return borsh.struct([borsh.u64("value"), borsh.u64("exp")], property)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new Price({
      value: obj.value,
      exp: obj.exp,
    })
  }

  static toEncodable(fields: PriceFields) {
    return {
      value: fields.value,
      exp: fields.exp,
    }
  }

  toJSON(): PriceJSON {
    return {
      value: this.value.toString(),
      exp: this.exp.toString(),
    }
  }

  static fromJSON(obj: PriceJSON): Price {
    return new Price({
      value: BigInt(obj.value),
      exp: BigInt(obj.exp),
    })
  }

  toEncodable() {
    return Price.toEncodable(this)
  }
}
