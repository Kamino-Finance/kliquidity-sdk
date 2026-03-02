/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  address,
  Address,
  fetchEncodedAccount,
  fetchEncodedAccounts,
  GetAccountInfoApi,
  GetMultipleAccountsApi,
  Rpc,
} from "@solana/kit"
/* eslint-enable @typescript-eslint/no-unused-vars */
import * as borsh from "../utils/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface PositionV2Fields {
  /** The LB pair of this position */
  lbPair: Address
  /** Owner of the position. Client rely on this to to fetch their positions. */
  owner: Address
  /** Liquidity shares of this position in bins (lower_bin_id <-> upper_bin_id). This is the same as LP concept. */
  liquidityShares: Array<bigint>
  /** Farming reward information */
  rewardInfos: Array<types.UserRewardInfoFields>
  /** Swap fee to claim information */
  feeInfos: Array<types.FeeInfoFields>
  /** Lower bin ID */
  lowerBinId: number
  /** Upper bin ID */
  upperBinId: number
  /** Last updated timestamp */
  lastUpdatedAt: bigint
  /** Total claimed token fee X */
  totalClaimedFeeXAmount: bigint
  /** Total claimed token fee Y */
  totalClaimedFeeYAmount: bigint
  /** Total claimed rewards */
  totalClaimedRewards: Array<bigint>
  /** Operator of position */
  operator: Address
  /** Slot which the locked liquidity can be withdraw */
  lockReleaseSlot: bigint
  /** Is the position subjected to liquidity locking for the launch pool. */
  subjectedToBootstrapLiquidityLocking: number
  /** Address is able to claim fee in this position, only valid for bootstrap_liquidity_position */
  feeOwner: Address
  /** Reserved space for future use */
  reserved: Array<number>
}

export interface PositionV2JSON {
  /** The LB pair of this position */
  lbPair: string
  /** Owner of the position. Client rely on this to to fetch their positions. */
  owner: string
  /** Liquidity shares of this position in bins (lower_bin_id <-> upper_bin_id). This is the same as LP concept. */
  liquidityShares: Array<string>
  /** Farming reward information */
  rewardInfos: Array<types.UserRewardInfoJSON>
  /** Swap fee to claim information */
  feeInfos: Array<types.FeeInfoJSON>
  /** Lower bin ID */
  lowerBinId: number
  /** Upper bin ID */
  upperBinId: number
  /** Last updated timestamp */
  lastUpdatedAt: string
  /** Total claimed token fee X */
  totalClaimedFeeXAmount: string
  /** Total claimed token fee Y */
  totalClaimedFeeYAmount: string
  /** Total claimed rewards */
  totalClaimedRewards: Array<string>
  /** Operator of position */
  operator: string
  /** Slot which the locked liquidity can be withdraw */
  lockReleaseSlot: string
  /** Is the position subjected to liquidity locking for the launch pool. */
  subjectedToBootstrapLiquidityLocking: number
  /** Address is able to claim fee in this position, only valid for bootstrap_liquidity_position */
  feeOwner: string
  /** Reserved space for future use */
  reserved: Array<number>
}

export class PositionV2 {
  /** The LB pair of this position */
  readonly lbPair: Address
  /** Owner of the position. Client rely on this to to fetch their positions. */
  readonly owner: Address
  /** Liquidity shares of this position in bins (lower_bin_id <-> upper_bin_id). This is the same as LP concept. */
  readonly liquidityShares: Array<bigint>
  /** Farming reward information */
  readonly rewardInfos: Array<types.UserRewardInfo>
  /** Swap fee to claim information */
  readonly feeInfos: Array<types.FeeInfo>
  /** Lower bin ID */
  readonly lowerBinId: number
  /** Upper bin ID */
  readonly upperBinId: number
  /** Last updated timestamp */
  readonly lastUpdatedAt: bigint
  /** Total claimed token fee X */
  readonly totalClaimedFeeXAmount: bigint
  /** Total claimed token fee Y */
  readonly totalClaimedFeeYAmount: bigint
  /** Total claimed rewards */
  readonly totalClaimedRewards: Array<bigint>
  /** Operator of position */
  readonly operator: Address
  /** Slot which the locked liquidity can be withdraw */
  readonly lockReleaseSlot: bigint
  /** Is the position subjected to liquidity locking for the launch pool. */
  readonly subjectedToBootstrapLiquidityLocking: number
  /** Address is able to claim fee in this position, only valid for bootstrap_liquidity_position */
  readonly feeOwner: Address
  /** Reserved space for future use */
  readonly reserved: Array<number>

  static readonly discriminator = new Uint8Array([
    117, 176, 212, 199, 245, 180, 133, 182,
  ])

  static readonly layout = borsh.struct<PositionV2>([
    borshAddress("lbPair"),
    borshAddress("owner"),
    borsh.array(borsh.u128(), 70, "liquidityShares"),
    borsh.array(types.UserRewardInfo.layout(), 70, "rewardInfos"),
    borsh.array(types.FeeInfo.layout(), 70, "feeInfos"),
    borsh.i32("lowerBinId"),
    borsh.i32("upperBinId"),
    borsh.i64("lastUpdatedAt"),
    borsh.u64("totalClaimedFeeXAmount"),
    borsh.u64("totalClaimedFeeYAmount"),
    borsh.array(borsh.u64(), 2, "totalClaimedRewards"),
    borshAddress("operator"),
    borsh.u64("lockReleaseSlot"),
    borsh.u8("subjectedToBootstrapLiquidityLocking"),
    borshAddress("feeOwner"),
    borsh.array(borsh.u8(), 87, "reserved"),
  ])

  constructor(fields: PositionV2Fields) {
    this.lbPair = fields.lbPair
    this.owner = fields.owner
    this.liquidityShares = fields.liquidityShares
    this.rewardInfos = fields.rewardInfos.map(
      (item) => new types.UserRewardInfo({ ...item })
    )
    this.feeInfos = fields.feeInfos.map(
      (item) => new types.FeeInfo({ ...item })
    )
    this.lowerBinId = fields.lowerBinId
    this.upperBinId = fields.upperBinId
    this.lastUpdatedAt = fields.lastUpdatedAt
    this.totalClaimedFeeXAmount = fields.totalClaimedFeeXAmount
    this.totalClaimedFeeYAmount = fields.totalClaimedFeeYAmount
    this.totalClaimedRewards = fields.totalClaimedRewards
    this.operator = fields.operator
    this.lockReleaseSlot = fields.lockReleaseSlot
    this.subjectedToBootstrapLiquidityLocking =
      fields.subjectedToBootstrapLiquidityLocking
    this.feeOwner = fields.feeOwner
    this.reserved = fields.reserved
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<PositionV2 | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `PositionV2Fields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(new Uint8Array(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<PositionV2 | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `PositionV2Fields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(new Uint8Array(info.data))
    })
  }

  static decode(data: Uint8Array): PositionV2 {
    if (data.length < PositionV2.discriminator.length) {
      throw new Error("invalid account discriminator")
    }
    for (let i = 0; i < PositionV2.discriminator.length; i++) {
      if (data[i] !== PositionV2.discriminator[i]) {
        throw new Error("invalid account discriminator")
      }
    }

    const dec = PositionV2.layout.decode(
      data.subarray(PositionV2.discriminator.length)
    )

    return new PositionV2({
      lbPair: dec.lbPair,
      owner: dec.owner,
      liquidityShares: dec.liquidityShares,
      rewardInfos: dec.rewardInfos.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => types.UserRewardInfo.fromDecoded(item)
      ),
      feeInfos: dec.feeInfos.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => types.FeeInfo.fromDecoded(item)
      ),
      lowerBinId: dec.lowerBinId,
      upperBinId: dec.upperBinId,
      lastUpdatedAt: dec.lastUpdatedAt,
      totalClaimedFeeXAmount: dec.totalClaimedFeeXAmount,
      totalClaimedFeeYAmount: dec.totalClaimedFeeYAmount,
      totalClaimedRewards: dec.totalClaimedRewards,
      operator: dec.operator,
      lockReleaseSlot: dec.lockReleaseSlot,
      subjectedToBootstrapLiquidityLocking:
        dec.subjectedToBootstrapLiquidityLocking,
      feeOwner: dec.feeOwner,
      reserved: dec.reserved,
    })
  }

  toJSON(): PositionV2JSON {
    return {
      lbPair: this.lbPair,
      owner: this.owner,
      liquidityShares: this.liquidityShares.map((item) => item.toString()),
      rewardInfos: this.rewardInfos.map((item) => item.toJSON()),
      feeInfos: this.feeInfos.map((item) => item.toJSON()),
      lowerBinId: this.lowerBinId,
      upperBinId: this.upperBinId,
      lastUpdatedAt: this.lastUpdatedAt.toString(),
      totalClaimedFeeXAmount: this.totalClaimedFeeXAmount.toString(),
      totalClaimedFeeYAmount: this.totalClaimedFeeYAmount.toString(),
      totalClaimedRewards: this.totalClaimedRewards.map((item) =>
        item.toString()
      ),
      operator: this.operator,
      lockReleaseSlot: this.lockReleaseSlot.toString(),
      subjectedToBootstrapLiquidityLocking:
        this.subjectedToBootstrapLiquidityLocking,
      feeOwner: this.feeOwner,
      reserved: this.reserved,
    }
  }

  static fromJSON(obj: PositionV2JSON): PositionV2 {
    return new PositionV2({
      lbPair: address(obj.lbPair),
      owner: address(obj.owner),
      liquidityShares: obj.liquidityShares.map((item) => BigInt(item)),
      rewardInfos: obj.rewardInfos.map((item) =>
        types.UserRewardInfo.fromJSON(item)
      ),
      feeInfos: obj.feeInfos.map((item) => types.FeeInfo.fromJSON(item)),
      lowerBinId: obj.lowerBinId,
      upperBinId: obj.upperBinId,
      lastUpdatedAt: BigInt(obj.lastUpdatedAt),
      totalClaimedFeeXAmount: BigInt(obj.totalClaimedFeeXAmount),
      totalClaimedFeeYAmount: BigInt(obj.totalClaimedFeeYAmount),
      totalClaimedRewards: obj.totalClaimedRewards.map((item) => BigInt(item)),
      operator: address(obj.operator),
      lockReleaseSlot: BigInt(obj.lockReleaseSlot),
      subjectedToBootstrapLiquidityLocking:
        obj.subjectedToBootstrapLiquidityLocking,
      feeOwner: address(obj.feeOwner),
      reserved: obj.reserved,
    })
  }
}
