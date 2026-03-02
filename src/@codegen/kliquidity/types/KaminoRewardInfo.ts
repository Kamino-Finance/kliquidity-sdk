/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface KaminoRewardInfoFields {
  decimals: bigint
  rewardVault: Address
  rewardMint: Address
  rewardCollateralId: bigint
  lastIssuanceTs: bigint
  rewardPerSecond: bigint
  amountUncollected: bigint
  amountIssuedCumulative: bigint
  amountAvailable: bigint
}

export interface KaminoRewardInfoJSON {
  decimals: string
  rewardVault: string
  rewardMint: string
  rewardCollateralId: string
  lastIssuanceTs: string
  rewardPerSecond: string
  amountUncollected: string
  amountIssuedCumulative: string
  amountAvailable: string
}

export class KaminoRewardInfo {
  readonly decimals: bigint
  readonly rewardVault: Address
  readonly rewardMint: Address
  readonly rewardCollateralId: bigint
  readonly lastIssuanceTs: bigint
  readonly rewardPerSecond: bigint
  readonly amountUncollected: bigint
  readonly amountIssuedCumulative: bigint
  readonly amountAvailable: bigint

  constructor(fields: KaminoRewardInfoFields) {
    this.decimals = fields.decimals
    this.rewardVault = fields.rewardVault
    this.rewardMint = fields.rewardMint
    this.rewardCollateralId = fields.rewardCollateralId
    this.lastIssuanceTs = fields.lastIssuanceTs
    this.rewardPerSecond = fields.rewardPerSecond
    this.amountUncollected = fields.amountUncollected
    this.amountIssuedCumulative = fields.amountIssuedCumulative
    this.amountAvailable = fields.amountAvailable
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.u64("decimals"),
        borshAddress("rewardVault"),
        borshAddress("rewardMint"),
        borsh.u64("rewardCollateralId"),
        borsh.u64("lastIssuanceTs"),
        borsh.u64("rewardPerSecond"),
        borsh.u64("amountUncollected"),
        borsh.u64("amountIssuedCumulative"),
        borsh.u64("amountAvailable"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new KaminoRewardInfo({
      decimals: obj.decimals,
      rewardVault: obj.rewardVault,
      rewardMint: obj.rewardMint,
      rewardCollateralId: obj.rewardCollateralId,
      lastIssuanceTs: obj.lastIssuanceTs,
      rewardPerSecond: obj.rewardPerSecond,
      amountUncollected: obj.amountUncollected,
      amountIssuedCumulative: obj.amountIssuedCumulative,
      amountAvailable: obj.amountAvailable,
    })
  }

  static toEncodable(fields: KaminoRewardInfoFields) {
    return {
      decimals: fields.decimals,
      rewardVault: fields.rewardVault,
      rewardMint: fields.rewardMint,
      rewardCollateralId: fields.rewardCollateralId,
      lastIssuanceTs: fields.lastIssuanceTs,
      rewardPerSecond: fields.rewardPerSecond,
      amountUncollected: fields.amountUncollected,
      amountIssuedCumulative: fields.amountIssuedCumulative,
      amountAvailable: fields.amountAvailable,
    }
  }

  toJSON(): KaminoRewardInfoJSON {
    return {
      decimals: this.decimals.toString(),
      rewardVault: this.rewardVault,
      rewardMint: this.rewardMint,
      rewardCollateralId: this.rewardCollateralId.toString(),
      lastIssuanceTs: this.lastIssuanceTs.toString(),
      rewardPerSecond: this.rewardPerSecond.toString(),
      amountUncollected: this.amountUncollected.toString(),
      amountIssuedCumulative: this.amountIssuedCumulative.toString(),
      amountAvailable: this.amountAvailable.toString(),
    }
  }

  static fromJSON(obj: KaminoRewardInfoJSON): KaminoRewardInfo {
    return new KaminoRewardInfo({
      decimals: BigInt(obj.decimals),
      rewardVault: address(obj.rewardVault),
      rewardMint: address(obj.rewardMint),
      rewardCollateralId: BigInt(obj.rewardCollateralId),
      lastIssuanceTs: BigInt(obj.lastIssuanceTs),
      rewardPerSecond: BigInt(obj.rewardPerSecond),
      amountUncollected: BigInt(obj.amountUncollected),
      amountIssuedCumulative: BigInt(obj.amountIssuedCumulative),
      amountAvailable: BigInt(obj.amountAvailable),
    })
  }

  toEncodable() {
    return KaminoRewardInfo.toEncodable(this)
  }
}
