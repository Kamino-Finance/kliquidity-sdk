import { address } from '@solana/kit';
import { expect } from 'chai';
import Decimal from 'decimal.js';
import { OrcaService } from '../src/services/OrcaService';
import type { KaminoPrices } from '../src/models';

describe('OrcaService sparse reward metadata', () => {
  const pyusdMint = '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo';
  const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const orcaMint = 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE';
  const poolAddress = '9tXiuRRw7kbejLhZXtxDxYs2REe43uH2e7k1kocgdM9B';

  const prices: KaminoPrices = {
    spot: {
      [pyusdMint]: { price: new Decimal('1'), name: 'PYUSD' },
      [usdcMint]: { price: new Decimal('1'), name: 'USDC' },
      [orcaMint]: { price: new Decimal('2'), name: 'ORCA' },
    },
    twap: {},
  };

  const sparseRewardsPool = {
    address: poolAddress,
    whirlpoolsConfig: '2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ',
    whirlpoolBump: [255],
    tickSpacing: 1,
    tickSpacingSeed: [1, 0],
    feeRate: 100,
    protocolFeeRate: 1300,
    liquidity: '23422273307633754',
    sqrtPrice: '18446810778587887973',
    tickCurrentIndex: 0,
    protocolFeeOwedA: '9219285',
    protocolFeeOwedB: '113392',
    tokenMintA: pyusdMint,
    tokenVaultA: 'EeF6oBy6AQiBJoRx5xiRNxa6cmpQE3ayVagj28QFZuyg',
    feeGrowthGlobalA: '610132396549083',
    tokenMintB: usdcMint,
    tokenVaultB: 'MvB8poDgpDPbRgx8MXeb7EPEsawGuiBTqpkpM9exeLi',
    feeGrowthGlobalB: '598228278639491',
    rewardLastUpdatedTimestamp: '2026-03-11T20:07:40Z',
    updatedAt: '2026-03-11T20:07:53.756035Z',
    updatedSlot: 405764585,
    writeVersion: 3851831640,
    hasWarning: false,
    poolType: 'whirlpool',
    tokenA: {
      address: pyusdMint,
      programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
      imageUrl: '',
      name: 'PayPal USD',
      symbol: 'PYUSD',
      decimals: 6,
      tags: [],
    },
    tokenB: {
      address: usdcMint,
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      imageUrl: '',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      tags: [],
    },
    price: '1.00000723217047679113',
    tvlUsdc: null,
    yieldOverTvl: null,
    tokenBalanceA: null,
    tokenBalanceB: null,
    stats: {
      '24h': { volume: '1000000', fees: null, rewards: null, yieldOverTvl: null },
      '7d': { volume: null, fees: null, rewards: null, yieldOverTvl: null },
      '30d': { volume: null, fees: null, rewards: null, yieldOverTvl: null },
    },
    rewards: [],
    feeTierIndex: 1,
    adaptiveFeeEnabled: false,
    tradeEnableTimestamp: '1970-01-01T00:00:00Z',
  } as any;

  it('skips missing reward entries when reading Orca pool token prices', () => {
    const service = new OrcaService({} as any);

    const tokenPrices = (service as any).getPoolTokensPrices(sparseRewardsPool, prices) as Map<string, Decimal>;

    expect(Array.from(tokenPrices.keys())).to.deep.equal([pyusdMint, usdcMint]);
  });

  it('builds an empty rewards-decimals map when Orca API returns an empty rewards array', () => {
    const service = new OrcaService({} as any);
    const rewardsDecimals = (service as any).getRewardsDecimals(sparseRewardsPool, {
      position: address('8cP9fBSXVka3EmzfrEaqgGzk3cx3DcevVQrhiSFjgF2V'),
      pool: address(poolAddress),
      tokenAMint: address(pyusdMint),
      tokenBMint: address(usdcMint),
      tokenAMintDecimals: 6n,
      tokenBMintDecimals: 6n,
      tokenACollateralId: 0n,
      tokenBCollateralId: 1n,
      reward0CollateralId: 2n,
      reward1CollateralId: 3n,
      reward2CollateralId: 0n,
      reward0Decimals: 6n,
      reward1Decimals: 6n,
      reward2Decimals: 0n,
    } as any) as Map<string, number>;

    expect(Array.from(rewardsDecimals.entries())).to.deep.equal([]);
  });

  it('does not throw when an Orca reward mint exists but its price is missing', () => {
    const service = new OrcaService({} as any);
    const poolWithRewardMint = {
      ...sparseRewardsPool,
      rewards: [{ mint: orcaMint }],
    };
    const pricesWithoutReward: KaminoPrices = {
      spot: {
        [pyusdMint]: { price: new Decimal('1'), name: 'PYUSD' },
        [usdcMint]: { price: new Decimal('1'), name: 'USDC' },
      },
      twap: {},
    };

    expect(() => (service as any).getPoolTokensPrices(poolWithRewardMint, pricesWithoutReward)).to.not.throw();
  });
});
