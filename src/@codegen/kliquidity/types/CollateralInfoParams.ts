import { address, Address } from "@solana/kit" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"
import { borshAddress } from "../utils"

export interface CollateralInfoParamsFields {
  mint: Address
  lowerHeuristic: BN
  upperHeuristic: BN
  expHeuristic: BN
  maxTwapDivergenceBps: BN
  scopeTwapPriceChain: Array<number>
  scopePriceChain: Array<number>
  name: Array<number>
  maxAgePriceSeconds: BN
  maxAgeTwapSeconds: BN
  maxIgnorableAmountAsReward: BN
  disabled: number
  scopeStakingRateChain: Array<number>
  scopeFeed: Address
}

export interface CollateralInfoParamsJSON {
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
  scopeStakingRateChain: Array<number>
  scopeFeed: string
}

export class CollateralInfoParams {
  readonly mint: Address
  readonly lowerHeuristic: BN
  readonly upperHeuristic: BN
  readonly expHeuristic: BN
  readonly maxTwapDivergenceBps: BN
  readonly scopeTwapPriceChain: Array<number>
  readonly scopePriceChain: Array<number>
  readonly name: Array<number>
  readonly maxAgePriceSeconds: BN
  readonly maxAgeTwapSeconds: BN
  readonly maxIgnorableAmountAsReward: BN
  readonly disabled: number
  readonly scopeStakingRateChain: Array<number>
  readonly scopeFeed: Address

  constructor(fields: CollateralInfoParamsFields) {
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
    this.scopeStakingRateChain = fields.scopeStakingRateChain
    this.scopeFeed = fields.scopeFeed
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
        borsh.array(borsh.u16(), 4, "scopeStakingRateChain"),
        borshAddress("scopeFeed"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new CollateralInfoParams({
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
      scopeStakingRateChain: obj.scopeStakingRateChain,
      scopeFeed: obj.scopeFeed,
    })
  }

  static toEncodable(fields: CollateralInfoParamsFields) {
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
      scopeStakingRateChain: fields.scopeStakingRateChain,
      scopeFeed: fields.scopeFeed,
    }
  }

  toJSON(): CollateralInfoParamsJSON {
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
      scopeStakingRateChain: this.scopeStakingRateChain,
      scopeFeed: this.scopeFeed,
    }
  }

  static fromJSON(obj: CollateralInfoParamsJSON): CollateralInfoParams {
    return new CollateralInfoParams({
      mint: address(obj.mint),
      lowerHeuristic: new BN(obj.lowerHeuristic),
      upperHeuristic: new BN(obj.upperHeuristic),
      expHeuristic: new BN(obj.expHeuristic),
      maxTwapDivergenceBps: new BN(obj.maxTwapDivergenceBps),
      scopeTwapPriceChain: obj.scopeTwapPriceChain,
      scopePriceChain: obj.scopePriceChain,
      name: obj.name,
      maxAgePriceSeconds: new BN(obj.maxAgePriceSeconds),
      maxAgeTwapSeconds: new BN(obj.maxAgeTwapSeconds),
      maxIgnorableAmountAsReward: new BN(obj.maxIgnorableAmountAsReward),
      disabled: obj.disabled,
      scopeStakingRateChain: obj.scopeStakingRateChain,
      scopeFeed: address(obj.scopeFeed),
    })
  }

  toEncodable() {
    return CollateralInfoParams.toEncodable(this)
  }
}
