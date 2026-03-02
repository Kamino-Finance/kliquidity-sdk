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

export interface WhirlpoolStrategyFields {
  adminAuthority: Address
  globalConfig: Address
  baseVaultAuthority: Address
  baseVaultAuthorityBump: bigint
  pool: Address
  poolTokenVaultA: Address
  poolTokenVaultB: Address
  tickArrayLower: Address
  tickArrayUpper: Address
  position: Address
  positionMint: Address
  positionMetadata: Address
  positionTokenAccount: Address
  tokenAVault: Address
  tokenBVault: Address
  deprecated0: Array<Address>
  deprecated1: Array<bigint>
  tokenAMint: Address
  tokenBMint: Address
  tokenAMintDecimals: bigint
  tokenBMintDecimals: bigint
  tokenAAmounts: bigint
  tokenBAmounts: bigint
  tokenACollateralId: bigint
  tokenBCollateralId: bigint
  scopePrices: Address
  deprecated2: Address
  sharesMint: Address
  sharesMintDecimals: bigint
  sharesMintAuthority: Address
  sharesMintAuthorityBump: bigint
  sharesIssued: bigint
  status: bigint
  reward0Amount: bigint
  reward0Vault: Address
  reward0CollateralId: bigint
  reward0Decimals: bigint
  reward1Amount: bigint
  reward1Vault: Address
  reward1CollateralId: bigint
  reward1Decimals: bigint
  reward2Amount: bigint
  reward2Vault: Address
  reward2CollateralId: bigint
  reward2Decimals: bigint
  depositCapUsd: bigint
  feesACumulative: bigint
  feesBCumulative: bigint
  reward0AmountCumulative: bigint
  reward1AmountCumulative: bigint
  reward2AmountCumulative: bigint
  depositCapUsdPerIxn: bigint
  withdrawalCapA: types.WithdrawalCapsFields
  withdrawalCapB: types.WithdrawalCapsFields
  maxPriceDeviationBps: bigint
  swapVaultMaxSlippageBps: number
  swapVaultMaxSlippageFromReferenceBps: number
  strategyType: bigint
  padding0: bigint
  withdrawFee: bigint
  feesFee: bigint
  reward0Fee: bigint
  reward1Fee: bigint
  reward2Fee: bigint
  positionTimestamp: bigint
  kaminoRewards: Array<types.KaminoRewardInfoFields>
  strategyDex: bigint
  raydiumProtocolPositionOrBaseVaultAuthority: Address
  allowDepositWithoutInvest: bigint
  raydiumPoolConfigOrBaseVaultAuthority: Address
  depositBlocked: number
  creationStatus: number
  investBlocked: number
  /** share_calculation_method can be either DOLAR_BASED=0 or PROPORTION_BASED=1 */
  shareCalculationMethod: number
  withdrawBlocked: number
  reservedFlag2: number
  localAdminBlocked: number
  flashVaultSwapAllowed: number
  referenceSwapPriceA: types.PriceFields
  referenceSwapPriceB: types.PriceFields
  isCommunity: number
  rebalanceType: number
  padding1: Array<number>
  rebalanceRaw: types.RebalanceRawFields
  padding2: Array<number>
  tokenAFeesFromRewardsCumulative: bigint
  tokenBFeesFromRewardsCumulative: bigint
  strategyLookupTable: Address
  lastSwapUnevenStepTimestamp: bigint
  farm: Address
  rebalancesCap: types.WithdrawalCapsFields
  swapUnevenAuthority: Address
  tokenATokenProgram: Address
  tokenBTokenProgram: Address
  pendingAdmin: Address
  padding3: bigint
  padding4: Array<bigint>
  padding5: Array<bigint>
  padding6: Array<bigint>
  padding7: Array<bigint>
}

export interface WhirlpoolStrategyJSON {
  adminAuthority: string
  globalConfig: string
  baseVaultAuthority: string
  baseVaultAuthorityBump: string
  pool: string
  poolTokenVaultA: string
  poolTokenVaultB: string
  tickArrayLower: string
  tickArrayUpper: string
  position: string
  positionMint: string
  positionMetadata: string
  positionTokenAccount: string
  tokenAVault: string
  tokenBVault: string
  deprecated0: Array<string>
  deprecated1: Array<string>
  tokenAMint: string
  tokenBMint: string
  tokenAMintDecimals: string
  tokenBMintDecimals: string
  tokenAAmounts: string
  tokenBAmounts: string
  tokenACollateralId: string
  tokenBCollateralId: string
  scopePrices: string
  deprecated2: string
  sharesMint: string
  sharesMintDecimals: string
  sharesMintAuthority: string
  sharesMintAuthorityBump: string
  sharesIssued: string
  status: string
  reward0Amount: string
  reward0Vault: string
  reward0CollateralId: string
  reward0Decimals: string
  reward1Amount: string
  reward1Vault: string
  reward1CollateralId: string
  reward1Decimals: string
  reward2Amount: string
  reward2Vault: string
  reward2CollateralId: string
  reward2Decimals: string
  depositCapUsd: string
  feesACumulative: string
  feesBCumulative: string
  reward0AmountCumulative: string
  reward1AmountCumulative: string
  reward2AmountCumulative: string
  depositCapUsdPerIxn: string
  withdrawalCapA: types.WithdrawalCapsJSON
  withdrawalCapB: types.WithdrawalCapsJSON
  maxPriceDeviationBps: string
  swapVaultMaxSlippageBps: number
  swapVaultMaxSlippageFromReferenceBps: number
  strategyType: string
  padding0: string
  withdrawFee: string
  feesFee: string
  reward0Fee: string
  reward1Fee: string
  reward2Fee: string
  positionTimestamp: string
  kaminoRewards: Array<types.KaminoRewardInfoJSON>
  strategyDex: string
  raydiumProtocolPositionOrBaseVaultAuthority: string
  allowDepositWithoutInvest: string
  raydiumPoolConfigOrBaseVaultAuthority: string
  depositBlocked: number
  creationStatus: number
  investBlocked: number
  /** share_calculation_method can be either DOLAR_BASED=0 or PROPORTION_BASED=1 */
  shareCalculationMethod: number
  withdrawBlocked: number
  reservedFlag2: number
  localAdminBlocked: number
  flashVaultSwapAllowed: number
  referenceSwapPriceA: types.PriceJSON
  referenceSwapPriceB: types.PriceJSON
  isCommunity: number
  rebalanceType: number
  padding1: Array<number>
  rebalanceRaw: types.RebalanceRawJSON
  padding2: Array<number>
  tokenAFeesFromRewardsCumulative: string
  tokenBFeesFromRewardsCumulative: string
  strategyLookupTable: string
  lastSwapUnevenStepTimestamp: string
  farm: string
  rebalancesCap: types.WithdrawalCapsJSON
  swapUnevenAuthority: string
  tokenATokenProgram: string
  tokenBTokenProgram: string
  pendingAdmin: string
  padding3: string
  padding4: Array<string>
  padding5: Array<string>
  padding6: Array<string>
  padding7: Array<string>
}

export class WhirlpoolStrategy {
  readonly adminAuthority: Address
  readonly globalConfig: Address
  readonly baseVaultAuthority: Address
  readonly baseVaultAuthorityBump: bigint
  readonly pool: Address
  readonly poolTokenVaultA: Address
  readonly poolTokenVaultB: Address
  readonly tickArrayLower: Address
  readonly tickArrayUpper: Address
  readonly position: Address
  readonly positionMint: Address
  readonly positionMetadata: Address
  readonly positionTokenAccount: Address
  readonly tokenAVault: Address
  readonly tokenBVault: Address
  readonly deprecated0: Array<Address>
  readonly deprecated1: Array<bigint>
  readonly tokenAMint: Address
  readonly tokenBMint: Address
  readonly tokenAMintDecimals: bigint
  readonly tokenBMintDecimals: bigint
  readonly tokenAAmounts: bigint
  readonly tokenBAmounts: bigint
  readonly tokenACollateralId: bigint
  readonly tokenBCollateralId: bigint
  readonly scopePrices: Address
  readonly deprecated2: Address
  readonly sharesMint: Address
  readonly sharesMintDecimals: bigint
  readonly sharesMintAuthority: Address
  readonly sharesMintAuthorityBump: bigint
  readonly sharesIssued: bigint
  readonly status: bigint
  readonly reward0Amount: bigint
  readonly reward0Vault: Address
  readonly reward0CollateralId: bigint
  readonly reward0Decimals: bigint
  readonly reward1Amount: bigint
  readonly reward1Vault: Address
  readonly reward1CollateralId: bigint
  readonly reward1Decimals: bigint
  readonly reward2Amount: bigint
  readonly reward2Vault: Address
  readonly reward2CollateralId: bigint
  readonly reward2Decimals: bigint
  readonly depositCapUsd: bigint
  readonly feesACumulative: bigint
  readonly feesBCumulative: bigint
  readonly reward0AmountCumulative: bigint
  readonly reward1AmountCumulative: bigint
  readonly reward2AmountCumulative: bigint
  readonly depositCapUsdPerIxn: bigint
  readonly withdrawalCapA: types.WithdrawalCaps
  readonly withdrawalCapB: types.WithdrawalCaps
  readonly maxPriceDeviationBps: bigint
  readonly swapVaultMaxSlippageBps: number
  readonly swapVaultMaxSlippageFromReferenceBps: number
  readonly strategyType: bigint
  readonly padding0: bigint
  readonly withdrawFee: bigint
  readonly feesFee: bigint
  readonly reward0Fee: bigint
  readonly reward1Fee: bigint
  readonly reward2Fee: bigint
  readonly positionTimestamp: bigint
  readonly kaminoRewards: Array<types.KaminoRewardInfo>
  readonly strategyDex: bigint
  readonly raydiumProtocolPositionOrBaseVaultAuthority: Address
  readonly allowDepositWithoutInvest: bigint
  readonly raydiumPoolConfigOrBaseVaultAuthority: Address
  readonly depositBlocked: number
  readonly creationStatus: number
  readonly investBlocked: number
  /** share_calculation_method can be either DOLAR_BASED=0 or PROPORTION_BASED=1 */
  readonly shareCalculationMethod: number
  readonly withdrawBlocked: number
  readonly reservedFlag2: number
  readonly localAdminBlocked: number
  readonly flashVaultSwapAllowed: number
  readonly referenceSwapPriceA: types.Price
  readonly referenceSwapPriceB: types.Price
  readonly isCommunity: number
  readonly rebalanceType: number
  readonly padding1: Array<number>
  readonly rebalanceRaw: types.RebalanceRaw
  readonly padding2: Array<number>
  readonly tokenAFeesFromRewardsCumulative: bigint
  readonly tokenBFeesFromRewardsCumulative: bigint
  readonly strategyLookupTable: Address
  readonly lastSwapUnevenStepTimestamp: bigint
  readonly farm: Address
  readonly rebalancesCap: types.WithdrawalCaps
  readonly swapUnevenAuthority: Address
  readonly tokenATokenProgram: Address
  readonly tokenBTokenProgram: Address
  readonly pendingAdmin: Address
  readonly padding3: bigint
  readonly padding4: Array<bigint>
  readonly padding5: Array<bigint>
  readonly padding6: Array<bigint>
  readonly padding7: Array<bigint>

  static readonly discriminator = new Uint8Array([
    190, 178, 231, 184, 49, 186, 103, 13,
  ])

  static readonly layout = borsh.struct<WhirlpoolStrategy>([
    borshAddress("adminAuthority"),
    borshAddress("globalConfig"),
    borshAddress("baseVaultAuthority"),
    borsh.u64("baseVaultAuthorityBump"),
    borshAddress("pool"),
    borshAddress("poolTokenVaultA"),
    borshAddress("poolTokenVaultB"),
    borshAddress("tickArrayLower"),
    borshAddress("tickArrayUpper"),
    borshAddress("position"),
    borshAddress("positionMint"),
    borshAddress("positionMetadata"),
    borshAddress("positionTokenAccount"),
    borshAddress("tokenAVault"),
    borshAddress("tokenBVault"),
    borsh.array(borshAddress(), 2, "deprecated0"),
    borsh.array(borsh.u64(), 2, "deprecated1"),
    borshAddress("tokenAMint"),
    borshAddress("tokenBMint"),
    borsh.u64("tokenAMintDecimals"),
    borsh.u64("tokenBMintDecimals"),
    borsh.u64("tokenAAmounts"),
    borsh.u64("tokenBAmounts"),
    borsh.u64("tokenACollateralId"),
    borsh.u64("tokenBCollateralId"),
    borshAddress("scopePrices"),
    borshAddress("deprecated2"),
    borshAddress("sharesMint"),
    borsh.u64("sharesMintDecimals"),
    borshAddress("sharesMintAuthority"),
    borsh.u64("sharesMintAuthorityBump"),
    borsh.u64("sharesIssued"),
    borsh.u64("status"),
    borsh.u64("reward0Amount"),
    borshAddress("reward0Vault"),
    borsh.u64("reward0CollateralId"),
    borsh.u64("reward0Decimals"),
    borsh.u64("reward1Amount"),
    borshAddress("reward1Vault"),
    borsh.u64("reward1CollateralId"),
    borsh.u64("reward1Decimals"),
    borsh.u64("reward2Amount"),
    borshAddress("reward2Vault"),
    borsh.u64("reward2CollateralId"),
    borsh.u64("reward2Decimals"),
    borsh.u64("depositCapUsd"),
    borsh.u64("feesACumulative"),
    borsh.u64("feesBCumulative"),
    borsh.u64("reward0AmountCumulative"),
    borsh.u64("reward1AmountCumulative"),
    borsh.u64("reward2AmountCumulative"),
    borsh.u64("depositCapUsdPerIxn"),
    types.WithdrawalCaps.layout("withdrawalCapA"),
    types.WithdrawalCaps.layout("withdrawalCapB"),
    borsh.u64("maxPriceDeviationBps"),
    borsh.u32("swapVaultMaxSlippageBps"),
    borsh.u32("swapVaultMaxSlippageFromReferenceBps"),
    borsh.u64("strategyType"),
    borsh.u64("padding0"),
    borsh.u64("withdrawFee"),
    borsh.u64("feesFee"),
    borsh.u64("reward0Fee"),
    borsh.u64("reward1Fee"),
    borsh.u64("reward2Fee"),
    borsh.u64("positionTimestamp"),
    borsh.array(types.KaminoRewardInfo.layout(), 3, "kaminoRewards"),
    borsh.u64("strategyDex"),
    borshAddress("raydiumProtocolPositionOrBaseVaultAuthority"),
    borsh.u64("allowDepositWithoutInvest"),
    borshAddress("raydiumPoolConfigOrBaseVaultAuthority"),
    borsh.u8("depositBlocked"),
    borsh.u8("creationStatus"),
    borsh.u8("investBlocked"),
    borsh.u8("shareCalculationMethod"),
    borsh.u8("withdrawBlocked"),
    borsh.u8("reservedFlag2"),
    borsh.u8("localAdminBlocked"),
    borsh.u8("flashVaultSwapAllowed"),
    types.Price.layout("referenceSwapPriceA"),
    types.Price.layout("referenceSwapPriceB"),
    borsh.u8("isCommunity"),
    borsh.u8("rebalanceType"),
    borsh.array(borsh.u8(), 6, "padding1"),
    types.RebalanceRaw.layout("rebalanceRaw"),
    borsh.array(borsh.u8(), 7, "padding2"),
    borsh.u64("tokenAFeesFromRewardsCumulative"),
    borsh.u64("tokenBFeesFromRewardsCumulative"),
    borshAddress("strategyLookupTable"),
    borsh.u64("lastSwapUnevenStepTimestamp"),
    borshAddress("farm"),
    types.WithdrawalCaps.layout("rebalancesCap"),
    borshAddress("swapUnevenAuthority"),
    borshAddress("tokenATokenProgram"),
    borshAddress("tokenBTokenProgram"),
    borshAddress("pendingAdmin"),
    borsh.u64("padding3"),
    borsh.array(borsh.u128(), 13, "padding4"),
    borsh.array(borsh.u128(), 32, "padding5"),
    borsh.array(borsh.u128(), 32, "padding6"),
    borsh.array(borsh.u128(), 32, "padding7"),
  ])

  constructor(fields: WhirlpoolStrategyFields) {
    this.adminAuthority = fields.adminAuthority
    this.globalConfig = fields.globalConfig
    this.baseVaultAuthority = fields.baseVaultAuthority
    this.baseVaultAuthorityBump = fields.baseVaultAuthorityBump
    this.pool = fields.pool
    this.poolTokenVaultA = fields.poolTokenVaultA
    this.poolTokenVaultB = fields.poolTokenVaultB
    this.tickArrayLower = fields.tickArrayLower
    this.tickArrayUpper = fields.tickArrayUpper
    this.position = fields.position
    this.positionMint = fields.positionMint
    this.positionMetadata = fields.positionMetadata
    this.positionTokenAccount = fields.positionTokenAccount
    this.tokenAVault = fields.tokenAVault
    this.tokenBVault = fields.tokenBVault
    this.deprecated0 = fields.deprecated0
    this.deprecated1 = fields.deprecated1
    this.tokenAMint = fields.tokenAMint
    this.tokenBMint = fields.tokenBMint
    this.tokenAMintDecimals = fields.tokenAMintDecimals
    this.tokenBMintDecimals = fields.tokenBMintDecimals
    this.tokenAAmounts = fields.tokenAAmounts
    this.tokenBAmounts = fields.tokenBAmounts
    this.tokenACollateralId = fields.tokenACollateralId
    this.tokenBCollateralId = fields.tokenBCollateralId
    this.scopePrices = fields.scopePrices
    this.deprecated2 = fields.deprecated2
    this.sharesMint = fields.sharesMint
    this.sharesMintDecimals = fields.sharesMintDecimals
    this.sharesMintAuthority = fields.sharesMintAuthority
    this.sharesMintAuthorityBump = fields.sharesMintAuthorityBump
    this.sharesIssued = fields.sharesIssued
    this.status = fields.status
    this.reward0Amount = fields.reward0Amount
    this.reward0Vault = fields.reward0Vault
    this.reward0CollateralId = fields.reward0CollateralId
    this.reward0Decimals = fields.reward0Decimals
    this.reward1Amount = fields.reward1Amount
    this.reward1Vault = fields.reward1Vault
    this.reward1CollateralId = fields.reward1CollateralId
    this.reward1Decimals = fields.reward1Decimals
    this.reward2Amount = fields.reward2Amount
    this.reward2Vault = fields.reward2Vault
    this.reward2CollateralId = fields.reward2CollateralId
    this.reward2Decimals = fields.reward2Decimals
    this.depositCapUsd = fields.depositCapUsd
    this.feesACumulative = fields.feesACumulative
    this.feesBCumulative = fields.feesBCumulative
    this.reward0AmountCumulative = fields.reward0AmountCumulative
    this.reward1AmountCumulative = fields.reward1AmountCumulative
    this.reward2AmountCumulative = fields.reward2AmountCumulative
    this.depositCapUsdPerIxn = fields.depositCapUsdPerIxn
    this.withdrawalCapA = new types.WithdrawalCaps({ ...fields.withdrawalCapA })
    this.withdrawalCapB = new types.WithdrawalCaps({ ...fields.withdrawalCapB })
    this.maxPriceDeviationBps = fields.maxPriceDeviationBps
    this.swapVaultMaxSlippageBps = fields.swapVaultMaxSlippageBps
    this.swapVaultMaxSlippageFromReferenceBps =
      fields.swapVaultMaxSlippageFromReferenceBps
    this.strategyType = fields.strategyType
    this.padding0 = fields.padding0
    this.withdrawFee = fields.withdrawFee
    this.feesFee = fields.feesFee
    this.reward0Fee = fields.reward0Fee
    this.reward1Fee = fields.reward1Fee
    this.reward2Fee = fields.reward2Fee
    this.positionTimestamp = fields.positionTimestamp
    this.kaminoRewards = fields.kaminoRewards.map(
      (item) => new types.KaminoRewardInfo({ ...item })
    )
    this.strategyDex = fields.strategyDex
    this.raydiumProtocolPositionOrBaseVaultAuthority =
      fields.raydiumProtocolPositionOrBaseVaultAuthority
    this.allowDepositWithoutInvest = fields.allowDepositWithoutInvest
    this.raydiumPoolConfigOrBaseVaultAuthority =
      fields.raydiumPoolConfigOrBaseVaultAuthority
    this.depositBlocked = fields.depositBlocked
    this.creationStatus = fields.creationStatus
    this.investBlocked = fields.investBlocked
    this.shareCalculationMethod = fields.shareCalculationMethod
    this.withdrawBlocked = fields.withdrawBlocked
    this.reservedFlag2 = fields.reservedFlag2
    this.localAdminBlocked = fields.localAdminBlocked
    this.flashVaultSwapAllowed = fields.flashVaultSwapAllowed
    this.referenceSwapPriceA = new types.Price({
      ...fields.referenceSwapPriceA,
    })
    this.referenceSwapPriceB = new types.Price({
      ...fields.referenceSwapPriceB,
    })
    this.isCommunity = fields.isCommunity
    this.rebalanceType = fields.rebalanceType
    this.padding1 = fields.padding1
    this.rebalanceRaw = new types.RebalanceRaw({ ...fields.rebalanceRaw })
    this.padding2 = fields.padding2
    this.tokenAFeesFromRewardsCumulative =
      fields.tokenAFeesFromRewardsCumulative
    this.tokenBFeesFromRewardsCumulative =
      fields.tokenBFeesFromRewardsCumulative
    this.strategyLookupTable = fields.strategyLookupTable
    this.lastSwapUnevenStepTimestamp = fields.lastSwapUnevenStepTimestamp
    this.farm = fields.farm
    this.rebalancesCap = new types.WithdrawalCaps({ ...fields.rebalancesCap })
    this.swapUnevenAuthority = fields.swapUnevenAuthority
    this.tokenATokenProgram = fields.tokenATokenProgram
    this.tokenBTokenProgram = fields.tokenBTokenProgram
    this.pendingAdmin = fields.pendingAdmin
    this.padding3 = fields.padding3
    this.padding4 = fields.padding4
    this.padding5 = fields.padding5
    this.padding6 = fields.padding6
    this.padding7 = fields.padding7
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<WhirlpoolStrategy | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `WhirlpoolStrategyFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(new Uint8Array(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<WhirlpoolStrategy | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `WhirlpoolStrategyFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(new Uint8Array(info.data))
    })
  }

  static decode(data: Uint8Array): WhirlpoolStrategy {
    if (data.length < WhirlpoolStrategy.discriminator.length) {
      throw new Error("invalid account discriminator")
    }
    for (let i = 0; i < WhirlpoolStrategy.discriminator.length; i++) {
      if (data[i] !== WhirlpoolStrategy.discriminator[i]) {
        throw new Error("invalid account discriminator")
      }
    }

    const dec = WhirlpoolStrategy.layout.decode(
      data.subarray(WhirlpoolStrategy.discriminator.length)
    )

    return new WhirlpoolStrategy({
      adminAuthority: dec.adminAuthority,
      globalConfig: dec.globalConfig,
      baseVaultAuthority: dec.baseVaultAuthority,
      baseVaultAuthorityBump: dec.baseVaultAuthorityBump,
      pool: dec.pool,
      poolTokenVaultA: dec.poolTokenVaultA,
      poolTokenVaultB: dec.poolTokenVaultB,
      tickArrayLower: dec.tickArrayLower,
      tickArrayUpper: dec.tickArrayUpper,
      position: dec.position,
      positionMint: dec.positionMint,
      positionMetadata: dec.positionMetadata,
      positionTokenAccount: dec.positionTokenAccount,
      tokenAVault: dec.tokenAVault,
      tokenBVault: dec.tokenBVault,
      deprecated0: dec.deprecated0,
      deprecated1: dec.deprecated1,
      tokenAMint: dec.tokenAMint,
      tokenBMint: dec.tokenBMint,
      tokenAMintDecimals: dec.tokenAMintDecimals,
      tokenBMintDecimals: dec.tokenBMintDecimals,
      tokenAAmounts: dec.tokenAAmounts,
      tokenBAmounts: dec.tokenBAmounts,
      tokenACollateralId: dec.tokenACollateralId,
      tokenBCollateralId: dec.tokenBCollateralId,
      scopePrices: dec.scopePrices,
      deprecated2: dec.deprecated2,
      sharesMint: dec.sharesMint,
      sharesMintDecimals: dec.sharesMintDecimals,
      sharesMintAuthority: dec.sharesMintAuthority,
      sharesMintAuthorityBump: dec.sharesMintAuthorityBump,
      sharesIssued: dec.sharesIssued,
      status: dec.status,
      reward0Amount: dec.reward0Amount,
      reward0Vault: dec.reward0Vault,
      reward0CollateralId: dec.reward0CollateralId,
      reward0Decimals: dec.reward0Decimals,
      reward1Amount: dec.reward1Amount,
      reward1Vault: dec.reward1Vault,
      reward1CollateralId: dec.reward1CollateralId,
      reward1Decimals: dec.reward1Decimals,
      reward2Amount: dec.reward2Amount,
      reward2Vault: dec.reward2Vault,
      reward2CollateralId: dec.reward2CollateralId,
      reward2Decimals: dec.reward2Decimals,
      depositCapUsd: dec.depositCapUsd,
      feesACumulative: dec.feesACumulative,
      feesBCumulative: dec.feesBCumulative,
      reward0AmountCumulative: dec.reward0AmountCumulative,
      reward1AmountCumulative: dec.reward1AmountCumulative,
      reward2AmountCumulative: dec.reward2AmountCumulative,
      depositCapUsdPerIxn: dec.depositCapUsdPerIxn,
      withdrawalCapA: types.WithdrawalCaps.fromDecoded(dec.withdrawalCapA),
      withdrawalCapB: types.WithdrawalCaps.fromDecoded(dec.withdrawalCapB),
      maxPriceDeviationBps: dec.maxPriceDeviationBps,
      swapVaultMaxSlippageBps: dec.swapVaultMaxSlippageBps,
      swapVaultMaxSlippageFromReferenceBps:
        dec.swapVaultMaxSlippageFromReferenceBps,
      strategyType: dec.strategyType,
      padding0: dec.padding0,
      withdrawFee: dec.withdrawFee,
      feesFee: dec.feesFee,
      reward0Fee: dec.reward0Fee,
      reward1Fee: dec.reward1Fee,
      reward2Fee: dec.reward2Fee,
      positionTimestamp: dec.positionTimestamp,
      kaminoRewards: dec.kaminoRewards.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => types.KaminoRewardInfo.fromDecoded(item)
      ),
      strategyDex: dec.strategyDex,
      raydiumProtocolPositionOrBaseVaultAuthority:
        dec.raydiumProtocolPositionOrBaseVaultAuthority,
      allowDepositWithoutInvest: dec.allowDepositWithoutInvest,
      raydiumPoolConfigOrBaseVaultAuthority:
        dec.raydiumPoolConfigOrBaseVaultAuthority,
      depositBlocked: dec.depositBlocked,
      creationStatus: dec.creationStatus,
      investBlocked: dec.investBlocked,
      shareCalculationMethod: dec.shareCalculationMethod,
      withdrawBlocked: dec.withdrawBlocked,
      reservedFlag2: dec.reservedFlag2,
      localAdminBlocked: dec.localAdminBlocked,
      flashVaultSwapAllowed: dec.flashVaultSwapAllowed,
      referenceSwapPriceA: types.Price.fromDecoded(dec.referenceSwapPriceA),
      referenceSwapPriceB: types.Price.fromDecoded(dec.referenceSwapPriceB),
      isCommunity: dec.isCommunity,
      rebalanceType: dec.rebalanceType,
      padding1: dec.padding1,
      rebalanceRaw: types.RebalanceRaw.fromDecoded(dec.rebalanceRaw),
      padding2: dec.padding2,
      tokenAFeesFromRewardsCumulative: dec.tokenAFeesFromRewardsCumulative,
      tokenBFeesFromRewardsCumulative: dec.tokenBFeesFromRewardsCumulative,
      strategyLookupTable: dec.strategyLookupTable,
      lastSwapUnevenStepTimestamp: dec.lastSwapUnevenStepTimestamp,
      farm: dec.farm,
      rebalancesCap: types.WithdrawalCaps.fromDecoded(dec.rebalancesCap),
      swapUnevenAuthority: dec.swapUnevenAuthority,
      tokenATokenProgram: dec.tokenATokenProgram,
      tokenBTokenProgram: dec.tokenBTokenProgram,
      pendingAdmin: dec.pendingAdmin,
      padding3: dec.padding3,
      padding4: dec.padding4,
      padding5: dec.padding5,
      padding6: dec.padding6,
      padding7: dec.padding7,
    })
  }

  toJSON(): WhirlpoolStrategyJSON {
    return {
      adminAuthority: this.adminAuthority,
      globalConfig: this.globalConfig,
      baseVaultAuthority: this.baseVaultAuthority,
      baseVaultAuthorityBump: this.baseVaultAuthorityBump.toString(),
      pool: this.pool,
      poolTokenVaultA: this.poolTokenVaultA,
      poolTokenVaultB: this.poolTokenVaultB,
      tickArrayLower: this.tickArrayLower,
      tickArrayUpper: this.tickArrayUpper,
      position: this.position,
      positionMint: this.positionMint,
      positionMetadata: this.positionMetadata,
      positionTokenAccount: this.positionTokenAccount,
      tokenAVault: this.tokenAVault,
      tokenBVault: this.tokenBVault,
      deprecated0: this.deprecated0,
      deprecated1: this.deprecated1.map((item) => item.toString()),
      tokenAMint: this.tokenAMint,
      tokenBMint: this.tokenBMint,
      tokenAMintDecimals: this.tokenAMintDecimals.toString(),
      tokenBMintDecimals: this.tokenBMintDecimals.toString(),
      tokenAAmounts: this.tokenAAmounts.toString(),
      tokenBAmounts: this.tokenBAmounts.toString(),
      tokenACollateralId: this.tokenACollateralId.toString(),
      tokenBCollateralId: this.tokenBCollateralId.toString(),
      scopePrices: this.scopePrices,
      deprecated2: this.deprecated2,
      sharesMint: this.sharesMint,
      sharesMintDecimals: this.sharesMintDecimals.toString(),
      sharesMintAuthority: this.sharesMintAuthority,
      sharesMintAuthorityBump: this.sharesMintAuthorityBump.toString(),
      sharesIssued: this.sharesIssued.toString(),
      status: this.status.toString(),
      reward0Amount: this.reward0Amount.toString(),
      reward0Vault: this.reward0Vault,
      reward0CollateralId: this.reward0CollateralId.toString(),
      reward0Decimals: this.reward0Decimals.toString(),
      reward1Amount: this.reward1Amount.toString(),
      reward1Vault: this.reward1Vault,
      reward1CollateralId: this.reward1CollateralId.toString(),
      reward1Decimals: this.reward1Decimals.toString(),
      reward2Amount: this.reward2Amount.toString(),
      reward2Vault: this.reward2Vault,
      reward2CollateralId: this.reward2CollateralId.toString(),
      reward2Decimals: this.reward2Decimals.toString(),
      depositCapUsd: this.depositCapUsd.toString(),
      feesACumulative: this.feesACumulative.toString(),
      feesBCumulative: this.feesBCumulative.toString(),
      reward0AmountCumulative: this.reward0AmountCumulative.toString(),
      reward1AmountCumulative: this.reward1AmountCumulative.toString(),
      reward2AmountCumulative: this.reward2AmountCumulative.toString(),
      depositCapUsdPerIxn: this.depositCapUsdPerIxn.toString(),
      withdrawalCapA: this.withdrawalCapA.toJSON(),
      withdrawalCapB: this.withdrawalCapB.toJSON(),
      maxPriceDeviationBps: this.maxPriceDeviationBps.toString(),
      swapVaultMaxSlippageBps: this.swapVaultMaxSlippageBps,
      swapVaultMaxSlippageFromReferenceBps:
        this.swapVaultMaxSlippageFromReferenceBps,
      strategyType: this.strategyType.toString(),
      padding0: this.padding0.toString(),
      withdrawFee: this.withdrawFee.toString(),
      feesFee: this.feesFee.toString(),
      reward0Fee: this.reward0Fee.toString(),
      reward1Fee: this.reward1Fee.toString(),
      reward2Fee: this.reward2Fee.toString(),
      positionTimestamp: this.positionTimestamp.toString(),
      kaminoRewards: this.kaminoRewards.map((item) => item.toJSON()),
      strategyDex: this.strategyDex.toString(),
      raydiumProtocolPositionOrBaseVaultAuthority:
        this.raydiumProtocolPositionOrBaseVaultAuthority,
      allowDepositWithoutInvest: this.allowDepositWithoutInvest.toString(),
      raydiumPoolConfigOrBaseVaultAuthority:
        this.raydiumPoolConfigOrBaseVaultAuthority,
      depositBlocked: this.depositBlocked,
      creationStatus: this.creationStatus,
      investBlocked: this.investBlocked,
      shareCalculationMethod: this.shareCalculationMethod,
      withdrawBlocked: this.withdrawBlocked,
      reservedFlag2: this.reservedFlag2,
      localAdminBlocked: this.localAdminBlocked,
      flashVaultSwapAllowed: this.flashVaultSwapAllowed,
      referenceSwapPriceA: this.referenceSwapPriceA.toJSON(),
      referenceSwapPriceB: this.referenceSwapPriceB.toJSON(),
      isCommunity: this.isCommunity,
      rebalanceType: this.rebalanceType,
      padding1: this.padding1,
      rebalanceRaw: this.rebalanceRaw.toJSON(),
      padding2: this.padding2,
      tokenAFeesFromRewardsCumulative:
        this.tokenAFeesFromRewardsCumulative.toString(),
      tokenBFeesFromRewardsCumulative:
        this.tokenBFeesFromRewardsCumulative.toString(),
      strategyLookupTable: this.strategyLookupTable,
      lastSwapUnevenStepTimestamp: this.lastSwapUnevenStepTimestamp.toString(),
      farm: this.farm,
      rebalancesCap: this.rebalancesCap.toJSON(),
      swapUnevenAuthority: this.swapUnevenAuthority,
      tokenATokenProgram: this.tokenATokenProgram,
      tokenBTokenProgram: this.tokenBTokenProgram,
      pendingAdmin: this.pendingAdmin,
      padding3: this.padding3.toString(),
      padding4: this.padding4.map((item) => item.toString()),
      padding5: this.padding5.map((item) => item.toString()),
      padding6: this.padding6.map((item) => item.toString()),
      padding7: this.padding7.map((item) => item.toString()),
    }
  }

  static fromJSON(obj: WhirlpoolStrategyJSON): WhirlpoolStrategy {
    return new WhirlpoolStrategy({
      adminAuthority: address(obj.adminAuthority),
      globalConfig: address(obj.globalConfig),
      baseVaultAuthority: address(obj.baseVaultAuthority),
      baseVaultAuthorityBump: BigInt(obj.baseVaultAuthorityBump),
      pool: address(obj.pool),
      poolTokenVaultA: address(obj.poolTokenVaultA),
      poolTokenVaultB: address(obj.poolTokenVaultB),
      tickArrayLower: address(obj.tickArrayLower),
      tickArrayUpper: address(obj.tickArrayUpper),
      position: address(obj.position),
      positionMint: address(obj.positionMint),
      positionMetadata: address(obj.positionMetadata),
      positionTokenAccount: address(obj.positionTokenAccount),
      tokenAVault: address(obj.tokenAVault),
      tokenBVault: address(obj.tokenBVault),
      deprecated0: obj.deprecated0.map((item) => address(item)),
      deprecated1: obj.deprecated1.map((item) => BigInt(item)),
      tokenAMint: address(obj.tokenAMint),
      tokenBMint: address(obj.tokenBMint),
      tokenAMintDecimals: BigInt(obj.tokenAMintDecimals),
      tokenBMintDecimals: BigInt(obj.tokenBMintDecimals),
      tokenAAmounts: BigInt(obj.tokenAAmounts),
      tokenBAmounts: BigInt(obj.tokenBAmounts),
      tokenACollateralId: BigInt(obj.tokenACollateralId),
      tokenBCollateralId: BigInt(obj.tokenBCollateralId),
      scopePrices: address(obj.scopePrices),
      deprecated2: address(obj.deprecated2),
      sharesMint: address(obj.sharesMint),
      sharesMintDecimals: BigInt(obj.sharesMintDecimals),
      sharesMintAuthority: address(obj.sharesMintAuthority),
      sharesMintAuthorityBump: BigInt(obj.sharesMintAuthorityBump),
      sharesIssued: BigInt(obj.sharesIssued),
      status: BigInt(obj.status),
      reward0Amount: BigInt(obj.reward0Amount),
      reward0Vault: address(obj.reward0Vault),
      reward0CollateralId: BigInt(obj.reward0CollateralId),
      reward0Decimals: BigInt(obj.reward0Decimals),
      reward1Amount: BigInt(obj.reward1Amount),
      reward1Vault: address(obj.reward1Vault),
      reward1CollateralId: BigInt(obj.reward1CollateralId),
      reward1Decimals: BigInt(obj.reward1Decimals),
      reward2Amount: BigInt(obj.reward2Amount),
      reward2Vault: address(obj.reward2Vault),
      reward2CollateralId: BigInt(obj.reward2CollateralId),
      reward2Decimals: BigInt(obj.reward2Decimals),
      depositCapUsd: BigInt(obj.depositCapUsd),
      feesACumulative: BigInt(obj.feesACumulative),
      feesBCumulative: BigInt(obj.feesBCumulative),
      reward0AmountCumulative: BigInt(obj.reward0AmountCumulative),
      reward1AmountCumulative: BigInt(obj.reward1AmountCumulative),
      reward2AmountCumulative: BigInt(obj.reward2AmountCumulative),
      depositCapUsdPerIxn: BigInt(obj.depositCapUsdPerIxn),
      withdrawalCapA: types.WithdrawalCaps.fromJSON(obj.withdrawalCapA),
      withdrawalCapB: types.WithdrawalCaps.fromJSON(obj.withdrawalCapB),
      maxPriceDeviationBps: BigInt(obj.maxPriceDeviationBps),
      swapVaultMaxSlippageBps: obj.swapVaultMaxSlippageBps,
      swapVaultMaxSlippageFromReferenceBps:
        obj.swapVaultMaxSlippageFromReferenceBps,
      strategyType: BigInt(obj.strategyType),
      padding0: BigInt(obj.padding0),
      withdrawFee: BigInt(obj.withdrawFee),
      feesFee: BigInt(obj.feesFee),
      reward0Fee: BigInt(obj.reward0Fee),
      reward1Fee: BigInt(obj.reward1Fee),
      reward2Fee: BigInt(obj.reward2Fee),
      positionTimestamp: BigInt(obj.positionTimestamp),
      kaminoRewards: obj.kaminoRewards.map((item) =>
        types.KaminoRewardInfo.fromJSON(item)
      ),
      strategyDex: BigInt(obj.strategyDex),
      raydiumProtocolPositionOrBaseVaultAuthority: address(
        obj.raydiumProtocolPositionOrBaseVaultAuthority
      ),
      allowDepositWithoutInvest: BigInt(obj.allowDepositWithoutInvest),
      raydiumPoolConfigOrBaseVaultAuthority: address(
        obj.raydiumPoolConfigOrBaseVaultAuthority
      ),
      depositBlocked: obj.depositBlocked,
      creationStatus: obj.creationStatus,
      investBlocked: obj.investBlocked,
      shareCalculationMethod: obj.shareCalculationMethod,
      withdrawBlocked: obj.withdrawBlocked,
      reservedFlag2: obj.reservedFlag2,
      localAdminBlocked: obj.localAdminBlocked,
      flashVaultSwapAllowed: obj.flashVaultSwapAllowed,
      referenceSwapPriceA: types.Price.fromJSON(obj.referenceSwapPriceA),
      referenceSwapPriceB: types.Price.fromJSON(obj.referenceSwapPriceB),
      isCommunity: obj.isCommunity,
      rebalanceType: obj.rebalanceType,
      padding1: obj.padding1,
      rebalanceRaw: types.RebalanceRaw.fromJSON(obj.rebalanceRaw),
      padding2: obj.padding2,
      tokenAFeesFromRewardsCumulative: BigInt(
        obj.tokenAFeesFromRewardsCumulative
      ),
      tokenBFeesFromRewardsCumulative: BigInt(
        obj.tokenBFeesFromRewardsCumulative
      ),
      strategyLookupTable: address(obj.strategyLookupTable),
      lastSwapUnevenStepTimestamp: BigInt(obj.lastSwapUnevenStepTimestamp),
      farm: address(obj.farm),
      rebalancesCap: types.WithdrawalCaps.fromJSON(obj.rebalancesCap),
      swapUnevenAuthority: address(obj.swapUnevenAuthority),
      tokenATokenProgram: address(obj.tokenATokenProgram),
      tokenBTokenProgram: address(obj.tokenBTokenProgram),
      pendingAdmin: address(obj.pendingAdmin),
      padding3: BigInt(obj.padding3),
      padding4: obj.padding4.map((item) => BigInt(item)),
      padding5: obj.padding5.map((item) => BigInt(item)),
      padding6: obj.padding6.map((item) => BigInt(item)),
      padding7: obj.padding7.map((item) => BigInt(item)),
    })
  }
}
