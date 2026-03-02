/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface RewardInfoFields {
  /** Reward token mint. */
  mint: Address
  /** Reward vault token account. */
  vault: Address
  /** Authority account that allows to fund rewards */
  funder: Address
  /** TODO check whether we need to store it in pool */
  rewardDuration: bigint
  /** TODO check whether we need to store it in pool */
  rewardDurationEnd: bigint
  /** TODO check whether we need to store it in pool */
  rewardRate: bigint
  /** The last time reward states were updated. */
  lastUpdateTime: bigint
  /** Accumulated seconds where when farm distribute rewards, but the bin is empty. The reward will be accumulated for next reward time window. */
  cumulativeSecondsWithEmptyLiquidityReward: bigint
}

export interface RewardInfoJSON {
  /** Reward token mint. */
  mint: string
  /** Reward vault token account. */
  vault: string
  /** Authority account that allows to fund rewards */
  funder: string
  /** TODO check whether we need to store it in pool */
  rewardDuration: string
  /** TODO check whether we need to store it in pool */
  rewardDurationEnd: string
  /** TODO check whether we need to store it in pool */
  rewardRate: string
  /** The last time reward states were updated. */
  lastUpdateTime: string
  /** Accumulated seconds where when farm distribute rewards, but the bin is empty. The reward will be accumulated for next reward time window. */
  cumulativeSecondsWithEmptyLiquidityReward: string
}

/** Stores the state relevant for tracking liquidity mining rewards */
export class RewardInfo {
  /** Reward token mint. */
  readonly mint: Address
  /** Reward vault token account. */
  readonly vault: Address
  /** Authority account that allows to fund rewards */
  readonly funder: Address
  /** TODO check whether we need to store it in pool */
  readonly rewardDuration: bigint
  /** TODO check whether we need to store it in pool */
  readonly rewardDurationEnd: bigint
  /** TODO check whether we need to store it in pool */
  readonly rewardRate: bigint
  /** The last time reward states were updated. */
  readonly lastUpdateTime: bigint
  /** Accumulated seconds where when farm distribute rewards, but the bin is empty. The reward will be accumulated for next reward time window. */
  readonly cumulativeSecondsWithEmptyLiquidityReward: bigint

  constructor(fields: RewardInfoFields) {
    this.mint = fields.mint
    this.vault = fields.vault
    this.funder = fields.funder
    this.rewardDuration = fields.rewardDuration
    this.rewardDurationEnd = fields.rewardDurationEnd
    this.rewardRate = fields.rewardRate
    this.lastUpdateTime = fields.lastUpdateTime
    this.cumulativeSecondsWithEmptyLiquidityReward =
      fields.cumulativeSecondsWithEmptyLiquidityReward
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borshAddress("mint"),
        borshAddress("vault"),
        borshAddress("funder"),
        borsh.u64("rewardDuration"),
        borsh.u64("rewardDurationEnd"),
        borsh.u128("rewardRate"),
        borsh.u64("lastUpdateTime"),
        borsh.u64("cumulativeSecondsWithEmptyLiquidityReward"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new RewardInfo({
      mint: obj.mint,
      vault: obj.vault,
      funder: obj.funder,
      rewardDuration: obj.rewardDuration,
      rewardDurationEnd: obj.rewardDurationEnd,
      rewardRate: obj.rewardRate,
      lastUpdateTime: obj.lastUpdateTime,
      cumulativeSecondsWithEmptyLiquidityReward:
        obj.cumulativeSecondsWithEmptyLiquidityReward,
    })
  }

  static toEncodable(fields: RewardInfoFields) {
    return {
      mint: fields.mint,
      vault: fields.vault,
      funder: fields.funder,
      rewardDuration: fields.rewardDuration,
      rewardDurationEnd: fields.rewardDurationEnd,
      rewardRate: fields.rewardRate,
      lastUpdateTime: fields.lastUpdateTime,
      cumulativeSecondsWithEmptyLiquidityReward:
        fields.cumulativeSecondsWithEmptyLiquidityReward,
    }
  }

  toJSON(): RewardInfoJSON {
    return {
      mint: this.mint,
      vault: this.vault,
      funder: this.funder,
      rewardDuration: this.rewardDuration.toString(),
      rewardDurationEnd: this.rewardDurationEnd.toString(),
      rewardRate: this.rewardRate.toString(),
      lastUpdateTime: this.lastUpdateTime.toString(),
      cumulativeSecondsWithEmptyLiquidityReward:
        this.cumulativeSecondsWithEmptyLiquidityReward.toString(),
    }
  }

  static fromJSON(obj: RewardInfoJSON): RewardInfo {
    return new RewardInfo({
      mint: address(obj.mint),
      vault: address(obj.vault),
      funder: address(obj.funder),
      rewardDuration: BigInt(obj.rewardDuration),
      rewardDurationEnd: BigInt(obj.rewardDurationEnd),
      rewardRate: BigInt(obj.rewardRate),
      lastUpdateTime: BigInt(obj.lastUpdateTime),
      cumulativeSecondsWithEmptyLiquidityReward: BigInt(
        obj.cumulativeSecondsWithEmptyLiquidityReward
      ),
    })
  }

  toEncodable() {
    return RewardInfo.toEncodable(this)
  }
}
