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

export interface AdaptiveFeeTierFields {
  whirlpoolsConfig: Address
  feeTierIndex: number
  tickSpacing: number
  initializePoolAuthority: Address
  delegatedFeeAuthority: Address
  defaultBaseFeeRate: number
  filterPeriod: number
  decayPeriod: number
  reductionFactor: number
  adaptiveFeeControlFactor: number
  maxVolatilityAccumulator: number
  tickGroupSize: number
  majorSwapThresholdTicks: number
}

export interface AdaptiveFeeTierJSON {
  whirlpoolsConfig: string
  feeTierIndex: number
  tickSpacing: number
  initializePoolAuthority: string
  delegatedFeeAuthority: string
  defaultBaseFeeRate: number
  filterPeriod: number
  decayPeriod: number
  reductionFactor: number
  adaptiveFeeControlFactor: number
  maxVolatilityAccumulator: number
  tickGroupSize: number
  majorSwapThresholdTicks: number
}

export class AdaptiveFeeTier {
  readonly whirlpoolsConfig: Address
  readonly feeTierIndex: number
  readonly tickSpacing: number
  readonly initializePoolAuthority: Address
  readonly delegatedFeeAuthority: Address
  readonly defaultBaseFeeRate: number
  readonly filterPeriod: number
  readonly decayPeriod: number
  readonly reductionFactor: number
  readonly adaptiveFeeControlFactor: number
  readonly maxVolatilityAccumulator: number
  readonly tickGroupSize: number
  readonly majorSwapThresholdTicks: number

  static readonly discriminator = Buffer.from([
    147, 16, 144, 116, 47, 146, 149, 46,
  ])

  static readonly layout = borsh.struct<AdaptiveFeeTier>([
    borshAddress("whirlpoolsConfig"),
    borsh.u16("feeTierIndex"),
    borsh.u16("tickSpacing"),
    borshAddress("initializePoolAuthority"),
    borshAddress("delegatedFeeAuthority"),
    borsh.u16("defaultBaseFeeRate"),
    borsh.u16("filterPeriod"),
    borsh.u16("decayPeriod"),
    borsh.u16("reductionFactor"),
    borsh.u32("adaptiveFeeControlFactor"),
    borsh.u32("maxVolatilityAccumulator"),
    borsh.u16("tickGroupSize"),
    borsh.u16("majorSwapThresholdTicks"),
  ])

  constructor(fields: AdaptiveFeeTierFields) {
    this.whirlpoolsConfig = fields.whirlpoolsConfig
    this.feeTierIndex = fields.feeTierIndex
    this.tickSpacing = fields.tickSpacing
    this.initializePoolAuthority = fields.initializePoolAuthority
    this.delegatedFeeAuthority = fields.delegatedFeeAuthority
    this.defaultBaseFeeRate = fields.defaultBaseFeeRate
    this.filterPeriod = fields.filterPeriod
    this.decayPeriod = fields.decayPeriod
    this.reductionFactor = fields.reductionFactor
    this.adaptiveFeeControlFactor = fields.adaptiveFeeControlFactor
    this.maxVolatilityAccumulator = fields.maxVolatilityAccumulator
    this.tickGroupSize = fields.tickGroupSize
    this.majorSwapThresholdTicks = fields.majorSwapThresholdTicks
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<AdaptiveFeeTier | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error("account doesn't belong to this program")
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<AdaptiveFeeTier | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error("account doesn't belong to this program")
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): AdaptiveFeeTier {
    if (!data.slice(0, 8).equals(AdaptiveFeeTier.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = AdaptiveFeeTier.layout.decode(data.slice(8))

    return new AdaptiveFeeTier({
      whirlpoolsConfig: dec.whirlpoolsConfig,
      feeTierIndex: dec.feeTierIndex,
      tickSpacing: dec.tickSpacing,
      initializePoolAuthority: dec.initializePoolAuthority,
      delegatedFeeAuthority: dec.delegatedFeeAuthority,
      defaultBaseFeeRate: dec.defaultBaseFeeRate,
      filterPeriod: dec.filterPeriod,
      decayPeriod: dec.decayPeriod,
      reductionFactor: dec.reductionFactor,
      adaptiveFeeControlFactor: dec.adaptiveFeeControlFactor,
      maxVolatilityAccumulator: dec.maxVolatilityAccumulator,
      tickGroupSize: dec.tickGroupSize,
      majorSwapThresholdTicks: dec.majorSwapThresholdTicks,
    })
  }

  toJSON(): AdaptiveFeeTierJSON {
    return {
      whirlpoolsConfig: this.whirlpoolsConfig,
      feeTierIndex: this.feeTierIndex,
      tickSpacing: this.tickSpacing,
      initializePoolAuthority: this.initializePoolAuthority,
      delegatedFeeAuthority: this.delegatedFeeAuthority,
      defaultBaseFeeRate: this.defaultBaseFeeRate,
      filterPeriod: this.filterPeriod,
      decayPeriod: this.decayPeriod,
      reductionFactor: this.reductionFactor,
      adaptiveFeeControlFactor: this.adaptiveFeeControlFactor,
      maxVolatilityAccumulator: this.maxVolatilityAccumulator,
      tickGroupSize: this.tickGroupSize,
      majorSwapThresholdTicks: this.majorSwapThresholdTicks,
    }
  }

  static fromJSON(obj: AdaptiveFeeTierJSON): AdaptiveFeeTier {
    return new AdaptiveFeeTier({
      whirlpoolsConfig: address(obj.whirlpoolsConfig),
      feeTierIndex: obj.feeTierIndex,
      tickSpacing: obj.tickSpacing,
      initializePoolAuthority: address(obj.initializePoolAuthority),
      delegatedFeeAuthority: address(obj.delegatedFeeAuthority),
      defaultBaseFeeRate: obj.defaultBaseFeeRate,
      filterPeriod: obj.filterPeriod,
      decayPeriod: obj.decayPeriod,
      reductionFactor: obj.reductionFactor,
      adaptiveFeeControlFactor: obj.adaptiveFeeControlFactor,
      maxVolatilityAccumulator: obj.maxVolatilityAccumulator,
      tickGroupSize: obj.tickGroupSize,
      majorSwapThresholdTicks: obj.majorSwapThresholdTicks,
    })
  }
}
