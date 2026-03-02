/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface CollateralInfoFields {
  mint: Address
  lowerHeuristic: bigint
  upperHeuristic: bigint
  expHeuristic: bigint
  maxTwapDivergenceBps: bigint
  scopeTwapPriceChain: Array<number>
  scopePriceChain: Array<number>
  name: Array<number>
  maxAgePriceSeconds: bigint
  maxAgeTwapSeconds: bigint
  maxIgnorableAmountAsReward: bigint
  disabled: number
  padding0: Array<number>
  scopeStakingRateChain: Array<number>
  padding: Array<bigint>
}

export interface CollateralInfoJSON {
  mint: string
  lowerHeuristic: string
  upperHeuristic: string
  expHeuristic: string
  maxTwapDivergenceBps: string
  scopeTwapPriceChain: Array<number>
  scopePriceChain: Array<number>
  name: Array<number>
  maxAgePriceSeconds: string
  maxAgeTwapSeconds: string
  maxIgnorableAmountAsReward: string
  disabled: number
  padding0: Array<number>
  scopeStakingRateChain: Array<number>
  padding: Array<string>
}

export class CollateralInfo {
  readonly mint: Address
  readonly lowerHeuristic: bigint
  readonly upperHeuristic: bigint
  readonly expHeuristic: bigint
  readonly maxTwapDivergenceBps: bigint
  readonly scopeTwapPriceChain: Array<number>
  readonly scopePriceChain: Array<number>
  readonly name: Array<number>
  readonly maxAgePriceSeconds: bigint
  readonly maxAgeTwapSeconds: bigint
  readonly maxIgnorableAmountAsReward: bigint
  readonly disabled: number
  readonly padding0: Array<number>
  readonly scopeStakingRateChain: Array<number>
  readonly padding: Array<bigint>

  constructor(fields: CollateralInfoFields) {
    this.mint = fields.mint
    this.lowerHeuristic = fields.lowerHeuristic
    this.upperHeuristic = fields.upperHeuristic
    this.expHeuristic = fields.expHeuristic
    this.maxTwapDivergenceBps = fields.maxTwapDivergenceBps
    this.scopeTwapPriceChain = fields.scopeTwapPriceChain
    this.scopePriceChain = fields.scopePriceChain
    this.name = fields.name
    this.maxAgePriceSeconds = fields.maxAgePriceSeconds
    this.maxAgeTwapSeconds = fields.maxAgeTwapSeconds
    this.maxIgnorableAmountAsReward = fields.maxIgnorableAmountAsReward
    this.disabled = fields.disabled
    this.padding0 = fields.padding0
    this.scopeStakingRateChain = fields.scopeStakingRateChain
    this.padding = fields.padding
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borshAddress("mint"),
        borsh.u64("lowerHeuristic"),
        borsh.u64("upperHeuristic"),
        borsh.u64("expHeuristic"),
        borsh.u64("maxTwapDivergenceBps"),
        borsh.array(borsh.u16(), 4, "scopeTwapPriceChain"),
        borsh.array(borsh.u16(), 4, "scopePriceChain"),
        borsh.array(borsh.u8(), 32, "name"),
        borsh.u64("maxAgePriceSeconds"),
        borsh.u64("maxAgeTwapSeconds"),
        borsh.u64("maxIgnorableAmountAsReward"),
        borsh.u8("disabled"),
        borsh.array(borsh.u8(), 7, "padding0"),
        borsh.array(borsh.u16(), 4, "scopeStakingRateChain"),
        borsh.array(borsh.u64(), 8, "padding"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new CollateralInfo({
      mint: obj.mint,
      lowerHeuristic: obj.lowerHeuristic,
      upperHeuristic: obj.upperHeuristic,
      expHeuristic: obj.expHeuristic,
      maxTwapDivergenceBps: obj.maxTwapDivergenceBps,
      scopeTwapPriceChain: obj.scopeTwapPriceChain,
      scopePriceChain: obj.scopePriceChain,
      name: obj.name,
      maxAgePriceSeconds: obj.maxAgePriceSeconds,
      maxAgeTwapSeconds: obj.maxAgeTwapSeconds,
      maxIgnorableAmountAsReward: obj.maxIgnorableAmountAsReward,
      disabled: obj.disabled,
      padding0: obj.padding0,
      scopeStakingRateChain: obj.scopeStakingRateChain,
      padding: obj.padding,
    })
  }

  static toEncodable(fields: CollateralInfoFields) {
    return {
      mint: fields.mint,
      lowerHeuristic: fields.lowerHeuristic,
      upperHeuristic: fields.upperHeuristic,
      expHeuristic: fields.expHeuristic,
      maxTwapDivergenceBps: fields.maxTwapDivergenceBps,
      scopeTwapPriceChain: fields.scopeTwapPriceChain,
      scopePriceChain: fields.scopePriceChain,
      name: fields.name,
      maxAgePriceSeconds: fields.maxAgePriceSeconds,
      maxAgeTwapSeconds: fields.maxAgeTwapSeconds,
      maxIgnorableAmountAsReward: fields.maxIgnorableAmountAsReward,
      disabled: fields.disabled,
      padding0: fields.padding0,
      scopeStakingRateChain: fields.scopeStakingRateChain,
      padding: fields.padding,
    }
  }

  toJSON(): CollateralInfoJSON {
    return {
      mint: this.mint,
      lowerHeuristic: this.lowerHeuristic.toString(),
      upperHeuristic: this.upperHeuristic.toString(),
      expHeuristic: this.expHeuristic.toString(),
      maxTwapDivergenceBps: this.maxTwapDivergenceBps.toString(),
      scopeTwapPriceChain: this.scopeTwapPriceChain,
      scopePriceChain: this.scopePriceChain,
      name: this.name,
      maxAgePriceSeconds: this.maxAgePriceSeconds.toString(),
      maxAgeTwapSeconds: this.maxAgeTwapSeconds.toString(),
      maxIgnorableAmountAsReward: this.maxIgnorableAmountAsReward.toString(),
      disabled: this.disabled,
      padding0: this.padding0,
      scopeStakingRateChain: this.scopeStakingRateChain,
      padding: this.padding.map((item) => item.toString()),
    }
  }

  static fromJSON(obj: CollateralInfoJSON): CollateralInfo {
    return new CollateralInfo({
      mint: address(obj.mint),
      lowerHeuristic: BigInt(obj.lowerHeuristic),
      upperHeuristic: BigInt(obj.upperHeuristic),
      expHeuristic: BigInt(obj.expHeuristic),
      maxTwapDivergenceBps: BigInt(obj.maxTwapDivergenceBps),
      scopeTwapPriceChain: obj.scopeTwapPriceChain,
      scopePriceChain: obj.scopePriceChain,
      name: obj.name,
      maxAgePriceSeconds: BigInt(obj.maxAgePriceSeconds),
      maxAgeTwapSeconds: BigInt(obj.maxAgeTwapSeconds),
      maxIgnorableAmountAsReward: BigInt(obj.maxIgnorableAmountAsReward),
      disabled: obj.disabled,
      padding0: obj.padding0,
      scopeStakingRateChain: obj.scopeStakingRateChain,
      padding: obj.padding.map((item) => BigInt(item)),
    })
  }

  toEncodable() {
    return CollateralInfo.toEncodable(this)
  }
}
