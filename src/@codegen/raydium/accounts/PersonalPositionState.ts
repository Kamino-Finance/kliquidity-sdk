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

export interface PersonalPositionStateFields {
  bump: number
  nftMint: Address
  poolId: Address
  tickLowerIndex: number
  tickUpperIndex: number
  liquidity: bigint
  feeGrowthInside0LastX64: bigint
  feeGrowthInside1LastX64: bigint
  tokenFeesOwed0: bigint
  tokenFeesOwed1: bigint
  rewardInfos: Array<types.PositionRewardInfoFields>
  padding: Array<bigint>
}

export interface PersonalPositionStateJSON {
  bump: number
  nftMint: string
  poolId: string
  tickLowerIndex: number
  tickUpperIndex: number
  liquidity: string
  feeGrowthInside0LastX64: string
  feeGrowthInside1LastX64: string
  tokenFeesOwed0: string
  tokenFeesOwed1: string
  rewardInfos: Array<types.PositionRewardInfoJSON>
  padding: Array<string>
}

export class PersonalPositionState {
  readonly bump: number
  readonly nftMint: Address
  readonly poolId: Address
  readonly tickLowerIndex: number
  readonly tickUpperIndex: number
  readonly liquidity: bigint
  readonly feeGrowthInside0LastX64: bigint
  readonly feeGrowthInside1LastX64: bigint
  readonly tokenFeesOwed0: bigint
  readonly tokenFeesOwed1: bigint
  readonly rewardInfos: Array<types.PositionRewardInfo>
  readonly padding: Array<bigint>

  static readonly discriminator = new Uint8Array([
    70, 111, 150, 126, 230, 15, 25, 117,
  ])

  static readonly layout = borsh.struct<PersonalPositionState>([
    borsh.u8("bump"),
    borshAddress("nftMint"),
    borshAddress("poolId"),
    borsh.i32("tickLowerIndex"),
    borsh.i32("tickUpperIndex"),
    borsh.u128("liquidity"),
    borsh.u128("feeGrowthInside0LastX64"),
    borsh.u128("feeGrowthInside1LastX64"),
    borsh.u64("tokenFeesOwed0"),
    borsh.u64("tokenFeesOwed1"),
    borsh.array(types.PositionRewardInfo.layout(), 3, "rewardInfos"),
    borsh.array(borsh.u64(), 8, "padding"),
  ])

  constructor(fields: PersonalPositionStateFields) {
    this.bump = fields.bump
    this.nftMint = fields.nftMint
    this.poolId = fields.poolId
    this.tickLowerIndex = fields.tickLowerIndex
    this.tickUpperIndex = fields.tickUpperIndex
    this.liquidity = fields.liquidity
    this.feeGrowthInside0LastX64 = fields.feeGrowthInside0LastX64
    this.feeGrowthInside1LastX64 = fields.feeGrowthInside1LastX64
    this.tokenFeesOwed0 = fields.tokenFeesOwed0
    this.tokenFeesOwed1 = fields.tokenFeesOwed1
    this.rewardInfos = fields.rewardInfos.map(
      (item) => new types.PositionRewardInfo({ ...item })
    )
    this.padding = fields.padding
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<PersonalPositionState | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `PersonalPositionStateFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(new Uint8Array(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<PersonalPositionState | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `PersonalPositionStateFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(new Uint8Array(info.data))
    })
  }

  static decode(data: Uint8Array): PersonalPositionState {
    if (data.length < PersonalPositionState.discriminator.length) {
      throw new Error("invalid account discriminator")
    }
    for (let i = 0; i < PersonalPositionState.discriminator.length; i++) {
      if (data[i] !== PersonalPositionState.discriminator[i]) {
        throw new Error("invalid account discriminator")
      }
    }

    const dec = PersonalPositionState.layout.decode(
      data.subarray(PersonalPositionState.discriminator.length)
    )

    return new PersonalPositionState({
      bump: dec.bump,
      nftMint: dec.nftMint,
      poolId: dec.poolId,
      tickLowerIndex: dec.tickLowerIndex,
      tickUpperIndex: dec.tickUpperIndex,
      liquidity: dec.liquidity,
      feeGrowthInside0LastX64: dec.feeGrowthInside0LastX64,
      feeGrowthInside1LastX64: dec.feeGrowthInside1LastX64,
      tokenFeesOwed0: dec.tokenFeesOwed0,
      tokenFeesOwed1: dec.tokenFeesOwed1,
      rewardInfos: dec.rewardInfos.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => types.PositionRewardInfo.fromDecoded(item)
      ),
      padding: dec.padding,
    })
  }

  toJSON(): PersonalPositionStateJSON {
    return {
      bump: this.bump,
      nftMint: this.nftMint,
      poolId: this.poolId,
      tickLowerIndex: this.tickLowerIndex,
      tickUpperIndex: this.tickUpperIndex,
      liquidity: this.liquidity.toString(),
      feeGrowthInside0LastX64: this.feeGrowthInside0LastX64.toString(),
      feeGrowthInside1LastX64: this.feeGrowthInside1LastX64.toString(),
      tokenFeesOwed0: this.tokenFeesOwed0.toString(),
      tokenFeesOwed1: this.tokenFeesOwed1.toString(),
      rewardInfos: this.rewardInfos.map((item) => item.toJSON()),
      padding: this.padding.map((item) => item.toString()),
    }
  }

  static fromJSON(obj: PersonalPositionStateJSON): PersonalPositionState {
    return new PersonalPositionState({
      bump: obj.bump,
      nftMint: address(obj.nftMint),
      poolId: address(obj.poolId),
      tickLowerIndex: obj.tickLowerIndex,
      tickUpperIndex: obj.tickUpperIndex,
      liquidity: BigInt(obj.liquidity),
      feeGrowthInside0LastX64: BigInt(obj.feeGrowthInside0LastX64),
      feeGrowthInside1LastX64: BigInt(obj.feeGrowthInside1LastX64),
      tokenFeesOwed0: BigInt(obj.tokenFeesOwed0),
      tokenFeesOwed1: BigInt(obj.tokenFeesOwed1),
      rewardInfos: obj.rewardInfos.map((item) =>
        types.PositionRewardInfo.fromJSON(item)
      ),
      padding: obj.padding.map((item) => BigInt(item)),
    })
  }
}
