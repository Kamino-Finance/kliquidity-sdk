import { address, Address } from "@solana/kit" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"
import { borshAddress } from "../utils"

export interface RebalanceRawFields {
  params: Array<number>
  state: Array<number>
  referencePriceType: number
}

export interface RebalanceRawJSON {
  params: Array<number>
  state: Array<number>
  referencePriceType: number
}

export class RebalanceRaw {
  readonly params: Array<number>
  readonly state: Array<number>
  readonly referencePriceType: number

  constructor(fields: RebalanceRawFields) {
    this.params = fields.params
    this.state = fields.state
    this.referencePriceType = fields.referencePriceType
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.array(borsh.u8(), 128, "params"),
        borsh.array(borsh.u8(), 256, "state"),
        borsh.u8("referencePriceType"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new RebalanceRaw({
      params: obj.params,
      state: obj.state,
      referencePriceType: obj.referencePriceType,
    })
  }

  static toEncodable(fields: RebalanceRawFields) {
    return {
      params: fields.params,
      state: fields.state,
      referencePriceType: fields.referencePriceType,
    }
  }

  toJSON(): RebalanceRawJSON {
    return {
      params: this.params,
      state: this.state,
      referencePriceType: this.referencePriceType,
    }
  }

  static fromJSON(obj: RebalanceRawJSON): RebalanceRaw {
    return new RebalanceRaw({
      params: obj.params,
      state: obj.state,
      referencePriceType: obj.referencePriceType,
    })
  }

  toEncodable() {
    return RebalanceRaw.toEncodable(this)
  }
}
