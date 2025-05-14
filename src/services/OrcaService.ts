import { Connection, PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';
import {
  OrcaNetwork,
  OrcaWhirlpoolClient,
  getNearestValidTickIndexFromTickIndex,
  priceToTickIndex,
  TokenUSDPrices,
  EstimatedAprs,
  ZERO_APR,
  getRemoveLiquidityQuote,
  ZERO_SLIPPAGE,
  DecimalUtil,
  PoolRewardInfo,
} from '@orca-so/whirlpool-sdk';
import axios from 'axios';
import { OrcaWhirlpoolsResponse, Whirlpool, WhirlpoolV2 } from './OrcaWhirlpoolsResponse';
import { SolanaCluster } from '@hubbleprotocol/hubble-config';
import { WhirlpoolStrategy } from '../kamino-client/accounts';
import { Position } from '../whirlpools-client';
import { WhirlpoolAprApy } from './WhirlpoolAprApy';
import {
  aprToApy,
  GenericPoolInfo,
  getStrategyPriceRangeOrca,
  LiquidityDistribution,
  LiquidityForPrice,
  ZERO,
} from '../utils';
import { WHIRLPOOL_PROGRAM_ID } from '../whirlpools-client/programId';
import { CollateralInfo } from '../kamino-client/types';
import { KaminoPrices } from '../models';
import BN from 'bn.js';

export class OrcaService {
  private readonly _connection: Connection;
  private readonly _whirilpoolProgramId: PublicKey;
  private readonly _orcaNetwork: OrcaNetwork;
  private readonly _orcaApiUrl: string;

  constructor(connection: Connection, cluster: SolanaCluster, whirlpoolProgramId: PublicKey = WHIRLPOOL_PROGRAM_ID) {
    this._connection = connection;
    this._whirilpoolProgramId = whirlpoolProgramId;
    this._orcaNetwork = cluster === 'mainnet-beta' ? OrcaNetwork.MAINNET : OrcaNetwork.DEVNET;
    this._orcaApiUrl = `https://api.${cluster === 'mainnet-beta' ? 'mainnet' : 'devnet'}.orca.so`;
  }

  getWhirlpoolProgramId(): PublicKey {
    return this._whirilpoolProgramId;
  }

  async getOrcaWhirlpools() {
    return (await axios.get<OrcaWhirlpoolsResponse>(`${this._orcaApiUrl}/v1/whirlpool/list`)).data;
  }

  async getOrcaWhirlpool(poolAddress: PublicKey): Promise<WhirlpoolV2> {
    let rawResult = (await axios.get(`https://api.orca.so/v2/solana/pools/${poolAddress.toString()}`)).data;
    return rawResult['data'];
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
  ): Record<string, Decimal> {
    const tokensPrices: Record<string, Decimal> = {};

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

    const [mintA, mintB] = [strategy.tokenAMint.toString(), strategy.tokenBMint.toString()];
    const reward0 = collateralInfos[strategy.reward0CollateralId.toNumber()]?.mint?.toString();
    const reward1 = collateralInfos[strategy.reward1CollateralId.toNumber()]?.mint?.toString();
    const reward2 = collateralInfos[strategy.reward2CollateralId.toNumber()]?.mint?.toString();

    tokensPrices[mintA] = aPrice.price;
    tokensPrices[mintB] = bPrice.price;
    if (reward0Price !== null) {
      tokensPrices[reward0] = reward0Price.price;
    }
    if (reward1Price !== null) {
      tokensPrices[reward1] = reward1Price.price;
    }
    if (reward2Price !== null) {
      tokensPrices[reward2] = reward2Price.price;
    }

    return tokensPrices;
  }

  private getPoolTokensPrices(whirlpool: WhirlpoolV2, prices: KaminoPrices) {
    const tokensPrices: Record<string, Decimal> = {};
    const tokens = [
      whirlpool.tokenMintA.toString(),
      whirlpool.tokenMintB.toString(),
      whirlpool.rewards[0].mint.toString(),
      whirlpool.rewards[1].mint.toString(),
      whirlpool.rewards[2].mint.toString(),
    ];
    for (const mint of tokens) {
      if (mint) {
        const price = prices.spot[mint]?.price;
        if (!price) {
          throw new Error(`Could not get token ${mint} price`);
        }
        tokensPrices[mint] = price;
      }
    }

    return tokensPrices;
  }

  async getPool(poolAddress: PublicKey) {
    const orca = new OrcaWhirlpoolClient({
      connection: this._connection,
      network: this._orcaNetwork,
    });
    return await orca.getPool(poolAddress);
  }

  async getStrategyWhirlpoolPoolAprApy(
    strategy: WhirlpoolStrategy,
    collateralInfos: CollateralInfo[],
    prices: KaminoPrices,
    _whirlpools?: Whirlpool[]
  ): Promise<WhirlpoolAprApy> {
    const position = await Position.fetch(this._connection, strategy.position);
    if (!position) {
      throw new Error(`Position ${strategy.position.toString()} does not exist`);
    }

    const whirlpool = await this.getOrcaWhirlpool(strategy.pool);
    if (!whirlpool) {
      throw Error(`Could not get orca pool data for ${strategy.pool.toString()}`);
    }
    const priceRange = getStrategyPriceRangeOrca(
      position.tickLowerIndex,
      position.tickUpperIndex,
      strategy,
      new Decimal(whirlpool.price.toString())
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

    const lpFeeRate = whirlpool.feeRate;
    const volume24hUsd = whirlpool?.stats['24h'].volume ?? new Decimal(0);
    const fee24Usd = new Decimal(volume24hUsd).mul(lpFeeRate).toNumber();
    const tokensPrices = this.getTokenPrices(strategy, prices, collateralInfos);

    const apr = this.estimateAprsForPriceRange(
      whirlpool,
      tokensPrices,
      fee24Usd,
      position.tickLowerIndex,
      position.tickUpperIndex
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
      ...priceRange,
    };
  }

  // strongly recommended to pass lowestTick and highestTick because fetching the lowest and highest existent takes very long
  async getWhirlpoolLiquidityDistribution(
    pool: PublicKey,
    keepOrder: boolean = true,
    lowestTick?: number,
    highestTick?: number
  ): Promise<LiquidityDistribution> {
    const orca = new OrcaWhirlpoolClient({
      connection: this._connection,
      network: this._orcaNetwork,
    });
    const poolData = await orca.getPool(pool);
    if (!poolData) {
      throw new Error(`Could not get pool data for Whirlpool ${pool}`);
    }

    let lowestInitializedTick: number;
    if (lowestTick) {
      lowestInitializedTick = lowestTick;
    } else {
      lowestInitializedTick = await orca.pool.getLowestInitializedTickArrayTickIndex(pool, poolData.tickSpacing);
    }

    let highestInitializedTick: number;
    if (highestTick) {
      highestInitializedTick = highestTick;
    } else {
      highestInitializedTick = await orca.pool.getHighestInitializedTickArrayTickIndex(pool, poolData.tickSpacing);
    }

    const orcaLiqDistribution = await orca.pool.getLiquidityDistribution(
      pool,
      lowestInitializedTick,
      highestInitializedTick
    );

    const liqDistribution: LiquidityDistribution = {
      currentPrice: poolData.price,
      currentTickIndex: poolData.tickCurrentIndex,
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
    poolPubkey: PublicKey,
    priceLower: Decimal,
    priceUpper: Decimal,
    prices: KaminoPrices,
    _whirlpools?: Whirlpool[]
  ): Promise<WhirlpoolAprApy> {
    const whirlpool = await this.getOrcaWhirlpool(poolPubkey);
    if (!whirlpool) {
      throw Error(`Could not get orca pool data for ${poolPubkey}`);
    }

    let strategyOutOfRange = false;
    if (priceLower.gt(whirlpool.price) || priceUpper.lt(whirlpool.price)) {
      strategyOutOfRange = true;
    }
    if (strategyOutOfRange) {
      return {
        priceLower,
        priceUpper,
        strategyOutOfRange,
        poolPrice: new Decimal(whirlpool.price),
        rewardsApy: [],
        rewardsApr: [],
        feeApy: ZERO,
        feeApr: ZERO,
        totalApy: ZERO,
        totalApr: ZERO,
      };
    }

    const lpFeeRate = whirlpool.feeRate;
    const volume24hUsd = whirlpool?.stats['24h'].volume ?? new Decimal(0);
    const fee24Usd = new Decimal(volume24hUsd).mul(lpFeeRate).toNumber();
    const tokensPrices = this.getPoolTokensPrices(whirlpool, prices);

    const tickLowerIndex = getNearestValidTickIndexFromTickIndex(
      priceToTickIndex(priceLower, whirlpool.tokenMintA.decimals, whirlpool.tokenMintB.decimals),
      whirlpool.tickSpacing
    );
    const tickUpperIndex = getNearestValidTickIndexFromTickIndex(
      priceToTickIndex(priceUpper, whirlpool.tokenMintA.decimals, whirlpool.tokenMintB.decimals),
      whirlpool.tickSpacing
    );

    const apr = this.estimateAprsForPriceRange(whirlpool, tokensPrices, fee24Usd, tickLowerIndex, tickUpperIndex);

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
      poolPrice: new Decimal(whirlpool.price),
      strategyOutOfRange,
    };
  }

  async getGenericPoolInfo(poolPubkey: PublicKey, whirlpools?: Whirlpool[]) {
    const whirlpool = await this.getOrcaWhirlpool(poolPubkey);

    if (!whirlpool) {
      throw Error(`Could not get orca pool data for ${poolPubkey.toString()}`);
    }

    const poolInfo: GenericPoolInfo = {
      dex: 'ORCA',
      address: new PublicKey(poolPubkey),
      tokenMintA: new PublicKey(whirlpool.tokenMintA),
      tokenMintB: new PublicKey(whirlpool.tokenMintB),
      price: new Decimal(whirlpool.price),
      feeRate: new Decimal(whirlpool.feeRate),
      volumeOnLast7d: whirlpool.stats['7d'].volume ? new Decimal(whirlpool.stats['7d'].volume) : undefined,
      tvl: whirlpool.tvlUsdc ? new Decimal(whirlpool.tvlUsdc) : undefined,
      tickSpacing: new Decimal(whirlpool.tickSpacing),
      // todo(Silviu): get real amount of positions
      positions: new Decimal(0),
    };
    return poolInfo;
  }

  async getPositionsCountByPool(pool: PublicKey): Promise<number> {
    const rawPositions = await this._connection.getProgramAccounts(WHIRLPOOL_PROGRAM_ID, {
      commitment: 'confirmed',
      filters: [
        // account LAYOUT: https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/position.rs#L20
        { dataSize: 216 },
        { memcmp: { bytes: pool.toBase58(), offset: 8 } },
      ],
    });

    return rawPositions.length;
  }

  estimateAprsForPriceRange(
    pool: WhirlpoolV2,
    // TODO: should this actually be fetched/shared?
    // There's a weird in/out/in dependency here on prices/fees
    tokenPrices: TokenUSDPrices,
    fees24h: number,
    tickLowerIndex: number,
    tickUpperIndex: number
  ): EstimatedAprs {
    const tokenPriceA = tokenPrices[pool.tokenMintA.address];
    const tokenPriceB = tokenPrices[pool.tokenMintB.address];

    if (!fees24h || !tokenPriceA || !tokenPriceB || tickLowerIndex >= tickUpperIndex) {
      return ZERO_APR;
    }

    // Value of liquidity if the entire liquidity were concentrated between tickLower/Upper
    // Since this is virtual liquidity, concentratedValue should actually be less than totalValue
    const { minTokenA, minTokenB } = getRemoveLiquidityQuote({
      positionAddress: PublicKey.default,
      tickCurrentIndex: pool.tickCurrentIndex,
      sqrtPrice: new BN(pool.sqrtPrice),
      tickLowerIndex,
      tickUpperIndex,
      liquidity: pool.liquidity,
      slippageTolerance: ZERO_SLIPPAGE,
    });
    const tokenValueA = this.getTokenValue(minTokenA, pool.tokenMintA.decimals, tokenPriceA);
    const tokenValueB = this.getTokenValue(minTokenB, pool.tokenMintB.decimals, tokenPriceB);
    const concentratedValue = tokenValueA.add(tokenValueB);

    const feesPerYear = new Decimal(fees24h).mul(365);
    const feeApr = feesPerYear.div(concentratedValue).toNumber();

    const rewards = pool.rewards.map((reward) => this.estimateRewardApr(reward, concentratedValue, tokenPrices));

    return { fee: feeApr, rewards };
  }

  estimateRewardApr(reward: PoolRewardInfo, concentratedValue: Decimal, tokenPrices: TokenUSDPrices) {
    const { mint, emissionsPerSecond } = reward;
    const rewardTokenPrice = tokenPrices[mint.toBase58()];

    if (!emissionsPerSecond || !rewardTokenPrice) {
      return 0;
    }

    const SECONDS_PER_YEAR =
      60 * // SECONDS
      60 * // MINUTES
      24 * // HOURS
      365; // DAYS

    return emissionsPerSecond.mul(SECONDS_PER_YEAR).mul(rewardTokenPrice).div(concentratedValue).toNumber();
  }

  getTokenValue(tokenAmount: BN, tokenDecimals: number, tokenPrice: Decimal) {
    return DecimalUtil.adjustDecimals(new Decimal(tokenAmount.toString()), tokenDecimals).mul(tokenPrice);
  }
}
