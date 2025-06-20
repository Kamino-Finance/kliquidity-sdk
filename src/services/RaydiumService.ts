import { Address, Base58EncodedBytes, Rpc, SolanaRpcApi } from '@solana/kit';
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
  LiquidityDistribution,
  LiquidityForPrice,
  ZERO,
} from '../utils';
import axios from 'axios';
import { FullPercentage } from '../utils/CreationParameters';
import { PROGRAM_ID as RAYDIUM_PROGRAM_ID } from '../@codegen/raydium/programId';
import { priceToTickIndexWithRounding } from '../utils/raydium';
import {
  ApiV3PoolInfoConcentratedItem,
  Clmm,
  PoolUtils,
  PositionInfoLayout,
  Raydium,
  RaydiumLoadParams,
  SqrtPriceMath,
  TickMath,
} from '@raydium-io/raydium-sdk-v2/lib';
import { Connection } from '@solana/web3.js';

export class RaydiumService {
  private readonly _rpc: Rpc<SolanaRpcApi>;
  private readonly _legacyConnection: Connection;
  private readonly _raydiumProgramId: Address;

  constructor(rpc: Rpc<SolanaRpcApi>, legacyConnection: Connection, raydiumProgramId: Address = RAYDIUM_PROGRAM_ID) {
    this._rpc = rpc;
    this._legacyConnection = legacyConnection;
    this._raydiumProgramId = raydiumProgramId;
  }

  getRaydiumProgramId(): Address {
    return this._raydiumProgramId;
  }

  async getRaydiumWhirlpools(): Promise<RaydiumPoolsResponse> {
    return (await axios.get<RaydiumPoolsResponse>(`https://api.kamino.finance/v2/raydium/ammPools`)).data;
  }

  async getRaydiumPoolInfo(poolPubkey: Address): Promise<ApiV3PoolInfoConcentratedItem> {
    const raydiumLoadParams: RaydiumLoadParams = { connection: this._legacyConnection };
    const raydium = await Raydium.load(raydiumLoadParams);
    const rayClmm = new Clmm({ scope: raydium, moduleName: '' });
    const otherPoolInfo = await rayClmm.getPoolInfoFromRpc(poolPubkey.toString());
    console.log('otherPoolInfo', otherPoolInfo);
    return otherPoolInfo.poolInfo;
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
    const rewards = rewardsApr.map((reward) => new Decimal(reward).div(100));

    return {
      totalApr,
      totalApy: aprToApy(totalApr, 365),
      feeApr: fee,
      feeApy: aprToApy(fee, 365),
      rewardsApr: rewards,
      rewardsApy: rewards.map((x) => aprToApy(x, 365)),
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
    const rewards = rewardsApr.map((reward) => new Decimal(reward).div(100));

    return {
      totalApr,
      totalApy: aprToApy(totalApr, 365),
      feeApr: fee,
      feeApy: aprToApy(fee, 365),
      rewardsApr: rewards,
      rewardsApy: rewards.map((x) => aprToApy(x, 365)),
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
}
