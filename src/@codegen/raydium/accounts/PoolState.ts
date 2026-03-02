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

export interface PoolStateFields {
  bump: Array<number>
  ammConfig: Address
  owner: Address
  tokenMint0: Address
  tokenMint1: Address
  tokenVault0: Address
  tokenVault1: Address
  observationKey: Address
  mintDecimals0: number
  mintDecimals1: number
  tickSpacing: number
  liquidity: bigint
  sqrtPriceX64: bigint
  tickCurrent: number
  observationIndex: number
  observationUpdateDuration: number
  feeGrowthGlobal0X64: bigint
  feeGrowthGlobal1X64: bigint
  protocolFeesToken0: bigint
  protocolFeesToken1: bigint
  swapInAmountToken0: bigint
  swapOutAmountToken1: bigint
  swapInAmountToken1: bigint
  swapOutAmountToken0: bigint
  status: number
  padding: Array<number>
  rewardInfos: Array<types.RewardInfoFields>
  tickArrayBitmap: Array<bigint>
  totalFeesToken0: bigint
  totalFeesClaimedToken0: bigint
  totalFeesToken1: bigint
  totalFeesClaimedToken1: bigint
  fundFeesToken0: bigint
  fundFeesToken1: bigint
  openTime: bigint
  padding1: Array<bigint>
  padding2: Array<bigint>
}

export interface PoolStateJSON {
  bump: Array<number>
  ammConfig: string
  owner: string
  tokenMint0: string
  tokenMint1: string
  tokenVault0: string
  tokenVault1: string
  observationKey: string
  mintDecimals0: number
  mintDecimals1: number
  tickSpacing: number
  liquidity: string
  sqrtPriceX64: string
  tickCurrent: number
  observationIndex: number
  observationUpdateDuration: number
  feeGrowthGlobal0X64: string
  feeGrowthGlobal1X64: string
  protocolFeesToken0: string
  protocolFeesToken1: string
  swapInAmountToken0: string
  swapOutAmountToken1: string
  swapInAmountToken1: string
  swapOutAmountToken0: string
  status: number
  padding: Array<number>
  rewardInfos: Array<types.RewardInfoJSON>
  tickArrayBitmap: Array<string>
  totalFeesToken0: string
  totalFeesClaimedToken0: string
  totalFeesToken1: string
  totalFeesClaimedToken1: string
  fundFeesToken0: string
  fundFeesToken1: string
  openTime: string
  padding1: Array<string>
  padding2: Array<string>
}

export class PoolState {
  readonly bump: Array<number>
  readonly ammConfig: Address
  readonly owner: Address
  readonly tokenMint0: Address
  readonly tokenMint1: Address
  readonly tokenVault0: Address
  readonly tokenVault1: Address
  readonly observationKey: Address
  readonly mintDecimals0: number
  readonly mintDecimals1: number
  readonly tickSpacing: number
  readonly liquidity: bigint
  readonly sqrtPriceX64: bigint
  readonly tickCurrent: number
  readonly observationIndex: number
  readonly observationUpdateDuration: number
  readonly feeGrowthGlobal0X64: bigint
  readonly feeGrowthGlobal1X64: bigint
  readonly protocolFeesToken0: bigint
  readonly protocolFeesToken1: bigint
  readonly swapInAmountToken0: bigint
  readonly swapOutAmountToken1: bigint
  readonly swapInAmountToken1: bigint
  readonly swapOutAmountToken0: bigint
  readonly status: number
  readonly padding: Array<number>
  readonly rewardInfos: Array<types.RewardInfo>
  readonly tickArrayBitmap: Array<bigint>
  readonly totalFeesToken0: bigint
  readonly totalFeesClaimedToken0: bigint
  readonly totalFeesToken1: bigint
  readonly totalFeesClaimedToken1: bigint
  readonly fundFeesToken0: bigint
  readonly fundFeesToken1: bigint
  readonly openTime: bigint
  readonly padding1: Array<bigint>
  readonly padding2: Array<bigint>

  static readonly discriminator = new Uint8Array([
    247, 237, 227, 245, 215, 195, 222, 70,
  ])

  static readonly layout = borsh.struct<PoolState>([
    borsh.array(borsh.u8(), 1, "bump"),
    borshAddress("ammConfig"),
    borshAddress("owner"),
    borshAddress("tokenMint0"),
    borshAddress("tokenMint1"),
    borshAddress("tokenVault0"),
    borshAddress("tokenVault1"),
    borshAddress("observationKey"),
    borsh.u8("mintDecimals0"),
    borsh.u8("mintDecimals1"),
    borsh.u16("tickSpacing"),
    borsh.u128("liquidity"),
    borsh.u128("sqrtPriceX64"),
    borsh.i32("tickCurrent"),
    borsh.u16("observationIndex"),
    borsh.u16("observationUpdateDuration"),
    borsh.u128("feeGrowthGlobal0X64"),
    borsh.u128("feeGrowthGlobal1X64"),
    borsh.u64("protocolFeesToken0"),
    borsh.u64("protocolFeesToken1"),
    borsh.u128("swapInAmountToken0"),
    borsh.u128("swapOutAmountToken1"),
    borsh.u128("swapInAmountToken1"),
    borsh.u128("swapOutAmountToken0"),
    borsh.u8("status"),
    borsh.array(borsh.u8(), 7, "padding"),
    borsh.array(types.RewardInfo.layout(), 3, "rewardInfos"),
    borsh.array(borsh.u64(), 16, "tickArrayBitmap"),
    borsh.u64("totalFeesToken0"),
    borsh.u64("totalFeesClaimedToken0"),
    borsh.u64("totalFeesToken1"),
    borsh.u64("totalFeesClaimedToken1"),
    borsh.u64("fundFeesToken0"),
    borsh.u64("fundFeesToken1"),
    borsh.u64("openTime"),
    borsh.array(borsh.u64(), 25, "padding1"),
    borsh.array(borsh.u64(), 32, "padding2"),
  ])

  constructor(fields: PoolStateFields) {
    this.bump = fields.bump
    this.ammConfig = fields.ammConfig
    this.owner = fields.owner
    this.tokenMint0 = fields.tokenMint0
    this.tokenMint1 = fields.tokenMint1
    this.tokenVault0 = fields.tokenVault0
    this.tokenVault1 = fields.tokenVault1
    this.observationKey = fields.observationKey
    this.mintDecimals0 = fields.mintDecimals0
    this.mintDecimals1 = fields.mintDecimals1
    this.tickSpacing = fields.tickSpacing
    this.liquidity = fields.liquidity
    this.sqrtPriceX64 = fields.sqrtPriceX64
    this.tickCurrent = fields.tickCurrent
    this.observationIndex = fields.observationIndex
    this.observationUpdateDuration = fields.observationUpdateDuration
    this.feeGrowthGlobal0X64 = fields.feeGrowthGlobal0X64
    this.feeGrowthGlobal1X64 = fields.feeGrowthGlobal1X64
    this.protocolFeesToken0 = fields.protocolFeesToken0
    this.protocolFeesToken1 = fields.protocolFeesToken1
    this.swapInAmountToken0 = fields.swapInAmountToken0
    this.swapOutAmountToken1 = fields.swapOutAmountToken1
    this.swapInAmountToken1 = fields.swapInAmountToken1
    this.swapOutAmountToken0 = fields.swapOutAmountToken0
    this.status = fields.status
    this.padding = fields.padding
    this.rewardInfos = fields.rewardInfos.map(
      (item) => new types.RewardInfo({ ...item })
    )
    this.tickArrayBitmap = fields.tickArrayBitmap
    this.totalFeesToken0 = fields.totalFeesToken0
    this.totalFeesClaimedToken0 = fields.totalFeesClaimedToken0
    this.totalFeesToken1 = fields.totalFeesToken1
    this.totalFeesClaimedToken1 = fields.totalFeesClaimedToken1
    this.fundFeesToken0 = fields.fundFeesToken0
    this.fundFeesToken1 = fields.fundFeesToken1
    this.openTime = fields.openTime
    this.padding1 = fields.padding1
    this.padding2 = fields.padding2
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<PoolState | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `PoolStateFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(new Uint8Array(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<PoolState | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `PoolStateFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(new Uint8Array(info.data))
    })
  }

  static decode(data: Uint8Array): PoolState {
    if (data.length < PoolState.discriminator.length) {
      throw new Error("invalid account discriminator")
    }
    for (let i = 0; i < PoolState.discriminator.length; i++) {
      if (data[i] !== PoolState.discriminator[i]) {
        throw new Error("invalid account discriminator")
      }
    }

    const dec = PoolState.layout.decode(
      data.subarray(PoolState.discriminator.length)
    )

    return new PoolState({
      bump: dec.bump,
      ammConfig: dec.ammConfig,
      owner: dec.owner,
      tokenMint0: dec.tokenMint0,
      tokenMint1: dec.tokenMint1,
      tokenVault0: dec.tokenVault0,
      tokenVault1: dec.tokenVault1,
      observationKey: dec.observationKey,
      mintDecimals0: dec.mintDecimals0,
      mintDecimals1: dec.mintDecimals1,
      tickSpacing: dec.tickSpacing,
      liquidity: dec.liquidity,
      sqrtPriceX64: dec.sqrtPriceX64,
      tickCurrent: dec.tickCurrent,
      observationIndex: dec.observationIndex,
      observationUpdateDuration: dec.observationUpdateDuration,
      feeGrowthGlobal0X64: dec.feeGrowthGlobal0X64,
      feeGrowthGlobal1X64: dec.feeGrowthGlobal1X64,
      protocolFeesToken0: dec.protocolFeesToken0,
      protocolFeesToken1: dec.protocolFeesToken1,
      swapInAmountToken0: dec.swapInAmountToken0,
      swapOutAmountToken1: dec.swapOutAmountToken1,
      swapInAmountToken1: dec.swapInAmountToken1,
      swapOutAmountToken0: dec.swapOutAmountToken0,
      status: dec.status,
      padding: dec.padding,
      rewardInfos: dec.rewardInfos.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => types.RewardInfo.fromDecoded(item)
      ),
      tickArrayBitmap: dec.tickArrayBitmap,
      totalFeesToken0: dec.totalFeesToken0,
      totalFeesClaimedToken0: dec.totalFeesClaimedToken0,
      totalFeesToken1: dec.totalFeesToken1,
      totalFeesClaimedToken1: dec.totalFeesClaimedToken1,
      fundFeesToken0: dec.fundFeesToken0,
      fundFeesToken1: dec.fundFeesToken1,
      openTime: dec.openTime,
      padding1: dec.padding1,
      padding2: dec.padding2,
    })
  }

  toJSON(): PoolStateJSON {
    return {
      bump: this.bump,
      ammConfig: this.ammConfig,
      owner: this.owner,
      tokenMint0: this.tokenMint0,
      tokenMint1: this.tokenMint1,
      tokenVault0: this.tokenVault0,
      tokenVault1: this.tokenVault1,
      observationKey: this.observationKey,
      mintDecimals0: this.mintDecimals0,
      mintDecimals1: this.mintDecimals1,
      tickSpacing: this.tickSpacing,
      liquidity: this.liquidity.toString(),
      sqrtPriceX64: this.sqrtPriceX64.toString(),
      tickCurrent: this.tickCurrent,
      observationIndex: this.observationIndex,
      observationUpdateDuration: this.observationUpdateDuration,
      feeGrowthGlobal0X64: this.feeGrowthGlobal0X64.toString(),
      feeGrowthGlobal1X64: this.feeGrowthGlobal1X64.toString(),
      protocolFeesToken0: this.protocolFeesToken0.toString(),
      protocolFeesToken1: this.protocolFeesToken1.toString(),
      swapInAmountToken0: this.swapInAmountToken0.toString(),
      swapOutAmountToken1: this.swapOutAmountToken1.toString(),
      swapInAmountToken1: this.swapInAmountToken1.toString(),
      swapOutAmountToken0: this.swapOutAmountToken0.toString(),
      status: this.status,
      padding: this.padding,
      rewardInfos: this.rewardInfos.map((item) => item.toJSON()),
      tickArrayBitmap: this.tickArrayBitmap.map((item) => item.toString()),
      totalFeesToken0: this.totalFeesToken0.toString(),
      totalFeesClaimedToken0: this.totalFeesClaimedToken0.toString(),
      totalFeesToken1: this.totalFeesToken1.toString(),
      totalFeesClaimedToken1: this.totalFeesClaimedToken1.toString(),
      fundFeesToken0: this.fundFeesToken0.toString(),
      fundFeesToken1: this.fundFeesToken1.toString(),
      openTime: this.openTime.toString(),
      padding1: this.padding1.map((item) => item.toString()),
      padding2: this.padding2.map((item) => item.toString()),
    }
  }

  static fromJSON(obj: PoolStateJSON): PoolState {
    return new PoolState({
      bump: obj.bump,
      ammConfig: address(obj.ammConfig),
      owner: address(obj.owner),
      tokenMint0: address(obj.tokenMint0),
      tokenMint1: address(obj.tokenMint1),
      tokenVault0: address(obj.tokenVault0),
      tokenVault1: address(obj.tokenVault1),
      observationKey: address(obj.observationKey),
      mintDecimals0: obj.mintDecimals0,
      mintDecimals1: obj.mintDecimals1,
      tickSpacing: obj.tickSpacing,
      liquidity: BigInt(obj.liquidity),
      sqrtPriceX64: BigInt(obj.sqrtPriceX64),
      tickCurrent: obj.tickCurrent,
      observationIndex: obj.observationIndex,
      observationUpdateDuration: obj.observationUpdateDuration,
      feeGrowthGlobal0X64: BigInt(obj.feeGrowthGlobal0X64),
      feeGrowthGlobal1X64: BigInt(obj.feeGrowthGlobal1X64),
      protocolFeesToken0: BigInt(obj.protocolFeesToken0),
      protocolFeesToken1: BigInt(obj.protocolFeesToken1),
      swapInAmountToken0: BigInt(obj.swapInAmountToken0),
      swapOutAmountToken1: BigInt(obj.swapOutAmountToken1),
      swapInAmountToken1: BigInt(obj.swapInAmountToken1),
      swapOutAmountToken0: BigInt(obj.swapOutAmountToken0),
      status: obj.status,
      padding: obj.padding,
      rewardInfos: obj.rewardInfos.map((item) =>
        types.RewardInfo.fromJSON(item)
      ),
      tickArrayBitmap: obj.tickArrayBitmap.map((item) => BigInt(item)),
      totalFeesToken0: BigInt(obj.totalFeesToken0),
      totalFeesClaimedToken0: BigInt(obj.totalFeesClaimedToken0),
      totalFeesToken1: BigInt(obj.totalFeesToken1),
      totalFeesClaimedToken1: BigInt(obj.totalFeesClaimedToken1),
      fundFeesToken0: BigInt(obj.fundFeesToken0),
      fundFeesToken1: BigInt(obj.fundFeesToken1),
      openTime: BigInt(obj.openTime),
      padding1: obj.padding1.map((item) => BigInt(item)),
      padding2: obj.padding2.map((item) => BigInt(item)),
    })
  }
}
