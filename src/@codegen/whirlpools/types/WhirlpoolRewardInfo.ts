/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface WhirlpoolRewardInfoFields {
  mint: Address
  vault: Address
  authority: Address
  emissionsPerSecondX64: bigint
  growthGlobalX64: bigint
}

export interface WhirlpoolRewardInfoJSON {
  mint: string
  vault: string
  authority: string
  emissionsPerSecondX64: string
  growthGlobalX64: string
}

export class WhirlpoolRewardInfo {
  readonly mint: Address
  readonly vault: Address
  readonly authority: Address
  readonly emissionsPerSecondX64: bigint
  readonly growthGlobalX64: bigint

  constructor(fields: WhirlpoolRewardInfoFields) {
    this.mint = fields.mint
    this.vault = fields.vault
    this.authority = fields.authority
    this.emissionsPerSecondX64 = fields.emissionsPerSecondX64
    this.growthGlobalX64 = fields.growthGlobalX64
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borshAddress("mint"),
        borshAddress("vault"),
        borshAddress("authority"),
        borsh.u128("emissionsPerSecondX64"),
        borsh.u128("growthGlobalX64"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new WhirlpoolRewardInfo({
      mint: obj.mint,
      vault: obj.vault,
      authority: obj.authority,
      emissionsPerSecondX64: obj.emissionsPerSecondX64,
      growthGlobalX64: obj.growthGlobalX64,
    })
  }

  static toEncodable(fields: WhirlpoolRewardInfoFields) {
    return {
      mint: fields.mint,
      vault: fields.vault,
      authority: fields.authority,
      emissionsPerSecondX64: fields.emissionsPerSecondX64,
      growthGlobalX64: fields.growthGlobalX64,
    }
  }

  toJSON(): WhirlpoolRewardInfoJSON {
    return {
      mint: this.mint,
      vault: this.vault,
      authority: this.authority,
      emissionsPerSecondX64: this.emissionsPerSecondX64.toString(),
      growthGlobalX64: this.growthGlobalX64.toString(),
    }
  }

  static fromJSON(obj: WhirlpoolRewardInfoJSON): WhirlpoolRewardInfo {
    return new WhirlpoolRewardInfo({
      mint: address(obj.mint),
      vault: address(obj.vault),
      authority: address(obj.authority),
      emissionsPerSecondX64: BigInt(obj.emissionsPerSecondX64),
      growthGlobalX64: BigInt(obj.growthGlobalX64),
    })
  }

  toEncodable() {
    return WhirlpoolRewardInfo.toEncodable(this)
  }
}
