import { address, Address, Base58EncodedBytes, Rpc, SolanaRpcApi } from '@solana/kit';
import Decimal from 'decimal.js';
import axios from 'axios';
import { OrcaWhirlpoolsResponse, Whirlpool as WhirlpoolAPIResponse } from './OrcaWhirlpoolsResponse';
import { type WhirlpoolStrategy } from '../@codegen/kliquidity/accounts';
import { fetchMaybePosition } from '../@codegen/whirlpools/accounts';
import { unwrapAccount } from '../utils/codamaHelpers';
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
import { WHIRLPOOL_PROGRAM_ADDRESS } from '../@codegen/whirlpools/programs';
import { CollateralInfo } from '../@codegen/kliquidity/types';
import { KaminoPrices } from '../models';
import { priceToTickIndex } from '@orca-so/whirlpools-core';

function toOptionalAddress(value: Base58EncodedBytes | string | undefined | null): Address | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return address(value.toString());
}

function setRequiredTokenPrice(tokensPrices: Map<Address, Decimal>, prices: KaminoPrices, mint: Address): void {
  const price = prices.spot[mint]?.price;
  if (!price) {
    throw new Error(`Could not get token ${mint} price`);
  }

  tokensPrices.set(mint, price);
}

function setOptionalTokenPrice(tokensPrices: Map<Address, Decimal>, prices: KaminoPrices, mint: Address | undefined): void {
  if (!mint) {
    return;
  }

  const price = prices.spot[mint]?.price;
  if (price) {
    tokensPrices.set(mint, price);
  } else {
    console.error(`Could not get optional token ${mint} price`);
  }
}

function sumAprComponents(feeApr: number, rewardsApr: number[]): Decimal {
  return rewardsApr.reduce((totalApr, rewardApr) => totalApr.add(rewardApr), new Decimal(feeApr));
}

export class OrcaService {
  private readonly _rpc: Rpc<SolanaRpcApi>;
  private readonly _whirlpoolProgramId: Address;
  private readonly _orcaApiUrl: string;

  constructor(rpc: Rpc<SolanaRpcApi>, whirlpoolProgramId: Address = WHIRLPOOL_PROGRAM_ADDRESS) {
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

  private getStrategyRewardMint(
    strategy: WhirlpoolStrategy,
    collateralInfos: CollateralInfo[],
    rewardIndex: 0 | 1 | 2
  ): Address | undefined {
    const rewardCollateralId =
      rewardIndex === 0
        ? Number(strategy.reward0CollateralId)
        : rewardIndex === 1
          ? Number(strategy.reward1CollateralId)
          : Number(strategy.reward2CollateralId);
    const rewardMint = collateralInfos[rewardCollateralId]?.mint?.toString();

    const rewardDecimals =
      rewardIndex === 0 ? Number(strategy.reward0Decimals) : rewardIndex === 1 ? Number(strategy.reward1Decimals) : Number(strategy.reward2Decimals);
    if (rewardDecimals !== 0 && !rewardMint) {
      console.error(`Could not get strategy reward mint for reward index ${rewardIndex} and collateral id ${rewardCollateralId}`);
    }

    return toOptionalAddress(rewardMint);
  }

  private getPoolRewardMint(pool: WhirlpoolAPIResponse, rewardIndex: 0 | 1 | 2): Address | undefined {
    return toOptionalAddress(pool.rewards?.[rewardIndex]?.mint?.toString());
  }

  private getRewardsDecimals(pool: WhirlpoolAPIResponse, strategy: WhirlpoolStrategy): Map<Address, number> {
    const rewardsDecimals = new Map<Address, number>();
    const reward0Mint = this.getPoolRewardMint(pool, 0);
    const reward1Mint = this.getPoolRewardMint(pool, 1);
    const reward2Mint = this.getPoolRewardMint(pool, 2);

    if (Number(strategy.reward0Decimals) !== 0 && reward0Mint) {
      rewardsDecimals.set(reward0Mint, Number(strategy.reward0Decimals));
    } else if (Number(strategy.reward0Decimals) !== 0) {
      console.error(`Could not get Orca API reward mint for pool ${pool.address} at reward index 0`);
    }
    if (Number(strategy.reward1Decimals) !== 0 && reward1Mint) {
      rewardsDecimals.set(reward1Mint, Number(strategy.reward1Decimals));
    } else if (Number(strategy.reward1Decimals) !== 0) {
      console.error(`Could not get Orca API reward mint for pool ${pool.address} at reward index 1`);
    }
    if (Number(strategy.reward2Decimals) !== 0 && reward2Mint) {
      rewardsDecimals.set(reward2Mint, Number(strategy.reward2Decimals));
    } else if (Number(strategy.reward2Decimals) !== 0) {
      console.error(`Could not get Orca API reward mint for pool ${pool.address} at reward index 2`);
    }

    return rewardsDecimals;
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

    const tokenA = collateralInfos[Number(strategy.tokenACollateralId)];
    const tokenB = collateralInfos[Number(strategy.tokenBCollateralId)];
    const rewardToken0 = collateralInfos[Number(strategy.reward0CollateralId)];
    const rewardToken1 = collateralInfos[Number(strategy.reward1CollateralId)];
    const rewardToken2 = collateralInfos[Number(strategy.reward2CollateralId)];

    const aPrice = prices.spot[tokenA.mint.toString()];
    const bPrice = prices.spot[tokenB.mint.toString()];
    const reward0Price =
      Number(strategy.reward0Decimals) !== 0 && rewardToken0 ? prices.spot[rewardToken0.mint.toString()] : null;
    const reward1Price =
      Number(strategy.reward1Decimals) !== 0 && rewardToken1 ? prices.spot[rewardToken1.mint.toString()] : null;
    const reward2Price =
      Number(strategy.reward2Decimals) !== 0 && rewardToken2 ? prices.spot[rewardToken2.mint.toString()] : null;

    const mintA = address(strategy.tokenAMint.toString());
    const mintB = address(strategy.tokenBMint.toString());
    const reward0 = this.getStrategyRewardMint(strategy, collateralInfos, 0);
    const reward1 = this.getStrategyRewardMint(strategy, collateralInfos, 1);
    const reward2 = this.getStrategyRewardMint(strategy, collateralInfos, 2);

    tokensPrices.set(mintA, aPrice.price);
    tokensPrices.set(mintB, bPrice.price);
    if (reward0Price !== null && reward0) {
      if (reward0Price) {
        tokensPrices.set(reward0, reward0Price.price);
      } else {
        console.error(`Could not get strategy reward0 token ${reward0} price`);
      }
    }
    if (reward1Price !== null && reward1) {
      if (reward1Price) {
        tokensPrices.set(reward1, reward1Price.price);
      } else {
        console.error(`Could not get strategy reward1 token ${reward1} price`);
      }
    }
    if (reward2Price !== null && reward2) {
      if (reward2Price) {
        tokensPrices.set(reward2, reward2Price.price);
      } else {
        console.error(`Could not get strategy reward2 token ${reward2} price`);
      }
    }

    return tokensPrices;
  }

  private getPoolTokensPrices(pool: WhirlpoolAPIResponse, prices: KaminoPrices): Map<Address, Decimal> {
    const tokensPrices: Map<Address, Decimal> = new Map();
    setRequiredTokenPrice(tokensPrices, prices, address(pool.tokenMintA.toString()));
    setRequiredTokenPrice(tokensPrices, prices, address(pool.tokenMintB.toString()));
    setOptionalTokenPrice(tokensPrices, prices, this.getPoolRewardMint(pool, 0));
    setOptionalTokenPrice(tokensPrices, prices, this.getPoolRewardMint(pool, 1));
    setOptionalTokenPrice(tokensPrices, prices, this.getPoolRewardMint(pool, 2));

    return tokensPrices;
  }

  async getStrategyWhirlpoolPoolAprApy(
    strategy: WhirlpoolStrategy,
    collateralInfos: CollateralInfo[],
    prices: KaminoPrices
  ): Promise<WhirlpoolAprApy> {
    const position = unwrapAccount(await fetchMaybePosition(this._rpc, strategy.position));
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
    const volume24hUsd = pool.stats?.['24h']?.volume ?? new Decimal(0);
    const fee24Usd = new Decimal(volume24hUsd).mul(lpFeeRate).toNumber();
    const tokensPrices = this.getTokenPrices(strategy, prices, collateralInfos);

    const rewardsDecimals = this.getRewardsDecimals(pool, strategy);
    const apr = estimateAprsForPriceRange(
      pool,
      tokensPrices,
      fee24Usd,
      position.tickLowerIndex,
      position.tickUpperIndex,
      rewardsDecimals
    );

    const totalApr = sumAprComponents(apr.fee, apr.rewards);
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
    const volume24hUsd = pool.stats?.['24h']?.volume ?? new Decimal(0);
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

    const totalApr = sumAprComponents(apr.fee, apr.rewards);
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
      .getProgramAccounts(WHIRLPOOL_PROGRAM_ADDRESS, {
        commitment: 'confirmed',
        filters: [
          // account LAYOUT: https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/position.rs#L20
          { dataSize: 216n },
          { memcmp: { bytes: pool.toString() as Base58EncodedBytes, offset: 8n, encoding: 'base58' } },
        ],
        encoding: 'base64+zstd',
      })
      .send();

    return rawPositions.length;
  }
}
