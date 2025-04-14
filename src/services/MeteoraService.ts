import { address, Address, Rpc, SolanaRpcApi } from '@solana/kit';
import Decimal from 'decimal.js';
import { WhirlpoolStrategy } from '../@codegen/kliquidity/accounts';
import {
  aprToApy,
  GenericPoolInfo,
  getMeteoraPriceLowerUpper,
  getMintDecimals,
  getStrategyPriceRangeMeteora,
  LiquidityDistribution,
  ZERO,
} from '../utils';
import { LbPair, PositionV2 } from '../@codegen/meteora/accounts';
import { WhirlpoolAprApy } from './WhirlpoolAprApy';
import { PROGRAM_ID as METEORA_PROGRAM_ID } from '../@codegen/meteora/programId';
import { getPriceOfBinByBinIdWithDecimals } from '../utils/meteora';
import { DEFAULT_PUBLIC_KEY } from '../constants/pubkeys';

export interface MeteoraPool {
  key: Address;
  pool: LbPair;
}

export class MeteoraService {
  private readonly _rpc: Rpc<SolanaRpcApi>;
  private readonly _meteoraProgramId: Address;

  constructor(rpc: Rpc<SolanaRpcApi>, meteoraProgramId: Address = METEORA_PROGRAM_ID) {
    this._rpc = rpc;
    this._meteoraProgramId = meteoraProgramId;
  }

  getMeteoraProgramId(): Address {
    return this._meteoraProgramId;
  }

  async getPool(poolAddress: Address): Promise<LbPair | null> {
    return await LbPair.fetch(this._rpc, poolAddress);
  }

  async getPosition(position: Address): Promise<PositionV2 | null> {
    return await PositionV2.fetch(this._rpc, position);
  }

  async getMeteoraPools(): Promise<MeteoraPool[]> {
    const rawPools = await this._rpc.getProgramAccounts(METEORA_PROGRAM_ID, {
      commitment: 'confirmed',
      filters: [{ dataSize: 904n }],
    }).send();
    const pools: MeteoraPool[] = [];
    for (let i = 0; i < rawPools.length; i++) {
      try {
        const lbPair = LbPair.decode(Buffer.from(rawPools[i].account.data));
        pools.push({ pool: lbPair, key: rawPools[i].pubkey });
      } catch (e) {
        console.log(e);
      }
    }
    return pools;
  }

  async getStrategyMeteoraPoolAprApy(strategy: WhirlpoolStrategy): Promise<WhirlpoolAprApy> {
    const position = await this.getPosition(strategy.position);

    const pool = await this.getPool(strategy.pool);

    const decimalsX = strategy.tokenAMintDecimals.toNumber();
    const decimalsY = strategy.tokenBMintDecimals.toNumber();
    let priceLower: Decimal = new Decimal(0);
    let priceUpper: Decimal = new Decimal(0);
    if (position && pool) {
      const priceRange = getMeteoraPriceLowerUpper(
        position.lowerBinId,
        position.upperBinId,
        pool.binStep,
        decimalsX,
        decimalsY
      );
      priceLower = priceRange.priceLower;
      priceUpper = priceRange.priceUpper;
    }

    let priceRange = { priceLower, poolPrice: new Decimal(0), priceUpper, strategyOutOfRange: true };
    if (pool && position) {
      priceRange = getStrategyPriceRangeMeteora(
        priceLower,
        priceUpper,
        pool.activeId,
        pool.binStep,
        decimalsX,
        decimalsY
      );
    }

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

    // TODO: fix this
    const totalApr = new Decimal(0);
    const feeApr = new Decimal(0);
    const rewardsApr = [new Decimal(0)];
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
  async getMeteoraLiquidityDistribution(
    poolKey: Address,
    keepOrder: boolean = true,
    lowestTick?: number,
    highestTick?: number
  ): Promise<LiquidityDistribution> {
    // trick the linter
    (() => {
      return { keepOrder, highestTick, lowestTick };
    })();
    //TODO: fix this
    const pool = await this.getPool(poolKey);
    if (!pool) {
      // if the pool doesn't exist, return empty distribution
      return {
        currentPrice: new Decimal(0),
        currentTickIndex: 0,
        distribution: [],
      };
    }

    const currentTickIndex = pool.activeId;
    const tokenXDecimals = await getMintDecimals(this._rpc, pool.tokenXMint);
    const tokenYDecimals = await getMintDecimals(this._rpc, pool.tokenYMint);
    const currentPrice = getPriceOfBinByBinIdWithDecimals(
      currentTickIndex,
      pool.binStep,
      tokenXDecimals,
      tokenYDecimals
    );
    // TODO: add actual distribution
    return {
      currentPrice,
      currentTickIndex,
      distribution: [],
    };
  }

  async getMeteoraPositionAprApy(
    poolPubkey: Address,
    priceLower: Decimal,
    priceUpper: Decimal
  ): Promise<WhirlpoolAprApy> {
    const pool = await this.getPool(poolPubkey);
    if (!pool) {
      return {
        priceLower: ZERO,
        priceUpper: ZERO,
        poolPrice: ZERO,
        strategyOutOfRange: true,
        rewardsApy: [],
        rewardsApr: [],
        feeApy: ZERO,
        feeApr: ZERO,
        totalApy: ZERO,
        totalApr: ZERO,
      };
    }
    const tokenXDecimals = await getMintDecimals(this._rpc, pool.tokenXMint);
    const tokenYDecimals = await getMintDecimals(this._rpc, pool.tokenYMint);
    const priceRange = getStrategyPriceRangeMeteora(
      priceLower,
      priceUpper,
      pool.activeId,
      pool.binStep,
      tokenXDecimals,
      tokenYDecimals
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
    const totalApr = new Decimal(0);
    const feeApr = new Decimal(0);
    const rewardsApr = [new Decimal(0)];
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

  async getGenericPoolInfo(poolPubkey: Address): Promise<GenericPoolInfo> {
    const pool = await this.getPool(poolPubkey);
    if (!pool) {
      return {
        dex: 'METEORA',
        address: DEFAULT_PUBLIC_KEY,
        tokenMintA: DEFAULT_PUBLIC_KEY,
        tokenMintB: DEFAULT_PUBLIC_KEY,
        price: new Decimal(0),
        feeRate: new Decimal(0),
        volumeOnLast7d: new Decimal(0),
        tvl: new Decimal(0),
        tickSpacing: new Decimal(0),
        positions: new Decimal(0),
      };
    }
    const tokenXDecimals = await getMintDecimals(this._rpc, pool.tokenXMint);
    const tokenYDecimals = await getMintDecimals(this._rpc, pool.tokenYMint);
    const price = getPriceOfBinByBinIdWithDecimals(pool.activeId, pool.binStep, tokenXDecimals, tokenYDecimals);

    const poolInfo: GenericPoolInfo = {
      dex: 'METEORA',
      address: address(poolPubkey),
      tokenMintA: pool.tokenXMint,
      tokenMintB: pool.tokenYMint,
      price,
      feeRate: computeMeteoraFee(pool),
      // TODO: add these
      volumeOnLast7d: new Decimal(0),
      tvl: new Decimal(0),
      tickSpacing: new Decimal(pool.binStep),
      // todo(Silviu): get real amount of positions
      positions: new Decimal(await this.getPositionsCountByPool(poolPubkey)),
    };
    return poolInfo;
  }

  async getPositionsCountByPool(pool: Address): Promise<number> {
    const rawPositions = await this._rpc.getProgramAccounts(METEORA_PROGRAM_ID, {
      commitment: 'confirmed',
      filters: [{ dataSize: 8120n, }, { memcmp: { bytes: pool, offset: 8n, encoding: 'base58' } }],
    }).send();

    return rawPositions.length;
  }
}

export function computeMeteoraFee(pool: LbPair): Decimal {
  return new Decimal(pool.parameters.baseFactor).mul(new Decimal(pool.binStep)).div(new Decimal(1e6));
}
