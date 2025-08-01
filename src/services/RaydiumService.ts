import {
  Account,
  address,
  Address,
  Base58EncodedBytes,
  getAddressEncoder,
  getProgramDerivedAddress,
  ProgramDerivedAddress,
  Rpc,
  SolanaRpcApi,
} from '@solana/kit';
import {
  LiquidityDistribution as RaydiumLiquidityDistribuion,
  Pool,
  RaydiumPoolsResponse,
} from './RaydiumPoolsResponse';
import { PersonalPositionState, PoolState } from '../@codegen/raydium/accounts';
import Decimal from 'decimal.js';
import { WhirlpoolAprApy } from './WhirlpoolAprApy';
import { WhirlpoolStrategy } from '../@codegen/kliquidity/accounts';
import {
  aprToApy,
  GenericPoolInfo,
  getStrategyPriceRangeRaydium,
  getTokenAccountBalanceLamports,
  LiquidityDistribution,
  LiquidityForPrice,
  optionGetValue,
  optionGetValueOrUndefined,
  solToWSol,
  toLegacyPublicKey,
  WSOL_MINT,
  ZERO,
} from '../utils';
import axios from 'axios';
import { FullPercentage } from '../utils/CreationParameters';
import { PROGRAM_ID as RAYDIUM_PROGRAM_ID } from '../@codegen/raydium/programId';
import { priceToTickIndexWithRounding } from '../utils/raydium';
import {
  ApiV3PoolInfoConcentratedItem,
  ClmmConfigLayout,
  ClmmRpcData,
  ComputeClmmPoolInfo,
  POOL_TICK_ARRAY_BITMAP_SEED,
  PoolInfoLayout,
  PoolUtils,
  PositionInfoLayout,
  ReturnTypeFetchExBitmaps,
  ReturnTypeFetchMultipleMintInfos,
  ReturnTypeGetTickPrice,
  SqrtPriceMath,
  TickArrayBitmapExtensionLayout,
  TickMath,
} from '@raydium-io/raydium-sdk-v2/lib';
import { fromLegacyPublicKey } from '@solana/compat';
import { fetchAllMint, Mint } from '@solana-program/token-2022';
import { DEFAULT_PUBLIC_KEY } from '../constants/pubkeys';

export class RaydiumService {
  private readonly _rpc: Rpc<SolanaRpcApi>;
  private readonly _raydiumProgramId: Address;

  constructor(rpc: Rpc<SolanaRpcApi>, raydiumProgramId: Address = RAYDIUM_PROGRAM_ID) {
    this._rpc = rpc;
    this._raydiumProgramId = raydiumProgramId;
  }

  getRaydiumProgramId(): Address {
    return this._raydiumProgramId;
  }

  async getRaydiumWhirlpools(): Promise<RaydiumPoolsResponse> {
    return (await axios.get<RaydiumPoolsResponse>(`https://api.kamino.finance/v2/raydium/ammPools`)).data;
  }

  async getRaydiumPoolInfo(poolPubkey: Address): Promise<ApiV3PoolInfoConcentratedItem> {
    return this.getPoolInfoFromRpc(poolPubkey.toString());
  }

  async getRaydiumPoolLiquidityDistribution(
    pool: Address,
    keepOrder: boolean = true,
    lowestTick?: number,
    highestTick?: number
  ): Promise<LiquidityDistribution> {
    const raydiumLiqDistribution = (
      await axios.get<RaydiumLiquidityDistribuion>(
        `https://api.kamino.finance/v2/raydium/positionLine/${pool.toString()}`
      )
    ).data;

    const poolState = await PoolState.fetch(this._rpc, pool);
    if (!poolState) {
      throw Error(`Raydium pool state ${pool} does not exist`);
    }

    const poolPrice = SqrtPriceMath.sqrtPriceX64ToPrice(
      poolState.sqrtPriceX64,
      poolState.mintDecimals0,
      poolState.mintDecimals1
    );

    const liqDistribution: LiquidityDistribution = {
      currentPrice: poolPrice,
      currentTickIndex: poolState.tickCurrent,
      distribution: [],
    };

    raydiumLiqDistribution.data.forEach((entry) => {
      const tickIndex = priceToTickIndexWithRounding(entry.price);
      if ((lowestTick && tickIndex < lowestTick) || (highestTick && tickIndex > highestTick)) {
        return;
      }

      // if the prevoious entry has the same tick index, add to it
      if (
        liqDistribution.distribution.length > 0 &&
        liqDistribution.distribution[liqDistribution.distribution.length - 1].tickIndex === tickIndex
      ) {
        liqDistribution.distribution[liqDistribution.distribution.length - 1].liquidity = liqDistribution.distribution[
          liqDistribution.distribution.length - 1
        ].liquidity.add(new Decimal(entry.liquidity));
      } else {
        let priceWithOrder = new Decimal(entry.price);
        if (!keepOrder) {
          priceWithOrder = new Decimal(1).div(priceWithOrder);
        }
        const liq: LiquidityForPrice = {
          price: new Decimal(priceWithOrder),
          liquidity: new Decimal(entry.liquidity),
          tickIndex,
        };
        liqDistribution.distribution.push(liq);
      }
    });

    return liqDistribution;
  }

  getStrategyWhirlpoolPoolAprApy = async (strategy: WhirlpoolStrategy, pools?: Pool[]): Promise<WhirlpoolAprApy> => {
    const position = await PersonalPositionState.fetch(this._rpc, strategy.position);
    if (!position) {
      throw Error(`Position ${strategy.position} does not exist`);
    }
    const poolState = await PoolState.fetch(this._rpc, strategy.pool);
    if (!poolState) {
      throw Error(`Raydium pool state ${strategy.pool} does not exist`);
    }

    if (!pools) {
      ({ data: pools } = await this.getRaydiumWhirlpools());
    }

    if (!pools || pools.length === 0) {
      throw Error(`Could not get Raydium amm pools from Raydium API`);
    }

    const raydiumPool = pools.filter((d) => d.id === position.poolId.toString()).shift();
    if (!raydiumPool) {
      throw Error(`Could not get find Raydium amm pool ${strategy.pool} from Raydium API`);
    }

    const priceRange = getStrategyPriceRangeRaydium(
      position.tickLowerIndex,
      position.tickUpperIndex,
      Number(poolState.tickCurrent.toString()),
      Number(strategy.tokenAMintDecimals.toString()),
      Number(strategy.tokenBMintDecimals.toString())
    );
    if (priceRange.strategyOutOfRange) {
      return {
        ...priceRange,
        rewardsApy: [],
        rewardsApr: [],
        feeApy: ZERO,
        feeApr: ZERO,
        totalApy: ZERO,
        totalApr: ZERO,
      };
    }

    const raydiumPoolInfo = await this.getRaydiumPoolInfo(strategy.pool);
    console.log('raydiumPoolInfo', raydiumPoolInfo);
    const params: {
      poolInfo: ApiV3PoolInfoConcentratedItem;
      aprType: 'day' | 'week' | 'month';
      positionTickLowerIndex: number;
      positionTickUpperIndex: number;
    } = {
      poolInfo: raydiumPoolInfo,
      aprType: 'day',
      positionTickLowerIndex: position.tickLowerIndex,
      positionTickUpperIndex: position.tickUpperIndex,
    };

    const { apr, feeApr, rewardsApr } = PoolUtils.estimateAprsForPriceRangeMultiplier(params);
    const totalApr = new Decimal(apr).div(100);
    const fee = new Decimal(feeApr).div(100);
    const rewards = rewardsApr.map((reward: number) => new Decimal(reward).div(100));

    return {
      totalApr,
      totalApy: aprToApy(totalApr, 365),
      feeApr: fee,
      feeApy: aprToApy(fee, 365),
      rewardsApr: rewards,
      rewardsApy: rewards.map((x: Decimal) => aprToApy(x, 365)),
      ...priceRange,
    };
  };

  getRaydiumPositionAprApy = async (
    poolPubkey: Address,
    priceLower: Decimal,
    priceUpper: Decimal,
    pools?: Pool[]
  ): Promise<WhirlpoolAprApy> => {
    const poolState = await PoolState.fetch(this._rpc, poolPubkey);
    if (!poolState) {
      throw Error(`Raydium pool state ${poolPubkey} does not exist`);
    }

    if (!pools) {
      ({ data: pools } = await this.getRaydiumWhirlpools());
    }

    if (!pools || pools.length === 0) {
      throw Error(`Could not get Raydium amm pools from Raydium API`);
    }

    const raydiumPool = pools.filter((d) => d.id === poolPubkey.toString()).shift();
    if (!raydiumPool) {
      throw Error(`Could not get find Raydium amm pool ${poolPubkey.toString()} from Raydium API`);
    }

    const tickLowerIndex = TickMath.getTickWithPriceAndTickspacing(
      priceLower,
      poolState.tickSpacing,
      poolState.mintDecimals0,
      poolState.mintDecimals1
    );

    const tickUpperIndex = TickMath.getTickWithPriceAndTickspacing(
      priceUpper,
      poolState.tickSpacing,
      poolState.mintDecimals0,
      poolState.mintDecimals1
    );

    const priceRange = getStrategyPriceRangeRaydium(
      tickLowerIndex,
      tickUpperIndex,
      Number(poolState.tickCurrent.toString()),
      raydiumPool.mintDecimalsA,
      raydiumPool.mintDecimalsB
    );
    if (priceRange.strategyOutOfRange) {
      return {
        ...priceRange,
        rewardsApy: [],
        rewardsApr: [],
        feeApy: ZERO,
        feeApr: ZERO,
        totalApy: ZERO,
        totalApr: ZERO,
      };
    }

    const poolInfo = await this.getRaydiumPoolInfo(poolPubkey);
    const params: {
      poolInfo: ApiV3PoolInfoConcentratedItem;
      aprType: 'day' | 'week' | 'month';
      positionTickLowerIndex: number;
      positionTickUpperIndex: number;
    } = {
      poolInfo,
      aprType: 'day',
      positionTickLowerIndex: tickLowerIndex,
      positionTickUpperIndex: tickUpperIndex,
    };

    const { apr, feeApr, rewardsApr } = PoolUtils.estimateAprsForPriceRangeMultiplier(params);
    const totalApr = new Decimal(apr).div(100);
    const fee = new Decimal(feeApr).div(100);
    const rewards = rewardsApr.map((reward: number) => new Decimal(reward).div(100));

    return {
      totalApr,
      totalApy: aprToApy(totalApr, 365),
      feeApr: fee,
      feeApy: aprToApy(fee, 365),
      rewardsApr: rewards,
      rewardsApy: rewards.map((x: Decimal) => aprToApy(x, 365)),
      ...priceRange,
    };
  };

  async getGenericPoolInfo(poolPubkey: Address, pools?: Pool[]): Promise<GenericPoolInfo> {
    const poolState = await PoolState.fetch(this._rpc, poolPubkey);
    if (!poolState) {
      throw Error(`Raydium pool state ${poolPubkey} does not exist`);
    }

    if (!pools) {
      ({ data: pools } = await this.getRaydiumWhirlpools());
    }

    if (!pools || pools.length === 0) {
      throw Error(`Could not get Raydium amm pools from Raydium API`);
    }

    const raydiumPool = pools.filter((d) => d.id === poolPubkey.toString()).shift();
    if (!raydiumPool) {
      throw Error(`Could not get find Raydium amm pool ${poolPubkey.toString()} from Raydium API`);
    }

    const poolInfo: GenericPoolInfo = {
      dex: 'RAYDIUM',
      address: poolPubkey,
      tokenMintA: poolState.tokenMint0,
      tokenMintB: poolState.tokenMint1,
      price: new Decimal(raydiumPool.price),
      feeRate: new Decimal(raydiumPool.ammConfig.tradeFeeRate).div(new Decimal(FullPercentage)),
      volumeOnLast7d: new Decimal(raydiumPool.week.volume),
      tvl: new Decimal(raydiumPool.tvl),
      tickSpacing: new Decimal(raydiumPool.ammConfig.tickSpacing),
      // todo(Silviu): get real amount of positions
      positions: new Decimal(0),
    };
    return poolInfo;
  }

  async getPositionsCountByPool(pool: Address): Promise<number> {
    const positions = await this._rpc
      .getProgramAccounts(this._raydiumProgramId, {
        commitment: 'confirmed',
        filters: [
          { dataSize: BigInt(PositionInfoLayout.span) },
          {
            memcmp: {
              bytes: pool.toString() as Base58EncodedBytes,
              offset: BigInt(PositionInfoLayout.offsetOf('poolId')),
              encoding: 'base58',
            },
          },
        ],
      })
      .send();

    return positions.length;
  }

  getTickPrice(
    tick: number,
    tokenADecimals: number,
    tokenBDecimals: number,
    baseIn: boolean = true
  ): ReturnTypeGetTickPrice {
    const tickSqrtPriceX64 = SqrtPriceMath.getSqrtPriceX64FromTick(tick);
    const tickPrice = SqrtPriceMath.sqrtPriceX64ToPrice(tickSqrtPriceX64, tokenADecimals, tokenBDecimals);

    return baseIn
      ? { tick, price: tickPrice, tickSqrtPriceX64 }
      : { tick, price: new Decimal(1).div(tickPrice), tickSqrtPriceX64 };
  }

  async getRpcClmmPoolInfo(poolId: string): Promise<ClmmRpcData> {
    const poolAccountInfo = await this._rpc
      .getAccountInfo(address(poolId), { commitment: 'confirmed', encoding: 'base64' })
      .send();
    if (!poolAccountInfo.value) {
      throw Error(`Raydium pool state ${poolId} does not exist`);
    }

    const poolState = await PoolState.fetch(this._rpc, address(poolId));
    if (!poolState) {
      throw Error(`Raydium pool state ${poolId} does not exist`);
    }

    const rpc = PoolInfoLayout.decode(Buffer.from(poolAccountInfo.value.data[0], 'base64'));
    const currentPrice = SqrtPriceMath.sqrtPriceX64ToPrice(
      poolState.sqrtPriceX64,
      poolState.mintDecimals0,
      poolState.mintDecimals1
    ).toNumber();

    const data: ClmmRpcData = {
      ...rpc,
      currentPrice,
      programId: toLegacyPublicKey(this._raydiumProgramId),
    };

    return data;
  }

  async fetchComputeClmmInfo(poolInfoWithAddress: ClmmRpcDataWithAddress): Promise<ComputeClmmPoolInfo> {
    const { address: poolAddress } = poolInfoWithAddress;
    return (await this.fetchComputeMultipleClmmInfo([poolInfoWithAddress]))[poolAddress.toString()];
  }

  async fetchExBitmaps(exBitmapAddress: Address[]): Promise<ReturnTypeFetchExBitmaps> {
    const fetchedBitmapAccount = await this._rpc
      .getMultipleAccounts(exBitmapAddress, { commitment: 'confirmed', encoding: 'base64' })
      .send();
    const fetchedBitmapAccountWithAddress = exBitmapAddress.map((address, index) => ({
      address,
      data: fetchedBitmapAccount.value[index]?.data,
    }));

    const returnTypeFetchExBitmaps: ReturnTypeFetchExBitmaps = {};
    for (const { address, data } of fetchedBitmapAccountWithAddress) {
      if (!data) continue;
      returnTypeFetchExBitmaps[address.toString()] = TickArrayBitmapExtensionLayout.decode(
        Buffer.from(data[0], 'base64')
      );
    }
    return returnTypeFetchExBitmaps;
  }

  async fetchComputeMultipleClmmInfo(poolList: ClmmRpcDataWithAddress[]): Promise<Record<string, ComputeClmmPoolInfo>> {
    const fetchRpcList = poolList.map((p) => p.address);
    const rpcRes = await this._rpc
      .getMultipleAccounts(fetchRpcList, { commitment: 'confirmed', encoding: 'base64' })
      .send();
    const rpcResWithAddress = fetchRpcList.map((address, index) => ({
      address,
      data: rpcRes.value[index]?.data,
    }));

    const rpcDataMap: Record<string, ReturnType<typeof PoolInfoLayout.decode>> = {};
    for (const { address, data } of rpcResWithAddress) {
      if (!data) continue;
      rpcDataMap[address.toString()] = PoolInfoLayout.decode(Buffer.from(data[0], 'base64'));
    }

    // Fetch amm configs
    const configSet = Array.from(new Set(poolList.map((p) => p.clmmPoolRpcInfo.ammConfig.toBase58())));
    const configRes = await this._rpc
      .getMultipleAccounts(
        configSet.map((s) => address(s)),
        { commitment: 'confirmed', encoding: 'base64' }
      )
      .send();

    const clmmConfigs: Record<string, ReturnType<typeof ClmmConfigLayout.decode>> = {};
    configSet.forEach((configAddress, index) => {
      const data = configRes.value[index]?.data;
      if (data) {
        clmmConfigs[configAddress] = ClmmConfigLayout.decode(Buffer.from(data[0], 'base64'));
      }
    });

    // Fetch mint infos
    const allMints = Array.from(
      new Set(poolList.flatMap((p) => [p.clmmPoolRpcInfo.mintA.toBase58(), p.clmmPoolRpcInfo.mintB.toBase58()]))
    );
    const mintInfos = await this.fetchMultipleMintInfos(allMints.map((m) => address(m)));

    const pdaList = await Promise.all(
      poolList.map(async (poolInfo) => {
        const pda = await getPdaExBitmapAccount(
          fromLegacyPublicKey(poolInfo.clmmPoolRpcInfo.programId),
          poolInfo.address
        );
        return address(pda[0]);
      })
    );

    const exBitData = await this.fetchExBitmaps(pdaList);

    const result: Record<string, ComputeClmmPoolInfo> = {};
    for (let i = 0; i < poolList.length; i++) {
      const cur = poolList[i];
      const pda = await getPdaExBitmapAccount(fromLegacyPublicKey(cur.clmmPoolRpcInfo.programId), cur.address);

      const ammConfigKey = cur.clmmPoolRpcInfo.ammConfig.toBase58();
      const ammConfigData = clmmConfigs[ammConfigKey];
      const mintAKey = cur.clmmPoolRpcInfo.mintA.toBase58();
      const mintBKey = cur.clmmPoolRpcInfo.mintB.toBase58();

      result[cur.address.toString()] = {
        ...rpcDataMap[cur.address.toString()],
        id: toLegacyPublicKey(cur.address),
        version: 6,
        programId: fromLegacyPublicKey(cur.clmmPoolRpcInfo.programId),
        mintA: {
          chainId: 101,
          address: mintAKey,
          programId: mintInfos[mintAKey]?.programId.toBase58() || 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          logoURI: '',
          symbol: '',
          name: '',
          decimals: cur.clmmPoolRpcInfo.mintDecimalsA,
          tags: [],
          extensions: { feeConfig: mintInfos[mintAKey]?.feeConfig },
        },
        mintB: {
          chainId: 101,
          address: mintBKey,
          programId: mintInfos[mintBKey]?.programId.toBase58() || 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          logoURI: '',
          symbol: '',
          name: '',
          decimals: cur.clmmPoolRpcInfo.mintDecimalsB,
          tags: [],
          extensions: { feeConfig: mintInfos[mintBKey]?.feeConfig },
        },
        ammConfig: {
          ...ammConfigData,
          id: toLegacyPublicKey(address(ammConfigKey)),
          fundFeeRate: 0,
          description: '',
          defaultRange: 0,
          defaultRangePoint: [],
          fundOwner: '',
        },
        currentPrice: new Decimal(cur.clmmPoolRpcInfo.currentPrice),
        exBitmapAccount: toLegacyPublicKey(pda[0]),
        exBitmapInfo: exBitData[pda[0].toString()],
        startTime: rpcDataMap[cur.address.toString()].startTime.toNumber(),
        rewardInfos: rpcDataMap[cur.address.toString()].rewardInfos,
      } as any;
    }
    return result;
  }

  async fetchMultipleMintInfos(mints: Address[]): Promise<ReturnTypeFetchMultipleMintInfos> {
    if (mints.length === 0) return {};

    const cleanedMints = mints.map((i) => solToWSol(i));
    // fetch in chunks of 100
    const mintInfos: Account<Mint>[] = [];
    for (let i = 0; i < cleanedMints.length; i += 100) {
      const chunk = cleanedMints.slice(i, i + 100);
      const chunkMintInfos = await fetchAllMint(this._rpc, chunk);
      mintInfos.push(...chunkMintInfos);
    }

    const mintInfosWithAddress = cleanedMints.map((mint, index) => ({
      address: mint,
      data: mintInfos[index],
    }));

    const mintK: ReturnTypeFetchMultipleMintInfos = {};
    for (const { address, data } of mintInfosWithAddress) {
      if (!data) {
        console.log('invalid mint account', address.toString());
        continue;
      }
      mintK[address] = {
        mintAuthority: optionGetValueOrUndefined(data.data.mintAuthority)
          ? toLegacyPublicKey(optionGetValue(data.data.mintAuthority)!)
          : null,
        programId: toLegacyPublicKey(data.programAddress),
        feeConfig: undefined,
        address: toLegacyPublicKey(address),
        isInitialized: true,
        tlvData: Buffer.from([]),
        supply: data.data.supply,
        decimals: data.data.decimals,
        freezeAuthority: optionGetValueOrUndefined(data.data.freezeAuthority)
          ? toLegacyPublicKey(optionGetValue(data.data.freezeAuthority)!)
          : null,
      };
    }
    mintK[DEFAULT_PUBLIC_KEY.toString()] = mintK[WSOL_MINT.toString()];

    return mintK;
  }

  public async getComputeClmmPoolInfo(
    clmmPoolRpcInfoWithAddress: ClmmRpcDataWithAddress
  ): Promise<ComputeClmmPoolInfo> {
    const computeClmmPoolInfo = await this.fetchComputeClmmInfo(clmmPoolRpcInfoWithAddress);
    return computeClmmPoolInfo;
  }

  async getPoolInfoFromRpc(poolId: string): Promise<ApiV3PoolInfoConcentratedItem> {
    const rpcData = await this.getRpcClmmPoolInfo(poolId);

    const poolInfoWithAddress = {
      address: address(poolId),
      clmmPoolRpcInfo: rpcData,
    };
    const computeClmmPoolInfo = await this.getComputeClmmPoolInfo(poolInfoWithAddress);

    const poolInfo = this.clmmComputeInfoToApiInfo(computeClmmPoolInfo);

    poolInfo.mintAmountA = await getTokenAccountBalanceLamports(this._rpc, fromLegacyPublicKey(rpcData.vaultA));
    poolInfo.mintAmountB = await getTokenAccountBalanceLamports(this._rpc, fromLegacyPublicKey(rpcData.vaultB));

    return poolInfo;
  }

  clmmComputeInfoToApiInfo(pool: ComputeClmmPoolInfo): ApiV3PoolInfoConcentratedItem {
    return {
      ...pool,
      type: 'Concentrated',
      programId: pool.programId.toString(),
      id: pool.id.toString(),
      rewardDefaultInfos: [],
      rewardDefaultPoolInfos: 'Clmm',
      price: pool.currentPrice.toNumber(),
      mintAmountA: 0,
      mintAmountB: 0,
      feeRate: pool.ammConfig.tradeFeeRate,
      openTime: pool.startTime.toString(),
      tvl: 0,

      day: mockRewardData,
      week: mockRewardData,
      month: mockRewardData,
      pooltype: [],

      farmUpcomingCount: 0,
      farmOngoingCount: 0,
      farmFinishedCount: 0,
      burnPercent: 0,
      config: {
        ...pool.ammConfig,
        id: pool.ammConfig.id.toString(),
        defaultRange: 0,
        defaultRangePoint: [],
      },
    };
  }
}

export interface ClmmRpcDataWithAddress {
  address: Address;
  clmmPoolRpcInfo: ClmmRpcData;
}

export async function getPdaExBitmapAccount(programId: Address, poolId: Address): Promise<ProgramDerivedAddress> {
  const addressEncoder = getAddressEncoder();
  return getProgramDerivedAddress({
    seeds: [POOL_TICK_ARRAY_BITMAP_SEED, addressEncoder.encode(poolId)],
    programAddress: programId,
  });
}

const mockRewardData = {
  volume: 0,
  volumeQuote: 0,
  volumeFee: 0,
  apr: 0,
  feeApr: 0,
  priceMin: 0,
  priceMax: 0,
  rewardApr: [],
};
