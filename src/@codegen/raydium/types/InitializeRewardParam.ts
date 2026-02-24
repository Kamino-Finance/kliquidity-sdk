/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface InitializeRewardParamFields {
  openTime: bigint
  endTime: bigint
  emissionsPerSecondX64: bigint
}

export interface InitializeRewardParamJSON {
  openTime: string
  endTime: string
  emissionsPerSecondX64: string
}

export class InitializeRewardParam {
  readonly openTime: bigint
  readonly endTime: bigint
  readonly emissionsPerSecondX64: bigint

  constructor(fields: InitializeRewardParamFields) {
    this.openTime = fields.openTime
    this.endTime = fields.endTime
    this.emissionsPerSecondX64 = fields.emissionsPerSecondX64
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.u64("openTime"),
        borsh.u64("endTime"),
        borsh.u128("emissionsPerSecondX64"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new InitializeRewardParam({
      openTime: obj.openTime,
      endTime: obj.endTime,
      emissionsPerSecondX64: obj.emissionsPerSecondX64,
    })
  }

  static toEncodable(fields: InitializeRewardParamFields) {
    return {
      openTime: fields.openTime,
      endTime: fields.endTime,
      emissionsPerSecondX64: fields.emissionsPerSecondX64,
    }
  }

  toJSON(): InitializeRewardParamJSON {
    return {
      openTime: this.openTime.toString(),
      endTime: this.endTime.toString(),
      emissionsPerSecondX64: this.emissionsPerSecondX64.toString(),
    }
  }

  static fromJSON(obj: InitializeRewardParamJSON): InitializeRewardParam {
    return new InitializeRewardParam({
      openTime: BigInt(obj.openTime),
      endTime: BigInt(obj.endTime),
      emissionsPerSecondX64: BigInt(obj.emissionsPerSecondX64),
    })
  }

  toEncodable() {
    return InitializeRewardParam.toEncodable(this)
  }
}
