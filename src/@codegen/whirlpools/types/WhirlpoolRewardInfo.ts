import { address, Address } from "@solana/kit" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"
import { borshAddress } from "../utils"

export interface WhirlpoolRewardInfoFields {
  /** Reward token mint. */
  mint: Address
  /** Reward vault token account. */
  vault: Address
  /** Authority account that has permission to initialize the reward and set emissions. */
  authority: Address
  /** Q64.64 number that indicates how many tokens per second are earned per unit of liquidity. */
  emissionsPerSecondX64: BN
  /**
   * Q64.64 number that tracks the total tokens earned per unit of liquidity since the reward
   * emissions were turned on.
   */
  growthGlobalX64: BN
}

export interface WhirlpoolRewardInfoJSON {
  /** Reward token mint. */
  mint: string
  /** Reward vault token account. */
  vault: string
  /** Authority account that has permission to initialize the reward and set emissions. */
  authority: string
  /** Q64.64 number that indicates how many tokens per second are earned per unit of liquidity. */
  emissionsPerSecondX64: string
  /**
   * Q64.64 number that tracks the total tokens earned per unit of liquidity since the reward
   * emissions were turned on.
   */
  growthGlobalX64: string
}

/**
 * Stores the state relevant for tracking liquidity mining rewards at the `Whirlpool` level.
 * These values are used in conjunction with `PositionRewardInfo`, `Tick.reward_growths_outside`,
 * and `Whirlpool.reward_last_updated_timestamp` to determine how many rewards are earned by open
 * positions.
 */
export class WhirlpoolRewardInfo {
  /** Reward token mint. */
  readonly mint: Address
  /** Reward vault token account. */
  readonly vault: Address
  /** Authority account that has permission to initialize the reward and set emissions. */
  readonly authority: Address
  /** Q64.64 number that indicates how many tokens per second are earned per unit of liquidity. */
  readonly emissionsPerSecondX64: BN
  /**
   * Q64.64 number that tracks the total tokens earned per unit of liquidity since the reward
   * emissions were turned on.
   */
  readonly growthGlobalX64: BN

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
      emissionsPerSecondX64: new BN(obj.emissionsPerSecondX64),
      growthGlobalX64: new BN(obj.growthGlobalX64),
    })
  }

  toEncodable() {
    return WhirlpoolRewardInfo.toEncodable(this)
  }
}
