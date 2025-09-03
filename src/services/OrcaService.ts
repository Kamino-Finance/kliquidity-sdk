import { address, Address, Base58EncodedBytes, Rpc, SolanaRpcApi } from '@solana/kit';
import Decimal from 'decimal.js';
import axios from 'axios';
import { OrcaWhirlpoolsResponse, Whirlpool as WhirlpoolAPIResponse } from './OrcaWhirlpoolsResponse';
import { WhirlpoolStrategy } from '../@codegen/kliquidity/accounts';
import { Position } from '../@codegen/whirlpools/accounts';
import { WhirlpoolAprApy } from './WhirlpoolAprApy';
import {
  aprToApy,
  estimateAprsForPriceRange,
  GenericPoolInfo,
  getHighestInitializedTickArrayTickIndex,
  getLiquidityDistribution,
  getLowestInitializedTickArrayTickIndex,
  getNearestValidTickIndexFromTickIndex,
  getStrategyPriceRangeOrca,
  LiquidityDistribution,
  LiquidityForPrice,
  ZERO,
} from '../utils';
import { PROGRAM_ID as WHIRLPOOLS_PROGRAM_ID } from '../@codegen/whirlpools/programId';
import { CollateralInfo } from '../@codegen/kliquidity/types';
import { KaminoPrices } from '../models';
import { priceToTickIndex } from '@orca-so/whirlpools-core';

export class OrcaService {
  private readonly _rpc: Rpc<SolanaRpcApi>;
  private readonly _whirlpoolProgramId: Address;
  private readonly _orcaApiUrl: string;

  constructor(rpc: Rpc<SolanaRpcApi>, whirlpoolProgramId: Address = WHIRLPOOLS_PROGRAM_ID) {
    this._rpc = rpc;
    this._whirlpoolProgramId = whirlpoolProgramId;
    this._orcaApiUrl = `https://api.orca.so/v2/solana`;
  }

  getWhirlpoolProgramId(): Address {
    return this._whirlpoolProgramId;
  }

  // Fetch all Orca whirlpools with pagination support (note there are over 20 pages so it may take a while)
  async getOrcaWhirlpools(tokens: Address[] = []): Promise<WhirlpoolAPIResponse[]> {
    const maxPageSize = 1000;
    const maxPages = 100; // Safety limit to prevent infinite loops
    const allWhirlpools: WhirlpoolAPIResponse[] = [];
    let after: string | undefined = undefined;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore && pageCount < maxPages) {
      pageCount++;
      const url = new URL(`${this._orcaApiUrl}/pools`);
      url.searchParams.set('size', maxPageSize.toString());

      if (after) {
        url.searchParams.set('after', after);
      }

      // Add token filtering parameters based on the number of tokens provided
      if (tokens.length === 1) {
        url.searchParams.set('token', tokens[0]);
      } else if (tokens.length === 2) {
        url.searchParams.set('tokensBothOf', tokens.join(','));
      }

      try {
        const response = await axios.get<OrcaWhirlpoolsResponse>(url.toString());
        const data = response.data;

        // Add whirlpools from this page to our collection
        if (data.data && data.data.length > 0) {
          allWhirlpools.push(...data.data);
        }

        // Check if there are more pages using the meta.cursor.next field
        if (data.meta?.cursor?.next) {
          after = data.meta.cursor.next;
          hasMore = true;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error('Error fetching Orca whirlpools page:', error);
        throw error;
      }
    }

    if (pageCount >= maxPages) {
      console.warn(`Reached maximum page limit (${maxPages}). There might be more whirlpools available.`);
    }

    return allWhirlpools;
  }

  async getOrcaWhirlpool(poolAddress: Address): Promise<WhirlpoolAPIResponse> {
    const response = await axios.get(`${this._orcaApiUrl}/pools/${poolAddress}`);

    // If the API response has a nested data field that contains the actual pool data
    if (response.data.data && typeof response.data.data === 'object') {
      return response.data.data;
    }

    return response.data;
  }

  /**
   * Get token prices for a strategy - for use with orca sdk
   * @param strategy
   * @param prices
   * @param collateralInfos
   * @returns {Record<string, Decimal>} - token prices by mint string
   * @private
   */
  private getTokenPrices(
    strategy: WhirlpoolStrategy,
    prices: KaminoPrices,
    collateralInfos: CollateralInfo[]
  ): Map<Address, Decimal> {
    const tokensPrices: Map<Address, Decimal> = new Map();

    const tokenA = collateralInfos[strategy.tokenACollateralId.toNumber()];
    const tokenB = collateralInfos[strategy.tokenBCollateralId.toNumber()];
    const rewardToken0 = collateralInfos[strategy.reward0CollateralId.toNumber()];
    const rewardToken1 = collateralInfos[strategy.reward1CollateralId.toNumber()];
    const rewardToken2 = collateralInfos[strategy.reward2CollateralId.toNumber()];

    const aPrice = prices.spot[tokenA.mint.toString()];
    const bPrice = prices.spot[tokenB.mint.toString()];
    const reward0Price = strategy.reward0Decimals.toNumber() !== 0 ? prices.spot[rewardToken0.mint.toString()] : null;
    const reward1Price = strategy.reward1Decimals.toNumber() !== 0 ? prices.spot[rewardToken1.mint.toString()] : null;
    const reward2Price = strategy.reward2Decimals.toNumber() !== 0 ? prices.spot[rewardToken2.mint.toString()] : null;

    const [mintA, mintB] = [address(strategy.tokenAMint.toString()), address(strategy.tokenBMint.toString())];
    const reward0 = address(collateralInfos[strategy.reward0CollateralId.toNumber()]?.mint?.toString());
    const reward1 = address(collateralInfos[strategy.reward1CollateralId.toNumber()]?.mint?.toString());
    const reward2 = address(collateralInfos[strategy.reward2CollateralId.toNumber()]?.mint?.toString());

    tokensPrices.set(mintA, aPrice.price);
    tokensPrices.set(mintB, bPrice.price);
    if (reward0Price !== null) {
      tokensPrices.set(reward0, reward0Price.price);
    }
    if (reward1Price !== null) {
      tokensPrices.set(reward1, reward1Price.price);
    }
    if (reward2Price !== null) {
      tokensPrices.set(reward2, reward2Price.price);
    }

    return tokensPrices;
  }

  private getPoolTokensPrices(pool: WhirlpoolAPIResponse, prices: KaminoPrices): Map<Address, Decimal> {
    const tokensPrices: Map<Address, Decimal> = new Map();
    const tokens = [
      address(pool.tokenMintA.toString()),
      address(pool.tokenMintB.toString()),
      address(pool.rewards[0]?.mint.toString()),
      address(pool.rewards[1]?.mint.toString()),
      address(pool.rewards[2]?.mint.toString()),
    ];
    for (const mint of tokens) {
      if (mint) {
        const price = prices.spot[mint]?.price;
        if (!price) {
          throw new Error(`Could not get token ${mint} price`);
        }
        tokensPrices.set(mint, price);
      }
    }

    return tokensPrices;
  }

  async getStrategyWhirlpoolPoolAprApy(
    strategy: WhirlpoolStrategy,
    collateralInfos: CollateralInfo[],
    prices: KaminoPrices
  ): Promise<WhirlpoolAprApy> {
    const position = await Position.fetch(this._rpc, strategy.position);
    if (!position) {
      throw new Error(`Position ${strategy.position.toString()} does not exist`);
    }

    const pool = await this.getOrcaWhirlpool(strategy.pool);
    if (!pool) {
      throw Error(`Could not get orca pool data for ${strategy.pool.toString()}`);
    }

    const priceRange = getStrategyPriceRangeOrca(
      position.tickLowerIndex,
      position.tickUpperIndex,
      strategy,
      new Decimal(pool.price.toString())
    );
    if (priceRange.strategyOutOfRange) {
      return {
        priceLower: new Decimal(priceRange.priceLower),
        priceUpper: new Decimal(priceRange.priceUpper),
        poolPrice: new Decimal(pool.price),
        strategyOutOfRange: priceRange.strategyOutOfRange,
        rewardsApy: [],
        rewardsApr: [],
        feeApy: ZERO,
        feeApr: ZERO,
        totalApy: ZERO,
        totalApr: ZERO,
      };
    }

    const lpFeeRate = new Decimal(pool.feeRate);
    const volume24hUsd = pool.stats['24h']?.volume ?? new Decimal(0);
    const fee24Usd = new Decimal(volume24hUsd).mul(lpFeeRate).toNumber();
    const tokensPrices = this.getTokenPrices(strategy, prices, collateralInfos);

    const rewardsDecimals = new Map<Address, number>();
    if (strategy.reward0Decimals.toNumber() !== 0) {
      rewardsDecimals.set(address(pool.rewards[0]?.mint), strategy.reward0Decimals.toNumber());
    }
    if (strategy.reward1Decimals.toNumber() !== 0) {
      rewardsDecimals.set(address(pool.rewards[1]?.mint), strategy.reward1Decimals.toNumber());
    }
    if (strategy.reward2Decimals.toNumber() !== 0) {
      rewardsDecimals.set(address(pool.rewards[2]?.mint), strategy.reward2Decimals.toNumber());
    }
    const apr = estimateAprsForPriceRange(
      pool,
      tokensPrices,
      fee24Usd,
      position.tickLowerIndex,
      position.tickUpperIndex,
      rewardsDecimals
    );

    let totalApr = new Decimal(apr.fee);
    for (const reward of apr.rewards) {
      totalApr = totalApr.add(reward);
    }
    const feeApr = new Decimal(apr.fee);
    const rewardsApr = apr.rewards.map((r) => new Decimal(r));
    return {
      totalApr,
      totalApy: aprToApy(totalApr, 365),
      feeApr,
      feeApy: aprToApy(feeApr, 365),
      rewardsApr,
      rewardsApy: rewardsApr.map((x) => aprToApy(x, 365)),
      priceLower: new Decimal(priceRange.priceLower),
      priceUpper: new Decimal(priceRange.priceUpper),
      poolPrice: new Decimal(pool.price),
      strategyOutOfRange: priceRange.strategyOutOfRange,
    };
  }

  // strongly recommended to pass lowestTick and highestTick because fetching the lowest and highest existent takes very long
  async getWhirlpoolLiquidityDistribution(
    pool: Address,
    keepOrder: boolean = true,
    lowestTick?: number,
    highestTick?: number
  ): Promise<LiquidityDistribution> {
    const whirlpool = await this.getOrcaWhirlpool(pool);
    if (!whirlpool) {
      throw new Error(`Could not get pool data for Whirlpool ${pool}`);
    }

    let lowestInitializedTick: number;
    if (lowestTick) {
      lowestInitializedTick = lowestTick;
    } else {
      lowestInitializedTick = await getLowestInitializedTickArrayTickIndex(this._rpc, pool, whirlpool.tickSpacing);
    }

    let highestInitializedTick: number;
    if (highestTick) {
      highestInitializedTick = highestTick;
    } else {
      highestInitializedTick = await getHighestInitializedTickArrayTickIndex(this._rpc, pool, whirlpool.tickSpacing);
    }

    const orcaLiqDistribution = await getLiquidityDistribution(
      this._rpc,
      pool,
      whirlpool,
      lowestInitializedTick,
      highestInitializedTick,
      this._whirlpoolProgramId
    );

    const liqDistribution: LiquidityDistribution = {
      currentPrice: new Decimal(whirlpool.price),
      currentTickIndex: whirlpool.tickCurrentIndex,
      distribution: [],
    };

    orcaLiqDistribution.datapoints.forEach((entry) => {
      let priceWithOrder = new Decimal(entry.price);
      if (!keepOrder) {
        priceWithOrder = new Decimal(1).div(priceWithOrder);
      }
      const liq: LiquidityForPrice = {
        price: priceWithOrder,
        liquidity: entry.liquidity,
        tickIndex: entry.tickIndex,
      };

      liqDistribution.distribution.push(liq);
    });

    return liqDistribution;
  }

  async getWhirlpoolPositionAprApy(
    poolPubkey: Address,
    priceLower: Decimal,
    priceUpper: Decimal,
    prices: KaminoPrices,
    rewardsDecimals: Map<Address, number>
  ): Promise<WhirlpoolAprApy> {
    const pool = await this.getOrcaWhirlpool(poolPubkey);
    if (!pool) {
      throw Error(`Could not get orca pool data for ${poolPubkey}`);
    }

    let strategyOutOfRange = false;
    if (priceLower.gt(new Decimal(pool.price)) || priceUpper.lt(new Decimal(pool.price))) {
      strategyOutOfRange = true;
    }
    if (strategyOutOfRange) {
      return {
        priceLower,
        priceUpper,
        strategyOutOfRange,
        poolPrice: new Decimal(pool.price),
        rewardsApy: [],
        rewardsApr: [],
        feeApy: ZERO,
        feeApr: ZERO,
        totalApy: ZERO,
        totalApr: ZERO,
      };
    }

    const lpFeeRate = pool.feeRate;
    const volume24hUsd = pool?.stats?.['24h']?.volume ?? new Decimal(0);
    const fee24Usd = new Decimal(volume24hUsd).mul(lpFeeRate).toNumber();
    const tokensPrices = this.getPoolTokensPrices(pool, prices);

    const tickLowerIndex = getNearestValidTickIndexFromTickIndex(
      priceToTickIndex(priceLower.toNumber(), pool.tokenA.decimals, pool.tokenB.decimals),
      pool.tickSpacing
    );
    const tickUpperIndex = getNearestValidTickIndexFromTickIndex(
      priceToTickIndex(priceUpper.toNumber(), pool.tokenA.decimals, pool.tokenB.decimals),
      pool.tickSpacing
    );

    const apr = estimateAprsForPriceRange(
      pool,
      tokensPrices,
      fee24Usd,
      tickLowerIndex,
      tickUpperIndex,
      rewardsDecimals
    );

    const totalApr = new Decimal(apr.fee).add(apr.rewards[0]).add(apr.rewards[1]).add(apr.rewards[2]);
    const feeApr = new Decimal(apr.fee);
    const rewardsApr = apr.rewards.map((r) => new Decimal(r));
    return {
      totalApr,
      totalApy: aprToApy(totalApr, 365),
      feeApr,
      feeApy: aprToApy(feeApr, 365),
      rewardsApr,
      rewardsApy: rewardsApr.map((x) => aprToApy(x, 365)),
      priceLower,
      priceUpper,
      poolPrice: new Decimal(pool.price),
      strategyOutOfRange,
    };
  }

  async getGenericPoolInfo(poolPubkey: Address) {
    const pool = await this.getOrcaWhirlpool(poolPubkey);
    if (!pool) {
      throw Error(`Could not get orca pool data for ${poolPubkey.toString()}`);
    }

    const poolInfo: GenericPoolInfo = {
      dex: 'ORCA',
      address: poolPubkey,
      tokenMintA: address(pool.tokenMintA),
      tokenMintB: address(pool.tokenMintB),
      price: new Decimal(pool.price),
      feeRate: new Decimal(pool.feeRate),
      volumeOnLast7d: pool.stats['7d'] ? new Decimal(pool.stats['7d'].volume) : undefined,
      tvl: pool.tvlUsdc ? new Decimal(pool.tvlUsdc) : undefined,
      tickSpacing: new Decimal(pool.tickSpacing),
      // todo(Silviu): get real amount of positions
      positions: new Decimal(0),
    };
    return poolInfo;
  }

  async getPositionsCountByPool(pool: Address): Promise<number> {
    const rawPositions = await this._rpc
      .getProgramAccounts(WHIRLPOOLS_PROGRAM_ID, {
        commitment: 'confirmed',
        filters: [
          // account LAYOUT: https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/position.rs#L20
          { dataSize: 216n },
          { memcmp: { bytes: pool.toString() as Base58EncodedBytes, offset: 8n, encoding: 'base58' } },
        ],
      })
      .send();

    return rawPositions.length;
  }
}
