import { getConfigByCluster, HubbleConfig, SolanaCluster } from '@hubbleprotocol/hubble-config';
import {
  Account,
  AccountRole,
  address,
  Address,
  Base58EncodedBytes,
  fetchEncodedAccounts,
  generateKeyPairSigner,
  getAddressEncoder,
  GetProgramAccountsDatasizeFilter,
  GetProgramAccountsMemcmpFilter,
  getProgramDerivedAddress,
  Instruction,
  isAddress,
  isSome,
  JsonParsedTokenAccount,
  none,
  Option,
  Rpc,
  Slot,
  SolanaRpcApi,
  some,
  TransactionSigner,
} from '@solana/kit';
import bs58 from 'bs58';
import { CollateralInfos, GlobalConfig, TermsSignature, WhirlpoolStrategy } from './@codegen/kliquidity/accounts';
import Decimal from 'decimal.js';
import {
  initializeTickArray,
  InitializeTickArrayAccounts,
  InitializeTickArrayArgs,
} from './@codegen/whirlpools/instructions';
import { Position as OrcaPosition, TickArray, Whirlpool } from './@codegen/whirlpools/accounts';
import {
  sqrtPriceToPrice as orcaSqrtPriceToPrice,
  getTickArrayStartTickIndex as orcaGetTickArrayStartTickIndex,
  priceToTickIndex as orcaPriceToTickIndex,
  IncreaseLiquidityQuote,
  sqrtPriceToPrice,
  tickIndexToPrice as orcaTickIndexToPrice,
} from '@orca-so/whirlpools-core';
import {
  getEmptyShareData,
  Holdings,
  KaminoPosition,
  KaminoPrices,
  KaminoStrategyWithShareMint,
  MintToPriceMap,
  OraclePricesAndCollateralInfos,
  ShareData,
  ShareDataWithAddress,
  StrategyBalances,
  StrategyBalanceWithAddress,
  StrategyHolder,
  StrategyPrices,
  StrategyProgramAddress,
  StrategyVaultTokens,
  StrategyWithPendingFees,
  TokenAmounts,
  TokenHoldings,
  TotalStrategyVaultTokens,
  TreasuryFeeVault,
} from './models';
import { Scope } from '@kamino-finance/scope-sdk';
import { OraclePrices } from '@kamino-finance/scope-sdk/dist/@codegen/scope/accounts/OraclePrices';
import {
  batchFetch,
  buildStrategyRebalanceParams,
  collToLamportsDecimal,
  createAssociatedTokenAccountInstruction,
  DECIMALS_SOL,
  DepositAmountsForSwap,
  Dex,
  dexToNumber,
  GenericPoolInfo,
  GenericPositionRangeInfo,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressAndAccount,
  getMintDecimals,
  getTickArray,
  getTokenNameFromCollateralInfo,
  getUpdateStrategyConfigIx,
  InitPoolTickIfNeeded,
  InitStrategyIxs,
  InputRebalanceFieldInfo,
  InstructionsWithLookupTables,
  isSOLMint,
  isVaultInitialized,
  keyOrDefault,
  lamportsToNumberDecimal,
  LiquidityDistribution,
  LowerAndUpperTickPubkeys,
  MaybeTokensBalances,
  MetadataProgramAddressesOrca,
  MetadataProgramAddressesRaydium,
  noopProfiledFunctionExecution,
  numberToDex,
  numberToRebalanceType,
  numberToReferencePriceType,
  PerformanceFees,
  PositionRange,
  PriceReferenceType,
  ProfiledFunctionExecution,
  RebalanceFieldInfo,
  rebalanceFieldsDictToInfo,
  StrategiesFilters,
  strategyCreationStatusToBase58,
  strategyTypeToBase58,
  stripTwapZeros,
  SwapperIxBuilder,
  TokensBalances,
  VaultParameters,
  WithdrawAllAndCloseIxns,
  WithdrawShares,
  ZERO,
  getNearestValidTickIndexFromTickIndex as orcaGetNearestValidTickIndexFromTickIndex,
  getIncreaseLiquidityQuote,
  defaultSlippagePercentageBPS,
} from './utils';
import {
  checkExpectedVaultsBalances,
  CheckExpectedVaultsBalancesAccounts,
  CheckExpectedVaultsBalancesArgs,
  closeStrategy,
  CloseStrategyAccounts,
  collectFeesAndRewards,
  CollectFeesAndRewardsAccounts,
  deposit,
  DepositAccounts,
  DepositArgs,
  executiveWithdraw,
  ExecutiveWithdrawAccounts,
  ExecutiveWithdrawArgs,
  initializeStrategy,
  InitializeStrategyAccounts,
  InitializeStrategyArgs,
  invest,
  InvestAccounts,
  openLiquidityPosition,
  OpenLiquidityPositionAccounts,
  OpenLiquidityPositionArgs,
  signTerms,
  SignTermsAccounts,
  SignTermsArgs,
  singleTokenDepositWithMin,
  SingleTokenDepositWithMinAccounts,
  SingleTokenDepositWithMinArgs,
  updateRewardMapping,
  UpdateRewardMappingAccounts,
  UpdateRewardMappingArgs,
  updateStrategyConfig,
  UpdateStrategyConfigAccounts,
  UpdateStrategyConfigArgs,
  withdraw,
  WithdrawAccounts,
  WithdrawArgs,
  withdrawFromTopup,
  WithdrawFromTopupAccounts,
  WithdrawFromTopupArgs,
} from './@codegen/kliquidity/instructions';
import BN from 'bn.js';
import StrategyWithAddress from './models/StrategyWithAddress';
import { Rebalancing, Uninitialized } from './@codegen/kliquidity/types/StrategyStatus';
import { FRONTEND_KAMINO_STRATEGY_URL, METADATA_PROGRAM_ID, U64_MAX, ZERO_BN } from './constants';
import {
  CollateralInfo,
  ExecutiveWithdrawActionKind,
  RebalanceType,
  RebalanceTypeKind,
  ReferencePriceTypeKind,
  StrategyConfigOption,
  StrategyStatusKind,
} from './@codegen/kliquidity/types';
import { AmmConfig, PersonalPositionState, PoolState } from './@codegen/raydium/accounts';

import { OrcaService, RaydiumService, Whirlpool as WhirlpoolAPIResponse, WhirlpoolAprApy } from './services';
import { Pool } from './services/RaydiumPoolsResponse';
import {
  UpdateCollectFeesFee,
  UpdateLookupTable,
  UpdateRebalanceType,
  UpdateReferencePriceType,
  UpdateReward0Fee,
  UpdateReward1Fee,
  UpdateReward2Fee,
  UpdateWithdrawFee,
} from './@codegen/kliquidity/types/StrategyConfigOption';
import { DefaultPerformanceFeeBps } from './constants/DefaultStrategyConfig';
import {
  CONSENSUS_ID,
  DEFAULT_PUBLIC_KEY,
  LUT_OWNER_KEY,
  MEMO_PROGRAM_ID,
  STAGING_GLOBAL_CONFIG,
  STAGING_KAMINO_PROGRAM_ID,
} from './constants/pubkeys';
import {
  AutodriftMethod,
  DefaultDex,
  DefaultFeeTierOrca,
  DefaultMintTokenA,
  DefaultMintTokenB,
  DefaultTickSpacing,
  DriftRebalanceMethod,
  ExpanderMethod,
  FullBPS,
  FullPercentage,
  ManualRebalanceMethod,
  PeriodicRebalanceMethod,
  PricePercentageRebalanceMethod,
  PricePercentageWithResetRangeRebalanceMethod,
  RebalanceMethod,
  TakeProfitMethod,
} from './utils/CreationParameters';
import { DOLLAR_BASED, PROPORTION_BASED } from './constants/deposit_method';
import { DEFAULT_JUP_API_ENDPOINT, JupService } from './services/JupService';
import {
  simulateManualPool,
  simulatePercentagePool,
  SimulationPercentagePoolParameters,
} from './services/PoolSimulationService';
import {
  Autodrift,
  Drift,
  Expander,
  Manual,
  PeriodicRebalance,
  PricePercentage,
  PricePercentageWithReset,
  TakeProfit,
} from './@codegen/kliquidity/types/RebalanceType';
import {
  checkIfAccountExists,
  createWsolAtaIfMissing,
  getAtasWithCreateIxnsIfMissing,
  MAX_ACCOUNTS_PER_TRANSACTION,
  removeBudgetAndAtaIxns,
} from './utils/transactions';
import {
  deserializeDriftRebalanceFromOnchainParams,
  deserializeDriftRebalanceWithStateOverride,
  deserializeExpanderRebalanceWithStateOverride,
  deserializePeriodicRebalanceFromOnchainParams,
  deserializePricePercentageRebalanceFromOnchainParams,
  deserializePricePercentageRebalanceWithStateOverride,
  deserializePricePercentageWithResetRebalanceFromOnchainParams,
  deserializePricePercentageWithResetRebalanceWithStateOverride,
  deserializeTakeProfitRebalanceFromOnchainParams,
  getDefaultDriftRebalanceFieldInfos,
  getDefaultExpanderRebalanceFieldInfos,
  getDefaultManualRebalanceFieldInfos,
  getDefaultPeriodicRebalanceFieldInfos,
  getDefaultPricePercentageRebalanceFieldInfos,
  getDefaultPricePercentageWithResetRebalanceFieldInfos,
  getDefaultTakeProfitRebalanceFieldsInfos,
  getDriftRebalanceFieldInfos,
  getExpanderRebalanceFieldInfos,
  getManualRebalanceFieldInfos,
  getPeriodicRebalanceRebalanceFieldInfos,
  getPositionRangeFromDriftParams,
  getPositionRangeFromExpanderParams,
  getPositionRangeFromPercentageRebalanceParams,
  getPositionRangeFromPeriodicRebalanceParams,
  getPositionRangeFromPricePercentageWithResetParams,
  getPricePercentageRebalanceFieldInfos,
  getPricePercentageWithResetRebalanceFieldInfos,
  getTakeProfitRebalanceFieldsInfos,
  readDriftRebalanceParamsFromStrategy,
  readExpanderRebalanceFieldInfosFromStrategy,
  readExpanderRebalanceParamsFromStrategy,
  readPeriodicRebalanceRebalanceParamsFromStrategy,
  readPeriodicRebalanceRebalanceStateFromStrategy,
  readPricePercentageRebalanceParamsFromStrategy,
  readPricePercentageWithResetRebalanceParamsFromStrategy,
  readRawDriftRebalanceStateFromStrategy,
  readRawExpanderRebalanceStateFromStrategy,
  readRawPricePercentageRebalanceStateFromStrategy,
  readRawPricePercentageWithResetRebalanceStateFromStrategy,
  readTakeProfitRebalanceParamsFromStrategy,
  readTakeProfitRebalanceStateFromStrategy,
} from './rebalance_methods';
import { PoolPriceReferenceType, TwapPriceReferenceType } from './utils/priceReferenceTypes';
import {
  extractPricesFromDeserializedState,
  getRebalanceMethodFromRebalanceFields,
  getRebalanceTypeFromRebalanceFields,
} from './rebalance_methods/utils';
import { RebalanceTypeLabelName } from './rebalance_methods/consts';
import WhirlpoolWithAddress from './models/WhirlpoolWithAddress';
import { PoolSimulationResponse } from './models/PoolSimulationResponseData';
import {
  deserializeAutodriftRebalanceFromOnchainParams,
  deserializeAutodriftRebalanceWithStateOverride,
  getAutodriftRebalanceFieldInfos,
  getDefaultAutodriftRebalanceFieldInfos,
  getPositionRangeFromAutodriftParams,
  readAutodriftRebalanceParamsFromStrategy,
  readRawAutodriftRebalanceStateFromStrategy,
} from './rebalance_methods/autodriftRebalance';
import { getRemoveLiquidityQuote } from './utils/whirlpools';
import { computeMeteoraFee, MeteoraPool, MeteoraService } from './services/MeteoraService';
import {
  binIdToBinArrayIndex,
  deriveBinArray,
  getBinFromBinArray,
  getBinFromBinArrays,
  getBinIdFromPriceWithDecimals,
  getPriceOfBinByBinIdWithDecimals,
  MeteoraPosition,
} from './utils/meteora';
import { BinArray, LbPair, PositionV2 } from './@codegen/meteora/accounts';
import LbPairWithAddress from './models/LbPairWithAddress';
import {
  initializeBinArray,
  InitializeBinArrayAccounts,
  InitializeBinArrayArgs,
} from './@codegen/meteora/instructions';
import {
  getPdaProtocolPositionAddress,
  i32ToBytes,
  LiquidityMath as RaydiumLiquidityMath,
  SqrtPriceMath as RaydiumSqrtPriceMath,
  TickMath as RaydiumTickMath,
  TickUtils as RaydiumTickUtils,
} from '@raydium-io/raydium-sdk-v2/lib';
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  fetchAllMint,
  getCloseAccountInstruction,
  Token,
  TOKEN_2022_PROGRAM_ADDRESS,
} from '@solana-program/token-2022';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { getCreateAccountInstruction, getTransferSolInstruction, SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { SYSVAR_INSTRUCTIONS_ADDRESS, SYSVAR_RENT_ADDRESS } from '@solana/sysvars';
import { fromLegacyPublicKey } from '@solana/compat';
import {
  ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS,
  AddressLookupTable,
  fetchMaybeAddressLookupTable,
  findAddressLookupTablePda,
  getCreateLookupTableInstruction,
  getExtendLookupTableInstruction,
} from '@solana-program/address-lookup-table';
import { fetchMultipleLookupTableAccounts } from './utils/lookupTable';
import type { AccountInfoBase, AccountInfoWithJsonData, AccountInfoWithPubkey } from '@solana/rpc-types';
import { toLegacyPublicKey } from './utils/compat';
import { IncreaseLiquidityQuoteParam } from '@orca-so/whirlpools';

const addressEncoder = getAddressEncoder();

export const HUBBLE_SCOPE_FEED_ID = address('3NJYftD5sjVfxSnUdZ1wVML8f3aC6mp1CXCL6L7TnU8C');
export const KAMINO_SCOPE_FEED_ID = address('3t4JZcueEzTbVP6kLxXrL3VpWx45jDer4eqysweBchNH');

export class Kamino {
  private readonly _cluster: SolanaCluster;
  private readonly _rpc: Rpc<SolanaRpcApi>;
  readonly _config: HubbleConfig;
  private _globalConfig: Address;
  private readonly _scope: Scope;
  private readonly _kliquidityProgramId: Address;
  private readonly _orcaService: OrcaService;
  private readonly _raydiumService: RaydiumService;
  private readonly _meteoraService: MeteoraService;
  private readonly _jupBaseAPI: string = DEFAULT_JUP_API_ENDPOINT;

  /**
   * Create a new instance of the Kamino SDK class.
   * @param cluster Name of the Solana cluster
   * @param rpc Connection to the Solana cluster
   * @param globalConfig override kamino global config
   * @param programId override kamino program id
   * @param whirlpoolProgramId override whirlpool program id
   * @param raydiumProgramId override raydium program id
   * @param meteoraProgramId
   * @param jupBaseAPI
   */
  constructor(
    cluster: SolanaCluster,
    rpc: Rpc<SolanaRpcApi>,
    globalConfig?: Address,
    programId?: Address,
    whirlpoolProgramId?: Address,
    raydiumProgramId?: Address,
    meteoraProgramId?: Address,
    jupBaseAPI?: string
  ) {
    this._cluster = cluster;
    this._rpc = rpc;
    this._config = getConfigByCluster(cluster);

    if (programId && programId === STAGING_KAMINO_PROGRAM_ID) {
      this._kliquidityProgramId = programId;
      this._globalConfig = STAGING_GLOBAL_CONFIG;
    } else {
      this._kliquidityProgramId = programId ? programId : fromLegacyPublicKey(this._config.kamino.programId);
      this._globalConfig = globalConfig ? globalConfig : fromLegacyPublicKey(this._config.kamino.globalConfig);
    }

    this._scope = new Scope(cluster, rpc);
    this._orcaService = new OrcaService(rpc, whirlpoolProgramId);
    this._raydiumService = new RaydiumService(rpc, raydiumProgramId);
    this._meteoraService = new MeteoraService(rpc, meteoraProgramId);

    if (jupBaseAPI) {
      this._jupBaseAPI = jupBaseAPI;
    }
  }

  getConnection = () => this._rpc;

  getProgramID = () => this._kliquidityProgramId;

  setGlobalConfig = (globalConfig: Address) => {
    this._globalConfig = globalConfig;
  };

  getGlobalConfig = () => this._globalConfig;

  getDepositableTokens = async (): Promise<CollateralInfo[]> => {
    const collateralInfos = await this.getCollateralInfos();
    return collateralInfos.filter((x) => x.mint !== DEFAULT_PUBLIC_KEY);
  };

  getCollateralInfos = async () => {
    const config = await this.getGlobalConfigState(this._globalConfig);
    if (!config) {
      throw Error(`Could not fetch globalConfig with pubkey ${this.getGlobalConfig().toString()}`);
    }
    return this.getCollateralInfo(config.tokenInfos);
  };

  getDisabledTokensPrices = async (collateralInfos?: CollateralInfo[]) => {
    const collInfos = collateralInfos ? collateralInfos : await this.getCollateralInfos();
    const disabledTokens = collInfos.filter((x) => x.disabled && x.mint !== DEFAULT_PUBLIC_KEY);
    return JupService.getDollarPrices(
      disabledTokens.map((x) => x.mint),
      this._jupBaseAPI
    );
  };

  getSupportedDexes = (): Dex[] => ['ORCA', 'RAYDIUM', 'METEORA'];

  // todo: see if we can read this dynamically
  getFeeTiersForDex = (dex: Dex): Decimal[] => {
    if (dex === 'ORCA') {
      return [new Decimal(0.0001), new Decimal(0.0005), new Decimal(0.003), new Decimal(0.01)];
    } else if (dex === 'RAYDIUM') {
      return [new Decimal(0.0001), new Decimal(0.0005), new Decimal(0.0025), new Decimal(0.01)];
    } else if (dex === 'METEORA') {
      return [new Decimal(0.0001), new Decimal(0.0005), new Decimal(0.0025), new Decimal(0.01)];
    } else {
      throw new Error(`Dex ${dex} is not supported`);
    }
  };

  getRebalanceMethods = (): RebalanceMethod[] => {
    return [
      ManualRebalanceMethod,
      PricePercentageRebalanceMethod,
      PricePercentageWithResetRangeRebalanceMethod,
      DriftRebalanceMethod,
      TakeProfitMethod,
      PeriodicRebalanceMethod,
      ExpanderMethod,
      AutodriftMethod,
    ];
  };

  getEnabledRebalanceMethods = (): RebalanceMethod[] => {
    return this.getRebalanceMethods().filter((x) => x.enabled);
  };

  getPriceReferenceTypes = (): PriceReferenceType[] => {
    return [PoolPriceReferenceType, TwapPriceReferenceType];
  };

  getDefaultRebalanceMethod = (): RebalanceMethod => PricePercentageRebalanceMethod;

  getDefaultParametersForNewVault = async (): Promise<VaultParameters> => {
    const dex = DefaultDex;
    const tokenMintA = DefaultMintTokenA;
    const tokenMintB = DefaultMintTokenB;
    const rebalanceMethod = this.getDefaultRebalanceMethod();
    const feeTier = DefaultFeeTierOrca;
    const tickSpacing = DefaultTickSpacing;
    const rebalancingParameters = await this.getDefaultRebalanceFields(
      dex,
      tokenMintA,
      tokenMintB,
      tickSpacing,
      rebalanceMethod
    );
    const defaultParameters: VaultParameters = {
      dex,
      tokenMintA,
      tokenMintB,
      feeTier,
      rebalancingParameters,
    };
    return defaultParameters;
  };

  /**
   * Retunrs what type of rebalance method the fields represent
   */
  getRebalanceTypeFromRebalanceFields = (rebalanceFields: RebalanceFieldInfo[]): RebalanceTypeKind => {
    return getRebalanceTypeFromRebalanceFields(rebalanceFields);
  };

  /**
   * Retunrs the rebalance method the fields represent with more details (description, enabled, etc)
   */
  getRebalanceMethodFromRebalanceFields = (rebalanceFields: RebalanceFieldInfo[]): RebalanceMethod => {
    return getRebalanceMethodFromRebalanceFields(rebalanceFields);
  };

  getReferencePriceTypeForStrategy = async (strategy: Address | StrategyWithAddress): Promise<PriceReferenceType> => {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    return numberToReferencePriceType(strategyWithAddress.strategy.rebalanceRaw.referencePriceType);
  };

  getFieldsForRebalanceMethod = (
    rebalanceMethod: RebalanceMethod,
    dex: Dex,
    fieldOverrides: RebalanceFieldInfo[],
    tokenAMint: Address,
    tokenBMint: Address,
    tickSpacing: number,
    poolPrice?: Decimal
  ): Promise<RebalanceFieldInfo[]> => {
    switch (rebalanceMethod) {
      case ManualRebalanceMethod:
        return this.getFieldsForManualRebalanceMethod(dex, fieldOverrides, tokenAMint, tokenBMint, poolPrice);
      case PricePercentageRebalanceMethod:
        return this.getFieldsForPricePercentageMethod(dex, fieldOverrides, tokenAMint, tokenBMint, poolPrice);
      case PricePercentageWithResetRangeRebalanceMethod:
        return this.getFieldsForPricePercentageWithResetMethod(dex, fieldOverrides, tokenAMint, tokenBMint, poolPrice);
      case DriftRebalanceMethod:
        return this.getFieldsForDriftRebalanceMethod(
          dex,
          fieldOverrides,
          tickSpacing,
          tokenAMint,
          tokenBMint,
          poolPrice
        );
      case TakeProfitMethod:
        return this.getFieldsForTakeProfitRebalanceMethod(dex, fieldOverrides, tokenAMint, tokenBMint, poolPrice);
      case PeriodicRebalanceMethod:
        return this.getFieldsForPeriodicRebalanceMethod(dex, fieldOverrides, tokenAMint, tokenBMint, poolPrice);
      case ExpanderMethod:
        return this.getFieldsForExpanderRebalanceMethod(dex, fieldOverrides, tokenAMint, tokenBMint, poolPrice);
      case AutodriftMethod:
        return this.getFieldsForAutodriftRebalanceMethod(
          dex,
          fieldOverrides,
          tokenAMint,
          tokenBMint,
          tickSpacing,
          poolPrice
        );
      default:
        throw new Error(`Rebalance method ${rebalanceMethod} is not supported`);
    }
  };

  getFieldsForManualRebalanceMethod = async (
    dex: Dex,
    fieldOverrides: RebalanceFieldInfo[],
    tokenAMint: Address,
    tokenBMint: Address,
    poolPrice?: Decimal
  ): Promise<RebalanceFieldInfo[]> => {
    const price = poolPrice ? poolPrice : new Decimal(await this.getPriceForPair(dex, tokenAMint, tokenBMint));

    const defaultFields = getDefaultManualRebalanceFieldInfos(price);

    let lowerPrice = defaultFields.find((x) => x.label === 'rangePriceLower')!.value;
    const lowerPriceInput = fieldOverrides.find((x) => x.label === 'rangePriceLower');
    if (lowerPriceInput) {
      lowerPrice = lowerPriceInput.value;
    }

    let upperPrice = defaultFields.find((x) => x.label === 'rangePriceUpper')!.value;
    const upperPriceInput = fieldOverrides.find((x) => x.label === 'rangePriceUpper');
    if (upperPriceInput) {
      upperPrice = upperPriceInput.value;
    }

    return getManualRebalanceFieldInfos(new Decimal(lowerPrice), new Decimal(upperPrice));
  };

  getFieldsForPricePercentageMethod = async (
    dex: Dex,
    fieldOverrides: RebalanceFieldInfo[],
    tokenAMint: Address,
    tokenBMint: Address,
    poolPrice?: Decimal
  ): Promise<RebalanceFieldInfo[]> => {
    const price = poolPrice ? poolPrice : new Decimal(await this.getPriceForPair(dex, tokenAMint, tokenBMint));

    const defaultFields = getDefaultPricePercentageRebalanceFieldInfos(price);
    let lowerPriceDifferenceBPS = defaultFields.find((x) => x.label === 'lowerRangeBps')!.value;
    const lowerPriceDifferenceBPSInput = fieldOverrides.find((x) => x.label === 'lowerRangeBps');
    if (lowerPriceDifferenceBPSInput) {
      lowerPriceDifferenceBPS = lowerPriceDifferenceBPSInput.value;
    }

    let upperPriceDifferenceBPS = defaultFields.find((x) => x.label === 'upperRangeBps')!.value;
    const upperPriceDifferenceBPSInput = fieldOverrides.find((x) => x.label === 'upperRangeBps');
    if (upperPriceDifferenceBPSInput) {
      upperPriceDifferenceBPS = upperPriceDifferenceBPSInput.value;
    }

    return getPricePercentageRebalanceFieldInfos(
      price,
      new Decimal(lowerPriceDifferenceBPS),
      new Decimal(upperPriceDifferenceBPS)
    );
  };

  getFieldsForPricePercentageWithResetMethod = async (
    dex: Dex,
    fieldOverrides: RebalanceFieldInfo[],
    tokenAMint: Address,
    tokenBMint: Address,
    poolPrice?: Decimal
  ): Promise<RebalanceFieldInfo[]> => {
    const price = poolPrice ? poolPrice : new Decimal(await this.getPriceForPair(dex, tokenAMint, tokenBMint));

    const defaultFields = getDefaultPricePercentageWithResetRebalanceFieldInfos(price);

    let lowerPriceDifferenceBPS = defaultFields.find((x) => x.label === 'lowerRangeBps')!.value;
    const lowerPriceDifferenceBPSInput = fieldOverrides.find((x) => x.label === 'lowerRangeBps');
    if (lowerPriceDifferenceBPSInput) {
      lowerPriceDifferenceBPS = lowerPriceDifferenceBPSInput.value;
    }

    let upperPriceDifferenceBPS = defaultFields.find((x) => x.label === 'upperRangeBps')!.value;
    const upperPriceDifferenceBPSInput = fieldOverrides.find((x) => x.label === 'upperRangeBps');
    if (upperPriceDifferenceBPSInput) {
      upperPriceDifferenceBPS = upperPriceDifferenceBPSInput.value;
    }

    let lowerResetPriceDifferenceBPS = defaultFields.find((x) => x.label === 'resetLowerRangeBps')!.value;
    const lowerResetPriceDifferenceBPSInput = fieldOverrides.find((x) => x.label === 'resetLowerRangeBps');
    if (lowerResetPriceDifferenceBPSInput) {
      lowerResetPriceDifferenceBPS = lowerResetPriceDifferenceBPSInput.value;
    }

    let upperResetPriceDifferenceBPS = defaultFields.find((x) => x.label === 'resetUpperRangeBps')!.value;
    const upperResetPriceDifferenceBPSInput = fieldOverrides.find((x) => x.label === 'resetUpperRangeBps');
    if (upperResetPriceDifferenceBPSInput) {
      upperResetPriceDifferenceBPS = upperResetPriceDifferenceBPSInput.value;
    }

    return getPricePercentageWithResetRebalanceFieldInfos(
      price,
      new Decimal(lowerPriceDifferenceBPS),
      new Decimal(upperPriceDifferenceBPS),
      new Decimal(lowerResetPriceDifferenceBPS),
      new Decimal(upperResetPriceDifferenceBPS)
    );
  };

  getFieldsForDriftRebalanceMethod = async (
    dex: Dex,
    fieldOverrides: RebalanceFieldInfo[],
    tickSpacing: number,
    tokenAMint: Address,
    tokenBMint: Address,
    poolPrice?: Decimal
  ): Promise<RebalanceFieldInfo[]> => {
    const tokenADecimals = await getMintDecimals(this._rpc, tokenAMint);
    const tokenBDecimals = await getMintDecimals(this._rpc, tokenBMint);
    const price = poolPrice ? poolPrice : new Decimal(await this.getPriceForPair(dex, tokenAMint, tokenBMint));

    const defaultFields = getDefaultDriftRebalanceFieldInfos(dex, tickSpacing, price, tokenADecimals, tokenBDecimals);

    let startMidTick = defaultFields.find((x) => x.label === 'startMidTick')!.value;
    const startMidTickInput = fieldOverrides.find((x) => x.label === 'startMidTick');
    if (startMidTickInput) {
      startMidTick = startMidTickInput.value;
    }

    let ticksBelowMid = defaultFields.find((x) => x.label === 'ticksBelowMid')!.value;
    const ticksBelowMidInput = fieldOverrides.find((x) => x.label === 'ticksBelowMid');
    if (ticksBelowMidInput) {
      ticksBelowMid = ticksBelowMidInput.value;
    }

    let ticksAboveMid = defaultFields.find((x) => x.label === 'ticksAboveMid')!.value;
    const ticksAboveMidInput = fieldOverrides.find((x) => x.label === 'ticksAboveMid');
    if (ticksAboveMidInput) {
      ticksAboveMid = ticksAboveMidInput.value;
    }

    let secondsPerTick = defaultFields.find((x) => x.label === 'secondsPerTick')!.value;
    const secondsPerTickInput = fieldOverrides.find((x) => x.label === 'secondsPerTick');
    if (secondsPerTickInput) {
      secondsPerTick = secondsPerTickInput.value;
    }

    let direction = defaultFields.find((x) => x.label === 'direction')!.value;
    const directionInput = fieldOverrides.find((x) => x.label === 'direction');
    if (directionInput) {
      direction = directionInput.value;
    }

    const fieldInfos = getDriftRebalanceFieldInfos(
      dex,
      tokenADecimals,
      tokenBDecimals,
      tickSpacing,
      new Decimal(startMidTick),
      new Decimal(ticksBelowMid),
      new Decimal(ticksAboveMid),
      new Decimal(secondsPerTick),
      new Decimal(direction)
    );

    return fieldInfos;
  };

  getFieldsForTakeProfitRebalanceMethod = async (
    dex: Dex,
    fieldOverrides: RebalanceFieldInfo[],
    tokenAMint: Address,
    tokenBMint: Address,
    poolPrice?: Decimal
  ): Promise<RebalanceFieldInfo[]> => {
    const price = poolPrice ? poolPrice : new Decimal(await this.getPriceForPair(dex, tokenAMint, tokenBMint));
    const defaultFields = getDefaultTakeProfitRebalanceFieldsInfos(price);

    let lowerRangePrice = defaultFields.find((x) => x.label === 'rangePriceLower')!.value;
    const lowerRangePriceInput = fieldOverrides.find((x) => x.label === 'rangePriceLower');
    if (lowerRangePriceInput) {
      lowerRangePrice = lowerRangePriceInput.value;
    }

    let upperRangePrice = defaultFields.find((x) => x.label === 'rangePriceUpper')!.value;
    const upperRangePriceInput = fieldOverrides.find((x) => x.label === 'rangePriceUpper');
    if (upperRangePriceInput) {
      upperRangePrice = upperRangePriceInput.value;
    }

    let destinationToken = defaultFields.find((x) => x.label === 'destinationToken')!.value;
    const destinationTokenInput = fieldOverrides.find((x) => x.label === 'destinationToken');
    if (destinationTokenInput) {
      destinationToken = destinationTokenInput.value;
    }

    return getTakeProfitRebalanceFieldsInfos(
      new Decimal(lowerRangePrice),
      new Decimal(upperRangePrice),
      new Decimal(destinationToken),
      true
    );
  };

  getFieldsForPeriodicRebalanceMethod = async (
    dex: Dex,
    fieldOverrides: RebalanceFieldInfo[],
    tokenAMint: Address,
    tokenBMint: Address,
    poolPrice?: Decimal
  ): Promise<RebalanceFieldInfo[]> => {
    const price = poolPrice ? poolPrice : new Decimal(await this.getPriceForPair(dex, tokenAMint, tokenBMint));
    const defaultFields = getDefaultPeriodicRebalanceFieldInfos(price);

    let period: Decimal = new Decimal(defaultFields.find((x) => x.label === 'period')!.value);
    const periodInput = fieldOverrides.find((x) => x.label === 'period');
    if (periodInput) {
      period = new Decimal(periodInput.value);
    }

    let lowerPriceDifferenceBPS = defaultFields.find((x) => x.label === 'lowerRangeBps')!.value;
    const lowerPriceDifferenceBPSInput = fieldOverrides.find((x) => x.label === 'lowerRangeBps');
    if (lowerPriceDifferenceBPSInput) {
      lowerPriceDifferenceBPS = lowerPriceDifferenceBPSInput.value;
    }

    let upperPriceDifferenceBPS = defaultFields.find((x) => x.label === 'upperRangeBps')!.value;
    const upperPriceDifferenceBPSInput = fieldOverrides.find((x) => x.label === 'upperRangeBps');
    if (upperPriceDifferenceBPSInput) {
      upperPriceDifferenceBPS = upperPriceDifferenceBPSInput.value;
    }

    return getPeriodicRebalanceRebalanceFieldInfos(
      price,
      period,
      new Decimal(lowerPriceDifferenceBPS),
      new Decimal(upperPriceDifferenceBPS)
    );
  };

  getFieldsForExpanderRebalanceMethod = async (
    dex: Dex,
    fieldOverrides: RebalanceFieldInfo[],
    tokenAMint: Address,
    tokenBMint: Address,
    poolPrice?: Decimal
  ): Promise<RebalanceFieldInfo[]> => {
    const price = poolPrice ? poolPrice : new Decimal(await this.getPriceForPair(dex, tokenAMint, tokenBMint));
    const defaultFields = getDefaultExpanderRebalanceFieldInfos(price);

    let lowerPriceDifferenceBPS = defaultFields.find((x) => x.label === 'lowerRangeBps')!.value;
    const lowerPriceDifferenceBPSInput = fieldOverrides.find((x) => x.label === 'lowerRangeBps');
    if (lowerPriceDifferenceBPSInput) {
      lowerPriceDifferenceBPS = lowerPriceDifferenceBPSInput.value;
    }

    let upperPriceDifferenceBPS = defaultFields.find((x) => x.label === 'upperRangeBps')!.value;
    const upperPriceDifferenceBPSInput = fieldOverrides.find((x) => x.label === 'upperRangeBps');
    if (upperPriceDifferenceBPSInput) {
      upperPriceDifferenceBPS = upperPriceDifferenceBPSInput.value;
    }

    let lowerResetPriceDifferenceBPS = defaultFields.find((x) => x.label === 'resetLowerRangeBps')!.value;
    const lowerResetPriceDifferenceBPSInput = fieldOverrides.find((x) => x.label === 'resetLowerRangeBps');
    if (lowerResetPriceDifferenceBPSInput) {
      lowerResetPriceDifferenceBPS = lowerResetPriceDifferenceBPSInput.value;
    }

    let upperResetPriceDifferenceBPS = defaultFields.find((x) => x.label === 'resetUpperRangeBps')!.value;
    const upperResetPriceDifferenceBPSInput = fieldOverrides.find((x) => x.label === 'resetUpperRangeBps');
    if (upperResetPriceDifferenceBPSInput) {
      upperResetPriceDifferenceBPS = upperResetPriceDifferenceBPSInput.value;
    }

    let expansionBPS = defaultFields.find((x) => x.label === 'expansionBps')!.value;
    const expansionBPSInput = fieldOverrides.find((x) => x.label === 'expansionBps');
    if (expansionBPSInput) {
      expansionBPS = expansionBPSInput.value;
    }

    let maxNumberOfExpansions = defaultFields.find((x) => x.label === 'maxNumberOfExpansions')!.value;
    const maxNumberOfExpansionsInput = fieldOverrides.find((x) => x.label === 'maxNumberOfExpansions');
    if (maxNumberOfExpansionsInput) {
      maxNumberOfExpansions = maxNumberOfExpansionsInput.value;
    }

    let swapUnevenAllowed = defaultFields.find((x) => x.label === 'swapUnevenAllowed')!.value;
    const swapUnevenAllowedInput = fieldOverrides.find((x) => x.label === 'swapUnevenAllowed');
    if (swapUnevenAllowedInput) {
      swapUnevenAllowed = swapUnevenAllowedInput.value;
    }

    return getExpanderRebalanceFieldInfos(
      price,
      new Decimal(lowerPriceDifferenceBPS),
      new Decimal(upperPriceDifferenceBPS),
      new Decimal(lowerResetPriceDifferenceBPS),
      new Decimal(upperResetPriceDifferenceBPS),
      new Decimal(expansionBPS),
      new Decimal(maxNumberOfExpansions),
      new Decimal(swapUnevenAllowed)
    );
  };

  getFieldsForAutodriftRebalanceMethod = async (
    dex: Dex,
    fieldOverrides: RebalanceFieldInfo[],
    tokenAMint: Address,
    tokenBMint: Address,
    tickSpacing: number,
    poolPrice?: Decimal
  ): Promise<RebalanceFieldInfo[]> => {
    const tokenADecimals = await getMintDecimals(this._rpc, tokenAMint);
    const tokenBDecimals = await getMintDecimals(this._rpc, tokenBMint);
    const price = poolPrice ? poolPrice : new Decimal(await this.getPriceForPair(dex, tokenAMint, tokenBMint));

    // TODO: maybe we will need to get real staking price instead of pool price for this to be accurate.
    const defaultFields = getDefaultAutodriftRebalanceFieldInfos(
      dex,
      price,
      tokenADecimals,
      tokenBDecimals,
      tickSpacing
    );

    const lastMidTick = defaultFields.find((x) => x.label === 'lastMidTick')!.value;

    let initDriftTicksPerEpoch = defaultFields.find((x) => x.label === 'initDriftTicksPerEpoch')!.value;
    const initDriftTicksPerEpochInput = fieldOverrides.find((x) => x.label === 'initDriftTicksPerEpoch');
    if (initDriftTicksPerEpochInput) {
      initDriftTicksPerEpoch = initDriftTicksPerEpochInput.value;
    }

    let ticksBelowMid = defaultFields.find((x) => x.label === 'ticksBelowMid')!.value;
    const ticksBelowMidInput = fieldOverrides.find((x) => x.label === 'ticksBelowMid');
    if (ticksBelowMidInput) {
      ticksBelowMid = ticksBelowMidInput.value;
    }

    let ticksAboveMid = defaultFields.find((x) => x.label === 'ticksAboveMid')!.value;
    const ticksAboveMidInput = fieldOverrides.find((x) => x.label === 'ticksAboveMid');
    if (ticksAboveMidInput) {
      ticksAboveMid = ticksAboveMidInput.value;
    }

    let frontrunMultiplierBps = defaultFields.find((x) => x.label === 'frontrunMultiplierBps')!.value;
    const frontrunMultiplierBpsInput = fieldOverrides.find((x) => x.label === 'frontrunMultiplierBps');
    if (frontrunMultiplierBpsInput) {
      frontrunMultiplierBps = frontrunMultiplierBpsInput.value;
    }
    let stakingRateASource = defaultFields.find((x) => x.label === 'stakingRateASource')!.value;
    const stakingRateASourceInput = fieldOverrides.find((x) => x.label === 'stakingRateASource');
    if (stakingRateASourceInput) {
      stakingRateASource = stakingRateASourceInput.value;
    }

    let stakingRateBSource = defaultFields.find((x) => x.label === 'stakingRateBSource')!.value;
    const stakingRateBSourceInput = fieldOverrides.find((x) => x.label === 'stakingRateBSource');
    if (stakingRateBSourceInput) {
      stakingRateBSource = stakingRateBSourceInput.value;
    }

    let initialDriftDirection = defaultFields.find((x) => x.label === 'initialDriftDirection')!.value;
    const initialDriftDirectionInput = fieldOverrides.find((x) => x.label === 'initialDriftDirection');
    if (initialDriftDirectionInput) {
      initialDriftDirection = initialDriftDirectionInput.value;
    }

    const fieldInfos = getAutodriftRebalanceFieldInfos(
      dex,
      tokenADecimals,
      tokenBDecimals,
      tickSpacing,
      new Decimal(lastMidTick),
      new Decimal(initDriftTicksPerEpoch),
      new Decimal(ticksBelowMid),
      new Decimal(ticksAboveMid),
      new Decimal(frontrunMultiplierBps),
      new Decimal(stakingRateASource),
      new Decimal(stakingRateBSource),
      new Decimal(initialDriftDirection)
    );

    return fieldInfos;
  };

  /**
   * Get the price for a given pair of tokens in a given dex; The price comes from any pool having those tokens, not a specific one, so the price may not be exactly the same between different pools with the same tokens. For a specific pool price use getPoolPrice
   * @param strategy
   * @param amountA
   */
  getPriceForPair = async (dex: Dex, poolTokenA: Address, poolTokenB: Address): Promise<number> => {
    if (dex === 'ORCA') {
      const pools = await this.getOrcaPoolsForTokens(poolTokenA, poolTokenB);
      if (pools.length === 0) {
        throw new Error(`No pool found for ${poolTokenA.toString()} and ${poolTokenB.toString()}`);
      }
      return Number(pools[0].price);
    } else if (dex === 'RAYDIUM') {
      const pools = await this.getRaydiumPoolsForTokens(poolTokenA, poolTokenB);
      if (pools.length === 0) {
        throw new Error(`No pool found for ${poolTokenA.toString()} and ${poolTokenB.toString()}`);
      }
      return pools[0].price;
    } else if (dex === 'METEORA') {
      const pools = await this.getMeteoraPoolsForTokens(poolTokenA, poolTokenB);
      if (pools.length === 0) {
        throw new Error(`No pool found for ${poolTokenA.toString()} and ${poolTokenB.toString()}`);
      }
      const decimalsX = await getMintDecimals(this._rpc, poolTokenA);
      const decimalsY = await getMintDecimals(this._rpc, poolTokenB);
      return getPriceOfBinByBinIdWithDecimals(
        pools[0].pool.activeId,
        pools[0].pool.binStep,
        decimalsX,
        decimalsY
      ).toNumber();
    } else {
      throw new Error(`Dex ${dex} is not supported`);
    }
  };

  getDefaultRebalanceFields = async (
    dex: Dex,
    poolTokenA: Address,
    poolTokenB: Address,
    tickSpacing: number,
    rebalanceMethod: RebalanceMethod
  ): Promise<RebalanceFieldInfo[]> => {
    const price = new Decimal(await this.getPriceForPair(dex, poolTokenA, poolTokenB));
    const tokenADecimals = await getMintDecimals(this._rpc, poolTokenA);
    const tokenBDecimals = await getMintDecimals(this._rpc, poolTokenB);

    switch (rebalanceMethod) {
      case ManualRebalanceMethod:
        return getDefaultManualRebalanceFieldInfos(price);
      case PricePercentageRebalanceMethod:
        return getDefaultPricePercentageRebalanceFieldInfos(price);
      case PricePercentageWithResetRangeRebalanceMethod:
        return getDefaultPricePercentageWithResetRebalanceFieldInfos(price);
      case DriftRebalanceMethod:
        return getDefaultDriftRebalanceFieldInfos(dex, tickSpacing, price, tokenADecimals, tokenBDecimals);
      case TakeProfitMethod:
        return getDefaultTakeProfitRebalanceFieldsInfos(price);
      case PeriodicRebalanceMethod:
        return getDefaultPeriodicRebalanceFieldInfos(price);
      case ExpanderMethod:
        return getDefaultExpanderRebalanceFieldInfos(price);
      case AutodriftMethod:
        return getDefaultAutodriftRebalanceFieldInfos(dex, price, tokenADecimals, tokenBDecimals, tickSpacing);
      default:
        throw new Error(`Rebalance method ${rebalanceMethod} is not supported`);
    }
  };

  /**
   * Return a the pubkey of the pool in a given dex, for given mints and fee tier; if that pool doesn't exist, return default pubkey
   */
  getPoolInitializedForDexPairTier = async (
    dex: Dex,
    poolTokenA: Address,
    poolTokenB: Address,
    feeBPS: Decimal
  ): Promise<Address> => {
    if (dex === 'ORCA') {
      let pool: Address = DEFAULT_PUBLIC_KEY;
      const orcaPools = await this.getOrcaPoolsForTokens(poolTokenA, poolTokenB);
      orcaPools.forEach((element) => {
        if (element.feeRate * FullBPS === feeBPS.toNumber()) {
          pool = address(element.address);
        }
      });
      return pool;
    } else if (dex === 'RAYDIUM') {
      const pools: Pool[] = [];
      const raydiumPools = await this.getRaydiumPoolsForTokens(poolTokenA, poolTokenB);
      raydiumPools.forEach((element) => {
        if (new Decimal(element.ammConfig.tradeFeeRate).div(FullBPS).div(FullPercentage).equals(feeBPS.div(FullBPS))) {
          pools.push(element);
        }
      });
      if (pools.length === 0) {
        return DEFAULT_PUBLIC_KEY;
      }
      let pool = DEFAULT_PUBLIC_KEY;
      let tickSpacing = Number.MAX_VALUE;
      pools.forEach((element) => {
        if (element.ammConfig.tickSpacing < tickSpacing) {
          pool = address(element.id);
          tickSpacing = element.ammConfig.tickSpacing;
        }
      });
      return pool;
    } else if (dex === 'METEORA') {
      let pool = DEFAULT_PUBLIC_KEY;
      const pools = await this.getMeteoraPoolsForTokens(poolTokenA, poolTokenB);
      pools.forEach((element) => {
        const feeRateBps = element.pool.parameters.baseFactor * element.pool.binStep;
        if (feeRateBps === feeBPS.toNumber()) {
          pool = address(element.key);
        }
      });
      return pool;
    } else {
      throw new Error(`Dex ${dex} is not supported`);
    }
  };

  /**
   * Return generic information for all pools in a given dex, for given mints and fee tier
   */
  async getExistentPoolsForPair(dex: Dex, tokenMintA: Address, tokenMintB: Address): Promise<GenericPoolInfo[]> {
    if (dex === 'ORCA') {
      const pools = await this.getOrcaPoolsForTokens(tokenMintA, tokenMintB);
      const genericPoolInfos: GenericPoolInfo[] = await Promise.all(
        pools.map(async (pool: WhirlpoolAPIResponse) => {
          const positionsCount = new Decimal(await this.getPositionsCountForPool(dex, address(pool.address)));
          // read price from pool
          const poolData = await this._orcaService.getOrcaWhirlpool(address(pool.address));
          if (!poolData) {
            throw new Error(`Pool ${pool.address} not found`);
          }
          const poolInfo: GenericPoolInfo = {
            dex,
            address: address(pool.address),
            price: new Decimal(
              orcaSqrtPriceToPrice(BigInt(poolData.sqrtPrice), pool.tokenA.decimals, pool.tokenB.decimals)
            ),
            tokenMintA: address(pool.tokenMintA),
            tokenMintB: address(pool.tokenMintB),
            tvl: pool.tvlUsdc ? new Decimal(pool.tvlUsdc) : undefined,
            feeRate: new Decimal(pool.feeRate).mul(FullBPS),
            volumeOnLast7d: pool.stats['7d'] ? new Decimal(pool.stats['7d'].volume) : undefined,
            tickSpacing: new Decimal(pool.tickSpacing),
            positions: positionsCount,
          };
          return poolInfo;
        })
      );
      return genericPoolInfos;
    } else if (dex === 'RAYDIUM') {
      const pools = await this.getRaydiumPoolsForTokens(tokenMintA, tokenMintB);
      const genericPoolInfos: GenericPoolInfo[] = await Promise.all(
        pools.map(async (pool: Pool) => {
          const positionsCount = new Decimal(await this.getPositionsCountForPool(dex, address(pool.id)));

          const poolInfo: GenericPoolInfo = {
            dex,
            address: address(pool.id),
            price: new Decimal(pool.price),
            tokenMintA: address(pool.mintA),
            tokenMintB: address(pool.mintB),
            tvl: new Decimal(pool.tvl),
            feeRate: new Decimal(pool.ammConfig.tradeFeeRate).div(new Decimal(FullPercentage)),
            volumeOnLast7d: new Decimal(pool.week.volume),
            tickSpacing: new Decimal(pool.ammConfig.tickSpacing),
            positions: positionsCount,
          };
          return poolInfo;
        })
      );

      return genericPoolInfos;
    } else if (dex === 'METEORA') {
      const pools = await this.getMeteoraPoolsForTokens(tokenMintA, tokenMintB);
      const genericPoolInfos: GenericPoolInfo[] = await Promise.all(
        pools.map(async (pool: MeteoraPool) => {
          const positionsCount = new Decimal(await this.getPositionsCountForPool(dex, pool.key));
          const decimalsX = await getMintDecimals(this._rpc, pool.pool.tokenXMint);
          const decimalsY = await getMintDecimals(this._rpc, pool.pool.tokenYMint);
          const price = getPriceOfBinByBinIdWithDecimals(pool.pool.activeId, pool.pool.binStep, decimalsX, decimalsY);

          const poolInfo: GenericPoolInfo = {
            dex,
            address: pool.key,
            price,
            tokenMintA: pool.pool.tokenXMint,
            tokenMintB: pool.pool.tokenYMint,
            tvl: new Decimal(0),
            feeRate: computeMeteoraFee(pool.pool).div(1e2), // Transform it to rate
            volumeOnLast7d: new Decimal(0),
            tickSpacing: new Decimal(pool.pool.binStep),
            positions: positionsCount,
          };
          return poolInfo;
        })
      );

      return genericPoolInfos;
    } else {
      throw new Error(`Dex ${dex} is not supported`);
    }
  }

  getOrcaPoolsForTokens = async (poolTokenA: Address, poolTokenB: Address): Promise<WhirlpoolAPIResponse[]> => {
    const pools: WhirlpoolAPIResponse[] = [];
    const poolTokenAString = poolTokenA.toString();
    const poolTokenBString = poolTokenB.toString();
    const whirlpools = await this._orcaService.getOrcaWhirlpools();
    whirlpools.forEach((element) => {
      if (
        (element.tokenMintA === poolTokenAString && element.tokenMintB === poolTokenBString) ||
        (element.tokenMintA === poolTokenBString && element.tokenMintB === poolTokenAString)
      )
        pools.push(element);
    });

    return pools;
  };

  getRaydiumPoolsForTokens = async (poolTokenA: Address, poolTokenB: Address): Promise<Pool[]> => {
    const pools: Pool[] = [];
    const poolTokenAString = poolTokenA.toString();
    const poolTokenBString = poolTokenB.toString();
    const raydiumPools = await this._raydiumService.getRaydiumWhirlpools();
    raydiumPools.data.forEach((element) => {
      if (
        (element.mintA === poolTokenAString && element.mintB === poolTokenBString) ||
        (element.mintA === poolTokenBString && element.mintB === poolTokenAString)
      ) {
        pools.push(element);
      }
    });

    return pools;
  };

  getMeteoraPoolsForTokens = async (poolTokenA: Address, poolTokenB: Address): Promise<MeteoraPool[]> => {
    const pools: MeteoraPool[] = [];
    const meteoraPools = await this._meteoraService.getMeteoraPools();
    meteoraPools.forEach((element) => {
      if (
        (element.pool.tokenXMint === poolTokenA && element.pool.tokenYMint === poolTokenB) ||
        (element.pool.tokenXMint === poolTokenB && element.pool.tokenYMint === poolTokenA)
      ) {
        pools.push(element);
      }
    });

    return pools;
  };

  /**
   * Return a list of all Kamino whirlpool strategies
   * @param strategies Limit results to these strategy addresses
   */
  getStrategies = async (strategies?: Array<Address>): Promise<Array<WhirlpoolStrategy | null>> => {
    if (!strategies) {
      strategies = (await this.getAllStrategiesWithFilters({})).map((x) => x.address);
    }
    return await batchFetch(strategies, (chunk) => this.getWhirlpoolStrategies(chunk));
  };

  /**
   * Return a list of all Kamino whirlpool strategies with their addresses
   * @param strategies Limit results to these strategy addresses
   */
  getStrategiesWithAddresses = async (strategies?: Array<Address>): Promise<Array<StrategyWithAddress>> => {
    if (!strategies) {
      return this.getAllStrategiesWithFilters({});
    }
    const result: StrategyWithAddress[] = [];
    const states = await batchFetch(strategies, (chunk) => this.getWhirlpoolStrategies(chunk));
    for (let i = 0; i < strategies.length; i++) {
      if (states[i]) {
        result.push({ address: strategies[i], strategy: states[i]! });
      } else {
        throw Error(`Could not fetch strategy state for ${strategies[i].toString()}`);
      }
    }
    return result;
  };

  getAllStrategiesWithFilters = async (strategyFilters: StrategiesFilters): Promise<Array<StrategyWithAddress>> => {
    const filters: (GetProgramAccountsDatasizeFilter | GetProgramAccountsMemcmpFilter)[] = [];
    filters.push({
      dataSize: BigInt(WhirlpoolStrategy.layout.span + 8),
    });
    filters.push({
      memcmp: {
        offset: 0n,
        bytes: bs58.encode(WhirlpoolStrategy.discriminator) as Base58EncodedBytes,
        encoding: 'base58',
      },
    });

    if (strategyFilters.owner) {
      filters.push({
        memcmp: {
          offset: 8n,
          bytes: strategyFilters.owner.toString() as Base58EncodedBytes,
          encoding: 'base58',
        },
      });
    }

    if (strategyFilters.strategyCreationStatus) {
      filters.push({
        memcmp: {
          offset: 1625n,
          bytes: strategyCreationStatusToBase58(strategyFilters.strategyCreationStatus) as Base58EncodedBytes,
          encoding: 'base58',
        },
      });
    }
    if (strategyFilters.strategyType) {
      filters.push({
        memcmp: {
          offset: 1120n,
          bytes: strategyTypeToBase58(strategyFilters.strategyType).toString() as Base58EncodedBytes,
          encoding: 'base58',
        },
      });
    }

    if (strategyFilters.isCommunity !== undefined && strategyFilters.isCommunity !== null) {
      const value = !strategyFilters.isCommunity ? '1' : '2';
      filters.push({
        memcmp: {
          offset: 1664n,
          bytes: value as Base58EncodedBytes,
          encoding: 'base58',
        },
      });
    }

    return (
      await this._rpc
        .getProgramAccounts(this.getProgramID(), {
          filters,
          encoding: 'base64',
        })
        .send()
    ).map((x) => {
      const res: StrategyWithAddress = {
        strategy: WhirlpoolStrategy.decode(Buffer.from(x.account.data[0], 'base64')),
        address: x.pubkey,
      };
      return res;
    });
  };

  /**
   * Get a Kamino whirlpool strategy by its public key address
   * @param address
   */
  getStrategyByAddress = (address: Address) => this.getWhirlpoolStrategy(address);

  /**
   * Get a Kamino whirlpool strategy by its kToken mint address
   * @param kTokenMint - mint address of the kToken
   */
  getStrategyByKTokenMint = async (kTokenMint: Address): Promise<StrategyWithAddress | null> => {
    const filters: (GetProgramAccountsDatasizeFilter | GetProgramAccountsMemcmpFilter)[] = [
      {
        dataSize: BigInt(WhirlpoolStrategy.layout.span + 8),
      },
      {
        memcmp: {
          offset: 0n,
          bytes: bs58.encode(WhirlpoolStrategy.discriminator) as Base58EncodedBytes,
          encoding: 'base58',
        },
      },
      {
        memcmp: {
          bytes: kTokenMint.toString() as Base58EncodedBytes,
          offset: 720n,
          encoding: 'base58',
        },
      },
    ];
    const matchingStrategies = await this._rpc
      .getProgramAccounts(this.getProgramID(), {
        filters,
        encoding: 'base64',
      })
      .send();

    if (matchingStrategies.length === 0) {
      return null;
    }
    if (matchingStrategies.length > 1) {
      throw new Error(
        `Multiple strategies found for kToken mint: ${kTokenMint}. Strategies found: ${matchingStrategies.map(
          (x) => x.pubkey
        )}`
      );
    }
    const decodedStrategy = WhirlpoolStrategy.decode(Buffer.from(matchingStrategies[0].account.data[0], 'base64'));
    return {
      address: matchingStrategies[0].pubkey,
      strategy: decodedStrategy,
    };
  };

  /**
   * Get the strategy share data (price + balances) of the specified Kamino whirlpool strategy
   * @param strategy
   * @param scopePrices
   */
  getStrategyShareData = async (
    strategy: Address | StrategyWithAddress,
    scopePrices?: OraclePrices
  ): Promise<ShareData> => {
    const strategyState = await this.getStrategyStateIfNotFetched(strategy);
    const sharesFactor = Decimal.pow(10, strategyState.strategy.sharesMintDecimals.toString());
    const sharesIssued = new Decimal(strategyState.strategy.sharesIssued.toString());
    const balances = await this.getStrategyBalances(strategyState.strategy, scopePrices);
    if (sharesIssued.isZero()) {
      return { price: new Decimal(1), balance: balances };
    } else {
      return { price: balances.computedHoldings.totalSum.div(sharesIssued).mul(sharesFactor), balance: balances };
    }
  };

  /**
   * Get the token A and B per share for the specified Kamino whirlpool strategy
   * @param strategy
   */
  getTokenAAndBPerShare = async (strategy: Address | StrategyWithAddress): Promise<TokenAmounts> => {
    const strategyState = await this.getStrategyStateIfNotFetched(strategy);
    const sharesIssued = new Decimal(strategyState.strategy.sharesIssued.toString());
    const balances = await this.getStrategyBalances(strategyState.strategy);
    if (sharesIssued.isZero()) {
      return { a: new Decimal(0), b: new Decimal(0) };
    }
    return { a: balances.tokenAAmounts.div(sharesIssued), b: balances.tokenBAmounts.div(sharesIssued) };
  };

  /**
   * Batch fetch share data for all or a filtered list of strategies
   * @param strategyFilters strategy filters or a list of strategy public keys
   */
  getStrategiesShareData = async (
    strategyFilters: StrategiesFilters | Address[],
    stratsWithAddresses?: StrategyWithAddress[],
    collateralInfos?: CollateralInfo[],
    disabledTokensPrices?: Map<Address, Decimal>
  ): Promise<Array<ShareDataWithAddress>> => {
    const result: Array<ShareDataWithAddress> = [];
    const strategiesWithAddresses = stratsWithAddresses
      ? stratsWithAddresses
      : Array.isArray(strategyFilters)
        ? await this.getStrategiesWithAddresses(strategyFilters)
        : await this.getAllStrategiesWithFilters(strategyFilters);
    const fetchBalances: Promise<StrategyBalanceWithAddress>[] = [];
    const allScopePrices = strategiesWithAddresses.map((x) => x.strategy.scopePrices);
    const scopePrices = await this._scope.getMultipleOraclePrices(allScopePrices);
    const scopePricesMap: Record<Address, OraclePrices> = scopePrices.reduce(
      (map: Record<Address, OraclePrices>, [address, price]) => {
        map[address] = price;
        return map;
      },
      {}
    );

    const raydiumStrategies = strategiesWithAddresses.filter(
      (x) => x.strategy.strategyDex.toNumber() === dexToNumber('RAYDIUM') && x.strategy.position !== DEFAULT_PUBLIC_KEY
    );
    const raydiumPoolsPromise = this.getRaydiumPools(raydiumStrategies.map((x) => x.strategy.pool));
    const raydiumPositionsPromise = this.getRaydiumPositions(raydiumStrategies.map((x) => x.strategy.position));
    const orcaStrategies = strategiesWithAddresses.filter(
      (x) => x.strategy.strategyDex.toNumber() === dexToNumber('ORCA') && x.strategy.position !== DEFAULT_PUBLIC_KEY
    );
    const orcaPoolsPromise = this.getWhirlpools(orcaStrategies.map((x) => x.strategy.pool));
    const orcaPositionsPromise = this.getOrcaPositions(orcaStrategies.map((x) => x.strategy.position));
    const meteoraStrategies = strategiesWithAddresses.filter(
      (x) => x.strategy.strategyDex.toNumber() === dexToNumber('METEORA') && x.strategy.position !== DEFAULT_PUBLIC_KEY
    );
    const meteoraPoolsPromise = this.getMeteoraPools(meteoraStrategies.map((x) => x.strategy.pool));
    const meteoraPositionsPromise = this.getMeteoraPositions(meteoraStrategies.map((x) => x.strategy.position));

    const [raydiumPools, raydiumPositions, orcaPools, orcaPositions, meteoraPools, meteoraPositions] =
      await Promise.all([
        raydiumPoolsPromise,
        raydiumPositionsPromise,
        orcaPoolsPromise,
        orcaPositionsPromise,
        meteoraPoolsPromise,
        meteoraPositionsPromise,
      ]);

    const inactiveStrategies = strategiesWithAddresses.filter((x) => x.strategy.position === DEFAULT_PUBLIC_KEY);
    const collInfos = collateralInfos ? collateralInfos : await this.getCollateralInfos();
    const disabledPrices = disabledTokensPrices ? disabledTokensPrices : await this.getDisabledTokensPrices(collInfos);
    for (const { strategy, address } of inactiveStrategies) {
      const strategyPrices = await this.getStrategyPrices(
        strategy,
        collInfos,
        scopePricesMap[strategy.scopePrices],
        disabledPrices
      );
      result.push({
        address,
        strategy,
        shareData: getEmptyShareData({
          ...strategyPrices,
          poolPrice: ZERO,
          upperPrice: ZERO,
          lowerPrice: ZERO,
          twapPrice: ZERO,
          lowerResetPrice: ZERO,
          upperResetPrice: ZERO,
        }),
      });
    }

    fetchBalances.push(
      ...this.getBalance<PoolState, PersonalPositionState>(
        raydiumStrategies,
        raydiumPools,
        raydiumPositions,
        this.getRaydiumBalances,
        collInfos,
        scopePricesMap,
        disabledPrices
      )
    );

    fetchBalances.push(
      ...this.getBalance<Whirlpool, OrcaPosition>(
        orcaStrategies,
        orcaPools,
        orcaPositions,
        this.getOrcaBalances,
        collInfos,
        scopePricesMap,
        disabledPrices
      )
    );

    fetchBalances.push(
      ...this.getBalance<LbPair, PositionV2>(
        meteoraStrategies,
        meteoraPools,
        meteoraPositions,
        this.getMeteoraBalances,
        collInfos,
        scopePricesMap,
        disabledPrices
      )
    );

    const strategyBalances = await Promise.all(fetchBalances);

    for (const { balance, strategyWithAddress } of strategyBalances) {
      const sharesFactor = Decimal.pow(10, strategyWithAddress.strategy.sharesMintDecimals.toString());
      const sharesIssued = new Decimal(strategyWithAddress.strategy.sharesIssued.toString());
      if (sharesIssued.isZero()) {
        result.push({
          address: strategyWithAddress.address,
          strategy: strategyWithAddress.strategy,
          shareData: { price: new Decimal(1), balance },
        });
      } else {
        result.push({
          address: strategyWithAddress.address,
          strategy: strategyWithAddress.strategy,
          shareData: { price: balance.computedHoldings.totalSum.div(sharesIssued).mul(sharesFactor), balance },
        });
      }
    }

    return result;
  };

  private getBalance = <PoolT, PositionT>(
    strategies: StrategyWithAddress[],
    pools: Map<Address, PoolT | null>,
    positions: (PositionT | null)[],
    fetchBalance: (
      strategy: WhirlpoolStrategy,
      pool: PoolT,
      position: PositionT,
      collateralInfos: CollateralInfo[],
      prices?: OraclePrices,
      disabledTokensPrices?: Map<Address, Decimal>
    ) => Promise<StrategyBalances>,
    collateralInfos: CollateralInfo[],
    prices?: Record<string, OraclePrices>,
    disabledTokensPrices?: Map<Address, Decimal>
  ): Promise<StrategyBalanceWithAddress>[] => {
    const fetchBalances: Promise<StrategyBalanceWithAddress>[] = [];

    for (let i = 0; i < strategies.length; i++) {
      const { strategy, address } = strategies[i];

      const retrievedPool = { ...pools.get(strategy.pool) };
      const pool = { ...retrievedPool };
      const position = positions[i];
      if (!pool) {
        throw new Error(`Pool ${strategy.pool.toString()} could not be found.`);
      }
      if (!position) {
        throw new Error(`Position ${strategy.position.toString()} could not be found.`);
      }
      fetchBalances.push(
        fetchBalance(
          strategy,
          pool as PoolT,
          position as PositionT,
          collateralInfos,
          prices ? prices[strategy.scopePrices] : undefined,
          disabledTokensPrices
        ).then((balance) => {
          return { balance, strategyWithAddress: { strategy, address } };
        })
      );
    }
    return fetchBalances;
  };

  private getRaydiumBalances = async (
    strategy: WhirlpoolStrategy,
    pool: PoolState,
    position: PersonalPositionState,
    collateralInfos: CollateralInfo[],
    prices?: OraclePrices,
    disabledTokensPrices?: Map<Address, Decimal>
  ): Promise<StrategyBalances> => {
    const strategyPrices = await this.getStrategyPrices(strategy, collateralInfos, prices, disabledTokensPrices);
    const rebalanceKind = numberToRebalanceType(strategy.rebalanceType);
    const tokenHoldings = this.getRaydiumTokensBalances(strategy, pool, position);

    const computedHoldings: Holdings = this.getStrategyHoldingsUsd(
      tokenHoldings.available.a,
      tokenHoldings.available.b,
      tokenHoldings.invested.a,
      tokenHoldings.invested.b,
      new Decimal(strategy.tokenAMintDecimals.toString()),
      new Decimal(strategy.tokenBMintDecimals.toString()),
      strategyPrices.aPrice,
      strategyPrices.bPrice
    );

    const decimalsA = strategy.tokenAMintDecimals.toNumber();
    const decimalsB = strategy.tokenBMintDecimals.toNumber();

    const poolPrice = RaydiumSqrtPriceMath.sqrtPriceX64ToPrice(pool.sqrtPriceX64, decimalsA, decimalsB);
    const twapPrice =
      strategyPrices.aTwapPrice !== null && strategyPrices.bTwapPrice !== null
        ? strategyPrices.aTwapPrice.div(strategyPrices.bTwapPrice)
        : null;
    const upperPrice = RaydiumSqrtPriceMath.sqrtPriceX64ToPrice(
      RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(position.tickUpperIndex),
      decimalsA,
      decimalsB
    );
    const lowerPrice = RaydiumSqrtPriceMath.sqrtPriceX64ToPrice(
      RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(position.tickLowerIndex),
      decimalsA,
      decimalsB
    );
    let lowerResetPrice: Decimal | null = null;
    let upperResetPrice: Decimal | null = null;
    const dex = numberToDex(strategy.strategyDex.toNumber());
    if (rebalanceKind.kind === PricePercentageWithReset.kind) {
      const state = deserializePricePercentageWithResetRebalanceWithStateOverride(
        dex,
        decimalsA,
        decimalsB,
        poolPrice,
        strategy.rebalanceRaw
      );
      [lowerResetPrice, upperResetPrice] = extractPricesFromDeserializedState(state);
    } else if (rebalanceKind.kind === Expander.kind) {
      const state = deserializeExpanderRebalanceWithStateOverride(
        dex,
        decimalsA,
        decimalsB,
        poolPrice,
        strategy.rebalanceRaw
      );
      [lowerResetPrice, upperResetPrice] = extractPricesFromDeserializedState(state);
    }

    const balance: StrategyBalances = {
      computedHoldings,
      prices: { ...strategyPrices, poolPrice, lowerPrice, upperPrice, twapPrice, lowerResetPrice, upperResetPrice },
      tokenAAmounts: tokenHoldings.available.a.plus(tokenHoldings.invested.a),
      tokenBAmounts: tokenHoldings.available.b.plus(tokenHoldings.invested.b),
    };
    return balance;
  };

  private getMeteoraBalances = async (
    strategy: WhirlpoolStrategy,
    pool: LbPair,
    position: PositionV2 | undefined, // the undefined is for scenarios where the position is not initialised yet
    collateralInfos: CollateralInfo[],
    prices?: OraclePrices,
    disabledTokensPrices?: Map<Address, Decimal>
  ): Promise<StrategyBalances> => {
    const strategyPricesPromise = this.getStrategyPrices(strategy, collateralInfos, prices, disabledTokensPrices);
    const rebalanceKind = numberToRebalanceType(strategy.rebalanceType);
    const tokenHoldingsPromise = this.getMeteoraTokensBalances(strategy);
    const [strategyPrices, tokenHoldings] = await Promise.all([strategyPricesPromise, tokenHoldingsPromise]);

    const computedHoldings: Holdings = this.getStrategyHoldingsUsd(
      tokenHoldings.available.a,
      tokenHoldings.available.b,
      tokenHoldings.invested.a,
      tokenHoldings.invested.b,
      new Decimal(strategy.tokenAMintDecimals.toString()),
      new Decimal(strategy.tokenBMintDecimals.toString()),
      strategyPrices.aPrice,
      strategyPrices.bPrice
    );

    const decimalsA = strategy.tokenAMintDecimals.toNumber();
    const decimalsB = strategy.tokenBMintDecimals.toNumber();

    const twapPrice =
      strategyPrices.aTwapPrice !== null && strategyPrices.bTwapPrice !== null
        ? strategyPrices.aTwapPrice.div(strategyPrices.bTwapPrice)
        : null;
    const poolPrice = getPriceOfBinByBinIdWithDecimals(pool.activeId, pool.binStep, decimalsA, decimalsB);
    let lowerPrice = ZERO;
    let upperPrice = ZERO;
    if (position && position.lowerBinId && position.upperBinId) {
      lowerPrice = getPriceOfBinByBinIdWithDecimals(position.lowerBinId, pool.binStep, decimalsA, decimalsB);
      upperPrice = getPriceOfBinByBinIdWithDecimals(position.upperBinId, pool.binStep, decimalsA, decimalsB);
    }

    let lowerResetPrice: Decimal | null = null;
    let upperResetPrice: Decimal | null = null;
    const dex = numberToDex(strategy.strategyDex.toNumber());
    if (rebalanceKind.kind === PricePercentageWithReset.kind) {
      const state = deserializePricePercentageWithResetRebalanceWithStateOverride(
        dex,
        decimalsA,
        decimalsB,
        poolPrice,
        strategy.rebalanceRaw
      );
      [lowerResetPrice, upperResetPrice] = extractPricesFromDeserializedState(state);
    } else if (rebalanceKind.kind === Expander.kind) {
      const state = deserializeExpanderRebalanceWithStateOverride(
        dex,
        decimalsA,
        decimalsB,
        poolPrice,
        strategy.rebalanceRaw
      );
      [lowerResetPrice, upperResetPrice] = extractPricesFromDeserializedState(state);
    }

    const balance: StrategyBalances = {
      computedHoldings,
      prices: { ...strategyPrices, poolPrice, lowerPrice, upperPrice, twapPrice, lowerResetPrice, upperResetPrice },
      tokenAAmounts: tokenHoldings.available.a.plus(tokenHoldings.invested.a),
      tokenBAmounts: tokenHoldings.available.b.plus(tokenHoldings.invested.b),
    };
    return balance;
  };

  private getRaydiumTokensBalances = (
    strategy: WhirlpoolStrategy,
    pool: PoolState,
    position: PersonalPositionState,
    mode: 'DEPOSIT' | 'WITHDRAW' = 'WITHDRAW'
  ): TokenHoldings => {
    const lowerSqrtPriceX64 = RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(position.tickLowerIndex);
    const upperSqrtPriceX64 = RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(position.tickUpperIndex);

    const { amountA, amountB } = RaydiumLiquidityMath.getAmountsFromLiquidity(
      pool.sqrtPriceX64,
      new BN(lowerSqrtPriceX64),
      new BN(upperSqrtPriceX64),
      position.liquidity,
      mode === 'DEPOSIT'
    );

    const aAvailable = new Decimal(strategy.tokenAAmounts.toString());
    const bAvailable = new Decimal(strategy.tokenBAmounts.toString());
    const aInvested = new Decimal(amountA.toString());
    const bInvested = new Decimal(amountB.toString());

    const holdings: TokenHoldings = {
      available: {
        a: aAvailable,
        b: bAvailable,
      },
      invested: {
        a: aInvested,
        b: bInvested,
      },
    };

    return holdings;
  };

  private getMeteoraTokensBalances = async (strategy: WhirlpoolStrategy): Promise<TokenHoldings> => {
    let aInvested = ZERO;
    let bInvested = ZERO;
    try {
      const userPosition = await this.readMeteoraPosition(strategy.pool, strategy.position);

      if (!userPosition?.amountX.isNaN() && !userPosition?.amountY.isNaN()) {
        aInvested = userPosition.amountX;
        bInvested = userPosition.amountY;
      }
    } catch (e) {
      // @tslint:disable-next-line no-empty
    }

    const aAvailable = new Decimal(strategy.tokenAAmounts.toString());
    const bAvailable = new Decimal(strategy.tokenBAmounts.toString());

    const holdings: TokenHoldings = {
      available: {
        a: aAvailable,
        b: bAvailable,
      },
      invested: {
        a: new Decimal(aInvested),
        b: new Decimal(bInvested),
      },
    };

    return holdings;
  };

  private getOrcaBalances = async (
    strategy: WhirlpoolStrategy,
    pool: Whirlpool,
    position: OrcaPosition,
    collateralInfos: CollateralInfo[],
    prices?: OraclePrices,
    disabledTokensPrices?: Map<Address, Decimal>,
    mode: 'DEPOSIT' | 'WITHDRAW' = 'WITHDRAW'
  ): Promise<StrategyBalances> => {
    const strategyPrices = await this.getStrategyPrices(strategy, collateralInfos, prices, disabledTokensPrices);
    const rebalanceKind = numberToRebalanceType(strategy.rebalanceType);

    const tokenHoldings = this.getOrcaTokensBalances(strategy, pool, position, mode);
    const computedHoldings: Holdings = this.getStrategyHoldingsUsd(
      tokenHoldings.available.a,
      tokenHoldings.available.b,
      tokenHoldings.invested.a,
      tokenHoldings.invested.b,
      new Decimal(strategy.tokenAMintDecimals.toString()),
      new Decimal(strategy.tokenBMintDecimals.toString()),
      strategyPrices.aPrice,
      strategyPrices.bPrice
    );

    const decimalsA = strategy.tokenAMintDecimals.toNumber();
    const decimalsB = strategy.tokenBMintDecimals.toNumber();

    const poolPrice = new Decimal(orcaSqrtPriceToPrice(BigInt(pool.sqrtPrice.toString()), decimalsA, decimalsB));
    const twapPrice =
      strategyPrices.aTwapPrice !== null && strategyPrices.bTwapPrice !== null
        ? strategyPrices.aTwapPrice.div(strategyPrices.bTwapPrice)
        : null;
    const upperPrice = new Decimal(orcaTickIndexToPrice(position.tickUpperIndex, decimalsA, decimalsB));
    const lowerPrice = new Decimal(orcaTickIndexToPrice(position.tickLowerIndex, decimalsA, decimalsB));
    let lowerResetPrice: Decimal | null = null;
    let upperResetPrice: Decimal | null = null;
    const dex = numberToDex(strategy.strategyDex.toNumber());
    if (rebalanceKind.kind === PricePercentageWithReset.kind) {
      const state = deserializePricePercentageWithResetRebalanceWithStateOverride(
        dex,
        decimalsA,
        decimalsB,
        poolPrice,
        strategy.rebalanceRaw
      );
      [lowerResetPrice, upperResetPrice] = extractPricesFromDeserializedState(state);
    } else if (rebalanceKind.kind === Expander.kind) {
      const state = deserializeExpanderRebalanceWithStateOverride(
        dex,
        decimalsA,
        decimalsB,
        poolPrice,
        strategy.rebalanceRaw
      );
      [lowerResetPrice, upperResetPrice] = extractPricesFromDeserializedState(state);
    }

    const balance: StrategyBalances = {
      computedHoldings,
      prices: { ...strategyPrices, poolPrice, lowerPrice, upperPrice, twapPrice, lowerResetPrice, upperResetPrice },
      tokenAAmounts: tokenHoldings.available.a.plus(tokenHoldings.invested.a),
      tokenBAmounts: tokenHoldings.available.b.plus(tokenHoldings.invested.b),
    };
    return balance;
  };

  private getOrcaTokensBalances = (
    strategy: WhirlpoolStrategy,
    pool: Whirlpool,
    position: OrcaPosition,
    mode: 'DEPOSIT' | 'WITHDRAW' = 'WITHDRAW'
  ): TokenHoldings => {
    const quote = getRemoveLiquidityQuote(
      {
        positionAddress: strategy.position,
        liquidity: position.liquidity,
        slippageTolerance: { numerator: ZERO_BN, denominator: new BN(1000) },
        sqrtPrice: pool.sqrtPrice,
        tickLowerIndex: position.tickLowerIndex,
        tickUpperIndex: position.tickUpperIndex,
        tickCurrentIndex: pool.tickCurrentIndex,
      },
      mode === 'DEPOSIT'
    );
    const aAvailable = new Decimal(strategy.tokenAAmounts.toString());
    const bAvailable = new Decimal(strategy.tokenBAmounts.toString());
    const aInvested = new Decimal(quote.estTokenA.toString());
    const bInvested = new Decimal(quote.estTokenB.toString());

    const holdings: TokenHoldings = {
      available: {
        a: aAvailable,
        b: bAvailable,
      },
      invested: {
        a: aInvested,
        b: bInvested,
      },
    };

    return holdings;
  };

  /**
   * Get the strategies share data (price + balances) of the Kamino whirlpool strategies that match the filters
   * @param strategyFilters
   */
  getStrategyShareDataForStrategies = async (
    strategyFilters: StrategiesFilters
  ): Promise<Array<ShareDataWithAddress>> => {
    // weird name of method, but want to keep this method backwards compatible and not rename it
    return this.getStrategiesShareData(strategyFilters);
  };

  /**
   * Get the strategy share price of the specified Kamino whirlpool strategy
   * @param strategy
   */
  getStrategySharePrice = async (strategy: Address | StrategyWithAddress): Promise<Decimal> => {
    const strategyState = await this.getStrategyStateIfNotFetched(strategy);
    const sharesFactor = Decimal.pow(10, strategyState.strategy.sharesMintDecimals.toString());
    const sharesIssued = new Decimal(strategyState.strategy.sharesIssued.toString());
    const balances = await this.getStrategyBalances(strategyState.strategy);
    if (sharesIssued.isZero()) {
      return new Decimal(1);
    } else {
      return balances.computedHoldings.totalSum.div(sharesIssued).mul(sharesFactor);
    }
  };

  getTokenAccountBalance = async (tokenAccount: Address): Promise<Decimal> => {
    const tokenAccountBalance = await this._rpc.getTokenAccountBalance(tokenAccount).send();
    if (!tokenAccountBalance.value) {
      throw new Error(`Could not get token account balance for ${tokenAccount.toString()}.`);
    }
    return new Decimal(tokenAccountBalance.value.uiAmountString!);
  };

  /**
   * Get the balance of a token account or 0 if it doesn't exist
   * @param tokenAccount
   */
  getTokenAccountBalanceOrZero = async (tokenAccount: Address): Promise<Decimal> => {
    const tokenAccountExists = await checkIfAccountExists(this._rpc, tokenAccount);
    if (tokenAccountExists) {
      return await this.getTokenAccountBalance(tokenAccount);
    } else {
      return new Decimal(0);
    }
  };

  private getStrategyBalances = async (
    strategy: WhirlpoolStrategy,
    scopePrices?: OraclePrices,
    disabledTokensPrices?: Map<Address, Decimal>
  ): Promise<StrategyBalances> => {
    const collateralInfos = await this.getCollateralInfos();
    let disabledPrices = disabledTokensPrices;
    if (!disabledPrices) {
      disabledPrices = await this.getDisabledTokensPrices(collateralInfos);
    }

    if (strategy.strategyDex.toNumber() === dexToNumber('ORCA')) {
      return this.getStrategyBalancesOrca(strategy, collateralInfos, scopePrices, disabledPrices);
    } else if (strategy.strategyDex.toNumber() === dexToNumber('RAYDIUM')) {
      return this.getStrategyBalancesRaydium(strategy, collateralInfos, scopePrices, disabledPrices);
    } else if (strategy.strategyDex.toNumber() === dexToNumber('METEORA')) {
      return this.getStrategyBalancesMeteora(strategy, collateralInfos, scopePrices, disabledPrices);
    } else {
      throw new Error(`Invalid dex ${strategy.strategyDex.toString()}`);
    }
  };

  private getStrategyTokensBalances = async (
    strategy: WhirlpoolStrategy,
    mode: 'DEPOSIT' | 'WITHDRAW' = 'WITHDRAW'
  ): Promise<TokenHoldings> => {
    if (strategy.strategyDex.toNumber() === dexToNumber('ORCA')) {
      const [whirlpoolAcc, positionAcc] = (
        await this.getConnection().getMultipleAccounts([strategy.pool, strategy.position]).send()
      ).value;
      if (!whirlpoolAcc) {
        throw Error(`Could not fetch Orca whirlpool state with pubkey ${strategy.pool.toString()}`);
      }
      if (!positionAcc) {
        throw Error(`Could not fetch Orca whirlpool position state with pubkey ${strategy.position.toString()}`);
      }
      const whirlpool = Whirlpool.decode(Buffer.from(whirlpoolAcc.data[0], 'base64'));
      const position = OrcaPosition.decode(Buffer.from(positionAcc.data[0], 'base64'));
      return this.getOrcaTokensBalances(strategy, whirlpool, position, mode);
    } else if (strategy.strategyDex.toNumber() === dexToNumber('RAYDIUM')) {
      const [poolStateAcc, positionAcc] = (
        await this.getConnection().getMultipleAccounts([strategy.pool, strategy.position]).send()
      ).value;
      if (!poolStateAcc) {
        throw Error(`Could not fetch Raydium pool state with pubkey ${strategy.pool.toString()}`);
      }
      if (!positionAcc) {
        throw Error(`Could not fetch Raydium position state with pubkey ${strategy.position.toString()}`);
      }
      const poolState = PoolState.decode(Buffer.from(poolStateAcc.data[0], 'base64'));
      const position = PersonalPositionState.decode(Buffer.from(positionAcc.data[0], 'base64'));
      return this.getRaydiumTokensBalances(strategy, poolState, position, mode);
    } else if (strategy.strategyDex.toNumber() === dexToNumber('METEORA')) {
      return this.getMeteoraTokensBalances(strategy);
    } else {
      throw new Error(`Invalid dex ${strategy.strategyDex.toString()}`);
    }
  };

  /**
   * Get amount of specified token in all Kamino live strategies
   * @param tokenMint token mint pubkey
   */
  getTotalTokensInStrategies = async (tokenMint: Address | string): Promise<TotalStrategyVaultTokens> => {
    const strategies = await this.getStrategiesShareData({ strategyCreationStatus: 'LIVE' });
    let totalTokenAmount = new Decimal(0);
    const vaults: StrategyVaultTokens[] = [];
    for (const { strategy, address: ad, shareData } of strategies) {
      const aTotal = shareData.balance.computedHoldings.invested.a.plus(shareData.balance.computedHoldings.available.a);
      const bTotal = shareData.balance.computedHoldings.invested.b.plus(shareData.balance.computedHoldings.available.b);
      let amount = new Decimal(0);
      if (strategy.tokenAMint === address(tokenMint) && aTotal.greaterThan(0)) {
        amount = aTotal;
      } else if (strategy.tokenBMint === address(tokenMint) && bTotal.greaterThan(0)) {
        amount = bTotal;
      }
      if (amount.greaterThan(0)) {
        totalTokenAmount = totalTokenAmount.plus(amount);
        vaults.push({
          address: ad,
          frontendUrl: `${FRONTEND_KAMINO_STRATEGY_URL}/${ad}`,
          amount,
        });
      }
    }
    return { totalTokenAmount, vaults, timestamp: new Date() };
  };

  getAccountOwner = async (pk: Address): Promise<Address> => {
    const acc = await this.getConnection().getAccountInfo(pk).send();
    if (acc.value === null) {
      throw Error(`Could not fetch mint ${pk}`);
    }
    return acc.value.owner;
  };

  private getStrategyBalancesOrca = async (
    strategy: WhirlpoolStrategy,
    collateralInfos: CollateralInfo[],
    scopePrices?: OraclePrices,
    disabledTokensPrices?: Map<Address, Decimal>
  ): Promise<StrategyBalances> => {
    const res = await this.getConnection().getMultipleAccounts([strategy.pool, strategy.position]).send();
    const [whirlpoolAcc, positionAcc] = res.value;
    if (!whirlpoolAcc) {
      throw Error(`Could not fetch Orca whirlpool state with pubkey ${strategy.pool.toString()}`);
    }
    if (!positionAcc) {
      throw Error(`Could not fetch Orca whirlpool position state with pubkey ${strategy.position.toString()}`);
    }
    const whirlpool = Whirlpool.decode(Buffer.from(whirlpoolAcc.data[0], 'base64'));
    const position = OrcaPosition.decode(Buffer.from(positionAcc.data[0], 'base64'));

    return this.getOrcaBalances(
      strategy,
      whirlpool,
      position,
      collateralInfos,
      scopePrices,
      disabledTokensPrices,
      undefined
    );
  };

  private getStrategyBalancesRaydium = async (
    strategy: WhirlpoolStrategy,
    collateralInfos: CollateralInfo[],
    scopePrices?: OraclePrices,
    disabledTokensPrices?: Map<Address, Decimal>
  ): Promise<StrategyBalances> => {
    const res = await fetchEncodedAccounts(this.getConnection(), [strategy.pool, strategy.position]);
    const [poolStateAcc, positionAcc] = res;
    if (!poolStateAcc.exists) {
      throw Error(`Could not fetch Raydium pool state with pubkey ${strategy.pool}`);
    }
    if (!positionAcc.exists) {
      throw Error(`Could not fetch Raydium position state with pubkey ${strategy.position}`);
    }
    const poolState = PoolState.decode(Buffer.from(poolStateAcc.data));
    const position = PersonalPositionState.decode(Buffer.from(positionAcc.data));

    return this.getRaydiumBalances(strategy, poolState, position, collateralInfos, scopePrices, disabledTokensPrices);
  };

  private getStrategyBalancesMeteora = async (
    strategy: WhirlpoolStrategy,
    collateralInfos: CollateralInfo[],
    scopePrices?: OraclePrices,
    disabledTokensPrices?: Map<Address, Decimal>
  ): Promise<StrategyBalances> => {
    const res = await this.getConnection().getMultipleAccounts([strategy.pool, strategy.position]).send();
    const [poolStateAcc, positionAcc] = res.value;
    if (!poolStateAcc) {
      throw Error(`Could not fetch Meteora pool state with pubkey ${strategy.pool}`);
    }
    if (!positionAcc) {
      throw Error(`Could not fetch Meteora position state with pubkey ${strategy.position}`);
    }

    const poolState = LbPair.decode(Buffer.from(poolStateAcc.data[0], 'base64'));
    try {
      const position = PositionV2.decode(Buffer.from(positionAcc.data[0], 'base64'));
      return this.getMeteoraBalances(strategy, poolState, position, collateralInfos, scopePrices, disabledTokensPrices);
    } catch (e) {
      return this.getMeteoraBalances(
        strategy,
        poolState,
        undefined,
        collateralInfos,
        scopePrices,
        disabledTokensPrices
      );
    }
  };

  private getStrategyHoldingsUsd = (
    aAvailable: Decimal,
    bAvailable: Decimal,
    aInvested: Decimal,
    bInvested: Decimal,
    decimalsA: Decimal,
    decimalsB: Decimal,
    aPrice: Decimal | null,
    bPrice: Decimal | null
  ): Holdings => {
    const aAvailableScaled = aAvailable.div(Decimal.pow(10, decimalsA));
    const bAvailableScaled = bAvailable.div(Decimal.pow(10, decimalsB));

    const aInvestedScaled = aInvested.div(Decimal.pow(10, decimalsA));
    const bInvestedScaled = bInvested.div(Decimal.pow(10, decimalsB));

    const availableUsd =
      aPrice && bPrice ? aAvailableScaled.mul(aPrice).add(bAvailableScaled.mul(bPrice)) : new Decimal(0);
    const investedUsd =
      aPrice && bPrice ? aInvestedScaled.mul(aPrice).add(bInvestedScaled.mul(bPrice)) : new Decimal(0);

    return {
      available: {
        a: aAvailableScaled,
        b: bAvailableScaled,
      },
      availableUsd: availableUsd,
      invested: {
        a: aInvestedScaled,
        b: bInvestedScaled,
      },
      investedUsd: investedUsd,
      totalSum: availableUsd.add(investedUsd),
    };
  };

  getAllOraclePrices = (prices: Address[]): Promise<[Address, OraclePrices][]> => this._scope.getOraclePrices(prices);

  /**
   * Get all Kamino token spot and twap prices
   * @param oraclePrices (optional) Scope Oracle prices
   * @param collateralInfos (optional) Kamino Collateral Infos
   */
  getAllPrices = async (
    oraclePrices?: OraclePrices,
    collateralInfos?: CollateralInfo[],
    disabledTokensPrices?: Map<Address, Decimal>
  ): Promise<KaminoPrices> => {
    // todo: make MintToPriceMap have Pubkey as key
    const spotPrices: MintToPriceMap = {};
    const twaps: MintToPriceMap = {};

    const disabledTokens: Address[] = [];
    const oraclePricesAndCollateralInfos = await this.getOraclePricesAndCollateralInfos(
      oraclePrices ? [[HUBBLE_SCOPE_FEED_ID, oraclePrices]] : undefined,
      collateralInfos,
      true
    );
    const { oraclePrices: allOraclePrices, collateralInfos: hubbleCollateralInfos } = oraclePricesAndCollateralInfos;
    for (const collateralInfo of hubbleCollateralInfos) {
      if (
        collateralInfo.scopePriceChain &&
        Scope.isScopeChainValid(collateralInfo.scopePriceChain) &&
        collateralInfo.disabled === 0
      ) {
        const collInfoMintString = collateralInfo.mint.toString();
        const hubbleOraclePrices = allOraclePrices?.find((x) => x[0] === HUBBLE_SCOPE_FEED_ID)?.[1];
        const spotPrice = await this._scope.getPriceFromChain(collateralInfo.scopePriceChain, hubbleOraclePrices!);
        spotPrices[collInfoMintString] = {
          price: spotPrice.price,
          name: getTokenNameFromCollateralInfo(collateralInfo),
        };

        const filteredTwapChain = collateralInfo?.scopeTwapPriceChain?.filter((x) => x > 0);
        if (filteredTwapChain && Scope.isScopeChainValid(filteredTwapChain)) {
          const twap = await this._scope.getPriceFromChain(filteredTwapChain, hubbleOraclePrices!);
          twaps[collInfoMintString] = {
            price: twap.price,
            name: getTokenNameFromCollateralInfo(collateralInfo),
          };
        }
      } else {
        if (collateralInfo.mint === DEFAULT_PUBLIC_KEY) {
          continue;
        }
        disabledTokens.push(collateralInfo.mint);
      }
    }

    try {
      const tokensPrices = disabledTokensPrices
        ? disabledTokensPrices
        : await JupService.getDollarPrices(disabledTokens, this._jupBaseAPI);
      for (const [token, price] of tokensPrices) {
        const collInfo = hubbleCollateralInfos.find((x) => x.mint === token);
        if (!collInfo) {
          console.log(`Could not find collateral info for token ${token.toString()}`);
          continue;
        }
        // if there already is a spot price for this token, skip it
        if (spotPrices[token.toString()]) {
          continue;
        }
        spotPrices[token.toString()] = {
          price: new Decimal(price),
          name: getTokenNameFromCollateralInfo(collInfo),
        };
      }
    } catch (e) {
      console.error('Failed to get prices for disabled tokens from Jup', e);
    }

    return { spot: spotPrices, twap: twaps };
  };

  private async getOraclePricesAndCollateralInfos(
    oraclePrices?: [Address, OraclePrices][],
    collateralInfos?: CollateralInfo[],
    readAllFeeds: boolean = false
  ): Promise<OraclePricesAndCollateralInfos> {
    if (!oraclePrices) {
      const allFeeds = readAllFeeds ? [HUBBLE_SCOPE_FEED_ID, KAMINO_SCOPE_FEED_ID] : [HUBBLE_SCOPE_FEED_ID];
      oraclePrices = await this.getAllOraclePrices(allFeeds);
    }
    if (!collateralInfos) {
      collateralInfos = await this.getCollateralInfos();
    }
    return { oraclePrices, collateralInfos };
  }

  /**
   * Get the prices of all tokens in the specified strategy, or null if the reward token does not exist
   * @param strategy
   * @param collateralInfos
   * @param scopePrices
   */
  getStrategyPrices = async (
    strategy: WhirlpoolStrategy,
    collateralInfos: CollateralInfo[],
    scopePrices?: OraclePrices,
    disabledTokensPrices?: Map<Address, Decimal>
  ): Promise<StrategyPrices> => {
    const tokenA = collateralInfos[strategy.tokenACollateralId.toNumber()];
    const tokenB = collateralInfos[strategy.tokenBCollateralId.toNumber()];
    const rewardToken0 = collateralInfos[strategy.reward0CollateralId.toNumber()];
    const rewardToken1 = collateralInfos[strategy.reward1CollateralId.toNumber()];
    const rewardToken2 = collateralInfos[strategy.reward2CollateralId.toNumber()];

    let prices: OraclePrices;
    if (scopePrices) {
      prices = scopePrices;
    } else {
      prices = await this._scope.getSingleOraclePrices({ prices: strategy.scopePrices });
    }

    let jupPrices: Map<Address, Decimal>;
    if (disabledTokensPrices) {
      jupPrices = disabledTokensPrices;
    } else {
      jupPrices = await this.getDisabledTokensPrices(collateralInfos);
    }
    const fallbackTokenAPrice = jupPrices.get(tokenA.mint) ?? new Decimal(0);
    const fallbackTokenBPrice = jupPrices.get(tokenB.mint) ?? new Decimal(0);
    const fallbackReward0Price = jupPrices.get(rewardToken0.mint) ?? new Decimal(0);
    const fallbackReward1Price = jupPrices.get(rewardToken1.mint) ?? new Decimal(0);
    const fallbackReward2Price = jupPrices.get(rewardToken2.mint) ?? new Decimal(0);

    const aPrice = Scope.isScopeChainValid(tokenA.scopePriceChain)
      ? (await this._scope.getPriceFromChain(tokenA.scopePriceChain, prices)).price
      : fallbackTokenAPrice;
    const bPrice = Scope.isScopeChainValid(tokenB.scopePriceChain)
      ? (await this._scope.getPriceFromChain(tokenB.scopePriceChain, prices)).price
      : fallbackTokenBPrice;
    const tokenATwap = stripTwapZeros(tokenA.scopeTwapPriceChain);
    const tokenBTwap = stripTwapZeros(tokenB.scopeTwapPriceChain);
    const aTwapPrice = Scope.isScopeChainValid(tokenATwap)
      ? await this._scope.getPriceFromChain(tokenATwap, prices)
      : null;
    const bTwapPrice = Scope.isScopeChainValid(tokenBTwap)
      ? await this._scope.getPriceFromChain(tokenBTwap, prices)
      : null;

    let reward0Price = null;
    if (strategy.reward0Decimals.toNumber() !== 0) {
      reward0Price = Scope.isScopeChainValid(rewardToken0.scopePriceChain)
        ? (await this._scope.getPriceFromChain(rewardToken0.scopePriceChain, prices)).price
        : fallbackReward0Price;
    }
    let reward1Price = null;
    if (strategy.reward1Decimals.toNumber() !== 0) {
      reward1Price = Scope.isScopeChainValid(rewardToken1.scopePriceChain)
        ? (await this._scope.getPriceFromChain(rewardToken1.scopePriceChain, prices)).price
        : fallbackReward1Price;
    }
    let reward2Price = null;
    if (strategy.reward2Decimals.toNumber() !== 0) {
      reward2Price = Scope.isScopeChainValid(rewardToken2.scopePriceChain)
        ? (await this._scope.getPriceFromChain(rewardToken2.scopePriceChain, prices)).price
        : fallbackReward2Price;
    }

    return {
      aPrice: aPrice ?? null,
      bPrice: bPrice ?? null,
      aTwapPrice: aTwapPrice?.price ?? null,
      bTwapPrice: bTwapPrice?.price ?? null,
      reward0Price: reward0Price ?? null,
      reward1Price: reward1Price ?? null,
      reward2Price: reward2Price ?? null,
    };
  };

  /**
   * Get all token accounts for the specified share mint
   */
  getShareTokenAccounts = async (
    shareMint: Address
  ): Promise<AccountInfoWithPubkey<AccountInfoBase & AccountInfoWithJsonData>[]> => {
    //how to get all token accounts for specific mint: https://spl.solana.com/token#finding-all-token-accounts-for-a-specific-mint
    //get it from the hardcoded token program and create a filter with the actual mint address
    //datasize:165 filter selects all token accounts, memcmp filter selects based on the mint address withing each token account
    return this._rpc
      .getProgramAccounts(TOKEN_PROGRAM_ADDRESS, {
        filters: [
          { dataSize: 165n },
          { memcmp: { offset: 0n, bytes: shareMint.toString() as Base58EncodedBytes, encoding: 'base58' } },
        ],
        encoding: 'jsonParsed',
      })
      .send();
  };

  /**
   * Get all token accounts for the specified wallet
   */
  getAllTokenAccounts = async (
    wallet: Address
  ): Promise<AccountInfoWithPubkey<AccountInfoBase & AccountInfoWithJsonData>[]> => {
    //how to get all token accounts for specific wallet: https://spl.solana.com/token#finding-all-token-accounts-for-a-wallet
    return this._rpc
      .getProgramAccounts(TOKEN_PROGRAM_ADDRESS, {
        filters: [
          { dataSize: 165n },
          { memcmp: { offset: 32n, bytes: wallet.toString() as Base58EncodedBytes, encoding: 'base58' } },
        ],
        encoding: 'jsonParsed',
      })
      .send();
  };

  /**
   * Get all token accounts that are holding a specific Kamino whirlpool strategy
   */
  getStrategyTokenAccounts = async (strategy: Address | StrategyWithAddress) => {
    const strategyState = await this.getStrategyStateIfNotFetched(strategy);
    return this.getShareTokenAccounts(strategyState.strategy.sharesMint);
  };

  /**
   * Get strategy range in which liquidity is deposited
   */
  getStrategyRange = async (strategy: Address | StrategyWithAddress): Promise<PositionRange> => {
    const stratWithAddress = await this.getStrategyStateIfNotFetched(strategy);

    if (stratWithAddress.strategy.strategyDex.toNumber() === dexToNumber('ORCA')) {
      return this.getStrategyRangeOrca(strategy);
    } else if (stratWithAddress.strategy.strategyDex.toNumber() === dexToNumber('RAYDIUM')) {
      return this.getStrategyRangeRaydium(strategy);
    } else if (stratWithAddress.strategy.strategyDex.toNumber() === dexToNumber('METEORA')) {
      return this.getStrategyRangeMeteora(strategy);
    } else {
      throw Error(`Dex {stratWithAddress.strategy.strategyDex.toNumber()} not supported`);
    }
  };

  getStrategyRangeOrca = async (strategy: Address | StrategyWithAddress): Promise<PositionRange> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);

    if (strategyState.position === DEFAULT_PUBLIC_KEY) {
      return { lowerPrice: ZERO, upperPrice: ZERO };
    } else {
      return this.getPositionRangeOrca(
        strategyState.position,
        strategyState.tokenAMintDecimals.toNumber(),
        strategyState.tokenBMintDecimals.toNumber()
      );
    }
  };

  getStrategyRangeRaydium = async (strategy: Address | StrategyWithAddress): Promise<PositionRange> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);

    if (strategyState.position === DEFAULT_PUBLIC_KEY) {
      return { lowerPrice: ZERO, upperPrice: ZERO };
    } else {
      return this.getPositionRangeRaydium(
        strategyState.position,
        strategyState.tokenAMintDecimals.toNumber(),
        strategyState.tokenBMintDecimals.toNumber()
      );
    }
  };

  getStrategyRangeMeteora = async (strategy: Address | StrategyWithAddress): Promise<PositionRange> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);

    if (strategyState.position === DEFAULT_PUBLIC_KEY) {
      return { lowerPrice: ZERO, upperPrice: ZERO };
    } else {
      return this.getPositionRangeMeteora(
        strategyState.position,
        strategyState.tokenAMintDecimals.toNumber(),
        strategyState.tokenBMintDecimals.toNumber()
      );
    }
  };

  getPositionRange = async (
    dex: Dex,
    position: Address,
    decimalsA: number,
    decimalsB: number
  ): Promise<PositionRange> => {
    if (dex === 'ORCA') {
      return this.getPositionRangeOrca(position, decimalsA, decimalsB);
    } else if (dex === 'RAYDIUM') {
      return this.getPositionRangeRaydium(position, decimalsA, decimalsB);
    } else if (dex === 'METEORA') {
      return this.getPositionRangeMeteora(position, decimalsA, decimalsB);
    } else {
      throw Error(`Unsupported dex ${dex}`);
    }
  };

  getPositionRangeOrca = async (positionPk: Address, decimalsA: number, decimalsB: number): Promise<PositionRange> => {
    if (positionPk === DEFAULT_PUBLIC_KEY) {
      return { lowerPrice: ZERO, upperPrice: ZERO };
    }
    const position = await OrcaPosition.fetch(this._rpc, positionPk, this._orcaService.getWhirlpoolProgramId());
    if (!position) {
      return { lowerPrice: ZERO, upperPrice: ZERO };
    }
    const lowerPrice = new Decimal(orcaTickIndexToPrice(position.tickLowerIndex, decimalsA, decimalsB));
    const upperPrice = new Decimal(orcaTickIndexToPrice(position.tickUpperIndex, decimalsA, decimalsB));

    const positionRange: PositionRange = { lowerPrice, upperPrice };

    return positionRange;
  };

  getPositionRangeRaydium = async (
    positionPk: Address,
    decimalsA: number,
    decimalsB: number
  ): Promise<PositionRange> => {
    if (positionPk === DEFAULT_PUBLIC_KEY) {
      return { lowerPrice: ZERO, upperPrice: ZERO };
    }
    const position = await PersonalPositionState.fetch(
      this._rpc,
      positionPk,
      this._raydiumService.getRaydiumProgramId()
    );
    if (!position) {
      return { lowerPrice: ZERO, upperPrice: ZERO };
    }
    const lowerPrice = RaydiumSqrtPriceMath.sqrtPriceX64ToPrice(
      RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(position.tickLowerIndex),
      decimalsA,
      decimalsB
    );

    const upperPrice = RaydiumSqrtPriceMath.sqrtPriceX64ToPrice(
      RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(position.tickUpperIndex),
      decimalsA,
      decimalsB
    );

    const positionRange: PositionRange = { lowerPrice, upperPrice };

    return positionRange;
  };

  getPositionRangeMeteora = async (
    positionPk: Address,
    decimalsA: number,
    decimalsB: number
  ): Promise<PositionRange> => {
    if (positionPk === DEFAULT_PUBLIC_KEY) {
      return { lowerPrice: ZERO, upperPrice: ZERO };
    }
    const position = await PositionV2.fetch(this._rpc, positionPk, this._meteoraService.getMeteoraProgramId());
    if (!position) {
      return { lowerPrice: ZERO, upperPrice: ZERO };
    }
    const pool = await LbPair.fetch(this._rpc, position.lbPair);
    if (!pool) {
      return { lowerPrice: ZERO, upperPrice: ZERO };
    }
    const lowerPrice = getPriceOfBinByBinIdWithDecimals(position.lowerBinId, pool.binStep, decimalsA, decimalsB);

    const upperPrice = getPriceOfBinByBinIdWithDecimals(position.upperBinId, pool.binStep, decimalsA, decimalsB);

    const positionRange: PositionRange = { lowerPrice, upperPrice };

    return positionRange;
  };

  /**
   * Get all strategy token holders
   * @param strategy
   */
  getStrategyHolders = async (strategy: Address | StrategyWithAddress): Promise<StrategyHolder[]> => {
    const strategyState = await this.getStrategyStateIfNotFetched(strategy);
    const tokenAccounts = await this.getStrategyTokenAccounts(strategyState);
    const result: StrategyHolder[] = [];
    for (const tokenAccount of tokenAccounts) {
      const accountData = tokenAccount.account.data;
      if ('parsed' in accountData) {
        result.push({
          // @ts-ignore
          holderPubkey: address(accountData.parsed.info.owner),
          // @ts-ignore
          amount: new Decimal(accountData.parsed!.info.tokenAmount.uiAmountString),
        });
      }
    }
    return result;
  };

  /**
   * Get a list of Orca whirlpools from public keys
   * @param whirlpools
   */
  getWhirlpools = async (whirlpools: Address[]): Promise<Map<Address, Whirlpool | null>> => {
    // todo: make this map have Pubkey as key
    const whirlpoolMap = new Map<Address, Whirlpool | null>();

    const uniqueWhirlpools = [...new Set(whirlpools)];
    if (uniqueWhirlpools.length === 1) {
      const whirlpool = await this.getWhirlpoolByAddress(whirlpools[0]);
      whirlpoolMap.set(whirlpools[0], whirlpool);
      return whirlpoolMap;
    }
    const fetched = await batchFetch(uniqueWhirlpools, (chunk) =>
      Whirlpool.fetchMultiple(this._rpc, chunk, this._orcaService.getWhirlpoolProgramId())
    );
    fetched.reduce((map: Record<Address, Whirlpool | null>, whirlpool, i) => {
      whirlpoolMap.set(uniqueWhirlpools[i], whirlpool);
      map[uniqueWhirlpools[i]] = whirlpool;
      return map;
    }, {});
    return whirlpoolMap;
  };

  getAllWhirlpoolsFromAPI = async (tokens: Address[] = []): Promise<WhirlpoolAPIResponse[]> => {
    return await this._orcaService.getOrcaWhirlpools(tokens);
  };

  /**
   * Get a list of Orca positions from public keys
   * @param positions
   */
  getOrcaPositions = async (positions: Address[]): Promise<(OrcaPosition | null)[]> => {
    const nonDefaults = positions.filter((value) => value !== DEFAULT_PUBLIC_KEY);
    const fetched = await batchFetch(nonDefaults, (chunk) =>
      OrcaPosition.fetchMultiple(this._rpc, chunk, this._orcaService.getWhirlpoolProgramId())
    );
    const fetchedMap: Record<string, OrcaPosition | null> = fetched.reduce(
      (map: Record<Address, OrcaPosition | null>, position, i) => {
        map[nonDefaults[i]] = position;
        return map;
      },
      {}
    );
    return positions.map((position) => fetchedMap[position] || null);
  };

  /**
   * Get a list of Raydium positions from public keys
   * @param positions
   */
  getRaydiumPositions = async (positions: Address[]): Promise<(PersonalPositionState | null)[]> => {
    const nonDefaults = positions.filter((value) => value !== DEFAULT_PUBLIC_KEY);
    const fetched = await batchFetch(nonDefaults, (chunk) =>
      PersonalPositionState.fetchMultiple(this._rpc, chunk, this._raydiumService.getRaydiumProgramId())
    );
    const fetchedMap: Record<Address, PersonalPositionState | null> = fetched.reduce(
      (map: Record<Address, PersonalPositionState | null>, position, i) => {
        map[nonDefaults[i]] = position;
        return map;
      },
      {}
    );
    return positions.map((position) => fetchedMap[position] || null);
  };

  getMeteoraPositions = async (positions: Address[]): Promise<(PositionV2 | null)[]> => {
    const nonDefaults = positions.filter((value) => value !== DEFAULT_PUBLIC_KEY);
    const fetched = await batchFetch(nonDefaults, (chunk) =>
      PositionV2.fetchMultiple(this._rpc, chunk, this._meteoraService.getMeteoraProgramId())
    );
    const fetchedMap: Record<Address, PositionV2 | null> = fetched.reduce(
      (map: Record<Address, PositionV2 | null>, position, i) => {
        map[nonDefaults[i]] = position;
        return map;
      },
      {}
    );
    return positions.map((position) => fetchedMap[position] || null);
  };

  /**
   * Get whirlpool from public key
   * @param whirlpool pubkey of the orca whirlpool
   */
  getWhirlpoolByAddress = (whirlpool: Address) =>
    Whirlpool.fetch(this._rpc, whirlpool, this._orcaService.getWhirlpoolProgramId());

  /**
   * Get a list of Raydium pools from public keys
   * @param pools
   */
  getRaydiumPools = async (pools: Address[]): Promise<Map<Address, PoolState | null>> => {
    // todo: make this map have Pubkey as key
    const poolsMap = new Map<Address, PoolState | null>();

    const uniquePools = [...new Set(pools)];
    if (uniquePools.length === 1) {
      const pool = await this.getRaydiumPoolByAddress(pools[0]);
      poolsMap.set(pools[0], pool);
    }
    const fetched = await batchFetch(uniquePools, (chunk) =>
      PoolState.fetchMultiple(this._rpc, chunk, this._raydiumService.getRaydiumProgramId())
    );
    fetched.reduce((map, whirlpool, i) => {
      poolsMap.set(uniquePools[i], whirlpool);
      return map;
    }, {});
    return poolsMap;
  };

  getMeteoraPools = async (pools: Address[]): Promise<Map<Address, LbPair | null>> => {
    // todo: make this map have Pubkey as key
    const poolsMap = new Map<Address, LbPair | null>();

    const uniquePools = [...new Set(pools)];
    if (uniquePools.length === 1) {
      const pool = await this.getMeteoraPoolByAddress(pools[0]);
      poolsMap.set(pools[0], pool);
    }
    const fetched = await batchFetch(uniquePools, (chunk) =>
      LbPair.fetchMultiple(this._rpc, chunk, this._meteoraService.getMeteoraProgramId())
    );
    fetched.reduce((map, whirlpool, i) => {
      poolsMap.set(uniquePools[i], whirlpool);
      return map;
    }, {});
    return poolsMap;
  };

  getRaydiumAmmConfig = (config: Address) =>
    AmmConfig.fetch(this._rpc, config, this._raydiumService.getRaydiumProgramId());

  /**
   * Get Raydium pool from public key
   * @param pool pubkey of the orca whirlpool
   */
  getRaydiumPoolByAddress = (pool: Address) =>
    PoolState.fetch(this._rpc, pool, this._raydiumService.getRaydiumProgramId());

  getMeteoraPoolByAddress = (pool: Address) =>
    LbPair.fetch(this._rpc, pool, this._meteoraService.getMeteoraProgramId());

  getEventAuthorityPDA = async (dex: BN): Promise<Option<Address>> => {
    if (dex.toNumber() === dexToNumber('ORCA') || dex.toNumber() === dexToNumber('RAYDIUM')) {
      return none();
    }

    if (dex.toNumber() === dexToNumber('METEORA')) {
      const [key] = await getProgramDerivedAddress({
        seeds: [Buffer.from('__event_authority')],
        programAddress: this._meteoraService.getMeteoraProgramId(),
      });
      return some(key);
    }
    throw new Error('Invalid dex');
  };

  /**
   * Return transaction instruction to withdraw shares from a strategy owner (wallet) and get back token A and token B
   * @param strategy strategy public key
   * @param sharesAmount amount of shares (decimal representation), NOT in lamports
   * @param owner shares owner (wallet with shares)
   * @returns transaction instruction
   */
  withdrawShares = async (
    strategy: Address | StrategyWithAddress,
    sharesAmount: Decimal,
    owner: TransactionSigner,
    sharesAtaBalance?: Decimal
  ): Promise<WithdrawShares> => {
    if (sharesAmount.lessThanOrEqualTo(0)) {
      throw Error('Shares amount cant be lower than or equal to 0.');
    }
    const strategyState = await this.getStrategyStateIfNotFetched(strategy);

    const eventAuthority = await this.getEventAuthorityPDA(strategyState.strategy.strategyDex);
    const { treasuryFeeTokenAVault, treasuryFeeTokenBVault } = await this.getTreasuryFeeVaultPDAs(
      strategyState.strategy.tokenAMint,
      strategyState.strategy.tokenBMint
    );

    const [sharesAta, tokenAAta, tokenBAta] = await Promise.all([
      getAssociatedTokenAddress(strategyState.strategy.sharesMint, owner.address),
      getAssociatedTokenAddress(
        strategyState.strategy.tokenAMint,
        owner.address,
        keyOrDefault(strategyState.strategy.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS)
      ),
      getAssociatedTokenAddress(
        strategyState.strategy.tokenBMint,
        owner.address,
        keyOrDefault(strategyState.strategy.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS)
      ),
    ]);
    console.log('Shares ATA in withdraw: ', sharesAta.toString());

    const sharesAmountInLamports = sharesAmount.mul(
      new Decimal(10).pow(strategyState.strategy.sharesMintDecimals.toString())
    );

    const programId = this.getDexProgramId(strategyState.strategy);

    const args: WithdrawArgs = { sharesAmount: new BN(sharesAmountInLamports.floor().toString()) };
    const accounts: WithdrawAccounts = {
      user: owner,
      strategy: strategyState.address,
      globalConfig: strategyState.strategy.globalConfig,
      pool: strategyState.strategy.pool,
      position: strategyState.strategy.position,
      tickArrayLower: strategyState.strategy.tickArrayLower,
      tickArrayUpper: strategyState.strategy.tickArrayUpper,
      tokenAVault: strategyState.strategy.tokenAVault,
      tokenBVault: strategyState.strategy.tokenBVault,
      baseVaultAuthority: strategyState.strategy.baseVaultAuthority,
      poolTokenVaultA: strategyState.strategy.poolTokenVaultA,
      poolTokenVaultB: strategyState.strategy.poolTokenVaultB,
      tokenAAta: tokenAAta,
      tokenBAta: tokenBAta,
      userSharesAta: sharesAta,
      sharesMint: strategyState.strategy.sharesMint,
      treasuryFeeTokenAVault,
      treasuryFeeTokenBVault,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      tokenProgram2022: TOKEN_2022_PROGRAM_ADDRESS,
      positionTokenAccount: strategyState.strategy.positionTokenAccount,
      poolProgram: programId,
      instructionSysvarAccount: SYSVAR_INSTRUCTIONS_ADDRESS,
      tokenAMint: strategyState.strategy.tokenAMint,
      tokenBMint: strategyState.strategy.tokenBMint,
      eventAuthority,
      tokenATokenProgram: keyOrDefault(strategyState.strategy.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS),
      tokenBTokenProgram: keyOrDefault(strategyState.strategy.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS),
      memoProgram: MEMO_PROGRAM_ID,
    };

    let withdrawIx = withdraw(args, accounts, undefined, this.getProgramID());
    let collectFeesAndRewardsIxns: Instruction[] = [];

    //  for Raydium strats we need to collect fees and rewards before withdrawal
    //  add rewards vaults accounts to withdraw
    const isRaydium = strategyState.strategy.strategyDex.toNumber() === dexToNumber('RAYDIUM');
    if (isRaydium) {
      const raydiumPosition = await PersonalPositionState.fetch(
        this._rpc,
        strategyState.strategy.position,
        this._raydiumService.getRaydiumProgramId()
      );
      if (!raydiumPosition) {
        throw new Error('Position is not found');
      }

      collectFeesAndRewardsIxns = new Decimal(raydiumPosition.liquidity.toString()).gt(ZERO)
        ? [await this.collectFeesAndRewards(strategy, owner)]
        : [];

      const poolState = await this.getRaydiumPoolByAddress(strategyState.strategy.pool);
      if (!poolState) {
        throw new Error('Pool is not found');
      }

      withdrawIx = {
        ...withdrawIx,
        accounts: withdrawIx.accounts?.concat([
          {
            address: strategyState.strategy.raydiumProtocolPositionOrBaseVaultAuthority,
            role: AccountRole.WRITABLE,
          },
        ]),
      };
      if (strategyState.strategy.reward0Decimals.toNumber() > 0) {
        withdrawIx = {
          ...withdrawIx,
          accounts: withdrawIx.accounts?.concat([
            {
              address: poolState.rewardInfos[0].tokenVault,
              role: AccountRole.WRITABLE,
            },
            {
              address: strategyState.strategy.reward0Vault,
              role: AccountRole.WRITABLE,
            },
            {
              address: poolState.rewardInfos[0].tokenMint,
              role: AccountRole.WRITABLE,
            },
          ]),
        };
      }
      if (strategyState.strategy.reward1Decimals.toNumber() > 0) {
        withdrawIx = {
          ...withdrawIx,
          accounts: withdrawIx.accounts?.concat([
            {
              address: poolState.rewardInfos[1].tokenVault,
              role: AccountRole.WRITABLE,
            },
            {
              address: strategyState.strategy.reward1Vault,
              role: AccountRole.WRITABLE,
            },
            {
              address: poolState.rewardInfos[1].tokenMint,
              role: AccountRole.WRITABLE,
            },
          ]),
        };
      }
      if (strategyState.strategy.reward2Decimals.toNumber() > 0) {
        withdrawIx = {
          ...withdrawIx,
          accounts: withdrawIx.accounts?.concat([
            {
              address: poolState.rewardInfos[2].tokenVault,
              role: AccountRole.WRITABLE,
            },
            {
              address: strategyState.strategy.reward2Vault,
              role: AccountRole.WRITABLE,
            },
            {
              address: poolState.rewardInfos[2].tokenMint,
              role: AccountRole.WRITABLE,
            },
          ]),
        };
      }

      const [poolTickArrayBitmap, _poolTickArrayBitmapBump] = await getProgramDerivedAddress({
        seeds: [Buffer.from('pool_tick_array_bitmap_extension'), addressEncoder.encode(strategyState.strategy.pool)],
        programAddress: this._raydiumService.getRaydiumProgramId(),
      });
      withdrawIx = {
        ...withdrawIx,
        accounts: withdrawIx.accounts?.concat([
          {
            address: poolTickArrayBitmap,
            role: AccountRole.WRITABLE,
          },
        ]),
      };
    }

    const res: WithdrawShares = { prerequisiteIxs: collectFeesAndRewardsIxns, withdrawIx };
    // if we withdraw everything also close the shares ATA
    if (sharesAtaBalance && sharesAtaBalance.lte(sharesAmount)) {
      res.closeSharesAtaIx = getCloseAccountInstruction(
        {
          owner,
          account: sharesAta,
          destination: owner.address,
        },
        { programAddress: TOKEN_PROGRAM_ADDRESS }
      );
    }

    return res;
  };

  /**
   * Get transaction instructions that create associated token accounts if they don't exist (token A, B and share)
   * @param owner wallet owner (shareholder)
   * @param strategyState kamino strategy state
   * @param tokenAData token A data of the owner's wallet
   * @param tokenAAta associated token account for token B
   * @param tokenBData token B data of the owner's wallet
   * @param tokenBAta associated token account for token B
   * @param sharesMintData shares data of the owner's wallet
   * @param sharesAta associated token account for shares
   * @returns list of transaction instructions (empty if all accounts already exist)
   */
  getCreateAssociatedTokenAccountInstructionsIfNotExist = async (
    owner: TransactionSigner,
    strategyState: StrategyWithAddress,
    tokenAData: Account<Token> | null,
    tokenAAta: Address,
    tokenBData: Account<Token> | null,
    tokenBAta: Address,
    sharesMintData: Account<Token> | null,
    sharesAta: Address
  ): Promise<Instruction[]> => {
    const instructions: Instruction[] = [];
    if (!tokenAData) {
      const tokenProgramA =
        strategyState.strategy.tokenATokenProgram === DEFAULT_PUBLIC_KEY
          ? TOKEN_PROGRAM_ADDRESS
          : strategyState.strategy.tokenATokenProgram;
      instructions.push(
        createAssociatedTokenAccountInstruction(
          owner,
          tokenAAta,
          owner.address,
          strategyState.strategy.tokenAMint,
          tokenProgramA
        )
      );
    }
    if (!tokenBData) {
      const tokenProgramB =
        strategyState.strategy.tokenBTokenProgram === DEFAULT_PUBLIC_KEY
          ? TOKEN_PROGRAM_ADDRESS
          : strategyState.strategy.tokenBTokenProgram;
      instructions.push(
        createAssociatedTokenAccountInstruction(
          owner,
          tokenBAta,
          owner.address,
          strategyState.strategy.tokenBMint,
          tokenProgramB
        )
      );
    }
    if (!sharesMintData) {
      instructions.push(
        createAssociatedTokenAccountInstruction(owner, sharesAta, owner.address, strategyState.strategy.sharesMint)
      );
    }
    return instructions;
  };

  /**
   * Check if strategy has already been fetched (is StrategyWithAddress type) and return that,
   * otherwise fetch it first from Address and return it
   * @param strategy
   * @private
   */
  private getStrategyStateIfNotFetched = async (
    strategy: Address | StrategyWithAddress
  ): Promise<StrategyWithAddress> => {
    const hasStrategyBeenFetched = (object: Address | StrategyWithAddress) => {
      return !(typeof object === 'string' && isAddress(object));
    };

    if (hasStrategyBeenFetched(strategy)) {
      return strategy;
    } else {
      const strategyState = await this.getStrategyByAddress(strategy);
      if (!strategyState) {
        throw Error(`Could not fetch strategy state with pubkey ${strategy.toString()}`);
      }
      return { strategy: strategyState, address: strategy };
    }
  };

  private getWhirlpoolStateIfNotFetched = async (
    whirlpool: Address | WhirlpoolWithAddress
  ): Promise<WhirlpoolWithAddress> => {
    const hasWhirlpoolBeenFetched = (object: Address | WhirlpoolWithAddress) => {
      return typeof object !== 'string' && 'whirlpool' in object;
    };

    if (hasWhirlpoolBeenFetched(whirlpool)) {
      return whirlpool;
    } else {
      const whirlpoolState = await this.getWhirlpoolByAddress(whirlpool);
      if (!whirlpoolState) {
        throw Error(`Could not fetch whirlpool state with pubkey ${whirlpool.toString()}`);
      }
      return { whirlpool: whirlpoolState, address: whirlpool };
    }
  };

  private getMeteoraStateIfNotFetched = async (lbPair: Address | LbPairWithAddress): Promise<LbPairWithAddress> => {
    const hasLbPairBeenFetched = (object: Address | LbPairWithAddress) => {
      return typeof object !== 'string' && 'pool' in object;
    };

    if (hasLbPairBeenFetched(lbPair)) {
      return lbPair;
    } else {
      const lbPairState = await this.getMeteoraPoolByAddress(lbPair);
      if (!lbPairState) {
        throw Error(`Could not fetch meteora lb pair state with pubkey ${lbPair.toString()}`);
      }
      return { pool: lbPairState, address: lbPair };
    }
  };

  /**
   * Get treasury fee vault program addresses from for token A and B mints
   * @param tokenAMint
   * @param tokenBMint
   * @private
   */
  private getTreasuryFeeVaultPDAs = async (tokenAMint: Address, tokenBMint: Address): Promise<TreasuryFeeVault> => {
    const [[treasuryFeeTokenAVault], [treasuryFeeTokenBVault], [treasuryFeeVaultAuthority]] = await Promise.all([
      getProgramDerivedAddress({
        seeds: [Buffer.from('treasury_fee_vault'), addressEncoder.encode(tokenAMint)],
        programAddress: this.getProgramID(),
      }),
      getProgramDerivedAddress({
        seeds: [Buffer.from('treasury_fee_vault'), addressEncoder.encode(tokenBMint)],
        programAddress: this.getProgramID(),
      }),
      getProgramDerivedAddress({
        seeds: [Buffer.from('treasury_fee_vault_authority')],
        programAddress: this.getProgramID(),
      }),
    ]);
    return { treasuryFeeTokenAVault, treasuryFeeTokenBVault, treasuryFeeVaultAuthority };
  };

  /**
   * Get a transaction instruction to withdraw all strategy shares from a specific wallet into token A and B
   * @param strategy public key of the strategy
   * @param owner public key of the owner (shareholder)
   * @returns transaction instruction or null if no shares or no sharesMint ATA present in the wallet
   */
  withdrawAllShares = async (
    strategy: Address | StrategyWithAddress,
    owner: TransactionSigner
  ): Promise<WithdrawShares | null> => {
    const strategyState = await this.getStrategyStateIfNotFetched(strategy);
    const [, sharesData] = await getAssociatedTokenAddressAndAccount(
      this._rpc,
      strategyState.strategy.sharesMint,
      owner.address
    );
    if (!sharesData || sharesData.data.amount === 0n) {
      return null;
    }
    const amount = new Decimal(sharesData.data.amount.toString()).div(
      new Decimal(10).pow(strategyState.strategy.sharesMintDecimals.toString())
    );
    return this.withdrawShares(strategyState, amount, owner);
  };

  /**
   * Get all the accounts needed by the deposit tx, without the swap.
   * @param strategy Kamino strategy public key or on-chain object
   * @param owner Owner (wallet, shareholder) public key
   * @returns list of pubkeys needed for the deposit transaction
   */
  getAllDepositAccounts = async (strategy: Address | StrategyWithAddress, owner: Address): Promise<Address[]> => {
    const strategyState = await this.getStrategyStateIfNotFetched(strategy);

    const globalConfig = await GlobalConfig.fetch(this._rpc, strategyState.strategy.globalConfig, this.getProgramID());
    if (!globalConfig) {
      throw Error(`Could not fetch global config with pubkey ${strategyState.strategy.globalConfig.toString()}`);
    }

    const [sharesAta, tokenAAta, tokenBAta] = await Promise.all([
      getAssociatedTokenAddress(strategyState.strategy.sharesMint, owner),
      getAssociatedTokenAddress(
        strategyState.strategy.tokenAMint,
        owner,
        keyOrDefault(strategyState.strategy.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS)
      ),
      getAssociatedTokenAddress(
        strategyState.strategy.tokenBMint,
        owner,
        keyOrDefault(strategyState.strategy.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS)
      ),
    ]);

    const accounts = [
      owner,
      strategyState.address,
      strategyState.strategy.globalConfig,
      strategyState.strategy.pool,
      strategyState.strategy.position,
      strategyState.strategy.tokenAVault,
      strategyState.strategy.tokenBVault,
      strategyState.strategy.baseVaultAuthority,
      strategyState.strategy.tokenAMint,
      strategyState.strategy.tokenBMint,
      sharesAta,
      tokenAAta,
      tokenBAta,
      strategyState.strategy.sharesMint,
      strategyState.strategy.sharesMintAuthority,
      strategyState.strategy.scopePrices,
      globalConfig.tokenInfos,
      TOKEN_PROGRAM_ADDRESS,
      keyOrDefault(strategyState.strategy.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS),
      keyOrDefault(strategyState.strategy.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS),
      SYSVAR_INSTRUCTIONS_ADDRESS,
      strategyState.strategy.tickArrayLower,
      strategyState.strategy.tickArrayUpper,
    ];

    return accounts;
  };

  /**
   * Get transaction instruction to deposit token A and B into a strategy.
   * @param strategy Kamino strategy public key or on-chain object
   * @param amountA Amount of token A to deposit into strategy
   * @param amountB Amount of token B to deposit into strategy
   * @param owner Owner (wallet, shareholder) public key
   * @returns transaction instruction for depositing tokens into a strategy
   */
  deposit = async (
    strategy: Address | StrategyWithAddress,
    amountA: Decimal,
    amountB: Decimal,
    owner: TransactionSigner
  ): Promise<Instruction> => {
    if (amountA.lessThanOrEqualTo(0) && amountB.lessThanOrEqualTo(0)) {
      throw Error('Token A and B amount cant be lower than or equal to 0.');
    }
    const strategyState = await this.getStrategyStateIfNotFetched(strategy);

    const globalConfig = await this.getGlobalConfigState(strategyState.strategy.globalConfig);
    if (!globalConfig) {
      throw Error(`Could not fetch global config with pubkey ${strategyState.strategy.globalConfig.toString()}`);
    }

    const [sharesAta, tokenAAta, tokenBAta] = await Promise.all([
      getAssociatedTokenAddress(strategyState.strategy.sharesMint, owner.address),
      getAssociatedTokenAddress(
        strategyState.strategy.tokenAMint,
        owner.address,
        keyOrDefault(strategyState.strategy.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS)
      ),
      getAssociatedTokenAddress(
        strategyState.strategy.tokenBMint,
        owner.address,
        keyOrDefault(strategyState.strategy.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS)
      ),
    ]);

    const lamportsA = amountA.mul(new Decimal(10).pow(strategyState.strategy.tokenAMintDecimals.toString()));
    const lamportsB = amountB.mul(new Decimal(10).pow(strategyState.strategy.tokenBMintDecimals.toString()));

    const depositArgs: DepositArgs = {
      tokenMaxA: new BN(lamportsA.floor().toString()),
      tokenMaxB: new BN(lamportsB.floor().toString()),
    };

    const depositAccounts: DepositAccounts = {
      user: owner,
      strategy: strategyState.address,
      globalConfig: strategyState.strategy.globalConfig,
      pool: strategyState.strategy.pool,
      position: strategyState.strategy.position,
      tokenAVault: strategyState.strategy.tokenAVault,
      tokenBVault: strategyState.strategy.tokenBVault,
      baseVaultAuthority: strategyState.strategy.baseVaultAuthority,
      tokenAAta,
      tokenBAta,
      tokenAMint: strategyState.strategy.tokenAMint,
      tokenBMint: strategyState.strategy.tokenBMint,
      userSharesAta: sharesAta,
      sharesMint: strategyState.strategy.sharesMint,
      sharesMintAuthority: strategyState.strategy.sharesMintAuthority,
      scopePrices: strategyState.strategy.scopePrices,
      tokenInfos: globalConfig.tokenInfos,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      instructionSysvarAccount: SYSVAR_INSTRUCTIONS_ADDRESS,
      tickArrayLower: strategyState.strategy.tickArrayLower,
      tickArrayUpper: strategyState.strategy.tickArrayUpper,
      tokenATokenProgram: keyOrDefault(strategyState.strategy.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS),
      tokenBTokenProgram: keyOrDefault(strategyState.strategy.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS),
    };

    return deposit(depositArgs, depositAccounts, undefined, this.getProgramID());
  };

  singleSidedDepositTokenA = async (
    strategy: Address | StrategyWithAddress,
    amountToDeposit: Decimal,
    owner: TransactionSigner,
    slippageBps: Decimal,
    profiler: ProfiledFunctionExecution = noopProfiledFunctionExecution,
    swapIxsBuilder?: SwapperIxBuilder,
    initialUserTokenAtaBalances?: TokensBalances,
    priceAInB?: Decimal,
    includeAtaIxns: boolean = true, // if true it includes create and close wsol and token atas,
    onlyDirectRoutes?: boolean
  ): Promise<InstructionsWithLookupTables> => {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);

    const userTokenBalances = await profiler(
      this.getInitialUserTokenBalances(
        owner.address,
        strategyWithAddress.strategy.tokenAMint,
        strategyWithAddress.strategy.tokenBMint,
        initialUserTokenAtaBalances
      ),
      'A-getInitialUserTokenBalances',
      []
    );

    const userTokenBalancesWithoutSolBalanace = {
      a: userTokenBalances.a,
      b: userTokenBalances.b,
    };

    // if any of the tokens is SOL, we need to read how much SOL the user has, not how much wSOL which is what getInitialUserTokenBalances returns
    if (isSOLMint(strategyWithAddress.strategy.tokenAMint)) {
      userTokenBalances.a = userTokenBalances.a?.add(
        lamportsToNumberDecimal(
          new Decimal((await this._rpc.getBalance(owner.address).send()).value.toString()),
          DECIMALS_SOL
        )
      );
    }

    if (isSOLMint(strategyWithAddress.strategy.tokenBMint)) {
      userTokenBalances.b = userTokenBalances.b?.add(
        lamportsToNumberDecimal(
          new Decimal((await this._rpc.getBalance(owner.address).send()).value.toString()),
          DECIMALS_SOL
        )
      );
    }

    if (!userTokenBalances.a || !userTokenBalances.b) {
      throw Error('Error reading user token balances');
    }

    const tokenAMinPostDepositBalance = userTokenBalances.a?.sub(amountToDeposit);
    const swapper: SwapperIxBuilder = swapIxsBuilder
      ? swapIxsBuilder
      : (
          input: DepositAmountsForSwap,
          tokenAMint: Address,
          tokenBMint: Address,
          user: TransactionSigner,
          slippageBps: Decimal,
          allAccounts: Address[]
        ) =>
          this.getJupSwapIxsV6(
            input,
            tokenAMint,
            tokenBMint,
            user.address,
            slippageBps,
            false,
            allAccounts,
            profiler,
            onlyDirectRoutes
          );

    console.log('single sided deposit tokenA tokenAMinPostDepositBalance', tokenAMinPostDepositBalance);
    console.log('single sided deposit tokenA userTokenBalances.b', userTokenBalances.b);
    return await profiler(
      this.getSingleSidedDepositIxs(
        strategyWithAddress,
        collToLamportsDecimal(tokenAMinPostDepositBalance, strategyWithAddress.strategy.tokenAMintDecimals.toNumber()),
        collToLamportsDecimal(userTokenBalances.b, strategyWithAddress.strategy.tokenBMintDecimals.toNumber()),
        owner,
        slippageBps,
        swapper,
        profiler,
        userTokenBalancesWithoutSolBalanace,
        priceAInB,
        includeAtaIxns
      ),
      'A-getSingleSidedDepositIxs',
      []
    );
  };

  singleSidedDepositTokenB = async (
    strategy: Address | StrategyWithAddress,
    amountToDeposit: Decimal,
    owner: TransactionSigner,
    slippageBps: Decimal,
    profiler: ProfiledFunctionExecution = noopProfiledFunctionExecution,
    swapIxsBuilder?: SwapperIxBuilder,
    initialUserTokenAtaBalances?: TokensBalances,
    priceAInB?: Decimal,
    includeAtaIxns: boolean = true, // if true it includes create and close wsol and token atas,
    onlyDirectRoutes?: boolean
  ): Promise<InstructionsWithLookupTables> => {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);

    const userTokenBalances = await profiler(
      this.getInitialUserTokenBalances(
        owner.address,
        strategyWithAddress.strategy.tokenAMint,
        strategyWithAddress.strategy.tokenBMint,
        initialUserTokenAtaBalances
      ),
      'A-getInitialUserTokenBalances',
      []
    );

    const userTokenBalancesWithoutSolBalanace = {
      a: userTokenBalances.a,
      b: userTokenBalances.b,
    };

    // if any of the tokens is SOL, we need to read how much SOL the user has, not how much wSOL which is what getInitialUserTokenBalances returns
    if (isSOLMint(strategyWithAddress.strategy.tokenAMint)) {
      userTokenBalances.a = userTokenBalances.a?.add(
        lamportsToNumberDecimal(
          new Decimal((await this._rpc.getBalance(owner.address).send()).value.toString()),
          DECIMALS_SOL
        )
      );
    }

    if (isSOLMint(strategyWithAddress.strategy.tokenBMint)) {
      userTokenBalances.b = userTokenBalances.b?.add(
        lamportsToNumberDecimal(
          new Decimal((await this._rpc.getBalance(owner.address).send()).value.toString()),
          DECIMALS_SOL
        )
      );
    }

    if (!userTokenBalances.a || !userTokenBalances.b) {
      throw Error('Error reading user token balances');
    }
    const tokenBMinPostDepositBalance = userTokenBalances.b.sub(amountToDeposit);
    const swapper: SwapperIxBuilder = swapIxsBuilder
      ? swapIxsBuilder
      : (
          input: DepositAmountsForSwap,
          tokenAMint: Address,
          tokenBMint: Address,
          user: TransactionSigner,
          slippageBps: Decimal,
          allAccounts: Address[]
        ): Promise<[Instruction[], Address[]]> =>
          this.getJupSwapIxsV6(
            input,
            tokenAMint,
            tokenBMint,
            user.address,
            slippageBps,
            false,
            allAccounts,
            profiler,
            onlyDirectRoutes
          );

    return await profiler(
      this.getSingleSidedDepositIxs(
        strategyWithAddress,
        collToLamportsDecimal(userTokenBalances.a, strategyWithAddress.strategy.tokenAMintDecimals.toNumber()),
        collToLamportsDecimal(tokenBMinPostDepositBalance, strategyWithAddress.strategy.tokenBMintDecimals.toNumber()),
        owner,
        slippageBps,
        swapper,
        profiler,
        userTokenBalancesWithoutSolBalanace,
        priceAInB,
        includeAtaIxns
      ),
      'A-getSingleSidedDepositIxs',
      []
    );
  };

  getInitialUserTokenBalances = async (
    owner: Address,
    tokenAMint: Address,
    tokenBMint: Address,
    initialUserTokenBalances?: MaybeTokensBalances
  ): Promise<TokensBalances> => {
    let initialUserTokenABalance = new Decimal(0);
    let initialUserTokenBBalance = new Decimal(0);

    if (initialUserTokenBalances?.a) {
      initialUserTokenABalance = initialUserTokenBalances.a;
    } else {
      const tokenATokenProgram = await this.getAccountOwner(tokenAMint);
      const tokenAAta = await getAssociatedTokenAddress(
        tokenAMint,
        owner,
        keyOrDefault(tokenATokenProgram, TOKEN_PROGRAM_ADDRESS)
      );

      const ataExists = await checkIfAccountExists(this._rpc, tokenAAta);
      if (!ataExists) {
        initialUserTokenABalance = new Decimal(0);
      } else {
        initialUserTokenABalance = await this.getTokenAccountBalance(tokenAAta);
      }
    }

    if (initialUserTokenBalances?.b) {
      initialUserTokenBBalance = initialUserTokenBalances.b;
    } else {
      const tokenBTokenProgram = await this.getAccountOwner(tokenBMint);
      const tokenBAta = await getAssociatedTokenAddress(
        tokenBMint,
        owner,
        keyOrDefault(tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS)
      );

      const ataExists = await checkIfAccountExists(this._rpc, tokenBAta);
      if (!ataExists) {
        initialUserTokenBBalance = new Decimal(0);
      } else {
        initialUserTokenBBalance = await this.getTokenAccountBalance(tokenBAta);
      }
    }

    return { a: initialUserTokenABalance, b: initialUserTokenBBalance };
  };

  private getSingleSidedDepositIxs = async (
    strategy: Address | StrategyWithAddress,
    tokenAMinPostDepositBalanceLamports: Decimal,
    tokenBMinPostDepositBalanceLamports: Decimal,
    owner: TransactionSigner,
    swapSlippageBps: Decimal,
    swapIxsBuilder: SwapperIxBuilder,
    profiler: ProfiledFunctionExecution,
    initialUserTokenAtaBalances: TokensBalances,
    priceAInB?: Decimal, // not mandatory as it will be fetched from Jupyter
    includeAtaIxns: boolean = true // if true it includes create and close wsol and token atas,
  ): Promise<InstructionsWithLookupTables> => {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    const strategyState = strategyWithAddress.strategy;

    let realTokenAMinPostDepositBalanceLamports = tokenAMinPostDepositBalanceLamports;
    let realTokenBMinPostDepositBalanceLamports = tokenBMinPostDepositBalanceLamports;
    if (
      (tokenAMinPostDepositBalanceLamports.lessThan(0) && !isSOLMint(strategyState.tokenAMint)) ||
      (tokenBMinPostDepositBalanceLamports.lessThan(0) && !isSOLMint(strategyState.tokenBMint))
    ) {
      throw Error('Token A or B post deposit amount cant be lower than 0.');
    }

    const [sharesAta, tokenAAta, tokenBAta] = await Promise.all([
      getAssociatedTokenAddress(strategyState.sharesMint, owner.address),
      getAssociatedTokenAddress(
        strategyState.tokenAMint,
        owner.address,
        keyOrDefault(strategyState.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS)
      ),
      getAssociatedTokenAddress(
        strategyState.tokenBMint,
        owner.address,
        keyOrDefault(strategyState.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS)
      ),
    ]);

    let tokenAAtaBalance = initialUserTokenAtaBalances.a;
    let tokenBAtaBalance = initialUserTokenAtaBalances.b;

    let aToDeposit = collToLamportsDecimal(tokenAAtaBalance, strategyState.tokenAMintDecimals.toNumber()).sub(
      tokenAMinPostDepositBalanceLamports
    );
    let bToDeposit = collToLamportsDecimal(tokenBAtaBalance, strategyState.tokenBMintDecimals.toNumber()).sub(
      tokenBMinPostDepositBalanceLamports
    );

    const cleanupIxs: Instruction[] = [];
    const createWsolAtasIxns: Instruction[] = [];

    if (isSOLMint(strategyState.tokenAMint)) {
      // read how much SOL the user has and calculate the amount to deposit and balance based on it
      const solBalance = new Decimal((await this._rpc.getBalance(owner.address).send()).value.toString());
      const tokenAAtaBalanceLamports = collToLamportsDecimal(
        tokenAAtaBalance,
        strategyState.tokenAMintDecimals.toNumber()
      );
      const availableSol = solBalance.add(tokenAAtaBalanceLamports);
      const solToDeposit = availableSol.sub(tokenAMinPostDepositBalanceLamports);

      aToDeposit = solToDeposit;
      if (!aToDeposit.eq(ZERO)) {
        if (tokenAAtaBalanceLamports.lessThan(aToDeposit)) {
          tokenAAtaBalance = lamportsToNumberDecimal(aToDeposit, DECIMALS_SOL);
        }
      }

      const createWSolAtaIxns = await createWsolAtaIfMissing(
        this._rpc,
        new Decimal(lamportsToNumberDecimal(solToDeposit, DECIMALS_SOL)),
        owner
      );

      // if the wSOL ata is not created, expect to have 0 remaining after the deposit
      const wSolAtaExists = await checkIfAccountExists(this._rpc, createWSolAtaIxns.ata);
      if (!wSolAtaExists) {
        realTokenAMinPostDepositBalanceLamports = new Decimal(0);
      } else {
        if (solToDeposit.greaterThanOrEqualTo(tokenAAtaBalanceLamports)) {
          realTokenAMinPostDepositBalanceLamports = ZERO;
        } else {
          realTokenAMinPostDepositBalanceLamports = tokenAAtaBalanceLamports.sub(solToDeposit);
        }
      }

      if (includeAtaIxns) {
        createWsolAtasIxns.push(...createWSolAtaIxns.createIxns);
        cleanupIxs.push(...createWSolAtaIxns.closeIxns);
      }
    }

    if (isSOLMint(strategyState.tokenBMint)) {
      const solBalance = new Decimal((await this._rpc.getBalance(owner.address).send()).value.toString());
      const tokenBAtaBalanceLamports = collToLamportsDecimal(
        tokenBAtaBalance,
        strategyState.tokenBMintDecimals.toNumber()
      );
      const availableSol = solBalance.add(tokenBAtaBalanceLamports);
      const solToDeposit = availableSol.sub(tokenBMinPostDepositBalanceLamports);
      availableSol;

      bToDeposit = solToDeposit;

      if (!bToDeposit.eq(ZERO)) {
        if (tokenBAtaBalanceLamports.lessThan(bToDeposit)) {
          tokenBAtaBalance = lamportsToNumberDecimal(bToDeposit, DECIMALS_SOL);
        }
      }

      const createWSolAtaIxns = await createWsolAtaIfMissing(
        this._rpc,
        new Decimal(lamportsToNumberDecimal(solToDeposit, DECIMALS_SOL)),
        owner
      );

      const wSolAtaExists = await checkIfAccountExists(this._rpc, createWSolAtaIxns.ata);
      if (!wSolAtaExists) {
        realTokenBMinPostDepositBalanceLamports = new Decimal(0);
      } else {
        if (solToDeposit.greaterThanOrEqualTo(tokenBAtaBalanceLamports)) {
          realTokenBMinPostDepositBalanceLamports = ZERO;
        } else {
          realTokenBMinPostDepositBalanceLamports = tokenBAtaBalanceLamports.sub(solToDeposit);
        }
      }

      if (includeAtaIxns) {
        createWsolAtasIxns.push(...createWSolAtaIxns.createIxns);
        cleanupIxs.push(...createWSolAtaIxns.closeIxns);
      }
    }

    const amountsToDepositWithSwapPromise = this.calculateAmountsToBeDepositedWithSwap(
      strategyWithAddress,
      aToDeposit,
      bToDeposit,
      profiler,
      priceAInB
    );

    if (aToDeposit.lessThan(0) || bToDeposit.lessThan(0)) {
      throw Error(
        `Token A or B to deposit amount cannot be lower than 0; aToDeposit=${aToDeposit.toString()} bToDeposit=${bToDeposit.toString()}`
      );
    }

    const createAtaList: [Address, Address][] = [[strategyState.sharesMint, TOKEN_PROGRAM_ADDRESS]];
    if (!tokenAAtaBalance.greaterThan(0)) {
      createAtaList.push([
        strategyState.tokenAMint,
        keyOrDefault(strategyState.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS),
      ]);
    }

    if (!tokenBAtaBalance.greaterThan(0)) {
      createAtaList.push([
        strategyState.tokenBMint,
        keyOrDefault(strategyState.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS),
      ]);
    }

    const createAtasIxnsPromise = getAtasWithCreateIxnsIfMissing(
      this._rpc,
      createAtaList.filter(([mint, _tokenProgram]) => !isSOLMint(mint)),
      owner
    );

    const getGlobalConfigPromise = this.getGlobalConfigState(strategyState.globalConfig);
    const [createAtasIxns, amountsToDepositWithSwap, globalConfig] = await Promise.all([
      createAtasIxnsPromise,
      amountsToDepositWithSwapPromise,
      getGlobalConfigPromise,
    ]);

    const checkExpectedVaultsBalancesIx = await profiler(
      this.getCheckExpectedVaultsBalancesIx(strategyWithAddress, owner, tokenAAta, tokenBAta, {
        a: tokenAAtaBalance,
        b: tokenBAtaBalance,
      }),
      'B-getCheckExpectedVaultsBalancesIx',
      []
    );

    const args: SingleTokenDepositWithMinArgs = {
      tokenAMinPostDepositBalance: new BN(realTokenAMinPostDepositBalanceLamports.floor().toString()),
      tokenBMinPostDepositBalance: new BN(realTokenBMinPostDepositBalanceLamports.floor().toString()),
    };

    const accounts: SingleTokenDepositWithMinAccounts = {
      user: owner,
      strategy: strategyWithAddress.address,
      globalConfig: strategyState.globalConfig,
      pool: strategyState.pool,
      position: strategyState.position,
      tokenAVault: strategyState.tokenAVault,
      tokenBVault: strategyState.tokenBVault,
      baseVaultAuthority: strategyState.baseVaultAuthority,
      tokenAAta,
      tokenBAta,
      tokenAMint: strategyState.tokenAMint,
      tokenBMint: strategyState.tokenBMint,
      userSharesAta: sharesAta,
      sharesMint: strategyState.sharesMint,
      sharesMintAuthority: strategyState.sharesMintAuthority,
      scopePrices: strategyState.scopePrices,
      tokenInfos: globalConfig!.tokenInfos,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      instructionSysvarAccount: SYSVAR_INSTRUCTIONS_ADDRESS,
      tickArrayLower: strategyWithAddress.strategy.tickArrayLower,
      tickArrayUpper: strategyWithAddress.strategy.tickArrayUpper,
      tokenATokenProgram: keyOrDefault(strategyWithAddress.strategy.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS),
      tokenBTokenProgram: keyOrDefault(strategyWithAddress.strategy.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS),
    };

    const singleSidedDepositIx = singleTokenDepositWithMin(args, accounts, undefined, this.getProgramID());

    let result: Instruction[] = [];
    if (includeAtaIxns) {
      result.push(...createAtasIxns, ...createWsolAtasIxns);
    }

    // get all unique accounts in the tx so we can use the remaining space (MAX_ACCOUNTS_PER_TRANSACTION - accounts_used) for the swap
    const extractKeys = (ixs: Instruction[]) => ixs.flatMap((ix) => ix.accounts?.map((key) => key.address) || []);

    const allKeys = [
      ...extractKeys(result),
      ...extractKeys([checkExpectedVaultsBalancesIx]),
      ...extractKeys([singleSidedDepositIx]),
      ...extractKeys(cleanupIxs),
    ];

    // if we have no tokens to sell skip the jup tx
    if (
      amountsToDepositWithSwap.tokenAToSwapAmount.gte(ZERO) &&
      amountsToDepositWithSwap.tokenBToSwapAmount.gte(ZERO)
    ) {
      result = result.concat([checkExpectedVaultsBalancesIx, singleSidedDepositIx, ...cleanupIxs]);
      return { instructions: result, lookupTablesAddresses: [] };
    }

    const [jupSwapIxs, lookupTablesAddresses] = await profiler(
      Kamino.retryAsync(async () =>
        profiler(
          swapIxsBuilder(
            amountsToDepositWithSwap,
            strategyState.tokenAMint,
            strategyState.tokenBMint,
            owner,
            swapSlippageBps,
            allKeys
          ),
          'B-swapIxsBuilder',
          [
            // todo: not sure if we need to include these logs
            ['tokenAMint', strategyState.tokenAMint.toString()],
            ['tokenBMint', strategyState.tokenBMint.toString()],
          ]
        )
      ),
      'B-retryAsync',
      []
    );

    result = result.concat([checkExpectedVaultsBalancesIx, ...jupSwapIxs, singleSidedDepositIx, ...cleanupIxs]);
    return { instructions: result, lookupTablesAddresses };
  };

  static async retryAsync(fn: () => Promise<any>, retriesLeft = 5, interval = 2000): Promise<any> {
    try {
      return await fn();
    } catch (error) {
      if (retriesLeft) {
        await new Promise((resolve) => setTimeout(resolve, interval));
        return await Kamino.retryAsync(fn, retriesLeft - 1, interval);
      }
      throw error;
    }
  }

  /**
   * Get transaction instruction to deposit SOL into topup vault.
   * @param owner Owner (wallet, shareholder) public key
   * @param amountLamports Amount of SOL to deposit into topup vault
   * @returns transaction instruction for adding SOL to topup vault
   */
  upkeepTopupVault = async (owner: TransactionSigner, amountLamports: Decimal): Promise<Instruction> => {
    if (amountLamports.lessThanOrEqualTo(0)) {
      throw Error('Must deposit a positive amount of SOL.');
    }
    const topupVault = await this.getUserTopupVault(owner.address);
    const ix = getTransferSolInstruction({
      source: owner,
      destination: topupVault,
      amount: BigInt(amountLamports.floor().toString()),
    });
    return ix;
  };

  /**
   * Get the topup vault balance in SOL.
   * @param owner Owner (wallet, shareholder) public key
   * @returns SOL amount in topup vault
   */
  topupVaultBalance = async (owner: Address): Promise<Decimal> => {
    const topupVault = await this.getUserTopupVault(owner);
    return lamportsToNumberDecimal(
      new Decimal((await this._rpc.getBalance(topupVault).send()).value.toString()),
      DECIMALS_SOL
    );
  };

  /**
   * Get transaction instruction to withdraw SOL from the topup vault.
   * @param owner Owner (wallet, shareholder) public key
   * @param amount Amount of SOL to withdraw from the topup vault
   * @returns transaction instruction for removing SOL from the topup vault
   */
  withdrawTopupVault = async (owner: TransactionSigner, amount: Decimal): Promise<Instruction> => {
    if (amount.lessThanOrEqualTo(0)) {
      throw Error('Must withdraw a positive amount of SOL.');
    }
    const topupVault = await this.getUserTopupVault(owner.address);

    let solToWithdraw: Decimal;
    if (amount.eq(new Decimal(U64_MAX))) {
      solToWithdraw = new Decimal((await this._rpc.getBalance(topupVault).send()).value.toString());
    } else {
      solToWithdraw = collToLamportsDecimal(amount, DECIMALS_SOL);
    }

    const args: WithdrawFromTopupArgs = {
      amount: new BN(solToWithdraw.toString()),
    };

    const accounts: WithdrawFromTopupAccounts = {
      adminAuthority: owner,
      topupVault,
      system: SYSTEM_PROGRAM_ADDRESS,
    };

    const withdrawIxn = withdrawFromTopup(args, accounts, undefined, this.getProgramID());
    return withdrawIxn;
  };

  getJupSwapIxsWithMaxAccounts = async (
    input: DepositAmountsForSwap,
    tokenAMint: Address,
    tokenBMint: Address,
    owner: Address,
    slippageBps: Decimal,
    useOnlyLegacyTransaction: boolean,
    existingAccounts: Address[],
    maxAccounts: number,
    profiler: ProfiledFunctionExecution = noopProfiledFunctionExecution,
    onlyDirectRoutes?: boolean
  ): Promise<[Instruction[], Address[]]> => {
    const jupiterQuote = input.tokenAToSwapAmount.lt(ZERO)
      ? await profiler(
          JupService.getBestRouteV6(
            owner,
            input.tokenAToSwapAmount.abs(),
            tokenAMint,
            tokenBMint,
            slippageBps.toNumber(),
            useOnlyLegacyTransaction,
            maxAccounts,
            onlyDirectRoutes
          ),
          'C-getBestRouteV6',
          []
        )
      : await profiler(
          JupService.getBestRouteV6(
            owner,
            input.tokenBToSwapAmount.abs(),
            tokenBMint,
            tokenAMint,
            slippageBps.toNumber(),
            useOnlyLegacyTransaction,
            maxAccounts,
            onlyDirectRoutes
          ),
          'C-getBestRouteV6',
          []
        );

    const allJupIxs: Instruction[] = [
      ...(jupiterQuote.tokenLedgerInstruction ? [jupiterQuote.tokenLedgerInstruction] : []),
      ...removeBudgetAndAtaIxns(jupiterQuote.setupInstructions, [tokenAMint, tokenBMint]),
      jupiterQuote.swapInstruction,
      ...(jupiterQuote.cleanupInstruction ? [jupiterQuote.cleanupInstruction] : []),
    ];

    const allJupAccounts = allJupIxs.flatMap((ix) => ix.accounts?.map((key) => key.address) || []);
    const allAccounts = new Set<Address>([...existingAccounts, ...allJupAccounts]);

    const prefix = 'getSingleSidedJupRoute:';
    console.log(`${prefix} All distinct existing accounts number ${new Set<Address>(existingAccounts).size}`);
    console.log(`${prefix} All distinct Jup accounts number ${new Set<Address>(allJupAccounts).size}`);
    console.log(`${prefix} All accounts number ${allAccounts.size}`);

    if (allAccounts.size < MAX_ACCOUNTS_PER_TRANSACTION) {
      return [allJupIxs, jupiterQuote.addressLookupTableAddresses];
    }

    // if none of the swap TXs returned by Jup have less than max allowed accounts throw error as the tx will fail because we lock too many accounts
    throw new Error('All Jupiter swap routes have too many accounts in the instructions');
  };

  getJupSwapIxsV6 = async (
    input: DepositAmountsForSwap,
    tokenAMint: Address,
    tokenBMint: Address,
    owner: Address,
    slippageBps: Decimal,
    useOnlyLegacyTransaction: boolean,
    existingAccounts: Address[],
    profiledFunctionExecution: ProfiledFunctionExecution = noopProfiledFunctionExecution,
    onlyDirectRoutes?: boolean
  ): Promise<[Instruction[], Address[]]> => {
    console.log('getJupSwapIxsV6', JSON.stringify(input));

    let extraAccountsBuffer = 5;

    const currentAccounts = new Set<Address>(existingAccounts).size;
    const duplicatedAccounts =
      1 + // tokenProgram
      1 + // systemProgram
      1 + // tokenAMint
      1 + // tokenBMint
      1 + // tokenAAta
      1; // tokenBAta

    while (extraAccountsBuffer < 30) {
      const maxAccounts = MAX_ACCOUNTS_PER_TRANSACTION - (currentAccounts - duplicatedAccounts) - extraAccountsBuffer;
      try {
        const result = await this.getJupSwapIxsWithMaxAccounts(
          input,
          tokenAMint,
          tokenBMint,
          owner,
          slippageBps,
          useOnlyLegacyTransaction,
          existingAccounts,
          maxAccounts,
          profiledFunctionExecution,
          onlyDirectRoutes
        );

        return result;
      } catch (error) {
        extraAccountsBuffer += 2;
        console.log(`getJupSwapIxs: ${error}`);
      }
    }

    console.log('getJupSwapIxs: Could not find a route with less than 64 total accounts');
    throw new Error(`Oops. Failed to find a route. Try again or unselect single-sided deposit.`);
  };

  getCheckExpectedVaultsBalancesIx = async (
    strategy: StrategyWithAddress,
    user: TransactionSigner,
    tokenAAta: Address,
    tokenBAta: Address,
    expectedTokensBalances?: MaybeTokensBalances
  ): Promise<Instruction> => {
    const { strategy: strategyState, address: _ } = strategy;

    let expectedABalance: Decimal;
    if (expectedTokensBalances && expectedTokensBalances.a) {
      expectedABalance = expectedTokensBalances.a;
    } else {
      expectedABalance = await this.getTokenAccountBalanceOrZero(tokenAAta);
    }

    let expectedBBalance: Decimal;
    if (expectedTokensBalances && expectedTokensBalances.b) {
      expectedBBalance = expectedTokensBalances.b;
    } else {
      expectedBBalance = await this.getTokenAccountBalanceOrZero(tokenBAta);
    }

    const expectedALamportsDecimal = collToLamportsDecimal(
      expectedABalance,
      strategyState.tokenAMintDecimals.toNumber()
    );
    const expectedBLamportsDecimal = collToLamportsDecimal(
      expectedBBalance,
      strategyState.tokenBMintDecimals.toNumber()
    );
    console.log('expectedALamportsDecimal ', expectedALamportsDecimal.toString());
    console.log('expectedBLamportsDecimal ', expectedBLamportsDecimal.toString());
    const expectedALamports = expectedALamportsDecimal.floor();
    const expectedBLamports = expectedBLamportsDecimal.floor();

    const args: CheckExpectedVaultsBalancesArgs = {
      tokenAAtaBalance: new BN(expectedALamports.toString()),
      tokenBAtaBalance: new BN(expectedBLamports.toString()),
    };

    const accounts: CheckExpectedVaultsBalancesAccounts = {
      user,
      tokenAAta,
      tokenBAta,
    };

    return checkExpectedVaultsBalances(args, accounts, undefined, this.getProgramID());
  };

  /**
   * Get transaction instruction to create a new Kamino strategy.
   * Current limitations:
   *   - strategy can only be created by the owner (admin) of the global config, we will need to allow non-admins to bypass this check
   *   - after the strategy is created, only the owner (admin) can update the treasury fee vault with token A/B, we need to allow non-admins to be able to do (and require) this as well
   * @param strategy public key of the new strategy to create
   * @param pool public key of the CLMM pool (either Orca or Raydium)
   * @param owner public key of the strategy owner (admin authority)
   * @param dex decentralized exchange specifier
   * @returns transaction instruction for Kamino strategy creation
   */
  createStrategy = async (
    strategy: Address,
    pool: Address,
    owner: TransactionSigner,
    dex: Dex
  ): Promise<Instruction> => {
    let tokenAMint = DEFAULT_PUBLIC_KEY;
    let tokenBMint = DEFAULT_PUBLIC_KEY;
    if (dex === 'ORCA') {
      const whirlpoolState = await Whirlpool.fetch(this._rpc, pool, this._orcaService.getWhirlpoolProgramId());
      if (!whirlpoolState) {
        throw Error(`Could not fetch whirlpool state with pubkey ${pool.toString()}`);
      }
      tokenAMint = whirlpoolState.tokenMintA;
      tokenBMint = whirlpoolState.tokenMintB;
    } else if (dex === 'RAYDIUM') {
      const raydiumPoolState = await PoolState.fetch(this._rpc, pool, this._raydiumService.getRaydiumProgramId());
      if (!raydiumPoolState) {
        throw Error(`Could not fetch Raydium pool state with pubkey ${pool.toString()}`);
      }
      tokenAMint = raydiumPoolState.tokenMint0;
      tokenBMint = raydiumPoolState.tokenMint1;
    } else if (dex === 'METEORA') {
      const meteoraPoolState = await LbPair.fetch(this._rpc, pool, this._meteoraService.getMeteoraProgramId());
      if (!meteoraPoolState) {
        throw Error(`Could not fetch Meteora pool state with pubkey ${pool.toString()}`);
      }
      tokenAMint = meteoraPoolState.tokenXMint;
      tokenBMint = meteoraPoolState.tokenYMint;
    }
    const tokenATokenProgram = await this.getAccountOwner(tokenAMint);
    const tokenBTokenProgram = await this.getAccountOwner(tokenBMint);

    const config = await this.getGlobalConfigState(this._globalConfig);
    if (!config) {
      throw Error(`Could not fetch globalConfig  with pubkey ${this.getGlobalConfig().toString()}`);
    }
    const collateralInfos = await this.getCollateralInfo(config.tokenInfos);
    const tokenACollateralId = collateralInfos.findIndex((x) => x.mint === tokenAMint);
    if (tokenACollateralId === -1) {
      throw Error(`Could not find token A (mint ${tokenAMint}) in collateral infos`);
    }
    const tokenBCollateralId = collateralInfos.findIndex((x) => x.mint === tokenBMint);
    if (tokenBCollateralId === -1) {
      throw Error(`Could not find token A (mint ${tokenBMint}) in collateral infos`);
    }

    const programAddresses = await this.getStrategyProgramAddresses(strategy, tokenAMint, tokenBMint);

    const strategyArgs: InitializeStrategyArgs = {
      tokenACollateralId: new BN(tokenACollateralId),
      tokenBCollateralId: new BN(tokenBCollateralId),
      strategyType: new BN(dexToNumber(dex)),
    };

    const strategyAccounts: InitializeStrategyAccounts = {
      adminAuthority: owner,
      strategy,
      globalConfig: this._globalConfig,
      pool,
      tokenAMint,
      tokenBMint,
      tokenAVault: programAddresses.tokenAVault,
      tokenBVault: programAddresses.tokenBVault,
      baseVaultAuthority: programAddresses.baseVaultAuthority,
      sharesMint: programAddresses.sharesMint,
      sharesMintAuthority: programAddresses.sharesMintAuthority,
      tokenInfos: config.tokenInfos,
      systemProgram: SYSTEM_PROGRAM_ADDRESS,
      rent: SYSVAR_RENT_ADDRESS,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      tokenATokenProgram,
      tokenBTokenProgram,
    };

    let ix = initializeStrategy(strategyArgs, strategyAccounts, undefined, this.getProgramID());
    ix = {
      ...ix,
      accounts: ix.accounts?.concat([
        { address: config.scopePriceId, role: AccountRole.READONLY },
        { address: config.scopeProgramId, role: AccountRole.READONLY },
      ]),
    };
    return ix;
  };

  /**
   * Get transaction instruction to close Kamino strategy, including its position if there is any
   * and strategy token accounts.
   * @param strategy public key of the strategy
   * @param admin signer to close the strategy
   * @returns instruction to close the strategy
   */
  withdrawAllAndCloseStrategy = async (
    admin: TransactionSigner,
    strategy: Address | StrategyWithAddress
  ): Promise<WithdrawAllAndCloseIxns | null> => {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    const withdrawIxns = await this.withdrawAllShares(strategyWithAddress, admin);
    if (withdrawIxns === null) {
      return null;
    }
    const closeIxn = await this.closeStrategy(admin, strategyWithAddress);
    return {
      withdrawIxns: [...withdrawIxns.prerequisiteIxs, withdrawIxns.withdrawIx],
      closeIxn,
    };
  };

  /**
   * Get transaction instruction to close Kamino strategy, including its position if there is any
   * and strategy token accounts.
   * @param admin signer to close the strategy
   * @param strategy public key of the strategy
   * @returns instruction to close the strategy
   */
  closeStrategy = async (admin: TransactionSigner, strategy: Address | StrategyWithAddress) => {
    const { address: strategyPubkey, strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);
    const collInfos = await this.getCollateralInfos();

    const eventAuthority = await this.getEventAuthorityPDA(strategyState.strategyDex);
    const poolProgram = this.getDexProgramId(strategyState);
    let oldPositionOrBaseVaultAuthority = strategyState.baseVaultAuthority;
    let oldPositionMintOrBaseVaultAuthority = strategyState.baseVaultAuthority;
    let oldPositionTokenAccountOrBaseVaultAuthority = strategyState.baseVaultAuthority;
    let oldTickArrayLowerOrBaseVaultAuthority = strategyState.baseVaultAuthority;
    let oldTickArrayUpperOrBaseVaultAuthority = strategyState.baseVaultAuthority;
    if (strategyState.position !== DEFAULT_PUBLIC_KEY) {
      oldPositionOrBaseVaultAuthority = strategyState.position;
      oldPositionMintOrBaseVaultAuthority = strategyState.positionMint;
      oldPositionTokenAccountOrBaseVaultAuthority = strategyState.positionTokenAccount;
      oldTickArrayLowerOrBaseVaultAuthority = strategyState.tickArrayLower;
      oldTickArrayUpperOrBaseVaultAuthority = strategyState.tickArrayUpper;
    }
    const [userTokenAAta, userTokenBAta] = await Promise.all([
      getAssociatedTokenAddress(
        strategyState.tokenAMint,
        strategyState.adminAuthority,
        keyOrDefault(strategyState.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS)
      ),
      getAssociatedTokenAddress(
        strategyState.tokenBMint,
        strategyState.adminAuthority,
        keyOrDefault(strategyState.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS)
      ),
    ]);

    const rewardMints = Array(6).fill(strategyState.pool);
    const rewardTokenPrograms = Array(6).fill(TOKEN_PROGRAM_ADDRESS);
    let reward0Vault = strategyState.baseVaultAuthority;
    let userReward0Ata = strategyState.baseVaultAuthority;
    if (isVaultInitialized(strategyState.reward0Vault, strategyState.reward0Decimals)) {
      reward0Vault = strategyState.reward0Vault;
      rewardMints[0] = collInfos[strategyState.reward0CollateralId.toNumber()].mint;
      rewardTokenPrograms[0] = await this.getAccountOwner(rewardMints[0]);
      userReward0Ata = await getAssociatedTokenAddress(
        rewardMints[0],
        strategyState.adminAuthority,
        rewardTokenPrograms[0]
      );
    }
    let reward1Vault = strategyState.baseVaultAuthority;
    let userReward1Ata = strategyState.baseVaultAuthority;
    if (isVaultInitialized(strategyState.reward1Vault, strategyState.reward1Decimals)) {
      reward1Vault = strategyState.reward1Vault;
      rewardMints[1] = collInfos[strategyState.reward1CollateralId.toNumber()].mint;
      rewardTokenPrograms[1] = await this.getAccountOwner(rewardMints[1]);
      userReward1Ata = await getAssociatedTokenAddress(
        rewardMints[1],
        strategyState.adminAuthority,
        rewardTokenPrograms[1]
      );
    }
    let reward2Vault = strategyState.baseVaultAuthority;
    let userReward2Ata = strategyState.baseVaultAuthority;
    if (isVaultInitialized(strategyState.reward2Vault, strategyState.reward2Decimals)) {
      reward2Vault = strategyState.reward2Vault;
      rewardMints[2] = collInfos[strategyState.reward2CollateralId.toNumber()].mint;
      rewardTokenPrograms[2] = await this.getAccountOwner(rewardMints[2]);
      userReward2Ata = await getAssociatedTokenAddress(
        rewardMints[2],
        strategyState.adminAuthority,
        rewardTokenPrograms[2]
      );
    }
    let kaminoReward0Vault = strategyState.baseVaultAuthority;
    const userKaminoReward0Ata = strategyState.baseVaultAuthority;
    if (isVaultInitialized(strategyState.kaminoRewards[0].rewardVault, strategyState.kaminoRewards[0].decimals)) {
      kaminoReward0Vault = strategyState.kaminoRewards[0].rewardVault;
      rewardMints[3] = strategyState.kaminoRewards[0].rewardVault;
      rewardTokenPrograms[3] = await this.getAccountOwner(rewardMints[3]);
      userReward0Ata = await getAssociatedTokenAddress(
        rewardMints[3],
        strategyState.adminAuthority,
        rewardTokenPrograms[3]
      );
    }
    let kaminoReward1Vault = strategyState.baseVaultAuthority;
    const userKaminoReward1Ata = strategyState.baseVaultAuthority;
    if (isVaultInitialized(strategyState.kaminoRewards[1].rewardVault, strategyState.kaminoRewards[1].decimals)) {
      kaminoReward1Vault = strategyState.kaminoRewards[1].rewardVault;
      rewardMints[4] = strategyState.kaminoRewards[1].rewardVault;
      rewardTokenPrograms[4] = await this.getAccountOwner(rewardMints[4]);
      userReward1Ata = await getAssociatedTokenAddress(
        rewardMints[4],
        strategyState.adminAuthority,
        rewardTokenPrograms[4]
      );
    }
    let kaminoReward2Vault = strategyState.baseVaultAuthority;
    const userKaminoReward2Ata = strategyState.baseVaultAuthority;
    if (isVaultInitialized(strategyState.kaminoRewards[2].rewardVault, strategyState.kaminoRewards[2].decimals)) {
      kaminoReward2Vault = strategyState.kaminoRewards[2].rewardVault;
      rewardMints[5] = strategyState.kaminoRewards[2].rewardVault;
      rewardTokenPrograms[5] = await this.getAccountOwner(rewardMints[5]);
      userReward2Ata = await getAssociatedTokenAddress(rewardMints[5], admin.address, rewardTokenPrograms[5]);
    }

    const strategyAccounts: CloseStrategyAccounts = {
      adminAuthority: admin,
      strategy: strategyPubkey,
      oldPositionOrBaseVaultAuthority,
      oldPositionMintOrBaseVaultAuthority,
      oldPositionTokenAccountOrBaseVaultAuthority,
      tokenAVault: strategyState.tokenAVault,
      tokenBVault: strategyState.tokenBVault,
      baseVaultAuthority: strategyState.baseVaultAuthority,
      system: SYSTEM_PROGRAM_ADDRESS,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      poolProgram: poolProgram,
      userTokenAAta,
      userTokenBAta,
      reward0Vault,
      reward1Vault,
      reward2Vault,
      kaminoReward0Vault,
      kaminoReward1Vault,
      kaminoReward2Vault,
      userReward0Ata,
      userReward1Ata,
      userReward2Ata,
      userKaminoReward0Ata,
      userKaminoReward1Ata,
      userKaminoReward2Ata,
      oldTickArrayLowerOrBaseVaultAuthority,
      oldTickArrayUpperOrBaseVaultAuthority,
      pool: strategyState.pool,
      eventAuthority,
      tokenATokenProgram: keyOrDefault(strategyState.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS),
      tokenBTokenProgram: keyOrDefault(strategyState.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS),
      tokenAMint: strategyState.tokenAMint,
      tokenBMint: strategyState.tokenBMint,
    };

    let ix = closeStrategy(strategyAccounts, undefined, this.getProgramID());

    for (let i = 0; i < 6; i++) {
      ix = {
        ...ix,
        accounts: ix.accounts?.concat([
          { address: rewardMints[i], role: AccountRole.READONLY },
          { address: rewardTokenPrograms[i], role: AccountRole.READONLY },
        ]),
      };
    }

    return ix;
  };

  getUserTopupVault = async (user: Address): Promise<Address> => {
    const [topupVault] = await getProgramDerivedAddress({
      seeds: [Buffer.from('topup_vault'), addressEncoder.encode(user)],
      programAddress: this.getProgramID(),
    });
    return topupVault;
  };

  /**
   * Find program adresses required for kamino strategy creation
   * @param strategy
   * @param tokenMintA
   * @param tokenMintB
   * @private
   * @returns object with program addresses for kamino strategy creation
   */
  private getStrategyProgramAddresses = async (
    strategy: Address,
    tokenMintA: Address,
    tokenMintB: Address
  ): Promise<StrategyProgramAddress> => {
    const [tokenAVault, tokenABump] = await getProgramDerivedAddress({
      seeds: [Buffer.from('svault_a'), addressEncoder.encode(strategy)],
      programAddress: this.getProgramID(),
    });
    const [tokenBVault, tokenBBump] = await getProgramDerivedAddress({
      seeds: [Buffer.from('svault_b'), addressEncoder.encode(strategy)],
      programAddress: this.getProgramID(),
    });
    const [baseVaultAuthority, baseVaultAuthorityBump] = await getProgramDerivedAddress({
      seeds: [Buffer.from('authority'), addressEncoder.encode(tokenAVault), addressEncoder.encode(tokenBVault)],
      programAddress: this.getProgramID(),
    });
    const [sharesMint, sharesMintBump] = await getProgramDerivedAddress({
      seeds: [
        Buffer.from('shares'),
        addressEncoder.encode(strategy),
        addressEncoder.encode(tokenMintA),
        addressEncoder.encode(tokenMintB),
      ],
      programAddress: this.getProgramID(),
    });
    const [sharesMintAuthority, sharesMintAuthorityBump] = await getProgramDerivedAddress({
      seeds: [Buffer.from('authority'), addressEncoder.encode(sharesMint)],
      programAddress: this.getProgramID(),
    });

    return {
      sharesMintAuthority,
      tokenAVault,
      tokenBVault,
      baseVaultAuthority,
      baseVaultAuthorityBump,
      sharesMintAuthorityBump,
      sharesMintBump,
      tokenBBump,
      sharesMint,
      tokenABump,
    };
  };

  /**
   * Get transaction instruction to create a new rent exempt strategy account
   * @param payer transaction payer (signer) public key
   * @param newStrategy public key of the new strategy
   * @returns transaction instruction to create the account
   */
  createStrategyAccount = async (payer: TransactionSigner, newStrategy: TransactionSigner): Promise<Instruction> => {
    const accountSize = BigInt(WhirlpoolStrategy.layout.span + 8);
    return this.createAccountRentExempt(payer, newStrategy, accountSize);
  };

  createAccountRentExempt = async (
    payer: TransactionSigner,
    newAccount: TransactionSigner,
    size: bigint
  ): Promise<Instruction> => {
    const lamports = await this._rpc.getMinimumBalanceForRentExemption(size).send();
    return getCreateAccountInstruction({
      newAccount,
      space: size,
      lamports,
      payer,
      programAddress: this.getProgramID(),
    });
  };

  /**
   * Get transaction instruction to collect strategy fees from the treasury fee
   * vaults and rewards from the reward vaults.
   * @param strategy strategy public key or already fetched object
   * @param owner signer of the tx
   * @returns transaction instruction to collect strategy fees and rewards
   */
  collectFeesAndRewards = async (
    strategy: Address | StrategyWithAddress,
    owner: TransactionSigner
  ): Promise<Instruction> => {
    const { address: strategyPubkey, strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);

    const eventAuthority = await this.getEventAuthorityPDA(strategyState.strategyDex);
    const { treasuryFeeTokenAVault, treasuryFeeTokenBVault, treasuryFeeVaultAuthority } =
      await this.getTreasuryFeeVaultPDAs(strategyState.tokenAMint, strategyState.tokenBMint);

    let programId = this._orcaService.getWhirlpoolProgramId();

    let poolRewardVault0 = DEFAULT_PUBLIC_KEY;
    let poolRewardVault1 = DEFAULT_PUBLIC_KEY;
    let poolRewardVault2 = DEFAULT_PUBLIC_KEY;
    let rewardMint0 = DEFAULT_PUBLIC_KEY;
    let rewardMint1 = DEFAULT_PUBLIC_KEY;
    let rewardMint2 = DEFAULT_PUBLIC_KEY;
    if (strategyState.strategyDex.toNumber() === dexToNumber('ORCA')) {
      const whirlpool = await Whirlpool.fetch(this._rpc, strategyState.pool, this._orcaService.getWhirlpoolProgramId());
      if (!whirlpool) {
        throw Error(`Could not fetch whirlpool state with pubkey ${strategyState.pool.toString()}`);
      }

      poolRewardVault0 = whirlpool.rewardInfos[0].vault;
      poolRewardVault1 = whirlpool.rewardInfos[1].vault;
      poolRewardVault2 = whirlpool.rewardInfos[2].vault;
      rewardMint0 = whirlpool.rewardInfos[0].mint;
      rewardMint1 = whirlpool.rewardInfos[1].mint;
      rewardMint2 = whirlpool.rewardInfos[2].mint;
    } else if (strategyState.strategyDex.toNumber() === dexToNumber('RAYDIUM')) {
      programId = this._raydiumService.getRaydiumProgramId();

      const poolState = await PoolState.fetch(
        this._rpc,
        strategyState.pool,
        this._raydiumService.getRaydiumProgramId()
      );
      if (!poolState) {
        throw Error(`Could not fetch Raydium pool state with pubkey ${strategyState.pool.toString()}`);
      }
      poolRewardVault0 = poolState.rewardInfos[0].tokenVault;
      poolRewardVault1 = poolState.rewardInfos[1].tokenVault;
      poolRewardVault2 = poolState.rewardInfos[2].tokenVault;
      rewardMint0 = poolState.rewardInfos[0].tokenMint;
      rewardMint1 = poolState.rewardInfos[1].tokenMint;
      rewardMint2 = poolState.rewardInfos[2].tokenMint;
    } else if (strategyState.strategyDex.toNumber() === dexToNumber('METEORA')) {
      programId = this._meteoraService.getMeteoraProgramId();

      const poolState = await LbPair.fetch(this._rpc, strategyState.pool, this._meteoraService.getMeteoraProgramId());
      if (!poolState) {
        throw Error(`Could not fetch Meteora pool state with pubkey ${strategyState.pool.toString()}`);
      }
      poolRewardVault0 = poolState.rewardInfos[0].vault;
      poolRewardVault1 = poolState.rewardInfos[1].vault;
      poolRewardVault2 = strategyPubkey;
      rewardMint0 = poolState.rewardInfos[0].mint;
      rewardMint1 = poolState.rewardInfos[1].mint;
      rewardMint2 = this.getProgramID();
    }

    const accounts: CollectFeesAndRewardsAccounts = {
      user: owner || strategyState.adminAuthority,
      strategy: strategyPubkey,
      globalConfig: strategyState.globalConfig,
      pool: strategyState.pool,
      position: strategyState.position,
      positionTokenAccount: strategyState.positionTokenAccount,
      treasuryFeeTokenAVault,
      treasuryFeeTokenBVault,
      treasuryFeeVaultAuthority,
      tokenAMint: strategyState.tokenAMint,
      tokenBMint: strategyState.tokenBMint,
      tokenAVault: strategyState.tokenAVault,
      tokenBVault: strategyState.tokenBVault,
      poolTokenVaultA: strategyState.poolTokenVaultA,
      poolTokenVaultB: strategyState.poolTokenVaultB,
      baseVaultAuthority: strategyState.baseVaultAuthority,
      reward0Vault: strategyState.reward0Vault,
      reward1Vault: strategyState.reward1Vault,
      reward2Vault: strategyState.baseVaultAuthority,
      poolRewardVault0:
        strategyState.reward0Decimals.toNumber() > 0 ? poolRewardVault0 : strategyState.baseVaultAuthority,
      poolRewardVault1:
        strategyState.reward1Decimals.toNumber() > 0 ? poolRewardVault1 : strategyState.baseVaultAuthority,
      poolRewardVault2:
        strategyState.reward2Decimals.toNumber() > 0 ? poolRewardVault2 : strategyState.baseVaultAuthority,
      tickArrayLower: strategyState.tickArrayLower,
      tickArrayUpper: strategyState.tickArrayUpper,
      raydiumProtocolPositionOrBaseVaultAuthority: strategyState.raydiumProtocolPositionOrBaseVaultAuthority,
      poolProgram: programId,
      instructionSysvarAccount: SYSVAR_INSTRUCTIONS_ADDRESS,
      eventAuthority,
      tokenATokenProgram: keyOrDefault(strategyState.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS),
      tokenBTokenProgram: keyOrDefault(strategyState.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS),
      memoProgram: MEMO_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      tokenProgram2022: TOKEN_2022_PROGRAM_ADDRESS,
    };

    let ix = collectFeesAndRewards(accounts, undefined, this.getProgramID());
    const pairs: [number, Address][] = [
      [strategyState.reward0Decimals.toNumber(), rewardMint0],
      [strategyState.reward1Decimals.toNumber(), rewardMint1],
      [strategyState.reward2Decimals.toNumber(), rewardMint2],
    ];
    for (const [decimals, mint] of pairs) {
      if (decimals > 0) {
        const tokenProgram = await this.getAccountOwner(mint);
        ix = {
          ...ix,
          accounts: ix.accounts?.concat([
            { address: mint, role: AccountRole.READONLY },
            { address: tokenProgram, role: AccountRole.READONLY },
          ]),
        };
      }
    }

    if (strategyState.strategyDex.toNumber() === dexToNumber('RAYDIUM')) {
      const [poolTickArrayBitmap] = await getProgramDerivedAddress({
        seeds: [Buffer.from('pool_tick_array_bitmap_extension'), addressEncoder.encode(strategyState.pool)],
        programAddress: this._raydiumService.getRaydiumProgramId(),
      });

      ix = {
        ...ix,
        accounts: ix.accounts?.concat([{ address: poolTickArrayBitmap, role: AccountRole.READONLY }]),
      };
    }
    return ix;
  };

  /**
   * Get orca position metadata program addresses
   * @param positionMint mint account of the position
   */
  getMetadataProgramAddressesOrca = async (positionMint: Address): Promise<MetadataProgramAddressesOrca> => {
    const [position, positionBump] = await getProgramDerivedAddress({
      seeds: [Buffer.from('position'), addressEncoder.encode(positionMint)],
      programAddress: this._orcaService.getWhirlpoolProgramId(),
    });
    const [positionMetadata, positionMetadataBump] = await getProgramDerivedAddress({
      seeds: [Buffer.from('metadata'), addressEncoder.encode(METADATA_PROGRAM_ID), addressEncoder.encode(positionMint)],
      programAddress: METADATA_PROGRAM_ID,
    });

    return {
      position,
      positionBump,
      positionMetadata,
      positionMetadataBump,
    };
  };

  getMetadataProgramAddressesRaydium = async (
    positionMint: Address,
    pool: Address,
    tickLowerIndex: number,
    tickUpperIndex: number
  ): Promise<MetadataProgramAddressesRaydium> => {
    const { publicKey: protocolPosition, nonce: protocolPositionBump } = getPdaProtocolPositionAddress(
      toLegacyPublicKey(this._raydiumService.getRaydiumProgramId()),
      toLegacyPublicKey(pool),
      tickLowerIndex,
      tickUpperIndex
    );

    const [position, positionBump] = await getProgramDerivedAddress({
      seeds: [Buffer.from('position'), addressEncoder.encode(positionMint)],
      programAddress: this._raydiumService.getRaydiumProgramId(),
    });

    const [positionMetadata, positionMetadataBump] = await getProgramDerivedAddress({
      seeds: [Buffer.from('metadata'), addressEncoder.encode(METADATA_PROGRAM_ID), addressEncoder.encode(positionMint)],
      programAddress: METADATA_PROGRAM_ID,
    });

    return {
      position,
      positionBump,
      protocolPosition: fromLegacyPublicKey(protocolPosition),
      protocolPositionBump,
      positionMetadata,
      positionMetadataBump,
    };
  };

  getStartEndTickIndexProgramAddressesOrca = async (
    whirlpool: Address,
    whirlpoolState: Whirlpool,
    tickLowerIndex: number,
    tickUpperIndex: number
  ): Promise<LowerAndUpperTickPubkeys> => {
    const startTickIndex = orcaGetTickArrayStartTickIndex(tickLowerIndex, whirlpoolState.tickSpacing);
    const endTickIndex = orcaGetTickArrayStartTickIndex(tickUpperIndex, whirlpoolState.tickSpacing);

    const [lowerTickPubkey, lowerTickBump] = await getProgramDerivedAddress({
      seeds: [Buffer.from('tick_array'), addressEncoder.encode(whirlpool), Buffer.from(startTickIndex.toString())],
      programAddress: this._orcaService.getWhirlpoolProgramId(),
    });
    const [upperTickPubkey, upperTickBump] = await getProgramDerivedAddress({
      seeds: [Buffer.from('tick_array'), addressEncoder.encode(whirlpool), Buffer.from(endTickIndex.toString())],
      programAddress: this._orcaService.getWhirlpoolProgramId(),
    });
    return {
      lowerTick: lowerTickPubkey,
      lowerTickBump,
      upperTick: upperTickPubkey,
      upperTickBump,
    };
  };

  private getStartEndTicketIndexProgramAddressesRaydium = async (
    pool: Address,
    poolState: PoolState,
    tickLowerIndex: number,
    tickUpperIndex: number
  ): Promise<LowerAndUpperTickPubkeys> => {
    const startTickIndex = RaydiumTickUtils.getTickArrayStartIndexByTick(tickLowerIndex, poolState.tickSpacing);
    const endTickIndex = RaydiumTickUtils.getTickArrayStartIndexByTick(tickUpperIndex, poolState.tickSpacing);

    const [lowerTickPubkey, lowerTickBump] = await getProgramDerivedAddress({
      seeds: [Buffer.from('tick_array'), addressEncoder.encode(pool), i32ToBytes(startTickIndex)],
      programAddress: this._raydiumService.getRaydiumProgramId(),
    });
    const [upperTickPubkey, upperTickBump] = await getProgramDerivedAddress({
      seeds: [Buffer.from('tick_array'), addressEncoder.encode(pool), i32ToBytes(endTickIndex)],
      programAddress: this._raydiumService.getRaydiumProgramId(),
    });
    return {
      lowerTick: lowerTickPubkey,
      lowerTickBump,
      upperTick: upperTickPubkey,
      upperTickBump,
    };
  };

  private readMeteoraPosition = async (poolPk: Address, positionPk: Address): Promise<MeteoraPosition> => {
    const pool = await LbPair.fetch(this._rpc, poolPk, this._meteoraService.getMeteoraProgramId());
    const position = await PositionV2.fetch(this._rpc, positionPk, this._meteoraService.getMeteoraProgramId());
    if (!pool || !position) {
      return {
        Address: positionPk,
        amountX: new Decimal(0),
        amountY: new Decimal(0),
      };
    }

    const { lowerTick: lowerTickPk, upperTick: upperTickPk } = await this.getStartEndTicketIndexProgramAddressesMeteora(
      poolPk,
      position.lowerBinId
    );
    const lowerBinArray = await BinArray.fetch(this._rpc, lowerTickPk, this._meteoraService.getMeteoraProgramId());
    const upperBinArray = await BinArray.fetch(this._rpc, upperTickPk, this._meteoraService.getMeteoraProgramId());
    if (!lowerBinArray || !upperBinArray) {
      return {
        Address: positionPk,
        amountX: new Decimal(0),
        amountY: new Decimal(0),
      };
    }
    const binArrays = [lowerBinArray, upperBinArray];
    let totalAmountX = new Decimal(0);
    let totalAmountY = new Decimal(0);
    for (let idx = position.lowerBinId; idx <= position.upperBinId; idx++) {
      const bin = getBinFromBinArrays(idx, binArrays);
      if (bin) {
        const binX = new Decimal(bin.amountX.toString());
        const binY = new Decimal(bin.amountY.toString());
        const binLiq = new Decimal(bin.liquiditySupply.toString());
        if (!binX.isNaN() && !binY.isNaN() && !binLiq.isNaN() && binLiq.gt(ZERO)) {
          const positionLiqNumber = position.liquidityShares[idx - position.lowerBinId];
          if (positionLiqNumber && !positionLiqNumber.isZero()) {
            const positionLiq = new Decimal(positionLiqNumber.toString());
            totalAmountX = totalAmountX.add(binX.mul(positionLiq).div(binLiq));
            totalAmountY = totalAmountY.add(binY.mul(positionLiq).div(binLiq));
          }
        }
      }
    }

    return {
      Address: positionPk,
      amountX: totalAmountX,
      amountY: totalAmountY,
    };
  };

  private getStartEndTicketIndexProgramAddressesMeteora = async (
    pool: Address,
    tickLowerIndex: number
  ): Promise<LowerAndUpperTickPubkeys> => {
    const meteoraProgramId = this._meteoraService.getMeteoraProgramId();

    const lowerBinArrayIndex = binIdToBinArrayIndex(new BN(tickLowerIndex));
    const [lowerTick, lowerTickBump] = await deriveBinArray(pool, lowerBinArrayIndex, meteoraProgramId);

    const upperBinArrayIndex = lowerBinArrayIndex.add(new BN(1));

    const [upperTick, upperTickBump] = await deriveBinArray(pool, upperBinArrayIndex, meteoraProgramId);

    return {
      lowerTick,
      lowerTickBump,
      upperTick,
      upperTickBump,
    };
  };
  /**
   * Get a transaction to open liquidity position for a Kamino strategy
   * @param admin strategy admin authority
   * @param strategy strategy you want to open liquidity position for
   * @param positionMint position mint keypair
   * @param priceLower new position's lower price of the range
   * @param priceUpper new position's upper price of the range
   * @param status strategy status
   */
  openPosition = async (
    admin: TransactionSigner,
    strategy: Address | StrategyWithAddress,
    positionMint: TransactionSigner,
    priceLower: Decimal,
    priceUpper: Decimal,
    status: StrategyStatusKind = new Uninitialized()
  ): Promise<Instruction> => {
    const { strategy: strategyState, address: strategyAddress } = await this.getStrategyStateIfNotFetched(strategy);
    if (!strategyState) {
      throw Error(`Could not fetch strategy state with pubkey ${strategy.toString()}`);
    }
    const eventAuthority = await this.getEventAuthorityPDA(strategyState.strategyDex);

    if (strategyState.strategyDex.toNumber() === dexToNumber('ORCA')) {
      return this.openPositionOrca(
        admin,
        strategyAddress,
        strategyState.baseVaultAuthority,
        strategyState.pool,
        positionMint,
        priceLower,
        priceUpper,
        strategyState.tokenAVault,
        strategyState.tokenBVault,
        strategyState.tokenAMint,
        strategyState.tokenBMint,
        strategyState.tokenATokenProgram,
        strategyState.tokenBTokenProgram,
        strategyState.position,
        strategyState.positionMint,
        strategyState.positionTokenAccount,
        strategyState.tickArrayLower,
        strategyState.tickArrayUpper,
        status
      );
    } else if (strategyState.strategyDex.toNumber() === dexToNumber('RAYDIUM')) {
      let reward0Vault: Address | undefined = undefined;
      let reward1Vault: Address | undefined = undefined;
      let reward2Vault: Address | undefined = undefined;
      if (strategyState.reward0Decimals.toNumber() > 0) {
        reward0Vault = strategyState.reward0Vault;
      }
      if (strategyState.reward1Decimals.toNumber() > 0) {
        reward1Vault = strategyState.reward1Vault;
      }
      if (strategyState.reward2Decimals.toNumber() > 0) {
        reward2Vault = strategyState.reward2Vault;
      }

      return this.openPositionRaydium(
        admin,
        strategyAddress,
        strategyState.baseVaultAuthority,
        strategyState.pool,
        positionMint,
        priceLower,
        priceUpper,
        strategyState.tokenAVault,
        strategyState.tokenBVault,
        strategyState.tokenAMint,
        strategyState.tokenBMint,
        strategyState.tokenATokenProgram,
        strategyState.tokenBTokenProgram,
        strategyState.tickArrayLower,
        strategyState.tickArrayUpper,
        strategyState.position,
        strategyState.positionMint,
        strategyState.positionTokenAccount,
        strategyState.raydiumProtocolPositionOrBaseVaultAuthority,
        eventAuthority,
        status,
        reward0Vault,
        reward1Vault,
        reward2Vault
      );
    } else if (strategyState.strategyDex.toNumber() === dexToNumber('METEORA')) {
      return this.openPositionMeteora(
        admin,
        strategyAddress,
        strategyState.baseVaultAuthority,
        strategyState.pool,
        positionMint,
        priceLower,
        priceUpper,
        strategyState.tokenAVault,
        strategyState.tokenBVault,
        strategyState.tokenAMint,
        strategyState.tokenBMint,
        strategyState.tokenATokenProgram,
        strategyState.tokenBTokenProgram,
        strategyState.position,
        strategyState.positionMint,
        strategyState.positionTokenAccount,
        strategyState.tickArrayLower,
        strategyState.tickArrayUpper,
        eventAuthority,
        status
      );
    } else {
      throw new Error(`Invalid dex ${strategyState.strategyDex.toString()}`);
    }
  };

  /**
   * Get a transaction to open liquidity position for a Kamino strategy
   * @param strategy strategy you want to open liquidity position for
   * @param positionMint new liquidity position account pubkey
   * @param priceLower new position's lower price of the range
   * @param priceUpper new position's upper price of the range
   * @param status strategy status
   */
  openPositionOrca = async (
    adminAuthority: TransactionSigner,
    strategy: Address,
    baseVaultAuthority: Address,
    pool: Address,
    positionMint: TransactionSigner,
    priceLower: Decimal,
    priceUpper: Decimal,
    tokenAVault: Address,
    tokenBVault: Address,
    tokenAMint: Address,
    tokenBMint: Address,
    tokenATokenProgram: Address,
    tokenBTokenProgram: Address,
    oldPositionOrBaseVaultAuthority: Address,
    oldPositionMintOrBaseVaultAuthority: Address,
    oldPositionTokenAccountOrBaseVaultAuthority: Address,
    oldTickArrayLowerOrBaseVaultAuthority: Address,
    oldTickArrayUpperOrBaseVaultAuthority: Address,
    status: StrategyStatusKind = new Uninitialized()
  ): Promise<Instruction> => {
    const whirlpool = await Whirlpool.fetch(this._rpc, pool, this._orcaService.getWhirlpoolProgramId());
    if (!whirlpool) {
      throw Error(`Could not fetch whirlpool state with pubkey ${pool.toString()}`);
    }

    const isRebalancing = status.discriminator === Rebalancing.discriminator;
    const decimalsA = await getMintDecimals(this._rpc, whirlpool.tokenMintA);
    const decimalsB = await getMintDecimals(this._rpc, whirlpool.tokenMintB);

    const tickLowerIndex = orcaPriceToTickIndex(priceLower.toNumber(), decimalsA, decimalsB);
    const tickUpperIndex = orcaPriceToTickIndex(priceUpper.toNumber(), decimalsA, decimalsB);

    const { position, positionBump, positionMetadata } = await this.getMetadataProgramAddressesOrca(
      positionMint.address
    );

    const positionTokenAccount = await getAssociatedTokenAddress(positionMint.address, baseVaultAuthority);

    const args: OpenLiquidityPositionArgs = {
      tickLowerIndex: new BN(tickLowerIndex),
      tickUpperIndex: new BN(tickUpperIndex),
      bump: positionBump,
    };

    const { lowerTick: startTickIndex, upperTick: endTickIndex } = await this.getStartEndTickIndexProgramAddressesOrca(
      pool,
      whirlpool,
      tickLowerIndex,
      tickUpperIndex
    );

    const globalConfig = await this.getGlobalConfigState(this._globalConfig);
    if (!globalConfig) {
      throw Error(`Could not fetch global config with pubkey ${this._globalConfig.toString()}`);
    }

    const accounts: OpenLiquidityPositionAccounts = {
      adminAuthority: adminAuthority,
      strategy,
      pool: pool,
      tickArrayLower: startTickIndex,
      tickArrayUpper: endTickIndex,
      baseVaultAuthority: baseVaultAuthority,
      position,
      positionMint: positionMint.address,
      positionMetadataAccount: positionMetadata,
      positionTokenAccount,
      rent: SYSVAR_RENT_ADDRESS,
      system: SYSTEM_PROGRAM_ADDRESS,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      tokenProgram2022: TOKEN_2022_PROGRAM_ADDRESS,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
      poolProgram: this._orcaService.getWhirlpoolProgramId(),
      oldPositionOrBaseVaultAuthority: isRebalancing ? oldPositionOrBaseVaultAuthority : baseVaultAuthority,
      oldPositionMintOrBaseVaultAuthority: isRebalancing ? oldPositionMintOrBaseVaultAuthority : positionMint.address,
      oldPositionTokenAccountOrBaseVaultAuthority: isRebalancing
        ? oldPositionTokenAccountOrBaseVaultAuthority
        : positionTokenAccount,
      globalConfig: this._globalConfig,
      oldTickArrayLowerOrBaseVaultAuthority: isRebalancing ? oldTickArrayLowerOrBaseVaultAuthority : baseVaultAuthority,
      oldTickArrayUpperOrBaseVaultAuthority: isRebalancing ? oldTickArrayUpperOrBaseVaultAuthority : baseVaultAuthority,
      tokenAVault,
      tokenBVault,
      poolTokenVaultA: whirlpool.tokenVaultA,
      poolTokenVaultB: whirlpool.tokenVaultB,
      scopePrices: globalConfig.scopePriceId,
      tokenInfos: globalConfig.tokenInfos,
      tokenAMint,
      tokenBMint,
      eventAuthority: none(),
      consensusAccount: CONSENSUS_ID,
      tokenATokenProgram: keyOrDefault(tokenATokenProgram, TOKEN_PROGRAM_ADDRESS),
      tokenBTokenProgram: keyOrDefault(tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS),
      memoProgram: MEMO_PROGRAM_ID,
    };

    const ix = openLiquidityPosition(args, accounts, undefined, this.getProgramID());

    const accs = [...(ix.accounts || [])];
    const accountIndex = accs.findIndex((acc) => acc.address === positionMint.address);
    if (accountIndex >= 0) {
      accs[accountIndex] = {
        ...accs[accountIndex],
        role: AccountRole.WRITABLE_SIGNER,
        // @ts-ignore
        signer: positionMint,
      };
    }
    return {
      ...ix,
      accounts: accs,
    };
  };

  /**
   * Get a transaction to open liquidity position for a Kamino strategy
   * @param strategy strategy you want to open liquidity position for
   * @param positionMint new liquidity position account pubkey
   * @param priceLower new position's lower price of the range
   * @param priceUpper new position's upper price of the range
   * @param status strategy status
   */
  openPositionRaydium = async (
    adminAuthority: TransactionSigner,
    strategy: Address,
    baseVaultAuthority: Address,
    pool: Address,
    positionMint: TransactionSigner,
    priceLower: Decimal,
    priceUpper: Decimal,
    tokenAVault: Address,
    tokenBVault: Address,
    tokenAMint: Address,
    tokenBMint: Address,
    tokenATokenProgram: Address,
    tokenBTokenProgram: Address,
    oldTickArrayLowerOrBaseVaultAuthority: Address,
    oldTickArrayUpperOrBaseVaultAuthority: Address,
    oldPositionOrBaseVaultAuthority: Address,
    oldPositionMintOrBaseVaultAuthority: Address,
    oldPositionTokenAccountOrBaseVaultAuthority: Address,
    oldProtocolPositionOrBaseVaultAuthority: Address,
    eventAuthority: Option<Address>,
    status: StrategyStatusKind = new Uninitialized(),
    strategyRewardOVault?: Address,
    strategyReward1Vault?: Address,
    strategyReward2Vault?: Address
  ): Promise<Instruction> => {
    const poolState = await PoolState.fetch(this._rpc, pool, this._raydiumService.getRaydiumProgramId());
    if (!poolState) {
      throw Error(`Could not fetch Raydium pool state with pubkey ${pool.toString()}`);
    }

    const isRebalancing = status.discriminator === Rebalancing.discriminator;

    const decimalsA = await getMintDecimals(this._rpc, poolState.tokenMint0);
    const decimalsB = await getMintDecimals(this._rpc, poolState.tokenMint1);

    const tickLowerIndex = RaydiumTickMath.getTickWithPriceAndTickspacing(
      RaydiumTickMath.roundPriceWithTickspacing(priceLower, poolState.tickSpacing, decimalsA, decimalsB),
      poolState.tickSpacing,
      decimalsA,
      decimalsB
    );

    const tickUpperIndex = RaydiumTickMath.getTickWithPriceAndTickspacing(
      RaydiumTickMath.roundPriceWithTickspacing(priceUpper, poolState.tickSpacing, decimalsA, decimalsB),
      poolState.tickSpacing,
      decimalsA,
      decimalsB
    );

    const { position, positionBump, protocolPosition, positionMetadata } =
      await this.getMetadataProgramAddressesRaydium(positionMint.address, pool, tickLowerIndex, tickUpperIndex);

    const positionTokenAccount = await getAssociatedTokenAddress(positionMint.address, baseVaultAuthority);

    const args: OpenLiquidityPositionArgs = {
      tickLowerIndex: new BN(tickLowerIndex),
      tickUpperIndex: new BN(tickUpperIndex),
      bump: positionBump,
    };

    const { lowerTick: startTickIndex, upperTick: endTickIndex } =
      await this.getStartEndTicketIndexProgramAddressesRaydium(pool, poolState, tickLowerIndex, tickUpperIndex);

    const globalConfig = await this.getGlobalConfigState(this._globalConfig);
    if (!globalConfig) {
      throw Error(`Could not fetch global config with pubkey ${this._globalConfig.toString()}`);
    }
    const accounts: OpenLiquidityPositionAccounts = {
      adminAuthority: adminAuthority,
      strategy,
      pool: pool,
      tickArrayLower: startTickIndex,
      tickArrayUpper: endTickIndex,
      baseVaultAuthority: baseVaultAuthority,
      position,
      positionMint: positionMint.address,
      positionMetadataAccount: positionMetadata,
      positionTokenAccount,
      rent: SYSVAR_RENT_ADDRESS,
      system: SYSTEM_PROGRAM_ADDRESS,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      tokenProgram2022: TOKEN_2022_PROGRAM_ADDRESS,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
      poolProgram: this._raydiumService.getRaydiumProgramId(),
      oldPositionOrBaseVaultAuthority: isRebalancing ? oldPositionOrBaseVaultAuthority : baseVaultAuthority,
      oldPositionMintOrBaseVaultAuthority: isRebalancing ? oldPositionMintOrBaseVaultAuthority : positionMint.address,
      oldPositionTokenAccountOrBaseVaultAuthority: isRebalancing
        ? oldPositionTokenAccountOrBaseVaultAuthority
        : positionTokenAccount,
      globalConfig: this._globalConfig,
      oldTickArrayLowerOrBaseVaultAuthority: isRebalancing ? oldTickArrayLowerOrBaseVaultAuthority : baseVaultAuthority,
      oldTickArrayUpperOrBaseVaultAuthority: isRebalancing ? oldTickArrayUpperOrBaseVaultAuthority : baseVaultAuthority,
      tokenAVault: tokenAVault,
      tokenBVault: tokenBVault,
      poolTokenVaultA: poolState.tokenVault0,
      poolTokenVaultB: poolState.tokenVault1,
      scopePrices: globalConfig.scopePriceId,
      tokenInfos: globalConfig.tokenInfos,
      tokenAMint,
      tokenBMint,
      eventAuthority,
      consensusAccount: CONSENSUS_ID,
      tokenATokenProgram: keyOrDefault(tokenATokenProgram, TOKEN_PROGRAM_ADDRESS),
      tokenBTokenProgram: keyOrDefault(tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS),
      memoProgram: MEMO_PROGRAM_ID,
    };
    const [poolTickArrayBitmap] = await getProgramDerivedAddress({
      seeds: [Buffer.from('pool_tick_array_bitmap_extension'), addressEncoder.encode(pool)],
      programAddress: this._raydiumService.getRaydiumProgramId(),
    });

    let ix = openLiquidityPosition(args, accounts, undefined, this.getProgramID());

    ix = {
      ...ix,
      accounts: ix.accounts?.concat([
        { address: protocolPosition, role: AccountRole.WRITABLE },
        { address: oldProtocolPositionOrBaseVaultAuthority, role: AccountRole.WRITABLE },
        { address: METADATA_PROGRAM_ID, role: AccountRole.READONLY },
        { address: poolTickArrayBitmap, role: AccountRole.WRITABLE },
      ]),
    };
    if (strategyRewardOVault) {
      ix = {
        ...ix,
        accounts: ix.accounts?.concat([
          { address: poolState.rewardInfos[0].tokenVault, role: AccountRole.WRITABLE },
          { address: strategyRewardOVault, role: AccountRole.WRITABLE },
          { address: poolState.rewardInfos[0].tokenMint, role: AccountRole.READONLY },
        ]),
      };
    }
    if (strategyReward1Vault) {
      ix = {
        ...ix,
        accounts: ix.accounts?.concat([
          { address: poolState.rewardInfos[1].tokenVault, role: AccountRole.WRITABLE },
          { address: strategyReward1Vault, role: AccountRole.WRITABLE },
          { address: poolState.rewardInfos[1].tokenMint, role: AccountRole.READONLY },
        ]),
      };
    }
    if (strategyReward2Vault) {
      ix = {
        ...ix,
        accounts: ix.accounts?.concat([
          { address: poolState.rewardInfos[2].tokenVault, role: AccountRole.WRITABLE },
          { address: strategyReward2Vault, role: AccountRole.WRITABLE },
          { address: poolState.rewardInfos[2].tokenMint, role: AccountRole.READONLY },
        ]),
      };
    }

    const accs = [...(ix.accounts || [])];
    const accountIndex = accs.findIndex((acc) => acc.address === positionMint.address);
    if (accountIndex >= 0) {
      accs[accountIndex] = {
        ...accs[accountIndex],
        role: AccountRole.WRITABLE_SIGNER,
        // @ts-ignore
        signer: positionMint,
      };
    }
    return {
      ...ix,
      accounts: accs,
    };
  };

  /**
   * Get a transaction to open liquidity position for a Kamino strategy
   * @param strategy strategy you want to open liquidity position for
   * @param positionMint new liquidity position account pubkey
   * @param priceLower new position's lower price of the range
   * @param priceUpper new position's upper price of the range
   * @param status strategy status
   */
  openPositionMeteora = async (
    adminAuthority: TransactionSigner,
    strategy: Address,
    baseVaultAuthority: Address,
    pool: Address,
    position: TransactionSigner,
    priceLower: Decimal,
    priceUpper: Decimal,
    tokenAVault: Address,
    tokenBVault: Address,
    tokenAMint: Address,
    tokenBMint: Address,
    tokenATokenProgram: Address,
    tokenBTokenProgram: Address,
    oldPositionOrBaseVaultAuthority: Address,
    oldPositionMintOrBaseVaultAuthority: Address,
    oldPositionTokenAccountOrBaseVaultAuthority: Address,
    oldTickArrayLowerOrBaseVaultAuthority: Address,
    oldTickArrayUpperOrBaseVaultAuthority: Address,
    eventAuthority: Option<Address>,
    status: StrategyStatusKind = new Uninitialized()
  ): Promise<Instruction> => {
    const lbPair = await LbPair.fetch(this._rpc, pool, this._meteoraService.getMeteoraProgramId());
    if (!lbPair) {
      throw Error(`Could not fetch meteora lbpair state with pubkey ${pool.toString()}`);
    }

    const isRebalancing = status.discriminator === Rebalancing.discriminator;
    const decimalsA = await getMintDecimals(this._rpc, lbPair.tokenXMint);
    const decimalsB = await getMintDecimals(this._rpc, lbPair.tokenYMint);

    const tickLowerIndex = getBinIdFromPriceWithDecimals(priceLower, lbPair.binStep, true, decimalsA, decimalsB);
    const tickUpperIndex = getBinIdFromPriceWithDecimals(priceUpper, lbPair.binStep, true, decimalsA, decimalsB);

    const {
      position: positionMint,
      positionBump,
      positionMetadata,
    } = await this.getMetadataProgramAddressesOrca(position.address);

    const positionTokenAccount = await getAssociatedTokenAddress(position.address, baseVaultAuthority);

    const args: OpenLiquidityPositionArgs = {
      tickLowerIndex: new BN(tickLowerIndex),
      tickUpperIndex: new BN(tickUpperIndex),
      bump: positionBump,
    };

    const { lowerTick: startTickIndex, upperTick: endTickIndex } =
      await this.getStartEndTicketIndexProgramAddressesMeteora(pool, tickLowerIndex);

    const globalConfig = await this.getGlobalConfigState(this._globalConfig);
    if (!globalConfig) {
      throw Error(`Could not fetch global config with pubkey ${this._globalConfig.toString()}`);
    }

    const accounts: OpenLiquidityPositionAccounts = {
      adminAuthority: adminAuthority,
      strategy,
      pool: pool,
      tickArrayLower: startTickIndex,
      tickArrayUpper: endTickIndex,
      baseVaultAuthority: baseVaultAuthority,
      position: position.address,
      positionMint,
      positionMetadataAccount: positionMetadata,
      positionTokenAccount,
      rent: SYSVAR_RENT_ADDRESS,
      system: SYSTEM_PROGRAM_ADDRESS,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      tokenProgram2022: TOKEN_2022_PROGRAM_ADDRESS,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
      poolProgram: this._meteoraService.getMeteoraProgramId(),
      oldPositionOrBaseVaultAuthority: isRebalancing ? oldPositionOrBaseVaultAuthority : baseVaultAuthority,
      oldPositionMintOrBaseVaultAuthority: isRebalancing ? oldPositionMintOrBaseVaultAuthority : positionMint,
      oldPositionTokenAccountOrBaseVaultAuthority: isRebalancing
        ? oldPositionTokenAccountOrBaseVaultAuthority
        : positionTokenAccount,
      globalConfig: this._globalConfig,
      oldTickArrayLowerOrBaseVaultAuthority: isRebalancing ? oldTickArrayLowerOrBaseVaultAuthority : baseVaultAuthority,
      oldTickArrayUpperOrBaseVaultAuthority: isRebalancing ? oldTickArrayUpperOrBaseVaultAuthority : baseVaultAuthority,
      tokenAVault,
      tokenBVault,
      poolTokenVaultA: lbPair.reserveX,
      poolTokenVaultB: lbPair.reserveY,
      scopePrices: globalConfig.scopePriceId,
      tokenInfos: globalConfig.tokenInfos,
      tokenAMint,
      tokenBMint,
      eventAuthority,
      consensusAccount: CONSENSUS_ID,
      tokenATokenProgram: keyOrDefault(tokenATokenProgram, TOKEN_PROGRAM_ADDRESS),
      tokenBTokenProgram: keyOrDefault(tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS),
      memoProgram: MEMO_PROGRAM_ID,
    };

    const ix = openLiquidityPosition(args, accounts, undefined, this.getProgramID());

    const accs = [...(ix.accounts || [])];
    const accountIndex = accs.findIndex((acc) => acc.address === position.address);
    if (accountIndex >= 0) {
      accs[accountIndex] = {
        ...accs[accountIndex],
        role: AccountRole.WRITABLE_SIGNER,
        // @ts-ignore
        signer: position,
      };
    }
    return {
      ...ix,
      accounts: accs,
    };
  };

  /**
   * Get a transaction for executive withdrawal from a Kamino strategy.
   * @param strategy strategy pubkey or object
   * @param action withdrawal action
   * @returns transaction for executive withdrawal
   */
  executiveWithdraw = async (
    admin: TransactionSigner,
    strategy: Address | StrategyWithAddress,
    action: ExecutiveWithdrawActionKind
  ): Promise<Instruction> => {
    const { address: strategyPubkey, strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);
    const eventAuthority = await this.getEventAuthorityPDA(strategyState.strategyDex);

    const globalConfig = await this.getGlobalConfigState(strategyState.globalConfig);
    if (globalConfig === null) {
      throw new Error(`Unable to fetch GlobalConfig with Pubkey ${strategyState.globalConfig}`);
    }
    const args: ExecutiveWithdrawArgs = {
      action: action.discriminator,
    };

    const programId = this.getDexProgramId(strategyState);

    const accounts: ExecutiveWithdrawAccounts = {
      adminAuthority: admin,
      strategy: strategyPubkey,
      globalConfig: strategyState.globalConfig,
      pool: strategyState.pool,
      position: strategyState.position,
      positionTokenAccount: strategyState.positionTokenAccount,
      baseVaultAuthority: strategyState.baseVaultAuthority,
      tickArrayLower: strategyState.tickArrayLower,
      tickArrayUpper: strategyState.tickArrayUpper,
      tokenAVault: strategyState.tokenAVault,
      tokenBVault: strategyState.tokenBVault,
      poolTokenVaultA: strategyState.poolTokenVaultA,
      poolTokenVaultB: strategyState.poolTokenVaultB,
      tokenAMint: strategyState.tokenAMint,
      tokenBMint: strategyState.tokenBMint,
      scopePrices: strategyState.scopePrices,
      raydiumProtocolPositionOrBaseVaultAuthority: strategyState.raydiumProtocolPositionOrBaseVaultAuthority,
      poolProgram: programId,
      tokenInfos: globalConfig.tokenInfos,
      eventAuthority,
      tokenATokenProgram: keyOrDefault(strategyState.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS),
      tokenBTokenProgram: keyOrDefault(strategyState.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS),
      memoProgram: MEMO_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      tokenProgram2022: TOKEN_2022_PROGRAM_ADDRESS,
    };

    let executiveWithdrawIx = executiveWithdraw(args, accounts, undefined, this.getProgramID());

    //  for Raydium strats we need to collect fees and rewards before withdrawal
    //  add rewards vaults accounts to withdraw
    const isRaydium = strategyState.strategyDex.toNumber() === dexToNumber('RAYDIUM');
    if (isRaydium) {
      const poolState = await this.getRaydiumPoolByAddress(strategyState.pool);
      if (!poolState) {
        throw new Error('Pool is not found');
      }

      if (strategyState.reward0Decimals.toNumber() > 0) {
        executiveWithdrawIx = {
          ...executiveWithdrawIx,
          accounts: executiveWithdrawIx.accounts?.concat([
            { address: poolState.rewardInfos[0].tokenVault, role: AccountRole.WRITABLE },
            { address: strategyState.reward0Vault, role: AccountRole.WRITABLE },
          ]),
        };
      }
      if (strategyState.reward1Decimals.toNumber() > 0) {
        executiveWithdrawIx = {
          ...executiveWithdrawIx,
          accounts: executiveWithdrawIx.accounts?.concat([
            { address: poolState.rewardInfos[1].tokenVault, role: AccountRole.WRITABLE },
            { address: strategyState.reward1Vault, role: AccountRole.WRITABLE },
          ]),
        };
      }
      if (strategyState.reward2Decimals.toNumber() > 0) {
        executiveWithdrawIx = {
          ...executiveWithdrawIx,
          accounts: executiveWithdrawIx.accounts?.concat([
            { address: poolState.rewardInfos[2].tokenVault, role: AccountRole.WRITABLE },
            { address: strategyState.reward2Vault, role: AccountRole.WRITABLE },
          ]),
        };
      }
    }

    return executiveWithdrawIx;
  };

  /**
   * Get a an instruction to update the reference price type of a strategy
   * @param admin transaction signer
   * @param strategy strategy pubkey or object
   * @param referencePriceType new reference price type
   */
  getUpdateReferencePriceTypeIx = async (
    admin: TransactionSigner,
    strategy: Address | StrategyWithAddress,
    referencePriceType: ReferencePriceTypeKind
  ): Promise<Instruction> => {
    const { address } = await this.getStrategyStateIfNotFetched(strategy);

    return getUpdateStrategyConfigIx(
      admin,
      this._globalConfig,
      address,
      new UpdateReferencePriceType(),
      new Decimal(referencePriceType.discriminator),
      this.getProgramID()
    );
  };

  /**
   * Get a transaction to invest funds from the Kamino vaults and put them into the DEX pool as liquidity.
   * @param strategy strategy pubkey or object
   * @param payer transaction payer
   */
  invest = async (strategy: Address | StrategyWithAddress, payer: TransactionSigner): Promise<Instruction> => {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    if (!strategyWithAddress || !strategyWithAddress.strategy) {
      throw Error(`Could not fetch strategy state with pubkey ${strategy.toString()}`);
    }

    const strategyState = strategyWithAddress.strategy;
    const globalConfig = await this.getGlobalConfigState(strategyState.globalConfig);
    if (!globalConfig) {
      throw Error(`Could not fetch global config with pubkey ${strategyState.globalConfig.toString()}`);
    }

    const programId = this.getDexProgramId(strategyState);
    const eventAuthority = await this.getEventAuthorityPDA(strategyState.strategyDex);

    const accounts: InvestAccounts = {
      position: strategyState.position,
      positionTokenAccount: strategyState.positionTokenAccount,
      pool: strategyState.pool,
      tokenAVault: strategyState.tokenAVault,
      tokenBVault: strategyState.tokenBVault,
      baseVaultAuthority: strategyState.baseVaultAuthority,
      payer,
      strategy: strategyWithAddress.address,
      globalConfig: strategyState.globalConfig,
      poolTokenVaultA: strategyState.poolTokenVaultA,
      poolTokenVaultB: strategyState.poolTokenVaultB,
      tickArrayLower: strategyState.tickArrayLower,
      tickArrayUpper: strategyState.tickArrayUpper,
      scopePrices: globalConfig.scopePriceId,
      raydiumProtocolPositionOrBaseVaultAuthority: strategyState.raydiumProtocolPositionOrBaseVaultAuthority,
      tokenInfos: globalConfig.tokenInfos,
      poolProgram: programId,
      instructionSysvarAccount: SYSVAR_INSTRUCTIONS_ADDRESS,
      tokenAMint: strategyState.tokenAMint,
      tokenBMint: strategyState.tokenBMint,
      eventAuthority,
      tokenATokenProgram: keyOrDefault(strategyState.tokenATokenProgram, TOKEN_PROGRAM_ADDRESS),
      tokenBTokenProgram: keyOrDefault(strategyState.tokenBTokenProgram, TOKEN_PROGRAM_ADDRESS),
      memoProgram: MEMO_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      tokenProgram2022: TOKEN_2022_PROGRAM_ADDRESS,
    };

    return invest(accounts, undefined, this.getProgramID());
  };

  /**
   * Get a list of instructions to collect the pending fees and invest them into the Kamino strategy's position.
   * @param strategy strategy pubkey or object
   * @param payer transaction payer
   */
  compound = async (strategy: Address | StrategyWithAddress, payer: TransactionSigner): Promise<Instruction[]> => {
    // fetch here so the underlying instructions won't need to fetch
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    if (!strategyWithAddress) {
      throw Error(`Could not fetch strategy state with pubkey ${strategy.toString()}`);
    }

    const collectFeesAndRewardsIx = this.collectFeesAndRewards(strategyWithAddress, payer);
    const investIx = this.invest(strategy, payer);

    return Promise.all([collectFeesAndRewardsIx, investIx]);
  };

  /**
   * Get a the pending fees in lamports of a strategy.
   * @param strategy strategy pubkey or object
   */
  getPendingFees = async (strategies: Address[]): Promise<StrategyWithPendingFees[]> => {
    const strategiesWithAddresses = await this.getStrategiesWithAddresses(strategies);
    const raydiumStrategies = strategiesWithAddresses.filter(
      (x) => x.strategy.strategyDex.toNumber() === dexToNumber('RAYDIUM') && x.strategy.position !== DEFAULT_PUBLIC_KEY
    );
    const raydiumPositionsPromise = this.getRaydiumPositions(raydiumStrategies.map((x) => x.strategy.position));
    const orcaStrategies = strategiesWithAddresses.filter(
      (x) => x.strategy.strategyDex.toNumber() === dexToNumber('ORCA') && x.strategy.position !== DEFAULT_PUBLIC_KEY
    );
    const orcaPositionsPromise = this.getOrcaPositions(orcaStrategies.map((x) => x.strategy.position));
    const meteoraStrategies = strategiesWithAddresses.filter(
      (x) => x.strategy.strategyDex.toNumber() === dexToNumber('METEORA') && x.strategy.position !== DEFAULT_PUBLIC_KEY
    );
    const meteoraPositionsPromise = this.getMeteoraPositions(meteoraStrategies.map((x) => x.strategy.position));
    const [raydiumPositions, orcaPositions, meteoraPositions] = await Promise.all([
      raydiumPositionsPromise,
      orcaPositionsPromise,
      meteoraPositionsPromise,
    ]);

    const result: StrategyWithPendingFees[] = [];
    for (let index = 0; index < orcaStrategies.length; index++) {
      const orcaPosition = orcaPositions[index];
      if (!orcaPosition) {
        throw Error(
          `Could not fetch Orca position state with pubkey ${orcaStrategies[index].strategy.position.toString()}`
        );
      }
      const pendingFees = {
        a: new Decimal(orcaPosition.feeOwedA.toString()),
        b: new Decimal(orcaPosition.feeOwedB.toString()),
      };
      result.push({
        strategy: orcaStrategies[index],
        pendingFees,
      });
    }

    for (let index = 0; index < raydiumStrategies.length; index++) {
      const raydiumPosition = raydiumPositions[index];
      if (!raydiumPosition) {
        throw Error(
          `Could not fetch Raydium position state with pubkey ${raydiumStrategies[index].strategy.position.toString()}`
        );
      }
      const pendingFees = {
        a: new Decimal(raydiumPosition.tokenFeesOwed0.toString()),
        b: new Decimal(raydiumPosition.tokenFeesOwed1.toString()),
      };
      result.push({
        strategy: raydiumStrategies[index],
        pendingFees,
      });
    }

    for (let index = 0; index < meteoraStrategies.length; index++) {
      const meteoraPosition = meteoraPositions[index];
      if (!meteoraPosition) {
        throw Error(
          `Could not fetch Meteora position state with pubkey ${meteoraStrategies[index].strategy.position.toString()}`
        );
      }
      const pendingFees: TokenAmounts = {
        a: ZERO,
        b: ZERO,
      };
      for (const feeInfo of meteoraPosition.feeInfos) {
        pendingFees.a = pendingFees.a.add(feeInfo.feeXPending.toString());
        pendingFees.b = pendingFees.b.add(feeInfo.feeYPending.toString());
      }
      result.push({
        strategy: meteoraStrategies[index],
        pendingFees,
      });
    }

    return result;
  };

  getUpdateRebalancingParamsFromRebalanceFieldsIx = async (
    strategyAdmin: TransactionSigner,
    strategy: Address | StrategyWithAddress,
    rebalanceFieldInfos: RebalanceFieldInfo[]
  ): Promise<Instruction> => {
    const rebalanceType = getRebalanceTypeFromRebalanceFields(rebalanceFieldInfos);
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    if (!strategyWithAddress || !strategyWithAddress.strategy) {
      throw Error(`Could not fetch strategy state with pubkey ${strategy.toString()}`);
    }

    const rebalanceParams = rebalanceFieldInfos
      .filter((x) => x.label != RebalanceTypeLabelName && x.enabled)
      .map((f) => new Decimal(f.value));
    return this.getUpdateRebalancingParamsIxns(
      strategyAdmin,
      strategyWithAddress.address,
      rebalanceParams,
      rebalanceType,
      strategyWithAddress.strategy.tokenAMintDecimals.toNumber(),
      strategyWithAddress.strategy.tokenBMintDecimals.toNumber()
    );
  };

  processRebalanceParams = async (
    dex: Dex,
    pool: Address | WhirlpoolWithAddress,
    rebalanceType: Decimal,
    rebalanceParams: Decimal[]
  ): Promise<Decimal[]> => {
    const processedRebalanceParams = [...rebalanceParams];
    const rebalanceTypeKind = numberToRebalanceType(rebalanceType.toNumber());
    if (dex === 'ORCA') {
      const { whirlpool: whilrpoolState } = await this.getWhirlpoolStateIfNotFetched(pool);
      if (rebalanceTypeKind.kind === RebalanceType.Drift.kind) {
        processedRebalanceParams[0] = new Decimal(
          orcaGetNearestValidTickIndexFromTickIndex(rebalanceParams[0].toNumber(), whilrpoolState.tickSpacing)
        );
      }
    }

    return processedRebalanceParams;
  };

  getUpdateRebalancingParamsIxns = async (
    strategyAdmin: TransactionSigner,
    strategy: Address | StrategyWithAddress,
    rebalanceParams: Decimal[],
    rebalanceType?: RebalanceTypeKind,
    tokenADecimals?: number,
    tokenBDecimals?: number
  ): Promise<Instruction> => {
    const { address: strategyAddress, strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);
    if (!rebalanceType) {
      rebalanceType = numberToRebalanceType(strategyState.rebalanceType);
    }
    tokenADecimals = strategyState.tokenAMintDecimals.toNumber();
    tokenBDecimals = strategyState.tokenBMintDecimals.toNumber();

    const processedRebalanceParams = await this.processRebalanceParams(
      numberToDex(strategyState.strategyDex.toNumber()),
      strategyState.pool,
      new Decimal(rebalanceType.discriminator),
      rebalanceParams
    );

    const value = buildStrategyRebalanceParams(processedRebalanceParams, rebalanceType, tokenADecimals, tokenBDecimals);
    const args: UpdateStrategyConfigArgs = {
      mode: StrategyConfigOption.UpdateRebalanceParams.discriminator,
      value,
    };

    const accounts: UpdateStrategyConfigAccounts = {
      adminAuthority: strategyAdmin,
      newAccount: DEFAULT_PUBLIC_KEY, // not used
      globalConfig: this._globalConfig,
      strategy: strategyAddress,
      systemProgram: SYSTEM_PROGRAM_ADDRESS,
    };
    return updateStrategyConfig(args, accounts, undefined, this.getProgramID());
  };

  getUpdateRebalancingParamsForUninitializedStratIx = async (
    strategyAdmin: TransactionSigner,
    strategy: Address,
    rebalanceParams: Decimal[],
    rebalanceType: RebalanceTypeKind,
    tokenADecimals: number,
    tokenBDecimals: number
  ): Promise<Instruction> => {
    const value = buildStrategyRebalanceParams(rebalanceParams, rebalanceType, tokenADecimals, tokenBDecimals);
    const args: UpdateStrategyConfigArgs = {
      mode: StrategyConfigOption.UpdateRebalanceParams.discriminator,
      value,
    };

    const accounts: UpdateStrategyConfigAccounts = {
      adminAuthority: strategyAdmin,
      newAccount: DEFAULT_PUBLIC_KEY, // not used
      globalConfig: this._globalConfig,
      strategy,
      systemProgram: SYSTEM_PROGRAM_ADDRESS,
    };
    return updateStrategyConfig(args, accounts, undefined, this.getProgramID());
  };

  buildStrategyRebalanceParams = async (strategy: Address | StrategyWithAddress): Promise<number[]> => {
    const strategyState = await this.getStrategyStateIfNotFetched(strategy);

    const params = strategyState.strategy.rebalanceRaw.params.map((p) => new Decimal(p.toString()));
    return buildStrategyRebalanceParams(params, numberToRebalanceType(strategyState.strategy.rebalanceType));
  };

  /**
   * Get a list of instructions to initialize and set up a strategy
   * @param dex the dex to use (Orca or Raydium)
   * @param feeTierBps which fee tier for that specific pair should be used (in BPS)
   * @param tokenAMint the mint of TokenA in the pool
   * @param tokenBMint the mint of TokenB in the pool
   * @param depositCap the maximum amount in USD in lamports (6 decimals) that can be deposited into the strategy
   * @param depositCapPerIx the maximum amount in USD in lamports (6 decimals) that can be deposited into the strategy per instruction
   */
  getBuildStrategyIxns = async (
    dex: Dex,
    feeTierBps: Decimal,
    strategy: Address,
    positionMint: TransactionSigner,
    strategyAdmin: TransactionSigner,
    rebalanceType: Decimal,
    rebalanceParams: Decimal[],
    tokenAMint: Address,
    tokenBMint: Address,
    depositCap?: Decimal,
    depositCapPerIx?: Decimal,
    withdrawFeeBps?: Decimal,
    depositFeeBps?: Decimal,
    performanceFeeBps?: Decimal
  ): Promise<InitStrategyIxs> => {
    const feeTier: Decimal = feeTierBps.div(FullBPS);
    // check both tokens exist in collateralInfo
    const config = await this.getGlobalConfigState(this._globalConfig);
    if (!config) {
      throw Error(`Could not fetch globalConfig  with pubkey ${this.getGlobalConfig().toString()}`);
    }
    const collateralInfos = await this.getCollateralInfo(config.tokenInfos);
    if (!this.mintIsSupported(collateralInfos, tokenAMint) || !this.mintIsSupported(collateralInfos, tokenBMint)) {
      throw Error(`Token mint ${tokenAMint.toString()} is not supported`);
    }

    const pool = await this.getPoolInitializedForDexPairTier(dex, tokenAMint, tokenBMint, feeTier.mul(FullBPS));
    if (pool === DEFAULT_PUBLIC_KEY) {
      throw Error(
        `Pool for tokens ${tokenAMint.toString()} and ${tokenBMint.toString()} for feeTier ${feeTier.toString()} does not exist`
      );
    }

    const processedRebalanceParams = await this.processRebalanceParams(dex, pool, rebalanceType, rebalanceParams);

    const price = await this.getCurrentPriceFromPool(dex, pool);

    let tokenMintA: Address;
    let tokenMintB: Address;
    let tickSpacing: number;
    if (dex === 'ORCA') {
      const whirlpoolState = await Whirlpool.fetch(this._rpc, pool, this._orcaService.getWhirlpoolProgramId());
      if (!whirlpoolState) {
        throw Error(`Could not fetch whirlpool state with pubkey ${pool.toString()}`);
      }
      tokenMintA = whirlpoolState.tokenMintA;
      tokenMintB = whirlpoolState.tokenMintB;
      tickSpacing = whirlpoolState.tickSpacing;
    } else if (dex === 'RAYDIUM') {
      const raydiumPoolState = await PoolState.fetch(this._rpc, pool, this._raydiumService.getRaydiumProgramId());
      if (!raydiumPoolState) {
        throw Error(`Could not fetch Raydium pool state with pubkey ${pool.toString()}`);
      }
      tokenMintA = raydiumPoolState.tokenMint0;
      tokenMintB = raydiumPoolState.tokenMint1;
      tickSpacing = raydiumPoolState.tickSpacing;
    } else if (dex === 'METEORA') {
      const meteoraPoolState = await LbPair.fetch(this._rpc, pool, this._meteoraService.getMeteoraProgramId());
      if (!meteoraPoolState) {
        throw Error(`Could not fetch Meteora pool state with pubkey ${pool.toString()}`);
      }
      tokenMintA = meteoraPoolState.tokenXMint;
      tokenMintB = meteoraPoolState.tokenYMint;
      tickSpacing = meteoraPoolState.binStep;
    } else {
      throw new Error(`Dex ${dex} is not supported`);
    }
    const tokenATokenProgram = await this.getAccountOwner(tokenAMint);
    const tokenBTokenProgram = await this.getAccountOwner(tokenBMint);

    const initStrategyIx: Instruction = await this.createStrategy(strategy, pool, strategyAdmin, dex);

    const tokenADecimals = await getMintDecimals(this._rpc, tokenMintA);
    const tokenBDecimals = await getMintDecimals(this._rpc, tokenMintB);
    const rebalanceKind = numberToRebalanceType(rebalanceType.toNumber());

    const updateRebalanceParamsIx = await this.getUpdateRebalancingParamsForUninitializedStratIx(
      strategyAdmin,
      strategy,
      processedRebalanceParams,
      rebalanceKind,
      tokenADecimals,
      tokenBDecimals
    );

    const updateStrategyParamsIxs = await this.getUpdateStrategyParamsIxs(
      strategyAdmin,
      strategy,
      rebalanceType,
      withdrawFeeBps,
      performanceFeeBps
    );

    const programAddresses = await this.getStrategyProgramAddresses(strategy, tokenMintA, tokenMintB);
    const baseVaultAuthority = programAddresses.baseVaultAuthority;
    const tokenAVault = programAddresses.tokenAVault;
    const tokenBVault = programAddresses.tokenBVault;

    const { lowerPrice, upperPrice } = await this.getRebalancePositionRange(
      dex,
      price,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      rebalanceKind,
      rebalanceParams
    );

    const openPositionIxs: Instruction[] = [];
    const eventAuthority = await this.getEventAuthorityPDA(new BN(dexToNumber(dex)));
    if (dex === 'ORCA') {
      const whirlpoolWithAddress = await this.getWhirlpoolStateIfNotFetched(pool);
      if (!whirlpoolWithAddress) {
        throw Error(`Could not fetch whirlpool state with pubkey ${pool.toString()}`);
      }
      const initLowerTickIfNeeded = await this.initializeTickForOrcaPool(strategyAdmin, pool, lowerPrice);
      const initUpperTickIfNeeded = await this.initializeTickForOrcaPool(strategyAdmin, pool, upperPrice);

      const openPositionIx = await this.openPositionOrca(
        strategyAdmin,
        strategy,
        baseVaultAuthority,
        pool,
        positionMint,
        lowerPrice,
        upperPrice,
        tokenAVault,
        tokenBVault,
        tokenAMint,
        tokenBMint,
        tokenATokenProgram,
        tokenBTokenProgram,
        baseVaultAuthority,
        baseVaultAuthority,
        baseVaultAuthority,
        baseVaultAuthority,
        baseVaultAuthority
      );
      if (initLowerTickIfNeeded.initTickIx) {
        openPositionIxs.push(initLowerTickIfNeeded.initTickIx);
      }
      if (initUpperTickIfNeeded.initTickIx) {
        openPositionIxs.push(initUpperTickIfNeeded.initTickIx);
      }
      openPositionIxs.push(openPositionIx);
    } else if (dex === 'RAYDIUM') {
      const openPositionIx = await this.openPositionRaydium(
        strategyAdmin,
        strategy,
        baseVaultAuthority,
        pool,
        positionMint,
        lowerPrice,
        upperPrice,
        tokenAVault,
        tokenBVault,
        tokenAMint,
        tokenBMint,
        tokenATokenProgram,
        tokenBTokenProgram,
        baseVaultAuthority,
        baseVaultAuthority,
        baseVaultAuthority,
        baseVaultAuthority,
        baseVaultAuthority,
        baseVaultAuthority,
        eventAuthority
      );

      openPositionIxs.push(openPositionIx);
    } else if (dex === 'METEORA') {
      const lbPair = await this.getMeteoraStateIfNotFetched(pool);
      if (!lbPair) {
        throw Error(`Could not fetch whirlpool state with pubkey ${pool.toString()}`);
      }
      const initLowerTickIfNeeded = await this.initializeTickForMeteoraPool(strategyAdmin, pool, lowerPrice);
      const initUpperTickIfNeeded = await this.initializeTickForMeteoraPool(strategyAdmin, pool, upperPrice);

      const openPositionIx = await this.openPositionMeteora(
        strategyAdmin,
        strategy,
        baseVaultAuthority,
        pool,
        positionMint,
        lowerPrice,
        upperPrice,
        tokenAVault,
        tokenBVault,
        tokenAMint,
        tokenBMint,
        tokenATokenProgram,
        tokenBTokenProgram,
        baseVaultAuthority,
        baseVaultAuthority,
        baseVaultAuthority,
        baseVaultAuthority,
        baseVaultAuthority,
        eventAuthority
      );
      if (initLowerTickIfNeeded.initTickIx) {
        openPositionIxs.push(initLowerTickIfNeeded.initTickIx);
      }
      if (initUpperTickIfNeeded.initTickIx) {
        openPositionIxs.push(initUpperTickIfNeeded.initTickIx);
      }
      openPositionIxs.push(openPositionIx);
    } else {
      throw new Error(`Dex ${dex} is not supported`);
    }

    return {
      initStrategyIx,
      updateStrategyParamsIxs,
      updateRebalanceParamsIx,
      openPositionIxs,
    };
  };

  async getNewPositionRange(
    strategy: Address | StrategyWithAddress,
    rebalanceKind: RebalanceTypeKind,
    rebalanceParams: Decimal[]
  ): Promise<PositionRange> {
    const strategyState = await this.getStrategyStateIfNotFetched(strategy);
    const dex = numberToDex(strategyState.strategy.strategyDex.toNumber());
    const tokenAMint = strategyState.strategy.tokenAMint;
    const tokenBMint = strategyState.strategy.tokenBMint;
    const price = await this.getCurrentPriceFromPool(dex, strategyState.strategy.pool);
    const tickSpacing = await this.getPoolTickSpacing(dex, strategyState.strategy.pool);

    return this.getRebalancePositionRange(
      dex,
      price,
      tokenAMint,
      tokenBMint,
      tickSpacing,
      rebalanceKind,
      rebalanceParams
    );
  }

  private async getRebalancePositionRange(
    dex: Dex,
    price: Decimal,
    tokenAMint: Address,
    tokenBMint: Address,
    tickSpacing: number,
    rebalanceKind: RebalanceTypeKind,
    rebalanceParams: Decimal[]
  ): Promise<PositionRange> {
    const tokenADecimals = await getMintDecimals(this._rpc, tokenAMint);
    const tokenBDecimals = await getMintDecimals(this._rpc, tokenBMint);
    switch (rebalanceKind.kind) {
      case RebalanceType.Manual.kind:
        return { lowerPrice: rebalanceParams[0], upperPrice: rebalanceParams[1] };
      case RebalanceType.TakeProfit.kind:
        return { lowerPrice: rebalanceParams[0], upperPrice: rebalanceParams[1] };

      case RebalanceType.PricePercentage.kind:
        return getPositionRangeFromPercentageRebalanceParams(price, rebalanceParams[0], rebalanceParams[1]);

      case RebalanceType.PricePercentageWithReset.kind:
        return getPositionRangeFromPricePercentageWithResetParams(price, rebalanceParams[0], rebalanceParams[1]);

      case RebalanceType.Drift.kind:
        return getPositionRangeFromDriftParams(
          dex,
          tickSpacing,
          tokenADecimals,
          tokenBDecimals,
          rebalanceParams[0],
          rebalanceParams[1],
          rebalanceParams[2]
        );

      case RebalanceType.PeriodicRebalance.kind:
        return getPositionRangeFromPeriodicRebalanceParams(price, rebalanceParams[1], rebalanceParams[2]);

      case RebalanceType.Expander.kind:
        return getPositionRangeFromExpanderParams(price, rebalanceParams[0], rebalanceParams[1]);

      case RebalanceType.Autodrift.kind:
        const currentTickIndex = orcaPriceToTickIndex(price.toNumber(), tokenADecimals, tokenBDecimals);
        const startMidTick = new Decimal(currentTickIndex);
        return getPositionRangeFromAutodriftParams(
          dex,
          tokenADecimals,
          tokenBDecimals,
          startMidTick,
          rebalanceParams[1],
          rebalanceParams[2],
          tickSpacing
        );

      default:
        throw new Error(`Rebalance type ${rebalanceKind} is not supported`);
    }
  }

  async getCurrentPrice(strategy: Address | StrategyWithAddress): Promise<Decimal> {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    const pool = strategyWithAddress.strategy.pool;
    const dex = numberToDex(strategyWithAddress.strategy.strategyDex.toNumber());

    return this.getCurrentPriceFromPool(
      dex,
      pool,
      strategyWithAddress.strategy.tokenAMintDecimals.toNumber(),
      strategyWithAddress.strategy.tokenBMintDecimals.toNumber()
    );
  }

  async getCurrentPriceFromPool(
    dex: Dex,
    pool: Address,
    tokenADecimals?: number,
    tokenBDecimals?: number
  ): Promise<Decimal> {
    if (dex === 'ORCA') {
      return this.getOrcaPoolPrice(pool, tokenADecimals, tokenBDecimals);
    } else if (dex === 'RAYDIUM') {
      return this.getRaydiumPoolPrice(pool);
    } else if (dex === 'METEORA') {
      return this.getMeteoraPoolPrice(pool);
    } else {
      throw new Error(`Dex ${dex} is not supported`);
    }
  }

  async getPoolTickSpacing(dex: Dex, pool: Address): Promise<number> {
    if (dex === 'ORCA') {
      const whirlpoolState = await Whirlpool.fetch(this._rpc, pool, this._orcaService.getWhirlpoolProgramId());
      if (!whirlpoolState) {
        throw Error(`Could not fetch whirlpool state with pubkey ${pool.toString()}`);
      }
      return whirlpoolState.tickSpacing;
    } else if (dex === 'RAYDIUM') {
      const raydiumPoolState = await PoolState.fetch(this._rpc, pool, this._raydiumService.getRaydiumProgramId());
      if (!raydiumPoolState) {
        throw Error(`Could not fetch Raydium pool state with pubkey ${pool.toString()}`);
      }
      return raydiumPoolState.tickSpacing;
    } else if (dex === 'METEORA') {
      const meteoraPoolState = await LbPair.fetch(this._rpc, pool, this._meteoraService.getMeteoraProgramId());
      if (!meteoraPoolState) {
        throw Error(`Could not fetch Meteora pool state with pubkey ${pool.toString()}`);
      }
      return meteoraPoolState.binStep;
    } else {
      throw new Error(`Dex ${dex} is not supported`);
    }
  }

  async getPriceRangePercentageBasedFromPool(
    dex: Dex,
    pool: Address,
    lowerPriceBpsDifference: Decimal,
    upperPriceBpsDifference: Decimal
  ): Promise<[Decimal, Decimal]> {
    let poolPrice: Decimal;
    if (dex === 'ORCA') {
      poolPrice = await this.getOrcaPoolPrice(pool);
    } else if (dex === 'RAYDIUM') {
      poolPrice = await this.getRaydiumPoolPrice(pool);
    } else if (dex === 'METEORA') {
      poolPrice = await this.getMeteoraPoolPrice(pool);
    } else {
      throw new Error(`Invalid dex ${dex}`);
    }

    return this.getPriceRangePercentageBasedFromPrice(poolPrice, lowerPriceBpsDifference, upperPriceBpsDifference);
  }

  /**
   * Get the raw rebalancing params given the strategy type
   */
  async readRebalancingParamsFromChain(strategy: Address | StrategyWithAddress): Promise<RebalanceFieldInfo[]> {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    const rebalanceKind = numberToRebalanceType(strategyWithAddress.strategy.rebalanceType);

    let rebalanceFields: RebalanceFieldInfo[];
    if (rebalanceKind.kind === Manual.kind) {
      rebalanceFields = [];
    } else if (rebalanceKind.kind === PricePercentage.kind) {
      rebalanceFields = readPricePercentageRebalanceParamsFromStrategy(strategyWithAddress.strategy.rebalanceRaw);
    } else if (rebalanceKind.kind === PricePercentageWithReset.kind) {
      rebalanceFields = readPricePercentageWithResetRebalanceParamsFromStrategy(
        strategyWithAddress.strategy.rebalanceRaw
      );
    } else if (rebalanceKind.kind === Drift.kind) {
      rebalanceFields = rebalanceFieldsDictToInfo(
        readDriftRebalanceParamsFromStrategy(strategyWithAddress.strategy.rebalanceRaw)
      );
    } else if (rebalanceKind.kind === TakeProfit.kind) {
      const tokenADecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenAMint);
      const tokenBDecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenBMint);
      rebalanceFields = rebalanceFieldsDictToInfo(
        readTakeProfitRebalanceParamsFromStrategy(
          tokenADecimals,
          tokenBDecimals,
          strategyWithAddress.strategy.rebalanceRaw
        )
      );
    } else if (rebalanceKind.kind === PeriodicRebalance.kind) {
      rebalanceFields = rebalanceFieldsDictToInfo(
        readPeriodicRebalanceRebalanceParamsFromStrategy(strategyWithAddress.strategy.rebalanceRaw)
      );
    } else if (rebalanceKind.kind === Expander.kind) {
      rebalanceFields = readExpanderRebalanceParamsFromStrategy(strategyWithAddress.strategy.rebalanceRaw);
    } else if (rebalanceKind.kind === Autodrift.kind) {
      rebalanceFields = rebalanceFieldsDictToInfo(
        readAutodriftRebalanceParamsFromStrategy(strategyWithAddress.strategy.rebalanceRaw)
      );
    } else {
      throw new Error(`Rebalance type ${rebalanceKind} is not supported`);
    }
    return rebalanceFields;
  }

  /**
   * Get the raw rebalancing params given the strategy type
   */
  async readRebalancingStateFromChain(strategy: Address | StrategyWithAddress): Promise<RebalanceFieldInfo[]> {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    const rebalanceKind = numberToRebalanceType(strategyWithAddress.strategy.rebalanceType);

    let rebalanceFields: RebalanceFieldInfo[];
    if (rebalanceKind.kind === Manual.kind) {
      rebalanceFields = [];
    } else if (rebalanceKind.kind === PricePercentage.kind) {
      rebalanceFields = readRawPricePercentageRebalanceStateFromStrategy(strategyWithAddress.strategy.rebalanceRaw);
    } else if (rebalanceKind.kind === PricePercentageWithReset.kind) {
      rebalanceFields = readRawPricePercentageWithResetRebalanceStateFromStrategy(
        strategyWithAddress.strategy.rebalanceRaw
      );
    } else if (rebalanceKind.kind === Drift.kind) {
      rebalanceFields = rebalanceFieldsDictToInfo(
        readRawDriftRebalanceStateFromStrategy(strategyWithAddress.strategy.rebalanceRaw)
      );
    } else if (rebalanceKind.kind === TakeProfit.kind) {
      rebalanceFields = rebalanceFieldsDictToInfo(
        readTakeProfitRebalanceStateFromStrategy(strategyWithAddress.strategy.rebalanceRaw)
      );
    } else if (rebalanceKind.kind === PeriodicRebalance.kind) {
      rebalanceFields = rebalanceFieldsDictToInfo(
        readPeriodicRebalanceRebalanceStateFromStrategy(strategyWithAddress.strategy.rebalanceRaw)
      );
    } else if (rebalanceKind.kind === Expander.kind) {
      rebalanceFields = rebalanceFieldsDictToInfo(
        readRawExpanderRebalanceStateFromStrategy(strategyWithAddress.strategy.rebalanceRaw)
      );
    } else if (rebalanceKind.kind === Autodrift.kind) {
      rebalanceFields = rebalanceFieldsDictToInfo(
        readRawAutodriftRebalanceStateFromStrategy(strategyWithAddress.strategy.rebalanceRaw)
      );
    } else {
      throw new Error(`Rebalance type ${rebalanceKind} is not supported`);
    }
    return rebalanceFields;
  }

  /**
   * Get the current withdrawal caps for a strategy
   */
  async getStrategyCurrentWithdrawalCaps(strategy: Address | StrategyWithAddress): Promise<TokenAmounts> {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);

    const tokenAWithdrawalCap = strategyWithAddress.strategy.withdrawalCapA;
    const tokenBWithdrawalCap = strategyWithAddress.strategy.withdrawalCapB;
    let tokenAWithdrawalCapTokens = Decimal.max(
      new Decimal(tokenAWithdrawalCap.configCapacity.toString()).sub(tokenAWithdrawalCap.currentTotal.toString()),
      ZERO
    );
    let tokenBWithdrawalCapTokens = Decimal.max(
      new Decimal(tokenBWithdrawalCap.configCapacity.toString()).sub(tokenBWithdrawalCap.currentTotal.toString()),
      ZERO
    );
    if (tokenAWithdrawalCap.configIntervalLengthSeconds.toNumber() == 0) {
      tokenAWithdrawalCapTokens = new Decimal(Number.MAX_VALUE);
    }
    if (tokenBWithdrawalCap.configIntervalLengthSeconds.toNumber() == 0) {
      tokenBWithdrawalCapTokens = new Decimal(Number.MAX_VALUE);
    }
    return {
      a: lamportsToNumberDecimal(tokenAWithdrawalCapTokens, strategyWithAddress.strategy.tokenAMintDecimals.toNumber()),
      b: lamportsToNumberDecimal(tokenBWithdrawalCapTokens, strategyWithAddress.strategy.tokenBMintDecimals.toNumber()),
    };
  }

  /**
   * Get the max USD value that can be deposited per ix for a strategy
   */
  async getStrategyDepositCapInUSDPerIx(strategy: Address | StrategyWithAddress): Promise<Decimal> {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    return lamportsToNumberDecimal(new Decimal(strategyWithAddress.strategy.depositCapUsdPerIxn.toString()), 6);
  }

  async getStrategyMaxDepositInUSD(strategy: Address | StrategyWithAddress): Promise<Decimal> {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    const depositCapInUSDPerIx = await this.getStrategyDepositCapInUSDPerIx(strategy);

    // return the min between deposit cap per ix and the cap left in the deposit
    const depositCapInTokens = lamportsToNumberDecimal(
      new Decimal(strategyWithAddress.strategy.depositCapUsd.toString()),
      6
    );

    // read the tvl from API
    const url = `https://api.hubbleprotocol.io/strategies/${strategyWithAddress.address.toString()}/metrics?env=mainnet-beta`;
    const response = await fetch(url);
    const data = (await response.json()) as { totalValueLocked: number };
    const tvl = new Decimal(data.totalValueLocked);

    const spaceLeftInDeposit = Decimal.max(depositCapInTokens.sub(tvl), ZERO);

    return Decimal.min(depositCapInUSDPerIx, spaceLeftInDeposit);
  }

  /**
   * Get the prices for rebalancing params (range and reset range, if strategy involves a reset range)
   */
  async readRebalancingParams(strategy: Address | StrategyWithAddress): Promise<RebalanceFieldInfo[]> {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    const rebalanceKind = numberToRebalanceType(strategyWithAddress.strategy.rebalanceType);

    if (rebalanceKind.kind === Manual.kind) {
      const positionRange = await this.getStrategyRange(strategyWithAddress);
      return getManualRebalanceFieldInfos(positionRange.lowerPrice, positionRange.upperPrice);
    } else if (rebalanceKind.kind === PricePercentage.kind) {
      const price = await this.getCurrentPrice(strategyWithAddress);
      return deserializePricePercentageRebalanceFromOnchainParams(price, strategyWithAddress.strategy.rebalanceRaw);
    } else if (rebalanceKind.kind === PricePercentageWithReset.kind) {
      const price = await this.getCurrentPrice(strategyWithAddress);
      return deserializePricePercentageWithResetRebalanceFromOnchainParams(
        price,
        strategyWithAddress.strategy.rebalanceRaw
      );
    } else if (rebalanceKind.kind === Drift.kind) {
      const dex = numberToDex(strategyWithAddress.strategy.strategyDex.toNumber());
      const tokenADecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenAMint);
      const tokenBDecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenBMint);
      const tickSpacing = await this.getPoolTickSpacing(dex, strategyWithAddress.strategy.pool);
      return deserializeDriftRebalanceFromOnchainParams(
        dex,
        tickSpacing,
        tokenADecimals,
        tokenBDecimals,
        strategyWithAddress.strategy.rebalanceRaw
      );
    } else if (rebalanceKind.kind === TakeProfit.kind) {
      const tokenADecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenAMint);
      const tokenBDecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenBMint);
      return deserializeTakeProfitRebalanceFromOnchainParams(
        tokenADecimals,
        tokenBDecimals,
        strategyWithAddress.strategy.rebalanceRaw
      );
    } else if (rebalanceKind.kind === PeriodicRebalance.kind) {
      const price = await this.getCurrentPrice(strategyWithAddress);
      return deserializePeriodicRebalanceFromOnchainParams(price, strategyWithAddress.strategy.rebalanceRaw);
    } else if (rebalanceKind.kind === Expander.kind) {
      const price = await this.getCurrentPrice(strategyWithAddress);
      return readExpanderRebalanceFieldInfosFromStrategy(price, strategyWithAddress.strategy.rebalanceRaw);
    } else if (rebalanceKind.kind === Autodrift.kind) {
      const dex = numberToDex(strategyWithAddress.strategy.strategyDex.toNumber());
      const tokenADecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenAMint);
      const tokenBDecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenBMint);
      const tickSpacing = await this.getPoolTickSpacing(dex, strategyWithAddress.strategy.pool);
      return deserializeAutodriftRebalanceFromOnchainParams(
        dex,
        tokenADecimals,
        tokenBDecimals,
        tickSpacing,
        strategyWithAddress.strategy.rebalanceRaw
      );
    } else {
      throw new Error(`Rebalance type ${rebalanceKind} is not supported`);
    }
  }

  /**
   * Get the rebalancing params from chain, alongside the current details of the position, reset range, etc
   */
  async readRebalancingParamsWithState(strategy: Address | StrategyWithAddress): Promise<RebalanceFieldInfo[]> {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    const rebalanceKind = numberToRebalanceType(strategyWithAddress.strategy.rebalanceType);
    const dex = numberToDex(strategyWithAddress.strategy.strategyDex.toNumber());
    const tokenADecimals = strategyWithAddress.strategy.tokenAMintDecimals.toNumber();
    const tokenBDecimals = strategyWithAddress.strategy.tokenBMintDecimals.toNumber();

    if (rebalanceKind.kind === Manual.kind) {
      const positionRange = await this.getStrategyRange(strategyWithAddress);
      return getManualRebalanceFieldInfos(positionRange.lowerPrice, positionRange.upperPrice);
    } else if (rebalanceKind.kind === PricePercentage.kind) {
      const price = await this.getCurrentPrice(strategyWithAddress);
      return deserializePricePercentageRebalanceWithStateOverride(
        dex,
        tokenADecimals,
        tokenBDecimals,
        price,
        strategyWithAddress.strategy.rebalanceRaw
      );
    } else if (rebalanceKind.kind === PricePercentageWithReset.kind) {
      const price = await this.getCurrentPrice(strategyWithAddress);
      return deserializePricePercentageWithResetRebalanceWithStateOverride(
        dex,
        tokenADecimals,
        tokenBDecimals,
        price,
        strategyWithAddress.strategy.rebalanceRaw
      );
    } else if (rebalanceKind.kind === Drift.kind) {
      const dex = numberToDex(strategyWithAddress.strategy.strategyDex.toNumber());
      const tokenADecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenAMint);
      const tokenBDecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenBMint);
      const tickSpacing = await this.getPoolTickSpacing(dex, strategyWithAddress.strategy.pool);
      return deserializeDriftRebalanceWithStateOverride(
        dex,
        tickSpacing,
        tokenADecimals,
        tokenBDecimals,
        strategyWithAddress.strategy.rebalanceRaw
      );
    } else if (rebalanceKind.kind === TakeProfit.kind) {
      const tokenADecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenAMint);
      const tokenBDecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenBMint);
      return deserializeTakeProfitRebalanceFromOnchainParams(
        tokenADecimals,
        tokenBDecimals,
        strategyWithAddress.strategy.rebalanceRaw
      );
    } else if (rebalanceKind.kind === PeriodicRebalance.kind) {
      const price = await this.getCurrentPrice(strategyWithAddress);
      return deserializePeriodicRebalanceFromOnchainParams(price, strategyWithAddress.strategy.rebalanceRaw);
    } else if (rebalanceKind.kind === Expander.kind) {
      const price = await this.getCurrentPrice(strategyWithAddress);
      return deserializeExpanderRebalanceWithStateOverride(
        dex,
        tokenADecimals,
        tokenBDecimals,
        price,
        strategyWithAddress.strategy.rebalanceRaw
      );
    } else if (rebalanceKind.kind === Autodrift.kind) {
      const dex = numberToDex(strategyWithAddress.strategy.strategyDex.toNumber());
      const tokenADecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenAMint);
      const tokenBDecimals = await getMintDecimals(this._rpc, strategyWithAddress.strategy.tokenBMint);
      const tickSpacing = await this.getPoolTickSpacing(dex, strategyWithAddress.strategy.pool);
      return deserializeAutodriftRebalanceWithStateOverride(
        dex,
        tokenADecimals,
        tokenBDecimals,
        tickSpacing,
        strategyWithAddress.strategy.rebalanceRaw
      );
    } else {
      throw new Error(`Rebalance type ${rebalanceKind} is not supported`);
    }
  }

  /**
   * Get a list of updated rebalance field infos.
   * @param initialRebalanceFieldInfos the initial list of rebalance field infos
   * @param updatedFields the fields to be updated, with label and value
   * @returns list of RebalanceFieldInfo with updated values
   */
  getUpdatedRebalanceFieldInfos(
    initialRebalanceFieldInfos: RebalanceFieldInfo[],
    updatedFields: InputRebalanceFieldInfo[]
  ): RebalanceFieldInfo[] {
    const newRebalanceFieldInfos = initialRebalanceFieldInfos.map((f) => {
      const updatedField = updatedFields.find((x) => x.label === f.label);
      if (updatedField) {
        return { ...f, value: updatedField.value };
      } else {
        return f;
      }
    });
    return newRebalanceFieldInfos;
  }

  getPriceRangePercentageBasedFromPrice(
    price: Decimal,
    lowerPriceBpsDifference: Decimal,
    upperPriceBpsDifference: Decimal
  ): [Decimal, Decimal] {
    const fullBPSDecimal = new Decimal(FullBPS);
    const lowerPrice = price.mul(fullBPSDecimal.sub(lowerPriceBpsDifference)).div(fullBPSDecimal);
    const upperPrice = price.mul(fullBPSDecimal.add(upperPriceBpsDifference)).div(fullBPSDecimal);

    return [lowerPrice, upperPrice];
  }

  /**
   * Read the pool price for a specific dex and pool
   */
  async getPoolPrice(dex: Dex, pool: Address, tokenADecimals: number, tokenBDecimals: number): Promise<Decimal> {
    if (dex === 'ORCA') {
      return this.getOrcaPoolPrice(pool, tokenADecimals, tokenBDecimals);
    } else if (dex === 'RAYDIUM') {
      return this.getRaydiumPoolPrice(pool);
    } else if (dex === 'METEORA') {
      return this.getMeteoraPoolPrice(pool);
    } else {
      throw new Error(`Invalid dex ${dex}`);
    }
  }

  async getOrcaPoolPrice(pool: Address, tokenADecimals?: number, tokenBDecimals?: number): Promise<Decimal> {
    // if the decimals are provided read from API, otherwise use RPC
    if (tokenADecimals && tokenBDecimals) {
      const whirlpool = await Whirlpool.fetch(this._rpc, pool, this._orcaService.getWhirlpoolProgramId());
      if (!whirlpool) {
        throw Error(`Could not fetch Whirlpool data for ${pool.toString()}`);
      }

      return new Decimal(sqrtPriceToPrice(BigInt(whirlpool.sqrtPrice.toString()), tokenADecimals, tokenBDecimals));
    } else {
      const whirlpool = await this._orcaService.getOrcaWhirlpool(pool);
      if (!whirlpool) {
        throw Error(`Could not fetch Whirlpool data for ${pool.toString()}`);
      }

      return new Decimal(
        sqrtPriceToPrice(BigInt(whirlpool.sqrtPrice.toString()), whirlpool.tokenA.decimals, whirlpool.tokenB.decimals)
      );
    }
  }

  async getRaydiumPoolPrice(pool: Address): Promise<Decimal> {
    const poolState = await PoolState.fetch(this._rpc, pool, this._raydiumService.getRaydiumProgramId());
    if (!poolState) {
      throw new Error(`Raydium poolState ${pool.toString()} is not found`);
    }

    const price = RaydiumSqrtPriceMath.sqrtPriceX64ToPrice(
      poolState.sqrtPriceX64,
      poolState.mintDecimals0,
      poolState.mintDecimals1
    );
    return price;
  }

  async getMeteoraPoolPrice(pool: Address): Promise<Decimal> {
    const poolState = await LbPair.fetch(this._rpc, pool, this._meteoraService.getMeteoraProgramId());
    if (!poolState) {
      throw new Error(`Meteora poolState ${pool.toString()} is not found`);
    }
    const decimalsX = await getMintDecimals(this._rpc, poolState.tokenXMint);
    const decimalsY = await getMintDecimals(this._rpc, poolState.tokenYMint);
    return getPriceOfBinByBinIdWithDecimals(poolState.activeId, poolState.binStep, decimalsX, decimalsY);
  }

  async getGenericPoolInfo(dex: Dex, pool: Address): Promise<GenericPoolInfo> {
    let poolInfo: GenericPoolInfo;
    if (dex === 'ORCA') {
      poolInfo = await this._orcaService.getGenericPoolInfo(pool);
    } else if (dex === 'RAYDIUM') {
      poolInfo = await this._raydiumService.getGenericPoolInfo(pool);
    } else if (dex === 'METEORA') {
      poolInfo = await this._meteoraService.getGenericPoolInfo(pool);
    } else {
      throw new Error(`Invalid dex ${dex}`);
    }

    return poolInfo;
  }

  mintIsSupported = (collateralInfos: CollateralInfo[], tokenMint: Address): boolean => {
    let found = false;
    collateralInfos.forEach((element) => {
      if (element.mint === tokenMint) {
        found = true;
      }
    });
    return found;
  };

  getCollateralInfoFromMint = (mint: Address, collateralInfos: CollateralInfo[]): CollateralInfo | undefined => {
    const collInfosForMint = collateralInfos.filter((x) => x.mint === mint);
    if (collInfosForMint.length === 0) {
      return undefined;
    }
    return collInfosForMint[0];
  };

  getCollateralIdFromMint = (mint: Address, collateralInfos: CollateralInfo[]): number => {
    for (let i = 0; i < collateralInfos.length; i++) {
      if (collateralInfos[i].mint === mint) {
        return i;
      }
    }

    return -1;
  };

  getMainLookupTablePks = async (): Promise<Address[]> => {
    if (
      this.getProgramID() === STAGING_KAMINO_PROGRAM_ID ||
      this._cluster === 'mainnet-beta' ||
      this._cluster === 'devnet'
    ) {
      return await this._rpc
        .getProgramAccounts(ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS, {
          filters: [
            { memcmp: { offset: 22n, bytes: LUT_OWNER_KEY.toString() as Base58EncodedBytes, encoding: 'base58' } },
          ],
          dataSlice: { length: 0, offset: 0 },
        })
        .send()
        .then((res) => res.map((raw) => raw.pubkey));
    }
    return [];
  };

  getMainLookupTable = async (): Promise<Account<AddressLookupTable>[] | undefined> => {
    const pks = await this.getMainLookupTablePks();
    if (
      this.getProgramID() === STAGING_KAMINO_PROGRAM_ID ||
      this._cluster === 'mainnet-beta' ||
      this._cluster === 'devnet'
    ) {
      return fetchMultipleLookupTableAccounts(this._rpc, pks);
    } else {
      return undefined;
    }
  };

  getInitLookupTableIx = async (authority: TransactionSigner, slot?: Slot): Promise<[Instruction, Address]> => {
    let recentSlot: Slot;
    if (slot) {
      recentSlot = slot;
    } else {
      recentSlot = await this._rpc.getSlot({ commitment: 'finalized' }).send();
    }

    const pda = await findAddressLookupTablePda({ authority: authority.address, recentSlot });
    const createLookupTableIx = getCreateLookupTableInstruction({
      authority: authority,
      payer: authority,
      address: pda,
      recentSlot: recentSlot,
    });
    return [createLookupTableIx, pda[0]];
  };

  getPopulateLookupTableIxs = async (
    authority: TransactionSigner,
    lookupTable: Address,
    strategy: Address | StrategyWithAddress
  ): Promise<Instruction[]> => {
    const { strategy: strategyState, address } = await this.getStrategyStateIfNotFetched(strategy);
    if (!strategyState) {
      throw Error(`Could not fetch strategy state with pubkey ${strategy.toString()}`);
    }
    const { treasuryFeeTokenAVault, treasuryFeeTokenBVault, treasuryFeeVaultAuthority } =
      await this.getTreasuryFeeVaultPDAs(strategyState.tokenAMint, strategyState.tokenBMint);

    const accountsToBeInserted: Address[] = [
      address,
      strategyState.adminAuthority,
      strategyState.globalConfig,
      strategyState.baseVaultAuthority,
      strategyState.pool,
      strategyState.tokenAMint,
      strategyState.tokenBMint,
      strategyState.tokenAVault,
      strategyState.tokenBVault,
      strategyState.poolTokenVaultA,
      strategyState.poolTokenVaultB,
      strategyState.tokenAMint,
      strategyState.sharesMint,
      strategyState.sharesMintAuthority,
      treasuryFeeTokenAVault,
      treasuryFeeTokenBVault,
      treasuryFeeVaultAuthority,
    ];

    return this.getAddLookupTableEntriesIxs(authority, lookupTable, accountsToBeInserted);
  };

  getAddLookupTableEntriesIxs = (
    authority: TransactionSigner,
    lookupTable: Address,
    entries: Address[]
  ): Instruction[] => {
    const chunkSize = 20;
    const txs: Instruction[] = [];
    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      txs.push(
        getExtendLookupTableInstruction({
          authority,
          payer: authority,
          address: lookupTable,
          addresses: chunk,
        })
      );
    }
    return txs;
  };

  getLookupTable = async (tablePk: Address): Promise<Account<AddressLookupTable>> => {
    const lut = await fetchMaybeAddressLookupTable(this._rpc, tablePk);
    if (!lut.exists) {
      throw new Error(`Could not get lookup table ${tablePk}`);
    }
    return lut;
  };

  setupStrategyLookupTable = async (
    authority: TransactionSigner,
    strategy: Address | StrategyWithAddress,
    slot?: Slot
  ): Promise<{
    lookupTable: Address;
    createLookupTableIx: Instruction;
    populateLookupTableIxs: Instruction[];
    updateStrategyLookupTableIx: Instruction;
  }> => {
    const [createLookupTableIx, lookupTable] = await this.getInitLookupTableIx(authority, slot);
    const populateLookupTableIxs = await this.getPopulateLookupTableIxs(authority, lookupTable, strategy);

    const strategyPk = typeof strategy === 'string' && isAddress(strategy) ? strategy : strategy.address;
    const updateStrategyLookupTableIx = await getUpdateStrategyConfigIx(
      authority,
      this._globalConfig,
      strategyPk,
      new UpdateLookupTable(),
      new Decimal(0),
      this.getProgramID(),
      lookupTable
    );

    return {
      lookupTable,
      createLookupTableIx,
      populateLookupTableIxs,
      updateStrategyLookupTableIx,
    };
  };

  // todo(silviu): implement this
  // getEstimatedApyAndVolumeOnRange = async (
  //   dex: Dex,
  //   pool: Address,
  //   lowerPrice: Decimal,
  //   upperPrice: Decimal,
  //   _startDate: Date,
  //   _endDate: Date
  // ): Promise<GenericPositionRangeInfo> => {
  //   if (dex === 'ORCA') {
  //     return this.getEstimatedApyAndVolumeOnRangeOrca();
  //   } else if (dex === 'RAYDIUM') {
  //     return this.getEstimatedApyAndVolumeOnRangeRaydium();
  //   } else if (dex === 'METEORA') {
  //     return this.getEstimatedApyAndVolumeOnRangeMeteora();
  //   } else {
  //     throw new Error(`Dex ${dex} is not supported`);
  //   }
  // };

  getEstimatedApyAndVolumeOnRangeOrca = async () // pool: Address,
  // lowerPrice: Decimal,
  // upperPrice: Decimal
  : Promise<GenericPositionRangeInfo> => {
    // todo
    return {
      estimatedApy: new Decimal(0),
      estimatedVolume: new Decimal(0),
    };
  };

  getEstimatedApyAndVolumeOnRangeRaydium = async () // pool: Address,
  // lowerPrice: Decimal,
  // upperPrice: Decimal
  : Promise<GenericPositionRangeInfo> => {
    // todo
    return {
      estimatedApy: new Decimal(0),
      estimatedVolume: new Decimal(0),
    };
  };

  getEstimatedApyAndVolumeOnRangeMeteora = async () // pool: Address,
  // lowerPrice: Decimal,
  // upperPrice: Decimal
  : Promise<GenericPositionRangeInfo> => {
    // todo
    return {
      estimatedApy: new Decimal(0),
      estimatedVolume: new Decimal(0),
    };
  };

  getManualPoolSimulatedValues = async (params: {
    pool: Address;
    priceLower: Decimal;
    priceUpper: Decimal;
    startDate: string;
    endDate: string;
  }): Promise<PoolSimulationResponse> => {
    const { pool, startDate, endDate, priceLower, priceUpper } = params;
    return simulateManualPool({ poolAddress: pool, priceUpper, priceLower, depositDate: startDate, endDate });
  };

  getPercentagePoolSimulatedValues = async (
    params: SimulationPercentagePoolParameters
  ): Promise<PoolSimulationResponse> => {
    const { resetRangeWidthPercLower = 1, resetRangeWidthPercUpper = 1, ...rest } = params;
    return simulatePercentagePool({ resetRangeWidthPercLower, resetRangeWidthPercUpper, ...rest });
  };

  /**
   * Get a list of transactions to rebalance a Kamino strategy.
   * @param admin pool admin
   * @param strategy strategy pubkey or object
   * @param newPosition new liquidity position account pubkey
   * @param priceLower new position's lower price of the range
   * @param priceUpper new position's upper price of the range
   * @returns list of transactions to rebalance (executive withdraw, collect fees/rewards, open new position, invest)
   */
  rebalance = async (
    admin: TransactionSigner,
    strategy: Address | StrategyWithAddress,
    newPosition: TransactionSigner,
    priceLower: Decimal,
    priceUpper: Decimal
  ): Promise<Instruction[]> => {
    // todo: refactor this to return an object, not a list
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);

    const ixs: Instruction[] = [];

    // if there are no invested tokens we don't need to collect fees and rewards
    const stratTokenBalances = await this.getStrategyTokensBalances(strategyWithAddress.strategy);
    if (
      strategyWithAddress.strategy.strategyDex.toNumber() === dexToNumber('ORCA') ||
      stratTokenBalances.invested.a.greaterThan(ZERO) ||
      stratTokenBalances.invested.b.greaterThan(ZERO)
    ) {
      ixs.push(await this.collectFeesAndRewards(strategyWithAddress, admin));
    }

    ixs.push(
      await this.openPosition(admin, strategyWithAddress, newPosition, priceLower, priceUpper, new Rebalancing())
    );

    return ixs;
  };

  /**
   * Get a list of user's Kamino strategy positions
   * @param wallet user wallet address
   * @param strategyFilters
   * @returns list of kamino strategy positions
   */
  getUserPositions = async (
    wallet: Address,
    strategyFilters: StrategiesFilters = { strategyCreationStatus: 'LIVE' }
  ): Promise<KaminoPosition[]> => {
    const userTokenAccounts = await this.getAllTokenAccounts(wallet);
    const liveStrategies = await this.getAllStrategiesWithFilters(strategyFilters);
    const positions: KaminoPosition[] = [];
    for (const tokenAccount of userTokenAccounts) {
      const accountData = tokenAccount.account.data;
      if ('parsed' in accountData) {
        // @ts-ignore
        const strategy = liveStrategies.find((x) => x.strategy.sharesMint === accountData.parsed.info.mint);
        if (strategy) {
          positions.push({
            shareMint: strategy.strategy.sharesMint,
            strategy: strategy.address,
            // @ts-ignore
            sharesAmount: new Decimal(accountData.parsed.info.tokenAmount.uiAmountString),
            strategyDex: numberToDex(strategy.strategy.strategyDex.toNumber()),
          });
        }
      }
    }
    return positions;
  };

  /**
   * Get a list of user's Kamino strategy positions
   * @param wallet user wallet address
   * @param strategiesWithShareMintsMap
   * @param strategiesWithAddressMap
   * @returns list of kamino strategy positions
   */
  getUserPositionsByStrategiesMap = async (
    wallet: Address,
    strategiesWithShareMintsMap: Map<Address, KaminoStrategyWithShareMint>,
    strategiesWithAddressMap?: Map<Address, WhirlpoolStrategy>
  ): Promise<KaminoPosition[]> => {
    const tokenAccounts = await this._rpc
      .getTokenAccountsByOwner(wallet, { programId: TOKEN_PROGRAM_ADDRESS }, { encoding: 'jsonParsed' })
      .send();

    const mints = tokenAccounts.value.map((accountInfo) => {
      return accountInfo.account.data.parsed.info.mint;
    });
    const mintInfos = await batchFetch(mints, async (chunk) => await fetchAllMint(this.getConnection(), chunk));

    const kaminoStrategyAddresses: Address[] = [];
    const kaminoAccountInfos: Array<JsonParsedTokenAccount> = [];

    for (let i = 0; i < mints.length; i++) {
      const mint = mints[i];
      const mintInfo = mintInfos[i];
      const accountInfo = tokenAccounts.value[i];

      if (!mint || !mintInfo || !accountInfo) continue;

      const [expectedMintAuthority] = await getProgramDerivedAddress({
        seeds: [Buffer.from('authority'), addressEncoder.encode(mint)],
        programAddress: this.getProgramID(),
      });

      if (isSome(mintInfo.data.mintAuthority) && mintInfo.data.mintAuthority.value === expectedMintAuthority) {
        const shareMintAddress = tokenAccounts.value[i].account.data.parsed.info.mint;
        const addr = strategiesWithShareMintsMap.get(shareMintAddress)?.address;

        if (!addr) continue;

        kaminoStrategyAddresses.push(addr);
        kaminoAccountInfos.push(accountInfo.account.data.parsed.info);
      }
    }

    let strategies: (WhirlpoolStrategy | null)[] = strategiesWithAddressMap
      ? Array.from(strategiesWithAddressMap.values())
      : [];
    const missingStrategies = kaminoStrategyAddresses.filter(
      (x) => !strategiesWithAddressMap || !strategiesWithAddressMap.has(x)
    );
    const missingStrategiesState = await batchFetch(missingStrategies, (chunk) => this.getStrategies(chunk));
    strategies = strategies.concat(missingStrategiesState);

    const positions: KaminoPosition[] = [];

    for (const index of strategies.keys()) {
      const strategy = strategies[index];
      const accountData = kaminoAccountInfos[index];
      const address = kaminoStrategyAddresses[index];

      if (!strategy || !accountData) {
        continue;
      }

      positions.push({
        shareMint: strategy.sharesMint,
        strategy: address,
        sharesAmount: new Decimal(accountData.tokenAmount.uiAmountString),
        strategyDex: numberToDex(strategy.strategyDex.toNumber()),
      });
    }

    return positions;
  };

  /**
   * Get Kamino strategy vault APY/APR
   * @param strategy strategy pubkey or onchain state
   * @param orcaPools not required, but you can add orca whirlpools if you're caching them, and we don't refetch every time
   * @param raydiumPools not required, but you can add raydium pools if you're caching them, and we don't refetch every time
   */
  getStrategyAprApy = async (
    strategy: Address | StrategyWithAddress,
    orcaPools?: WhirlpoolAPIResponse[],
    raydiumPools?: Pool[]
  ): Promise<WhirlpoolAprApy> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);
    const dex = Number(strategyState.strategyDex);
    const isOrca = dexToNumber('ORCA') === dex;
    const isRaydium = dexToNumber('RAYDIUM') === dex;
    const isMeteora = dexToNumber('METEORA') === dex;
    if (strategyState.position === DEFAULT_PUBLIC_KEY) {
      return {
        totalApr: ZERO,
        feeApr: ZERO,
        totalApy: ZERO,
        feeApy: ZERO,
        priceUpper: ZERO,
        priceLower: ZERO,
        rewardsApr: [],
        rewardsApy: [],
        poolPrice: ZERO,
        strategyOutOfRange: false,
      };
    }
    if (isOrca) {
      const prices = await this.getAllPrices();
      const collateralInfos = await this.getCollateralInfos();
      return this._orcaService.getStrategyWhirlpoolPoolAprApy(strategyState, collateralInfos, prices);
    }
    if (isRaydium) {
      return this._raydiumService.getStrategyWhirlpoolPoolAprApy(strategyState, raydiumPools);
    }
    if (isMeteora) {
      return this._meteoraService.getStrategyMeteoraPoolAprApy(strategyState);
    }
    throw Error(`Strategy dex ${dex} not supported`);
  };

  getStrategyPerformanceFees = async (
    strategy: Address | StrategyWithAddress,
    globalConfig?: GlobalConfig
  ): Promise<PerformanceFees> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);

    const globalConfigState = globalConfig || (await this.getGlobalConfigState(strategyState.globalConfig));

    if (globalConfigState === null) {
      throw new Error(`Unable to fetch GlobalConfig with Pubkey ${strategyState.globalConfig}`);
    }
    const globalConfigMinPerformanceFee = new Decimal(globalConfigState.minPerformanceFeeBps.toString());

    const strategyFeesFee = new Decimal(strategyState.feesFee.toString());
    const strategyReward0Fee = new Decimal(strategyState.reward0Fee.toString());
    const strategyReward1Fee = new Decimal(strategyState.reward1Fee.toString());
    const strategyReward2Fee = new Decimal(strategyState.reward2Fee.toString());

    return {
      feesFeeBPS: Decimal.max(strategyFeesFee, globalConfigMinPerformanceFee),
      reward0FeeBPS: Decimal.max(strategyReward0Fee, globalConfigMinPerformanceFee),
      reward1FeeBPS: Decimal.max(strategyReward1Fee, globalConfigMinPerformanceFee),
      reward2FeeBPS: Decimal.max(strategyReward2Fee, globalConfigMinPerformanceFee),
    };
  };

  getLiquidityDistributionRaydiumPool = (
    pool: Address,
    keepOrder: boolean = true,
    lowestTick?: number,
    highestTick?: number
  ): Promise<LiquidityDistribution> => {
    return this._raydiumService.getRaydiumPoolLiquidityDistribution(pool, keepOrder, lowestTick, highestTick);
  };

  getLiquidityDistributionMeteoraPool = (
    pool: Address,
    keepOrder: boolean = true,
    lowestTick?: number,
    highestTick?: number
  ): Promise<LiquidityDistribution> => {
    return this._meteoraService.getMeteoraLiquidityDistribution(pool, keepOrder, lowestTick, highestTick);
  };

  getLiquidityDistributionOrcaWhirlpool = (
    pool: Address,
    keepOrder: boolean = true,
    lowestTick?: number,
    highestTick?: number
  ): Promise<LiquidityDistribution> => {
    return this._orcaService.getWhirlpoolLiquidityDistribution(pool, keepOrder, lowestTick, highestTick);
  };

  getLiquidityDistribution = async (
    dex: Dex,
    pool: Address,
    keepOrder: boolean = true,
    lowestTick?: number,
    highestTick?: number
  ): Promise<LiquidityDistribution> => {
    if (dex === 'ORCA') {
      return this.getLiquidityDistributionOrcaWhirlpool(pool, keepOrder, lowestTick, highestTick);
    } else if (dex === 'RAYDIUM') {
      return this.getLiquidityDistributionRaydiumPool(pool, keepOrder, lowestTick, highestTick);
    } else if (dex === 'METEORA') {
      return this.getLiquidityDistributionMeteoraPool(pool, keepOrder, lowestTick, highestTick);
    } else {
      throw Error(`Dex ${dex} not supported`);
    }
  };

  getPositionsCountForPool = async (dex: Dex, pool: Address): Promise<number> => {
    if (dex === 'ORCA') {
      return this._orcaService.getPositionsCountByPool(pool);
    } else if (dex === 'RAYDIUM') {
      return this._raydiumService.getPositionsCountByPool(pool);
    } else if (dex === 'METEORA') {
      return this._meteoraService.getPositionsCountByPool(pool);
    } else {
      throw Error(`Dex ${dex} not supported`);
    }
  };

  getStrategyTokensHoldings = async (
    strategy: Address | StrategyWithAddress,
    mode: 'DEPOSIT' | 'WITHDRAW' = 'WITHDRAW'
  ): Promise<TokenAmounts> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);

    const holdings = await this.getStrategyTokensBalances(strategyState, mode);

    const totalA = holdings.available.a.add(holdings.invested.a);
    const totalB = holdings.available.b.add(holdings.invested.b);

    return { a: totalA, b: totalB };
  };

  /**
   * Get ratio of total_a_in_strategy/total_b_in_strategy; if the total_b_in_strategy is 0 throws;
   * @param strategy
   * @param amountA
   */
  getStrategyTokensRatio = async (strategy: Address | StrategyWithAddress): Promise<Decimal> => {
    const totalHoldings = await this.getStrategyTokensHoldings(strategy);
    return totalHoldings.a.div(totalHoldings.b);
  };

  calculateAmountsToBeDepositedWithSwap = async (
    strategy: Address | StrategyWithAddress,
    tokenAAmountUserDeposit: Decimal,
    tokenBAmountUserDeposit: Decimal,
    profiler: ProfiledFunctionExecution = noopProfiledFunctionExecution,
    priceAInB?: Decimal
  ): Promise<DepositAmountsForSwap> => {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    const strategyState = strategyWithAddress.strategy;

    if (!priceAInB) {
      priceAInB = await this.getCurrentPrice(strategyWithAddress);
    }
    const priceBInA = new Decimal(1).div(priceAInB);

    const tokenADecimals = strategyState.tokenAMintDecimals.toNumber();
    const tokenBDecimals = strategyState.tokenBMintDecimals.toNumber();
    const tokenADecimalsDiff = tokenADecimals - tokenBDecimals;
    const tokenAAddDecimals = tokenADecimalsDiff > 0 ? 0 : Math.abs(tokenADecimalsDiff);
    const tokenBAddDecimals = tokenADecimalsDiff > 0 ? Math.abs(tokenADecimalsDiff) : 0;

    const aAmount = tokenAAmountUserDeposit;
    const bAmount = tokenBAmountUserDeposit;

    const [aAmounts, bAmounts] = await profiler(
      this.calculateAmountsRatioToBeDeposited(strategyWithAddress, undefined, profiler),
      'C-calculateDepositRatio',
      []
    );

    const orcaAmountA = aAmounts.div(new Decimal(10).pow(tokenADecimals));
    const orcaAmountB = bAmounts.div(new Decimal(10).pow(tokenBDecimals));

    // multiply by tokens delta to make sure that both values uses the same about of decimals
    const totalUserDepositInA = aAmount
      .mul(10 ** tokenAAddDecimals)
      .add(bAmount.mul(10 ** tokenBAddDecimals).mul(priceBInA));

    // if the strategy is out of range we will deposit only one token so we will need to swap everything to that token
    if (orcaAmountA.eq(ZERO)) {
      const requiredAAmountToDeposit = ZERO;
      const requiredBAmountToDeposit = totalUserDepositInA.mul(priceAInB);

      const tokenAToSwapAmount = requiredAAmountToDeposit.sub(tokenAAmountUserDeposit);
      const tokenBToSwapAmount = requiredBAmountToDeposit.sub(tokenBAmountUserDeposit);

      const depositAmountsForSwap: DepositAmountsForSwap = {
        requiredAAmountToDeposit,
        requiredBAmountToDeposit,
        tokenAToSwapAmount,
        tokenBToSwapAmount,
      };

      return depositAmountsForSwap;
    }

    if (orcaAmountB.eq(ZERO)) {
      const requiredAAmountToDeposit = totalUserDepositInA;
      const requiredBAmountToDeposit = ZERO;

      const tokenAToSwapAmount = requiredAAmountToDeposit.sub(tokenAAmountUserDeposit);
      const tokenBToSwapAmount = requiredBAmountToDeposit.sub(tokenBAmountUserDeposit);

      const depositAmountsForSwap: DepositAmountsForSwap = {
        requiredAAmountToDeposit,
        requiredBAmountToDeposit,
        tokenAToSwapAmount,
        tokenBToSwapAmount,
      };

      return depositAmountsForSwap;
    }
    let ratio = orcaAmountA.div(orcaAmountB);
    ratio = ratio.div(priceBInA);

    const requiredAAmountToDeposit = totalUserDepositInA
      .mul(ratio)
      .div(ratio.add(1))
      .div(10 ** tokenAAddDecimals);
    const requiredBAmountToDeposit = totalUserDepositInA
      .sub(requiredAAmountToDeposit.mul(10 ** tokenAAddDecimals))
      .div(10 ** tokenBAddDecimals)
      .mul(priceAInB);

    const tokenAToSwapAmount = requiredAAmountToDeposit.sub(tokenAAmountUserDeposit);
    const tokenBToSwapAmount = requiredBAmountToDeposit.sub(tokenBAmountUserDeposit);

    const depositAmountsForSwap: DepositAmountsForSwap = {
      requiredAAmountToDeposit,
      requiredBAmountToDeposit,
      tokenAToSwapAmount,
      tokenBToSwapAmount,
    };

    return depositAmountsForSwap;
  };

  /**
   * @deprecated The method should not be used
   */
  calculateAmountsDistributionWithPriceRange = async (
    dex: Dex,
    pool: Address,
    lowerPrice: Decimal,
    upperPrice: Decimal
  ): Promise<[Decimal, Decimal]> => {
    const tokenAAmountToDeposit = new Decimal(100.0);

    if (dex === 'RAYDIUM') {
      const poolState = await PoolState.fetch(this._rpc, pool, this._raydiumService.getRaydiumProgramId());
      if (!poolState) {
        throw new Error(`Raydium poolState ${pool.toString()} is not found`);
      }
      const decimalsA = poolState.mintDecimals0;
      const decimalsB = poolState.mintDecimals1;

      const { amountA, amountB } = RaydiumLiquidityMath.getAmountsFromLiquidity(
        poolState.sqrtPriceX64,
        RaydiumSqrtPriceMath.priceToSqrtPriceX64(lowerPrice, decimalsA, decimalsB),
        RaydiumSqrtPriceMath.priceToSqrtPriceX64(upperPrice, decimalsA, decimalsB),
        new BN(100_000_000),
        true
      );

      const amountADecimal = new Decimal(amountA.toString());
      const amountBDecimal = new Decimal(amountB.toString());
      return [lamportsToNumberDecimal(amountADecimal, decimalsA), lamportsToNumberDecimal(amountBDecimal, decimalsB)];
    } else if (dex === 'ORCA') {
      const whirlpoolState = await Whirlpool.fetch(this._rpc, pool, this._orcaService.getWhirlpoolProgramId());
      if (!whirlpoolState) {
        throw new Error(`Raydium poolState ${pool.toString()} is not found`);
      }
      const tokenMintA = whirlpoolState.tokenMintA;
      const tokenMintB = whirlpoolState.tokenMintB;
      const decimalsA = await getMintDecimals(this._rpc, tokenMintA);
      const decimalsB = await getMintDecimals(this._rpc, tokenMintB);

      const tickLowerIndex = orcaGetNearestValidTickIndexFromTickIndex(
        orcaPriceToTickIndex(lowerPrice.toNumber(), decimalsA, decimalsB),
        whirlpoolState.tickSpacing
      );
      const tickUpperIndex = orcaGetNearestValidTickIndexFromTickIndex(
        orcaPriceToTickIndex(upperPrice.toNumber(), decimalsA, decimalsB),
        whirlpoolState.tickSpacing
      );

      const param: IncreaseLiquidityQuoteParam = {
        tokenA: BigInt(collToLamportsDecimal(tokenAAmountToDeposit, decimalsA).toString()),
      };

      const addLiqResult: IncreaseLiquidityQuote = getIncreaseLiquidityQuote(
        param,
        whirlpoolState,
        tickLowerIndex,
        tickUpperIndex,
        defaultSlippagePercentageBPS,
        undefined,
        undefined
      );
      return [
        lamportsToNumberDecimal(new Decimal(addLiqResult.tokenEstA.toString()), decimalsA),
        lamportsToNumberDecimal(new Decimal(addLiqResult.tokenEstB.toString()), decimalsB),
      ];
    } else if (dex === 'METEORA') {
      const poolState = await LbPair.fetch(this._rpc, pool, this._meteoraService.getMeteoraProgramId());
      if (!poolState) {
        throw new Error(`Meteora poolState ${pool.toString()} is not found`);
      }
      // const tokenMintA = poolState.tokenXMint;
      // const tokenMintB = poolState.tokenYMint;
      // const decimalsA = await getMintDecimals(this._connection, tokenMintA);
      // const decimalsB = await getMintDecimals(this._connection, tokenMintB);

      return [new Decimal(0), new Decimal(0)];
    } else {
      throw new Error('Invalid dex, use RAYDIUM or ORCA or METEORA');
    }
  };

  calculateAmountsToBeDeposited = async (
    strategy: Address | StrategyWithAddress,
    tokenAAmount?: Decimal,
    tokenBAmount?: Decimal,
    profiledFunctionExecution: ProfiledFunctionExecution = noopProfiledFunctionExecution
  ): Promise<[Decimal, Decimal]> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);
    if (strategyState.shareCalculationMethod === DOLLAR_BASED) {
      return this.calculateDepostAmountsDollarBased(strategy, tokenAAmount, tokenBAmount);
    } else if (strategyState.shareCalculationMethod === PROPORTION_BASED) {
      return this.calculateDepositAmountsProportional(strategy, tokenAAmount, tokenBAmount, profiledFunctionExecution);
    } else {
      throw new Error('Invalid share calculation method');
    }
  };

  /// Returns an amount of tokenA and an amount of tokenB that define the ratio of the amounts that can be deposited
  calculateAmountsRatioToBeDeposited = async (
    strategy: Address | StrategyWithAddress,
    holdings?: TokenAmounts,
    profiler: ProfiledFunctionExecution = noopProfiledFunctionExecution
  ): Promise<[Decimal, Decimal]> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);
    if (strategyState.shareCalculationMethod === DOLLAR_BASED) {
      return this.calculateDepostAmountsDollarBased(strategy, new Decimal(100), undefined);
    } else if (strategyState.shareCalculationMethod === PROPORTION_BASED) {
      let tokenHoldings = holdings;
      if (!tokenHoldings) {
        tokenHoldings = await profiler(this.getStrategyTokensHoldings(strategy), 'getStrategyTokensHoldings', []);
      }
      const { a, b } = tokenHoldings;
      return [a, b];
    } else {
      throw new Error('Invalid share calculation method');
    }
  };

  calculateDepositAmountsProportional = async (
    strategy: Address | StrategyWithAddress,
    tokenAAmount?: Decimal,
    tokenBAmount?: Decimal,
    profiler: ProfiledFunctionExecution = noopProfiledFunctionExecution
  ): Promise<[Decimal, Decimal]> => {
    if (!tokenAAmount && !tokenBAmount) {
      return [new Decimal(0), new Decimal(0)];
    }

    const totalHoldings = await profiler(this.getStrategyTokensHoldings(strategy), 'getStrategyTokensHoldings', []);
    // if we have no holdings, on the initial deposit we use the old method
    if (totalHoldings.a.eq(ZERO) && totalHoldings.b.eq(ZERO)) {
      return await this.calculateDepostAmountsDollarBased(strategy, tokenAAmount, tokenBAmount);
    }
    return await profiler(
      this.calculateDepositAmountsProportionalWithTotalTokens(totalHoldings, tokenAAmount, tokenBAmount),
      'C-calculateDepositAmountsProportionalWithTotalTokens',
      []
    );
  };

  private calculateDepositAmountsProportionalWithTotalTokens = async (
    totalTokens: TokenAmounts,
    tokenAAmount?: Decimal,
    tokenBAmount?: Decimal
  ): Promise<[Decimal, Decimal]> => {
    if (totalTokens.a.eq(ZERO)) {
      return [ZERO, tokenBAmount ? tokenBAmount : new Decimal(Number.MAX_VALUE)];
    }
    if (totalTokens.b.eq(ZERO)) {
      return [tokenAAmount ? tokenAAmount : new Decimal(Number.MAX_VALUE), ZERO];
    }
    const tokensRatio = totalTokens.a.div(totalTokens.b);
    if (tokenAAmount) {
      const requiredBAmount = tokenAAmount.div(tokensRatio);
      if (!tokenBAmount || tokenBAmount.gt(requiredBAmount)) {
        return [tokenAAmount, requiredBAmount];
      } else {
        const requiredAAmount = tokenBAmount.mul(tokensRatio);
        return [requiredAAmount, tokenBAmount];
      }
    } else if (tokenBAmount) {
      const requiredAMount = tokenBAmount.mul(tokensRatio);
      return [requiredAMount, tokenBAmount];
    } else {
      throw new Error('Invalid params, one of tokenAAmount or tokenBAmount must be provided');
    }
  };

  calculateDepostAmountsDollarBased = async (
    strategy: Address | StrategyWithAddress,
    tokenAAmount?: Decimal,
    tokenBAmount?: Decimal
  ): Promise<[Decimal, Decimal]> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);
    const dex = Number(strategyState.strategyDex);
    const isOrca = dexToNumber('ORCA') === dex;
    const isRaydium = dexToNumber('RAYDIUM') === dex;
    const isMeteora = dexToNumber('METEORA') === dex;
    if (isOrca) {
      const whirlpool = await Whirlpool.fetch(this._rpc, strategyState.pool, this._orcaService.getWhirlpoolProgramId());
      if (!whirlpool) {
        throw new Error(`Unable to get Orca whirlpool for pubkey ${strategyState.pool}`);
      }

      return this.calculateAmountsOrca({
        whirlpoolState: whirlpool,
        positionAddress: strategyState.position,
        tokenAAmount,
        tokenBAmount,
      });
    } else if (isRaydium) {
      return this.calculateAmountsRaydium({ strategyState, tokenAAmount, tokenBAmount });
    } else if (isMeteora) {
      return this.calculateAmountsMeteora({ strategyState, tokenAAmount, tokenBAmount });
    } else {
      throw new Error(`The strategy ${strategy.toString()} is not Orca or Raydium`);
    }
  };

  calculateAmountsOrca = async ({
    whirlpoolState,
    positionAddress,
    tokenAAmount,
    tokenBAmount,
  }: {
    whirlpoolState: Whirlpool;
    positionAddress: Address;
    tokenAAmount?: Decimal;
    tokenBAmount?: Decimal;
  }): Promise<[Decimal, Decimal]> => {
    if (!tokenAAmount && !tokenBAmount) {
      return [new Decimal(0), new Decimal(0)];
    }

    // Given A in ATA, calc how much A and B
    const defaultSlippagePercentageBPS = 10;
    const positionState = await OrcaPosition.fetch(
      this._rpc,
      positionAddress,
      this._orcaService.getWhirlpoolProgramId()
    );
    if (!positionState) {
      throw new Error(`Unable to get Orca position for pubkey ${positionAddress}`);
    }

    let computedAmounts: [Decimal, Decimal] = [new Decimal(0), new Decimal(0)];

    if (tokenAAmount) {
      const tokenAForQuote = BigInt(tokenAAmount.toString());
      const params: IncreaseLiquidityQuoteParam = {
        tokenA: tokenAForQuote,
      };
      const estimatedGivenA: IncreaseLiquidityQuote = getIncreaseLiquidityQuote(
        params,
        whirlpoolState,
        positionState.tickLowerIndex,
        positionState.tickUpperIndex,
        defaultSlippagePercentageBPS,
        undefined, // todo: use new Wirlpool state and read transfer fees
        undefined
      );
      computedAmounts = [
        new Decimal(estimatedGivenA.tokenEstA.toString()),
        new Decimal(estimatedGivenA.tokenEstB.toString()),
      ];
    }

    if (tokenBAmount && computedAmounts[1] > tokenBAmount) {
      const tokenBForQuote = BigInt(tokenBAmount.toString());
      const params: IncreaseLiquidityQuoteParam = {
        tokenB: tokenBForQuote,
      };
      const estimatedGivenB: IncreaseLiquidityQuote = getIncreaseLiquidityQuote(
        params,
        whirlpoolState,
        positionState.tickLowerIndex,
        positionState.tickUpperIndex,
        defaultSlippagePercentageBPS,
        undefined, // todo: use new Wirlpool state and read transfer fees
        undefined
      );
      computedAmounts = [
        new Decimal(estimatedGivenB.tokenEstA.toString()),
        new Decimal(estimatedGivenB.tokenEstB.toString()),
      ];
    }

    return computedAmounts;
  };

  calculateAmountsRaydium = async ({
    strategyState,
    tokenAAmount,
    tokenBAmount,
  }: {
    strategyState: WhirlpoolStrategy;
    tokenAAmount?: Decimal;
    tokenBAmount?: Decimal;
  }): Promise<[Decimal, Decimal]> => {
    if (!tokenAAmount && !tokenBAmount) {
      return [new Decimal(0), new Decimal(0)];
    }

    const poolState = await PoolState.fetch(this._rpc, strategyState.pool, this._raydiumService.getRaydiumProgramId());
    const position = await PersonalPositionState.fetch(
      this._rpc,
      strategyState.position,
      this._raydiumService.getRaydiumProgramId()
    );

    if (!position) {
      throw new Error(`position ${strategyState.position.toString()} is not found`);
    }

    if (!poolState) {
      throw new Error(`poolState ${strategyState.pool.toString()} is not found`);
    }

    if (tokenAAmount && tokenBAmount && tokenAAmount.gt(0) && tokenBAmount.gt(0)) {
      const liquidity = RaydiumLiquidityMath.getLiquidityFromTokenAmounts(
        poolState.sqrtPriceX64,
        RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(position.tickLowerIndex),
        RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(position.tickUpperIndex),
        new BN(tokenAAmount.toString()),
        new BN(tokenBAmount.toString())
      );

      const { amountA, amountB } = RaydiumLiquidityMath.getAmountsFromLiquidity(
        poolState.sqrtPriceX64,
        RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(position.tickLowerIndex),
        RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(position.tickUpperIndex),
        liquidity,
        true
      );

      return [new Decimal(amountA.toString()), new Decimal(amountB.toString())];
    } else {
      const primaryTokenAmount = tokenAAmount || tokenBAmount;
      const secondaryTokenAmount = tokenAAmount ? tokenBAmount : tokenAAmount;

      const { amountA, amountB } = RaydiumLiquidityMath.getAmountsFromLiquidity(
        poolState.sqrtPriceX64,
        RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(position.tickLowerIndex),
        RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(position.tickUpperIndex),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        new BN(primaryTokenAmount!.plus(secondaryTokenAmount || 0)!.toString()), // safe to use ! here because we check in the beginning that at least one of the amounts are not undefined;
        true
      );

      const amountADecimal = new Decimal(amountA.toString());
      const amountBDecimal = new Decimal(amountB.toString());
      const ratio = amountADecimal.div(amountBDecimal);
      if (tokenAAmount === undefined || tokenAAmount.eq(ZERO)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return [tokenBAmount!.mul(ratio), tokenBAmount!];
      }

      if (tokenBAmount === undefined || tokenBAmount.eq(ZERO)) {
        return [tokenAAmount, tokenAAmount.div(ratio)];
      }
    }

    return [new Decimal(0), new Decimal(0)];
  };

  calculateAmountsMeteora = async ({
    strategyState,
    tokenAAmount,
    tokenBAmount,
  }: {
    strategyState: WhirlpoolStrategy;
    tokenAAmount?: Decimal;
    tokenBAmount?: Decimal;
  }): Promise<[Decimal, Decimal]> => {
    if (!tokenAAmount && !tokenBAmount) {
      return [new Decimal(0), new Decimal(0)];
    }

    const poolState = await LbPair.fetch(this._rpc, strategyState.pool, this._meteoraService.getMeteoraProgramId());
    if (!poolState) {
      throw new Error(`poolState ${strategyState.pool.toString()} is not found`);
    }

    // TODO: this is just a simple approximation, but it's used only for the first deposit.
    if (tokenAAmount && tokenBAmount && tokenAAmount.gt(0) && tokenBAmount.gt(0)) {
      // Use everything that is given in case there are both tokens
      return [tokenAAmount, tokenBAmount];
    } else {
      const binArrayIndex = binIdToBinArrayIndex(new BN(poolState.activeId));
      const [binArrayPk] = await deriveBinArray(
        strategyState.pool,
        binArrayIndex,
        this._meteoraService.getMeteoraProgramId()
      );
      const binArray = await BinArray.fetch(this._rpc, binArrayPk, this._meteoraService.getMeteoraProgramId());
      if (!binArray) {
        throw new Error(`bin array ${binArrayPk.toString()} is not found`);
      }
      const bin = getBinFromBinArray(poolState.activeId, binArray);
      let amountADecimal = new Decimal(0);
      let amountBDecimal = new Decimal(0);
      if (bin) {
        if (!bin.amountX.eq(new BN(0))) {
          amountADecimal = new Decimal(bin.amountX.toString());
        }
        if (!bin.amountY.eq(new BN(0))) {
          amountBDecimal = new Decimal(bin.amountY.toString());
        }
      } else {
        throw new Error(`bin ${poolState.activeId.toString()} is not found`);
      }

      if (amountADecimal.eq(ZERO) && amountBDecimal.eq(ZERO)) {
        const decimalsA = await getMintDecimals(this._rpc, strategyState.tokenAMint);
        const decimalsB = await getMintDecimals(this._rpc, strategyState.tokenBMint);
        const poolPrice = getPriceOfBinByBinIdWithDecimals(poolState.activeId, poolState.binStep, decimalsA, decimalsB);
        return [tokenAAmount || tokenBAmount!.div(poolPrice), tokenBAmount || tokenAAmount!.mul(poolPrice)];
      }

      if (amountBDecimal.eq(ZERO)) {
        return [tokenAAmount!, ZERO];
      }

      if (amountADecimal.eq(ZERO)) {
        return [ZERO, tokenBAmount!];
      }

      const ratio = amountADecimal.div(amountBDecimal);
      if (tokenAAmount === undefined || tokenAAmount.eq(ZERO)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const amountA = tokenBAmount!.mul(ratio) || new Decimal(0);
        return [amountA, tokenBAmount!];
      }

      if (tokenBAmount === undefined || tokenBAmount.eq(ZERO)) {
        const amountB = tokenAAmount.div(ratio) || new Decimal(0);
        return [tokenAAmount, amountB];
      }
    }

    return [new Decimal(0), new Decimal(0)];
  };

  /**
   * @deprecated The method should not be used
   */
  getDepositRatioFromTokenA = async (
    strategy: Address | StrategyWithAddress,
    amountA: BN
  ): Promise<{ amountSlippageA: BN; amountSlippageB: BN }> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);
    const dex = Number(strategyState.strategyDex);

    const isOrca = dexToNumber('ORCA') === dex;
    const isRaydium = dexToNumber('RAYDIUM') === dex;
    const isMeteora = dexToNumber('METEORA') === dex;

    if (isOrca) {
      return this.getDepositRatioFromAOrca(strategy, amountA);
    }
    if (isRaydium) {
      return this.getDepositRatioFromARaydium(strategy, amountA);
    }
    if (isMeteora) {
      return this.getDepositRatioFromAMeteora(strategy);
    }
    throw Error(`Strategy dex ${dex} not supported`);
  };

  /**
   * @deprecated The method should not be used
   */
  getDepositRatioFromTokenB = async (
    strategy: Address | StrategyWithAddress,
    amountB: BN
  ): Promise<{ amountSlippageA: BN; amountSlippageB: BN }> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);
    const dex = Number(strategyState.strategyDex);

    const isOrca = dexToNumber('ORCA') === dex;
    const isRaydium = dexToNumber('RAYDIUM') === dex;
    const isMeteora = dexToNumber('METEORA') === dex;

    if (isOrca) {
      return this.getDepositRatioFromBOrca(strategy, amountB);
    }
    if (isRaydium) {
      return this.getDepositRatioFromBRaydium(strategy, amountB);
    }
    if (isMeteora) {
      return this.getDepositRatioFromBMeteora(strategy);
    }
    throw Error(`Strategy dex ${dex} not supported`);
  };

  /**
   * Get the on-chain state of the terms&conditions signature for the owner
   * @param owner
   */
  async getUserTermsSignatureState(owner: Address): Promise<TermsSignature | null> {
    const pdaSeed = [Buffer.from('signature'), addressEncoder.encode(owner)];
    const [signatureStateKey, _signatureStateBump] = await getProgramDerivedAddress({
      seeds: pdaSeed,
      programAddress: this.getProgramID(),
    });

    return await TermsSignature.fetch(this._rpc, signatureStateKey, this.getProgramID());
  }

  /**
   * Get the instruction to store the on chain owner signature of terms&conditions
   * @param owner
   * @param signature
   */
  async getUserTermsSignatureIx(owner: TransactionSigner, signature: Uint8Array): Promise<Instruction> {
    const pdaSeed = [Buffer.from('signature'), addressEncoder.encode(owner.address)];
    const [signatureStateKey] = await getProgramDerivedAddress({ seeds: pdaSeed, programAddress: this.getProgramID() });
    const args: SignTermsArgs = {
      signature: Array.from(signature),
    };

    const accounts: SignTermsAccounts = {
      owner: owner,
      ownerSignatureState: signatureStateKey,
      systemProgram: SYSTEM_PROGRAM_ADDRESS,
      rent: SYSVAR_RENT_ADDRESS,
    };

    return signTerms(args, accounts, undefined, this.getProgramID());
  }

  private async getDepositRatioFromAOrca(
    strategy: Address | StrategyWithAddress,
    amountA: BN
  ): Promise<{ amountSlippageA: BN; amountSlippageB: BN }> {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);

    const whirlpool = await Whirlpool.fetch(this._rpc, strategyState.pool, this._orcaService.getWhirlpoolProgramId());
    if (!whirlpool) {
      throw Error(`Could not fetch whirlpool state with pubkey ${strategyState.pool.toString()}`);
    }

    const position = await OrcaPosition.fetch(
      this._rpc,
      strategyState.position,
      this._orcaService.getWhirlpoolProgramId()
    );
    if (!position) {
      throw new Error(`Whirlpool position ${strategyState.position} does not exist`);
    }

    const params: IncreaseLiquidityQuoteParam = {
      tokenA: BigInt(amountA.toString()),
    };

    const quote: IncreaseLiquidityQuote = getIncreaseLiquidityQuote(
      params,
      whirlpool,
      position.tickLowerIndex,
      position.tickUpperIndex,
      defaultSlippagePercentageBPS,
      undefined,
      undefined
    );

    return { amountSlippageA: new BN(quote.tokenEstA.toString()), amountSlippageB: new BN(quote.tokenEstB.toString()) };
  }

  private async getDepositRatioFromAMeteora(
    strategy: Address | StrategyWithAddress
  ): Promise<{ amountSlippageA: BN; amountSlippageB: BN }> {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);

    const poolStatePromise = LbPair.fetch(this._rpc, strategyState.pool, this._meteoraService.getMeteoraProgramId());
    const positionPromise = PositionV2.fetch(
      this._rpc,
      strategyState.position,
      this._meteoraService.getMeteoraProgramId()
    );

    const [poolState, _position] = await Promise.all([poolStatePromise, positionPromise]);
    if (!poolState) {
      throw Error(`Could not fetch lb pair state with pubkey ${strategyState.pool.toString()}`);
    }

    return { amountSlippageA: ZERO_BN, amountSlippageB: ZERO_BN };
  }

  private async getDepositRatioFromBMeteora(
    strategy: Address | StrategyWithAddress
  ): Promise<{ amountSlippageA: BN; amountSlippageB: BN }> {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);

    const [poolState, _position] = await Promise.all([
      LbPair.fetch(this._rpc, strategyState.pool, this._meteoraService.getMeteoraProgramId()),
      PositionV2.fetch(this._rpc, strategyState.position, this._meteoraService.getMeteoraProgramId()),
    ]);

    if (!poolState) {
      throw Error(`Could not fetch lb pair state with pubkey ${strategyState.pool.toString()}`);
    }

    return { amountSlippageA: ZERO_BN, amountSlippageB: ZERO_BN };
  }

  private getDepositRatioFromBOrca = async (
    strategy: Address | StrategyWithAddress,
    amountB: BN
  ): Promise<{ amountSlippageA: BN; amountSlippageB: BN }> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);

    const whirlpool = await Whirlpool.fetch(this._rpc, strategyState.pool, this._orcaService.getWhirlpoolProgramId());
    if (!whirlpool) {
      throw Error(`Could not fetch whirlpool state with pubkey ${strategyState.pool.toString()}`);
    }

    const position = await OrcaPosition.fetch(
      this._rpc,
      strategyState.position,
      this._orcaService.getWhirlpoolProgramId()
    );
    if (!position) {
      throw new Error(`Whirlpool position ${strategyState.position} does not exist`);
    }

    const param: IncreaseLiquidityQuoteParam = {
      tokenB: BigInt(amountB.toString()),
    };

    const quote: IncreaseLiquidityQuote = getIncreaseLiquidityQuote(
      param,
      whirlpool,
      position.tickLowerIndex,
      position.tickUpperIndex,
      defaultSlippagePercentageBPS,
      undefined,
      undefined
    );

    return { amountSlippageA: new BN(quote.tokenEstA.toString()), amountSlippageB: new BN(quote.tokenEstB.toString()) };
  };

  private getDepositRatioFromARaydium = async (
    strategy: Address | StrategyWithAddress,
    amountA: BN
  ): Promise<{ amountSlippageA: BN; amountSlippageB: BN }> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);

    const poolState = await PoolState.fetch(this._rpc, strategyState.pool, this._raydiumService.getRaydiumProgramId());
    const positionState = await PersonalPositionState.fetch(
      this._rpc,
      strategyState.position,
      this._raydiumService.getRaydiumProgramId()
    );

    if (!positionState) {
      throw new Error(`Raydium position ${strategyState.position.toString()} could not be found.`);
    }
    if (!poolState) {
      throw new Error(`Raydium pool ${strategyState.pool.toString()} could not be found.`);
    }

    const lowerSqrtPriceX64 = RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(positionState.tickLowerIndex);
    const upperSqrtPriceX64 = RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(positionState.tickUpperIndex);

    const liqudity = RaydiumLiquidityMath.getLiquidityFromTokenAmountA(
      lowerSqrtPriceX64,
      upperSqrtPriceX64,
      amountA,
      false
    );
    const amountsSlippage = RaydiumLiquidityMath.getAmountsFromLiquidityWithSlippage(
      poolState.sqrtPriceX64,
      lowerSqrtPriceX64,
      upperSqrtPriceX64,
      liqudity,
      true,
      false,
      1
    );

    return amountsSlippage;
  };

  private getDepositRatioFromBRaydium = async (
    strategy: Address | StrategyWithAddress,
    amountB: BN
  ): Promise<{ amountSlippageA: BN; amountSlippageB: BN }> => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);

    const poolState = await PoolState.fetch(this._rpc, strategyState.pool, this._raydiumService.getRaydiumProgramId());
    const positionState = await PersonalPositionState.fetch(
      this._rpc,
      strategyState.position,
      this._raydiumService.getRaydiumProgramId()
    );

    if (!positionState) {
      throw new Error(`Raydium position ${strategyState.position.toString()} could not be found.`);
    }
    if (!poolState) {
      throw new Error(`Raydium pool ${strategyState.pool.toString()} could not be found.`);
    }

    const lowerSqrtPriceX64 = RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(positionState.tickLowerIndex);
    const upperSqrtPriceX64 = RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(positionState.tickUpperIndex);

    const liqudity = RaydiumLiquidityMath.getLiquidityFromTokenAmountB(lowerSqrtPriceX64, upperSqrtPriceX64, amountB);
    const amountsSlippage = RaydiumLiquidityMath.getAmountsFromLiquidityWithSlippage(
      poolState.sqrtPriceX64,
      lowerSqrtPriceX64,
      upperSqrtPriceX64,
      liqudity,
      true,
      false,
      1
    );

    return amountsSlippage;
  };

  getCollateralInfo = async (address: Address): Promise<CollateralInfo[]> => {
    const collateralInfos = await CollateralInfos.fetch(this._rpc, address, this.getProgramID());
    if (collateralInfos === null) {
      throw new Error('Could not fetch CollateralInfos');
    }
    return collateralInfos.infos;
  };

  getGlobalConfigState = async (address: Address): Promise<GlobalConfig | null> => {
    return await GlobalConfig.fetch(this._rpc, address, this.getProgramID());
  };

  getWhirlpoolStrategy = async (address: Address): Promise<WhirlpoolStrategy | null> => {
    return await WhirlpoolStrategy.fetch(this._rpc, address, this.getProgramID());
  };

  getWhirlpoolStrategies = async (addresses: Address[]): Promise<Array<WhirlpoolStrategy | null>> => {
    return await WhirlpoolStrategy.fetchMultiple(this._rpc, addresses, this.getProgramID());
  };

  getStrategyVaultBalances = async (strategy: Address | StrategyWithAddress) => {
    const { strategy: strategyState } = await this.getStrategyStateIfNotFetched(strategy);
    const vaults = await Promise.all([
      this.getTokenAccountBalance(strategyState.tokenAVault),
      this.getTokenAccountBalance(strategyState.tokenBVault),
    ]);
    const aVault = vaults[0];
    const bVault = vaults[1];
    return { aVault, bVault };
  };

  getUpdateStrategyParamsIxs = async (
    strategyAdmin: TransactionSigner,
    strategy: Address,
    rebalanceType: Decimal,
    withdrawFeeBps?: Decimal,
    performanceFeeBps?: Decimal
  ): Promise<Instruction[]> => {
    const updateRebalanceTypeIx = await getUpdateStrategyConfigIx(
      strategyAdmin,
      this._globalConfig,
      strategy,
      new UpdateRebalanceType(),
      rebalanceType,
      this.getProgramID()
    );

    let updateWithdrawalFeeIx: Instruction | null = null;
    if (withdrawFeeBps) {
      updateWithdrawalFeeIx = await getUpdateStrategyConfigIx(
        strategyAdmin,
        this._globalConfig,
        strategy,
        new UpdateWithdrawFee(),
        withdrawFeeBps,
        this.getProgramID()
      );
    }

    if (!performanceFeeBps) {
      performanceFeeBps = DefaultPerformanceFeeBps;
    }
    const updateFeesFeeIx = await getUpdateStrategyConfigIx(
      strategyAdmin,
      this._globalConfig,
      strategy,
      new UpdateCollectFeesFee(),
      performanceFeeBps,
      this.getProgramID()
    );
    const updateRewards0FeeIx = await getUpdateStrategyConfigIx(
      strategyAdmin,
      this._globalConfig,
      strategy,
      new UpdateReward0Fee(),
      performanceFeeBps,
      this.getProgramID()
    );
    const updateRewards1FeeIx = await getUpdateStrategyConfigIx(
      strategyAdmin,
      this._globalConfig,
      strategy,
      new UpdateReward1Fee(),
      performanceFeeBps,
      this.getProgramID()
    );
    const updateRewards2FeeIx = await getUpdateStrategyConfigIx(
      strategyAdmin,
      this._globalConfig,
      strategy,
      new UpdateReward2Fee(),
      performanceFeeBps,
      this.getProgramID()
    );

    const ixs = [updateRebalanceTypeIx, updateFeesFeeIx, updateRewards0FeeIx, updateRewards1FeeIx, updateRewards2FeeIx];
    if (updateWithdrawalFeeIx) {
      ixs.push(updateWithdrawalFeeIx);
    }
    return ixs;
  };

  getUpdateRewardsIxs = async (
    strategyOwner: TransactionSigner,
    strategy: Address | StrategyWithAddress
  ): Promise<[Instruction, TransactionSigner][]> => {
    const strategyWithAddress = await this.getStrategyStateIfNotFetched(strategy);
    const strategyState = strategyWithAddress.strategy;
    if (!strategyState) {
      throw Error(`Could not fetch strategy state with pubkey ${strategy.toString()}`);
    }
    const globalConfig = await this.getGlobalConfigState(strategyState.globalConfig);
    if (!globalConfig) {
      throw Error(`Could not fetch global config with pubkey ${strategyState.globalConfig.toString()}`);
    }
    const collateralInfos = await this.getCollateralInfo(globalConfig.tokenInfos);
    const result: [Instruction, TransactionSigner][] = [];
    if (strategyState.strategyDex.toNumber() === dexToNumber('ORCA')) {
      const whirlpool = await Whirlpool.fetch(this._rpc, strategyState.pool, this._orcaService.getWhirlpoolProgramId());
      if (!whirlpool) {
        throw Error(`Could not fetch whirlpool state with pubkey ${strategyState.pool.toString()}`);
      }
      for (let i = 0; i < 3; i++) {
        if (whirlpool.rewardInfos[i].mint !== DEFAULT_PUBLIC_KEY) {
          const collateralId = this.getCollateralIdFromMint(whirlpool.rewardInfos[i].mint, collateralInfos);
          if (collateralId === -1) {
            throw Error(`Could not find collateral id for mint ${whirlpool.rewardInfos[i].mint.toString()}`);
          }

          const rewardVault = await generateKeyPairSigner();
          const args: UpdateRewardMappingArgs = {
            rewardIndex: i,
            collateralToken: collateralId,
          };

          const tokenProgram = await this.getAccountOwner(whirlpool.rewardInfos[i].mint);
          const accounts: UpdateRewardMappingAccounts = {
            payer: strategyOwner,
            globalConfig: strategyState.globalConfig,
            strategy: strategyWithAddress.address,
            pool: strategyState.pool,
            rewardMint: whirlpool.rewardInfos[i].mint,
            rewardVault: rewardVault,
            baseVaultAuthority: strategyState.baseVaultAuthority,
            systemProgram: SYSTEM_PROGRAM_ADDRESS,
            rent: SYSVAR_RENT_ADDRESS,
            tokenProgram,
            tokenInfos: globalConfig.tokenInfos,
          };

          const ix = updateRewardMapping(args, accounts, undefined, this.getProgramID());
          result.push([ix, rewardVault]);
        }
      }
      return result;
    } else if (strategyState.strategyDex.toNumber() === dexToNumber('RAYDIUM')) {
      const poolState = await PoolState.fetch(
        this._rpc,
        strategyState.pool,
        this._raydiumService.getRaydiumProgramId()
      );
      if (!poolState) {
        throw new Error(`Could not fetch whirlpool state with pubkey ${strategyState.pool.toString()}`);
      }
      for (let i = 0; i < 3; i++) {
        if (poolState.rewardInfos[i].tokenMint !== DEFAULT_PUBLIC_KEY) {
          const collateralId = this.getCollateralIdFromMint(poolState.rewardInfos[i].tokenMint, collateralInfos);
          if (collateralId === -1) {
            throw Error(`Could not find collateral id for mint ${poolState.rewardInfos[i].tokenMint.toString()}`);
          }

          const rewardVault = await generateKeyPairSigner();
          const args: UpdateRewardMappingArgs = {
            rewardIndex: i,
            collateralToken: collateralId,
          };

          const tokenProgram = await this.getAccountOwner(poolState.rewardInfos[i].tokenMint);
          const accounts: UpdateRewardMappingAccounts = {
            payer: strategyOwner,
            globalConfig: strategyState.globalConfig,
            strategy: strategyWithAddress.address,
            pool: strategyState.pool,
            rewardMint: poolState.rewardInfos[i].tokenMint,
            rewardVault: rewardVault,
            baseVaultAuthority: strategyState.baseVaultAuthority,
            systemProgram: SYSTEM_PROGRAM_ADDRESS,
            rent: SYSVAR_RENT_ADDRESS,
            tokenProgram,
            tokenInfos: globalConfig.tokenInfos,
          };

          const ix = updateRewardMapping(args, accounts, undefined, this.getProgramID());
          result.push([ix, rewardVault]);
        }
      }
      return result;
    } else if (strategyState.strategyDex.toNumber() === dexToNumber('METEORA')) {
      const poolState = await LbPair.fetch(this._rpc, strategyState.pool, this._meteoraService.getMeteoraProgramId());
      if (!poolState) {
        throw new Error(`Could not fetch meteora state with pubkey ${strategyState.pool.toString()}`);
      }
      for (let i = 0; i < 2; i++) {
        if (poolState.rewardInfos[i].mint !== DEFAULT_PUBLIC_KEY) {
          const collateralId = this.getCollateralIdFromMint(poolState.rewardInfos[i].mint, collateralInfos);
          if (collateralId === -1) {
            throw Error(`Could not find collateral id for mint ${poolState.rewardInfos[i].mint.toString()}`);
          }

          const rewardVault = await generateKeyPairSigner();
          const args: UpdateRewardMappingArgs = {
            rewardIndex: i,
            collateralToken: collateralId,
          };

          const tokenProgram = await this.getAccountOwner(poolState.rewardInfos[i].mint);
          const accounts: UpdateRewardMappingAccounts = {
            payer: strategyOwner,
            globalConfig: strategyState.globalConfig,
            strategy: strategyWithAddress.address,
            pool: strategyState.pool,
            rewardMint: poolState.rewardInfos[i].mint,
            rewardVault: rewardVault,
            baseVaultAuthority: strategyState.baseVaultAuthority,
            systemProgram: SYSTEM_PROGRAM_ADDRESS,
            rent: SYSVAR_RENT_ADDRESS,
            tokenProgram,
            tokenInfos: globalConfig.tokenInfos,
          };

          const ix = updateRewardMapping(args, accounts, undefined, this.getProgramID());
          result.push([ix, rewardVault]);
        }
      }
      return result;
    } else {
      throw new Error(`Dex ${strategyState.strategyDex} not supported`);
    }
  };

  /**
   * Get the instruction to create an Orca Whirlpool tick, if it does not exist
   * @param payer
   * @param pool
   * @param price
   * @return tickPubkey, (tickInstruction | undefined)
   */
  initializeTickForOrcaPool = async (
    payer: TransactionSigner,
    pool: Address | WhirlpoolWithAddress,
    price: Decimal
  ): Promise<InitPoolTickIfNeeded> => {
    const { address: poolAddress, whirlpool: whilrpoolState } = await this.getWhirlpoolStateIfNotFetched(pool);

    const decimalsA = await getMintDecimals(this._rpc, whilrpoolState.tokenMintA);
    const decimalsB = await getMintDecimals(this._rpc, whilrpoolState.tokenMintB);
    const tickIndex = orcaGetTickArrayStartTickIndex(
      orcaPriceToTickIndex(price.toNumber(), decimalsA, decimalsB),
      whilrpoolState.tickSpacing
    );
    const startTickIndex = orcaGetTickArrayStartTickIndex(tickIndex, whilrpoolState.tickSpacing);

    const [startTickIndexPk, _startTickIndexBump] = await getTickArray(
      this._orcaService.getWhirlpoolProgramId(),
      poolAddress,
      startTickIndex
    );
    const tick = await TickArray.fetch(this._rpc, startTickIndexPk, this._orcaService.getWhirlpoolProgramId());
    // initialize tick if it doesn't exist
    if (!tick) {
      const initTickArrayArgs: InitializeTickArrayArgs = {
        startTickIndex,
      };
      const initTickArrayAccounts: InitializeTickArrayAccounts = {
        whirlpool: poolAddress,
        funder: payer,
        tickArray: startTickIndexPk,
        systemProgram: SYSTEM_PROGRAM_ADDRESS,
      };
      return {
        tick: startTickIndexPk,
        initTickIx: initializeTickArray(initTickArrayArgs, initTickArrayAccounts),
      };
    }
    return {
      tick: startTickIndexPk,
      initTickIx: undefined,
    };
  };

  initializeTickForMeteoraPool = async (
    payer: TransactionSigner,
    pool: Address | LbPairWithAddress,
    price: Decimal
  ): Promise<InitPoolTickIfNeeded> => {
    const { address: poolAddress, pool: poolState } = await this.getMeteoraStateIfNotFetched(pool);

    const decimalsA = await getMintDecimals(this._rpc, poolState.tokenXMint);
    const decimalsB = await getMintDecimals(this._rpc, poolState.tokenYMint);
    const binArray = getBinIdFromPriceWithDecimals(price, poolState.binStep, true, decimalsA, decimalsB);
    const binArrayIndex = binIdToBinArrayIndex(new BN(binArray));

    const [startTickIndexPk] = await deriveBinArray(
      poolAddress,
      binArrayIndex,
      this._meteoraService.getMeteoraProgramId()
    );
    const tick = await TickArray.fetch(this._rpc, startTickIndexPk, this._meteoraService.getMeteoraProgramId());
    // initialize tick if it doesn't exist
    if (!tick) {
      const initTickArrayArgs: InitializeBinArrayArgs = {
        index: new BN(binArrayIndex),
      };
      const initTickArrayAccounts: InitializeBinArrayAccounts = {
        funder: payer,
        binArray: startTickIndexPk,
        systemProgram: SYSTEM_PROGRAM_ADDRESS,
        lbPair: poolAddress,
      };
      return {
        tick: startTickIndexPk,
        initTickIx: initializeBinArray(initTickArrayArgs, initTickArrayAccounts),
      };
    }
    return {
      tick: startTickIndexPk,
      initTickIx: undefined,
    };
  };

  public getDexProgramId(strategyState: WhirlpoolStrategy): Address {
    if (strategyState.strategyDex.toNumber() == dexToNumber('ORCA')) {
      return this._orcaService.getWhirlpoolProgramId();
    } else if (strategyState.strategyDex.toNumber() == dexToNumber('RAYDIUM')) {
      return this._raydiumService.getRaydiumProgramId();
    } else if (strategyState.strategyDex.toNumber() == dexToNumber('METEORA')) {
      return this._meteoraService.getMeteoraProgramId();
    } else {
      throw Error(`Invalid DEX ${strategyState.strategyDex.toString()}`);
    }
  }
}

export default Kamino;
