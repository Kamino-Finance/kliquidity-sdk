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
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface ProtocolPositionStateFields {
  bump: number
  poolId: Address
  tickLowerIndex: number
  tickUpperIndex: number
  liquidity: BN
  feeGrowthInside0LastX64: BN
  feeGrowthInside1LastX64: BN
  tokenFeesOwed0: BN
  tokenFeesOwed1: BN
  rewardGrowthInside: Array<BN>
  padding: Array<BN>
}

export interface ProtocolPositionStateJSON {
  bump: number
  poolId: string
  tickLowerIndex: number
  tickUpperIndex: number
  liquidity: string
  feeGrowthInside0LastX64: string
  feeGrowthInside1LastX64: string
  tokenFeesOwed0: string
  tokenFeesOwed1: string
  rewardGrowthInside: Array<string>
  padding: Array<string>
}

export class ProtocolPositionState {
  readonly bump: number
  readonly poolId: Address
  readonly tickLowerIndex: number
  readonly tickUpperIndex: number
  readonly liquidity: BN
  readonly feeGrowthInside0LastX64: BN
  readonly feeGrowthInside1LastX64: BN
  readonly tokenFeesOwed0: BN
  readonly tokenFeesOwed1: BN
  readonly rewardGrowthInside: Array<BN>
  readonly padding: Array<BN>

  static readonly discriminator = Buffer.from([
    100, 226, 145, 99, 146, 218, 160, 106,
  ])

  static readonly layout = borsh.struct<ProtocolPositionState>([
    borsh.u8("bump"),
    borshAddress("poolId"),
    borsh.i32("tickLowerIndex"),
    borsh.i32("tickUpperIndex"),
    borsh.u128("liquidity"),
    borsh.u128("feeGrowthInside0LastX64"),
    borsh.u128("feeGrowthInside1LastX64"),
    borsh.u64("tokenFeesOwed0"),
    borsh.u64("tokenFeesOwed1"),
    borsh.array(borsh.u128(), 3, "rewardGrowthInside"),
    borsh.array(borsh.u64(), 8, "padding"),
  ])

  constructor(fields: ProtocolPositionStateFields) {
    this.bump = fields.bump
    this.poolId = fields.poolId
    this.tickLowerIndex = fields.tickLowerIndex
    this.tickUpperIndex = fields.tickUpperIndex
    this.liquidity = fields.liquidity
    this.feeGrowthInside0LastX64 = fields.feeGrowthInside0LastX64
    this.feeGrowthInside1LastX64 = fields.feeGrowthInside1LastX64
    this.tokenFeesOwed0 = fields.tokenFeesOwed0
    this.tokenFeesOwed1 = fields.tokenFeesOwed1
    this.rewardGrowthInside = fields.rewardGrowthInside
    this.padding = fields.padding
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<ProtocolPositionState | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `ProtocolPositionStateFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<ProtocolPositionState | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `ProtocolPositionStateFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): ProtocolPositionState {
    if (!data.slice(0, 8).equals(ProtocolPositionState.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = ProtocolPositionState.layout.decode(data.slice(8))

    return new ProtocolPositionState({
      bump: dec.bump,
      poolId: dec.poolId,
      tickLowerIndex: dec.tickLowerIndex,
      tickUpperIndex: dec.tickUpperIndex,
      liquidity: dec.liquidity,
      feeGrowthInside0LastX64: dec.feeGrowthInside0LastX64,
      feeGrowthInside1LastX64: dec.feeGrowthInside1LastX64,
      tokenFeesOwed0: dec.tokenFeesOwed0,
      tokenFeesOwed1: dec.tokenFeesOwed1,
      rewardGrowthInside: dec.rewardGrowthInside,
      padding: dec.padding,
    })
  }

  toJSON(): ProtocolPositionStateJSON {
    return {
      bump: this.bump,
      poolId: this.poolId,
      tickLowerIndex: this.tickLowerIndex,
      tickUpperIndex: this.tickUpperIndex,
      liquidity: this.liquidity.toString(),
      feeGrowthInside0LastX64: this.feeGrowthInside0LastX64.toString(),
      feeGrowthInside1LastX64: this.feeGrowthInside1LastX64.toString(),
      tokenFeesOwed0: this.tokenFeesOwed0.toString(),
      tokenFeesOwed1: this.tokenFeesOwed1.toString(),
      rewardGrowthInside: this.rewardGrowthInside.map((item) =>
        item.toString()
      ),
      padding: this.padding.map((item) => item.toString()),
    }
  }

  static fromJSON(obj: ProtocolPositionStateJSON): ProtocolPositionState {
    return new ProtocolPositionState({
      bump: obj.bump,
      poolId: address(obj.poolId),
      tickLowerIndex: obj.tickLowerIndex,
      tickUpperIndex: obj.tickUpperIndex,
      liquidity: new BN(obj.liquidity),
      feeGrowthInside0LastX64: new BN(obj.feeGrowthInside0LastX64),
      feeGrowthInside1LastX64: new BN(obj.feeGrowthInside1LastX64),
      tokenFeesOwed0: new BN(obj.tokenFeesOwed0),
      tokenFeesOwed1: new BN(obj.tokenFeesOwed1),
      rewardGrowthInside: obj.rewardGrowthInside.map((item) => new BN(item)),
      padding: obj.padding.map((item) => new BN(item)),
    })
  }
}
