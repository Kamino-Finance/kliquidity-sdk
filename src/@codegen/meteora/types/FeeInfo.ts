/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface FeeInfoFields {
  feeXPerTokenComplete: bigint
  feeYPerTokenComplete: bigint
  feeXPending: bigint
  feeYPending: bigint
}

export interface FeeInfoJSON {
  feeXPerTokenComplete: string
  feeYPerTokenComplete: string
  feeXPending: string
  feeYPending: string
}

export class FeeInfo {
  readonly feeXPerTokenComplete: bigint
  readonly feeYPerTokenComplete: bigint
  readonly feeXPending: bigint
  readonly feeYPending: bigint

  constructor(fields: FeeInfoFields) {
    this.feeXPerTokenComplete = fields.feeXPerTokenComplete
    this.feeYPerTokenComplete = fields.feeYPerTokenComplete
    this.feeXPending = fields.feeXPending
    this.feeYPending = fields.feeYPending
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.u128("feeXPerTokenComplete"),
        borsh.u128("feeYPerTokenComplete"),
        borsh.u64("feeXPending"),
        borsh.u64("feeYPending"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new FeeInfo({
      feeXPerTokenComplete: obj.feeXPerTokenComplete,
      feeYPerTokenComplete: obj.feeYPerTokenComplete,
      feeXPending: obj.feeXPending,
      feeYPending: obj.feeYPending,
    })
  }

  static toEncodable(fields: FeeInfoFields) {
    return {
      feeXPerTokenComplete: fields.feeXPerTokenComplete,
      feeYPerTokenComplete: fields.feeYPerTokenComplete,
      feeXPending: fields.feeXPending,
      feeYPending: fields.feeYPending,
    }
  }

  toJSON(): FeeInfoJSON {
    return {
      feeXPerTokenComplete: this.feeXPerTokenComplete.toString(),
      feeYPerTokenComplete: this.feeYPerTokenComplete.toString(),
      feeXPending: this.feeXPending.toString(),
      feeYPending: this.feeYPending.toString(),
    }
  }

  static fromJSON(obj: FeeInfoJSON): FeeInfo {
    return new FeeInfo({
      feeXPerTokenComplete: BigInt(obj.feeXPerTokenComplete),
      feeYPerTokenComplete: BigInt(obj.feeYPerTokenComplete),
      feeXPending: BigInt(obj.feeXPending),
      feeYPending: BigInt(obj.feeYPending),
    })
  }

  toEncodable() {
    return FeeInfo.toEncodable(this)
  }
}
