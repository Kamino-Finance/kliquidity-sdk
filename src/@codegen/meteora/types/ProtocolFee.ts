/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface ProtocolFeeFields {
  amountX: bigint
  amountY: bigint
}

export interface ProtocolFeeJSON {
  amountX: string
  amountY: string
}

export class ProtocolFee {
  readonly amountX: bigint
  readonly amountY: bigint

  constructor(fields: ProtocolFeeFields) {
    this.amountX = fields.amountX
    this.amountY = fields.amountY
  }

  static layout(property?: string) {
    return borsh.struct([borsh.u64("amountX"), borsh.u64("amountY")], property)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new ProtocolFee({
      amountX: obj.amountX,
      amountY: obj.amountY,
    })
  }

  static toEncodable(fields: ProtocolFeeFields) {
    return {
      amountX: fields.amountX,
      amountY: fields.amountY,
    }
  }

  toJSON(): ProtocolFeeJSON {
    return {
      amountX: this.amountX.toString(),
      amountY: this.amountY.toString(),
    }
  }

  static fromJSON(obj: ProtocolFeeJSON): ProtocolFee {
    return new ProtocolFee({
      amountX: BigInt(obj.amountX),
      amountY: BigInt(obj.amountY),
    })
  }

  toEncodable() {
    return ProtocolFee.toEncodable(this)
  }
}
