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

export interface GlobalConfigFields {
  emergencyMode: bigint
  blockDeposit: bigint
  blockInvest: bigint
  blockWithdraw: bigint
  blockCollectFees: bigint
  blockCollectRewards: bigint
  blockSwapRewards: bigint
  blockSwapUnevenVaults: number
  blockEmergencySwap: number
  minWithdrawalFeeBps: bigint
  scopeProgramId: Address
  scopePriceId: Address
  swapRewardsDiscountBps: Array<bigint>
  actionsAuthority: Address
  adminAuthority: Address
  treasuryFeeVaults: Array<Address>
  tokenInfos: Address
  blockLocalAdmin: bigint
  minPerformanceFeeBps: bigint
  minSwapUnevenSlippageToleranceBps: bigint
  minReferencePriceSlippageToleranceBps: bigint
  actionsAfterRebalanceDelaySeconds: bigint
  treasuryFeeVaultReceiver: Address
  padding: Array<bigint>
}

export interface GlobalConfigJSON {
  emergencyMode: string
  blockDeposit: string
  blockInvest: string
  blockWithdraw: string
  blockCollectFees: string
  blockCollectRewards: string
  blockSwapRewards: string
  blockSwapUnevenVaults: number
  blockEmergencySwap: number
  minWithdrawalFeeBps: string
  scopeProgramId: string
  scopePriceId: string
  swapRewardsDiscountBps: Array<string>
  actionsAuthority: string
  adminAuthority: string
  treasuryFeeVaults: Array<string>
  tokenInfos: string
  blockLocalAdmin: string
  minPerformanceFeeBps: string
  minSwapUnevenSlippageToleranceBps: string
  minReferencePriceSlippageToleranceBps: string
  actionsAfterRebalanceDelaySeconds: string
  treasuryFeeVaultReceiver: string
  padding: Array<string>
}

export class GlobalConfig {
  readonly emergencyMode: bigint
  readonly blockDeposit: bigint
  readonly blockInvest: bigint
  readonly blockWithdraw: bigint
  readonly blockCollectFees: bigint
  readonly blockCollectRewards: bigint
  readonly blockSwapRewards: bigint
  readonly blockSwapUnevenVaults: number
  readonly blockEmergencySwap: number
  readonly minWithdrawalFeeBps: bigint
  readonly scopeProgramId: Address
  readonly scopePriceId: Address
  readonly swapRewardsDiscountBps: Array<bigint>
  readonly actionsAuthority: Address
  readonly adminAuthority: Address
  readonly treasuryFeeVaults: Array<Address>
  readonly tokenInfos: Address
  readonly blockLocalAdmin: bigint
  readonly minPerformanceFeeBps: bigint
  readonly minSwapUnevenSlippageToleranceBps: bigint
  readonly minReferencePriceSlippageToleranceBps: bigint
  readonly actionsAfterRebalanceDelaySeconds: bigint
  readonly treasuryFeeVaultReceiver: Address
  readonly padding: Array<bigint>

  static readonly discriminator = new Uint8Array([
    149, 8, 156, 202, 160, 252, 176, 217,
  ])

  static readonly layout = borsh.struct<GlobalConfig>([
    borsh.u64("emergencyMode"),
    borsh.u64("blockDeposit"),
    borsh.u64("blockInvest"),
    borsh.u64("blockWithdraw"),
    borsh.u64("blockCollectFees"),
    borsh.u64("blockCollectRewards"),
    borsh.u64("blockSwapRewards"),
    borsh.u32("blockSwapUnevenVaults"),
    borsh.u32("blockEmergencySwap"),
    borsh.u64("minWithdrawalFeeBps"),
    borshAddress("scopeProgramId"),
    borshAddress("scopePriceId"),
    borsh.array(borsh.u64(), 256, "swapRewardsDiscountBps"),
    borshAddress("actionsAuthority"),
    borshAddress("adminAuthority"),
    borsh.array(borshAddress(), 256, "treasuryFeeVaults"),
    borshAddress("tokenInfos"),
    borsh.u64("blockLocalAdmin"),
    borsh.u64("minPerformanceFeeBps"),
    borsh.u64("minSwapUnevenSlippageToleranceBps"),
    borsh.u64("minReferencePriceSlippageToleranceBps"),
    borsh.u64("actionsAfterRebalanceDelaySeconds"),
    borshAddress("treasuryFeeVaultReceiver"),
    borsh.array(borsh.u64(), 2035, "padding"),
  ])

  constructor(fields: GlobalConfigFields) {
    this.emergencyMode = fields.emergencyMode
    this.blockDeposit = fields.blockDeposit
    this.blockInvest = fields.blockInvest
    this.blockWithdraw = fields.blockWithdraw
    this.blockCollectFees = fields.blockCollectFees
    this.blockCollectRewards = fields.blockCollectRewards
    this.blockSwapRewards = fields.blockSwapRewards
    this.blockSwapUnevenVaults = fields.blockSwapUnevenVaults
    this.blockEmergencySwap = fields.blockEmergencySwap
    this.minWithdrawalFeeBps = fields.minWithdrawalFeeBps
    this.scopeProgramId = fields.scopeProgramId
    this.scopePriceId = fields.scopePriceId
    this.swapRewardsDiscountBps = fields.swapRewardsDiscountBps
    this.actionsAuthority = fields.actionsAuthority
    this.adminAuthority = fields.adminAuthority
    this.treasuryFeeVaults = fields.treasuryFeeVaults
    this.tokenInfos = fields.tokenInfos
    this.blockLocalAdmin = fields.blockLocalAdmin
    this.minPerformanceFeeBps = fields.minPerformanceFeeBps
    this.minSwapUnevenSlippageToleranceBps =
      fields.minSwapUnevenSlippageToleranceBps
    this.minReferencePriceSlippageToleranceBps =
      fields.minReferencePriceSlippageToleranceBps
    this.actionsAfterRebalanceDelaySeconds =
      fields.actionsAfterRebalanceDelaySeconds
    this.treasuryFeeVaultReceiver = fields.treasuryFeeVaultReceiver
    this.padding = fields.padding
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<GlobalConfig | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `GlobalConfigFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(new Uint8Array(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<GlobalConfig | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `GlobalConfigFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(new Uint8Array(info.data))
    })
  }

  static decode(data: Uint8Array): GlobalConfig {
    if (data.length < GlobalConfig.discriminator.length) {
      throw new Error("invalid account discriminator")
    }
    for (let i = 0; i < GlobalConfig.discriminator.length; i++) {
      if (data[i] !== GlobalConfig.discriminator[i]) {
        throw new Error("invalid account discriminator")
      }
    }

    const dec = GlobalConfig.layout.decode(
      data.subarray(GlobalConfig.discriminator.length)
    )

    return new GlobalConfig({
      emergencyMode: dec.emergencyMode,
      blockDeposit: dec.blockDeposit,
      blockInvest: dec.blockInvest,
      blockWithdraw: dec.blockWithdraw,
      blockCollectFees: dec.blockCollectFees,
      blockCollectRewards: dec.blockCollectRewards,
      blockSwapRewards: dec.blockSwapRewards,
      blockSwapUnevenVaults: dec.blockSwapUnevenVaults,
      blockEmergencySwap: dec.blockEmergencySwap,
      minWithdrawalFeeBps: dec.minWithdrawalFeeBps,
      scopeProgramId: dec.scopeProgramId,
      scopePriceId: dec.scopePriceId,
      swapRewardsDiscountBps: dec.swapRewardsDiscountBps,
      actionsAuthority: dec.actionsAuthority,
      adminAuthority: dec.adminAuthority,
      treasuryFeeVaults: dec.treasuryFeeVaults,
      tokenInfos: dec.tokenInfos,
      blockLocalAdmin: dec.blockLocalAdmin,
      minPerformanceFeeBps: dec.minPerformanceFeeBps,
      minSwapUnevenSlippageToleranceBps: dec.minSwapUnevenSlippageToleranceBps,
      minReferencePriceSlippageToleranceBps:
        dec.minReferencePriceSlippageToleranceBps,
      actionsAfterRebalanceDelaySeconds: dec.actionsAfterRebalanceDelaySeconds,
      treasuryFeeVaultReceiver: dec.treasuryFeeVaultReceiver,
      padding: dec.padding,
    })
  }

  toJSON(): GlobalConfigJSON {
    return {
      emergencyMode: this.emergencyMode.toString(),
      blockDeposit: this.blockDeposit.toString(),
      blockInvest: this.blockInvest.toString(),
      blockWithdraw: this.blockWithdraw.toString(),
      blockCollectFees: this.blockCollectFees.toString(),
      blockCollectRewards: this.blockCollectRewards.toString(),
      blockSwapRewards: this.blockSwapRewards.toString(),
      blockSwapUnevenVaults: this.blockSwapUnevenVaults,
      blockEmergencySwap: this.blockEmergencySwap,
      minWithdrawalFeeBps: this.minWithdrawalFeeBps.toString(),
      scopeProgramId: this.scopeProgramId,
      scopePriceId: this.scopePriceId,
      swapRewardsDiscountBps: this.swapRewardsDiscountBps.map((item) =>
        item.toString()
      ),
      actionsAuthority: this.actionsAuthority,
      adminAuthority: this.adminAuthority,
      treasuryFeeVaults: this.treasuryFeeVaults,
      tokenInfos: this.tokenInfos,
      blockLocalAdmin: this.blockLocalAdmin.toString(),
      minPerformanceFeeBps: this.minPerformanceFeeBps.toString(),
      minSwapUnevenSlippageToleranceBps:
        this.minSwapUnevenSlippageToleranceBps.toString(),
      minReferencePriceSlippageToleranceBps:
        this.minReferencePriceSlippageToleranceBps.toString(),
      actionsAfterRebalanceDelaySeconds:
        this.actionsAfterRebalanceDelaySeconds.toString(),
      treasuryFeeVaultReceiver: this.treasuryFeeVaultReceiver,
      padding: this.padding.map((item) => item.toString()),
    }
  }

  static fromJSON(obj: GlobalConfigJSON): GlobalConfig {
    return new GlobalConfig({
      emergencyMode: BigInt(obj.emergencyMode),
      blockDeposit: BigInt(obj.blockDeposit),
      blockInvest: BigInt(obj.blockInvest),
      blockWithdraw: BigInt(obj.blockWithdraw),
      blockCollectFees: BigInt(obj.blockCollectFees),
      blockCollectRewards: BigInt(obj.blockCollectRewards),
      blockSwapRewards: BigInt(obj.blockSwapRewards),
      blockSwapUnevenVaults: obj.blockSwapUnevenVaults,
      blockEmergencySwap: obj.blockEmergencySwap,
      minWithdrawalFeeBps: BigInt(obj.minWithdrawalFeeBps),
      scopeProgramId: address(obj.scopeProgramId),
      scopePriceId: address(obj.scopePriceId),
      swapRewardsDiscountBps: obj.swapRewardsDiscountBps.map((item) =>
        BigInt(item)
      ),
      actionsAuthority: address(obj.actionsAuthority),
      adminAuthority: address(obj.adminAuthority),
      treasuryFeeVaults: obj.treasuryFeeVaults.map((item) => address(item)),
      tokenInfos: address(obj.tokenInfos),
      blockLocalAdmin: BigInt(obj.blockLocalAdmin),
      minPerformanceFeeBps: BigInt(obj.minPerformanceFeeBps),
      minSwapUnevenSlippageToleranceBps: BigInt(
        obj.minSwapUnevenSlippageToleranceBps
      ),
      minReferencePriceSlippageToleranceBps: BigInt(
        obj.minReferencePriceSlippageToleranceBps
      ),
      actionsAfterRebalanceDelaySeconds: BigInt(
        obj.actionsAfterRebalanceDelaySeconds
      ),
      treasuryFeeVaultReceiver: address(obj.treasuryFeeVaultReceiver),
      padding: obj.padding.map((item) => BigInt(item)),
    })
  }
}
