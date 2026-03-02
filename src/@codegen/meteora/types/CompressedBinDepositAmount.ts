/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface CompressedBinDepositAmountFields {
  binId: number
  amount: number
}

export interface CompressedBinDepositAmountJSON {
  binId: number
  amount: number
}

export class CompressedBinDepositAmount {
  readonly binId: number
  readonly amount: number

  constructor(fields: CompressedBinDepositAmountFields) {
    this.binId = fields.binId
    this.amount = fields.amount
  }

  static layout(property?: string) {
    return borsh.struct([borsh.i32("binId"), borsh.u32("amount")], property)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new CompressedBinDepositAmount({
      binId: obj.binId,
      amount: obj.amount,
    })
  }

  static toEncodable(fields: CompressedBinDepositAmountFields) {
    return {
      binId: fields.binId,
      amount: fields.amount,
    }
  }

  toJSON(): CompressedBinDepositAmountJSON {
    return {
      binId: this.binId,
      amount: this.amount,
    }
  }

  static fromJSON(
    obj: CompressedBinDepositAmountJSON
  ): CompressedBinDepositAmount {
    return new CompressedBinDepositAmount({
      binId: obj.binId,
      amount: obj.amount,
    })
  }

  toEncodable() {
    return CompressedBinDepositAmount.toEncodable(this)
  }
}
