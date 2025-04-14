import { Address, Rpc, SolanaRpcApi } from '@solana/kit';
import Decimal from 'decimal.js';
import {
  estimateAprsForPriceRange,
  OrcaNetwork,
  OrcaWhirlpoolClient,
  getNearestValidTickIndexFromTickIndex,
  priceToTickIndex,
  PoolData,
} from '@orca-so/whirlpool-sdk';
import axios from 'axios';
import { OrcaWhirlpoolsResponse, Whirlpool } from './OrcaWhirlpoolsResponse';
import { SolanaCluster } from '@hubbleprotocol/hubble-config';
import { WhirlpoolStrategy } from '../@codegen/kliquidity/accounts';
import { Position } from '../@codegen/whirlpools/accounts';
import { WhirlpoolAprApy } from './WhirlpoolAprApy';
import {
  aprToApy,
  GenericPoolInfo,
  getStrategyPriceRangeOrca,
  LiquidityDistribution,
  LiquidityForPrice,
  ZERO,
} from '../utils';
import { PROGRAM_ID as WHIRLPOOLS_PROGRAM_ID } from '../@codegen/whirlpools/programId';
import { CollateralInfo } from '../@codegen/kliquidity/types';
import { KaminoPrices } from '../models';
import { fromLegacyPublicKey } from '@solana/compat';
import { Connection } from '@solana/web3.js';

export class OrcaService {
  private readonly _rpc: Rpc<SolanaRpcApi>;
  private readonly _legacyConnection: Connection;
  private readonly _whirlpoolProgramId: Address;
  private readonly _orcaNetwork: OrcaNetwork;
  private readonly _orcaApiUrl: string;

  constructor(
    rpc: Rpc<SolanaRpcApi>,
    legacyConnection: Connection,
    cluster: SolanaCluster,
    whirlpoolProgramId: Address = WHIRLPOOLS_PROGRAM_ID
  ) {
    this._rpc = rpc;
    this._legacyConnection = legacyConnection;
    this._whirlpoolProgramId = whirlpoolProgramId;
    this._orcaNetwork = cluster === 'mainnet-beta' ? OrcaNetwork.MAINNET : OrcaNetwork.DEVNET;
    this._orcaApiUrl = `https://api.${cluster === 'mainnet-beta' ? 'mainnet' : 'devnet'}.orca.so`;
  }

  getWhirlpoolProgramId(): Address {
    return this._whirlpoolProgramId;
  }

  async getOrcaWhirlpools() {
    return (await axios.get<OrcaWhirlpoolsResponse>(`${this._orcaApiUrl}/v1/whirlpool/list`)).data;
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

  private getPoolTokensPrices(pool: PoolData, prices: KaminoPrices) {
    const tokensPrices: Record<string, Decimal> = {};
    const tokens = [
      pool.tokenMintA.toString(),
      pool.tokenMintB.toString(),
      pool.rewards[0].mint.toString(),
      pool.rewards[1].mint.toString(),
      pool.rewards[2].mint.toString(),
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

  async getPool(poolAddress: Address) {
    const orca = new OrcaWhirlpoolClient({
      connection: this._legacyConnection,
      network: this._orcaNetwork,
    });
    return orca.getPool(poolAddress);
  }

  async getStrategyWhirlpoolPoolAprApy(
    strategy: WhirlpoolStrategy,
    collateralInfos: CollateralInfo[],
    prices: KaminoPrices,
    whirlpools?: Whirlpool[]
  ): Promise<WhirlpoolAprApy> {
    const orca = new OrcaWhirlpoolClient({
      connection: this._legacyConnection,
      network: this._orcaNetwork,
    });
    const position = await Position.fetch(this._rpc, strategy.position);
    if (!position) {
      throw new Error(`Position ${strategy.position.toString()} does not exist`);
    }

    const pool = await orca.getPool(strategy.pool);
    if (!whirlpools) {
      ({ whirlpools } = await this.getOrcaWhirlpools());
    }

    const whirlpool = whirlpools?.find((x) => x.address === strategy.pool);

    if (!pool || !whirlpool) {
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
        ...priceRange,
        rewardsApy: [],
        rewardsApr: [],
        feeApy: ZERO,
        feeApr: ZERO,
        totalApy: ZERO,
        totalApr: ZERO,
      };
    }

    const lpFeeRate = pool.feePercentage;
    const volume24hUsd = whirlpool?.volume?.day ?? new Decimal(0);
    const fee24Usd = new Decimal(volume24hUsd).mul(lpFeeRate).toNumber();
    const tokensPrices = this.getTokenPrices(strategy, prices, collateralInfos);

    const apr = estimateAprsForPriceRange(
      pool,
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
    pool: Address,
    keepOrder: boolean = true,
    lowestTick?: number,
    highestTick?: number
  ): Promise<LiquidityDistribution> {
    const orca = new OrcaWhirlpoolClient({
      connection: this._legacyConnection,
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
    poolPubkey: Address,
    priceLower: Decimal,
    priceUpper: Decimal,
    prices: KaminoPrices,
    whirlpools?: Whirlpool[]
  ): Promise<WhirlpoolAprApy> {
    const orca = new OrcaWhirlpoolClient({
      connection: this._legacyConnection,
      network: this._orcaNetwork,
    });

    const pool = await orca.getPool(poolPubkey);
    if (!whirlpools) {
      ({ whirlpools } = await this.getOrcaWhirlpools());
    }

    const whirlpool = whirlpools?.find((x) => x.address === poolPubkey.toString());

    if (!pool || !whirlpool) {
      throw Error(`Could not get orca pool data for ${poolPubkey}`);
    }

    let strategyOutOfRange = false;
    if (priceLower.gt(pool.price) || priceUpper.lt(pool.price)) {
      strategyOutOfRange = true;
    }
    if (strategyOutOfRange) {
      return {
        priceLower,
        priceUpper,
        strategyOutOfRange,
        poolPrice: pool.price,
        rewardsApy: [],
        rewardsApr: [],
        feeApy: ZERO,
        feeApr: ZERO,
        totalApy: ZERO,
        totalApr: ZERO,
      };
    }

    const lpFeeRate = pool.feePercentage;
    const volume24hUsd = whirlpool?.volume?.day ?? new Decimal(0);
    const fee24Usd = new Decimal(volume24hUsd).mul(lpFeeRate).toNumber();
    const tokensPrices = this.getPoolTokensPrices(pool, prices);

    const tickLowerIndex = getNearestValidTickIndexFromTickIndex(
      priceToTickIndex(priceLower, pool.tokenDecimalsA, pool.tokenDecimalsB),
      whirlpool.tickSpacing
    );
    const tickUpperIndex = getNearestValidTickIndexFromTickIndex(
      priceToTickIndex(priceUpper, pool.tokenDecimalsA, pool.tokenDecimalsB),
      whirlpool.tickSpacing
    );

    const apr = estimateAprsForPriceRange(pool, tokensPrices, fee24Usd, tickLowerIndex, tickUpperIndex);

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
      poolPrice: pool.price,
      strategyOutOfRange,
    };
  }

  async getGenericPoolInfo(poolPubkey: Address, whirlpools?: Whirlpool[]) {
    const orca = new OrcaWhirlpoolClient({
      connection: this._legacyConnection,
      network: this._orcaNetwork,
    });

    const poolString = poolPubkey.toString();
    const pool = await orca.getPool(poolPubkey);
    if (!whirlpools) {
      ({ whirlpools } = await this.getOrcaWhirlpools());
    }

    const whirlpool = whirlpools?.find((x) => x.address === poolString);

    if (!pool || !whirlpool) {
      throw Error(`Could not get orca pool data for ${poolString}`);
    }

    const poolInfo: GenericPoolInfo = {
      dex: 'ORCA',
      address: poolPubkey,
      tokenMintA: fromLegacyPublicKey(pool.tokenMintA),
      tokenMintB: fromLegacyPublicKey(pool.tokenMintB),
      price: pool.price,
      feeRate: pool.feePercentage,
      volumeOnLast7d: whirlpool.volume ? new Decimal(whirlpool.volume?.week) : undefined,
      tvl: whirlpool.tvl ? new Decimal(whirlpool.tvl) : undefined,
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
          { memcmp: { bytes: pool, offset: 8n, encoding: 'base58' } },
        ],
      })
      .send();

    return rawPositions.length;
  }
}
