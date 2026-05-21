import { expect } from 'chai';
import { address, Address } from '@solana/kit';
import {
  ClmmConfigLayout,
  DynamicFeeInfo,
  PersonalPositionLayout,
  PoolInfoLayout,
  TickUtil,
} from '@raydium-io/raydium-sdk-v2/lib';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import Decimal from 'decimal.js';
import { RaydiumService } from '../src/services/RaydiumService';
import {
  getPdaProtocolPositionAddress,
  i32ToBytes,
  RaydiumLiquidityMath,
  RaydiumSqrtPriceMath,
  RaydiumTickMath,
  RaydiumTickUtils,
} from '../src/utils/raydiumSdkCompat';
import { AMM_V3_PROGRAM_ADDRESS } from '../src/@codegen/raydium/programs';

const key = (byte: number) => new PublicKey(new Uint8Array(32).fill(byte));
const poolAddress = address(key(9).toBase58());
const configKey = key(1);
const fundOwner = key(2);
const mintA = key(3);
const mintB = key(4);
const vaultA = key(5);
const vaultB = key(6);
const observationId = key(7);
const creator = key(8);

function rewardInfo() {
  return {
    state: 0,
    openTime: new BN(0),
    endTime: new BN(0),
    lastUpdateTime: new BN(0),
    emissionsPerSecondX64: new BN(0),
    totalEmissioned: new BN(0),
    claimed: new BN(0),
    mint: PublicKey.default,
    vault: PublicKey.default,
    creator: PublicKey.default,
    growthGlobalX64: new BN(0),
  };
}

function dynamicFeeInfo(overrides: Partial<ReturnType<typeof DynamicFeeInfo.getDynamicFeeInfo>> = {}) {
  return {
    filterPeriod: 0,
    decayPeriod: 0,
    reductionFactor: 0,
    dynamicFeeControl: 0,
    maxVolatilityAccumulator: 0,
    tickSpacingIndexReference: 0,
    volatilityReference: 0,
    volatilityAccumulator: 0,
    lastUpdateTimestamp: new BN(0),
    ...overrides,
  };
}

function poolLayoutValue(overrides: Record<string, unknown> = {}) {
  return {
    bump: 1,
    configId: configKey,
    creator,
    mintA,
    mintB,
    vaultA,
    vaultB,
    observationId,
    mintDecimalsA: 6,
    mintDecimalsB: 9,
    tickSpacing: 8,
    liquidity: new BN(1_000_000),
    sqrtPriceX64: TickUtil.priceToSqrtPriceX64(new Decimal('1.23'), 6, 9),
    tickCurrent: 71110,
    feeGrowthGlobalX64A: new BN(0),
    feeGrowthGlobalX64B: new BN(0),
    protocolFeesTokenA: new BN(0),
    protocolFeesTokenB: new BN(0),
    status: 0,
    feeOn: 1,
    rewardInfos: [rewardInfo(), rewardInfo(), rewardInfo()],
    tickArrayBitmap: Buffer.alloc(128),
    fundFeesTokenA: new BN(0),
    fundFeesTokenB: new BN(0),
    startTime: new BN(123),
    recentEpoch: new BN(0),
    dynamicFeeInfo: dynamicFeeInfo(),
    ...overrides,
  };
}

function encodePoolLayout(overrides: Record<string, unknown> = {}) {
  const buffer = Buffer.alloc(PoolInfoLayout.span);
  PoolInfoLayout.encode(poolLayoutValue(overrides), buffer);
  return buffer;
}

function encodeConfigLayout() {
  const buffer = Buffer.alloc(ClmmConfigLayout.span);
  ClmmConfigLayout.encode(
    {
      bump: 1,
      index: 0,
      owner: PublicKey.default,
      protocolFeeRate: 12,
      tradeFeeRate: 400,
      tickSpacing: 8,
      fundFeeRate: 44,
      fundOwner,
    },
    buffer
  );
  return buffer;
}

describe('Raydium SDK bump compatibility', () => {
  it('uses the new personal position layout for pool position scans', async () => {
    let capturedConfig: any;
    const rpc = {
      getProgramAccounts: (_programId: Address, config: any) => {
        capturedConfig = config;
        return { send: async () => [{}, {}] };
      },
    };
    const service = new RaydiumService(rpc as any);

    const count = await service.getPositionsCountByPool(poolAddress);

    expect(count).to.equal(2);
    expect(capturedConfig.filters[0].dataSize).to.equal(BigInt(PersonalPositionLayout.span));
    expect(capturedConfig.filters[1].memcmp.offset).to.equal(BigInt(PersonalPositionLayout.offsetOf('poolId')));
    expect(PoolInfoLayout.offsetOf('configId')).to.equal(9);
    expect(PoolInfoLayout.offsetOf('ammConfig')).to.equal(undefined);
  });

  it('decodes SDK CLMM pool data using configId and the new decimal field names', async () => {
    const encodedPool = encodePoolLayout();
    const rpc = {
      getAccountInfo: () => ({
        send: async () => ({
          value: { data: [encodedPool.toString('base64'), 'base64'] },
        }),
      }),
    };
    const service = new RaydiumService(rpc as any);

    const pool = await service.getRpcClmmPoolInfo(poolAddress);

    expect(pool.configId.toBase58()).to.equal(configKey.toBase58());
    expect((pool as any).ammConfig).to.equal(undefined);
    expect(pool.mintDecimalsA).to.equal(6);
    expect(pool.mintDecimalsB).to.equal(9);
    expect(pool.currentPrice).to.be.closeTo(1.23, 0.000000000001);
  });

  it('fetches CLMM config accounts through configId and preserves new fee fields', async () => {
    const encodedPool = encodePoolLayout();
    const decodedPool = PoolInfoLayout.decode(encodedPool);
    const encodedConfig = encodeConfigLayout();
    const requestedAccountBatches: Address[][] = [];
    const rpc = {
      getMultipleAccounts: (addresses: Address[]) => {
        requestedAccountBatches.push(addresses);
        const data = requestedAccountBatches.length === 1 ? encodedPool : encodedConfig;
        return {
          send: async () => ({
            value: [{ data: [data.toString('base64'), 'base64'] }],
          }),
        };
      },
    };
    const service = new RaydiumService(rpc as any);
    (service as any).fetchMultipleMintInfos = async (mints: Address[]) =>
      Object.fromEntries(
        mints.map((mint) => [
          mint.toString(),
          {
            programId: PublicKey.default,
            feeConfig: undefined,
          },
        ])
      );
    (service as any).fetchExBitmaps = async () => ({});

    const result = await service.fetchComputeMultipleClmmInfo([
      {
        address: poolAddress,
        clmmPoolRpcInfo: {
          ...decodedPool,
          currentPrice: 1.23,
          programId: new PublicKey(AMM_V3_PROGRAM_ADDRESS.toString()),
        },
      },
    ]);

    expect(requestedAccountBatches[1][0].toString()).to.equal(configKey.toBase58());
    expect(result[poolAddress].accInfo.configId.toBase58()).to.equal(configKey.toBase58());
    expect(result[poolAddress].ammConfig.id.toBase58()).to.equal(configKey.toBase58());
    expect(result[poolAddress].ammConfig.fundOwner).to.equal(fundOwner.toBase58());
    expect(result[poolAddress].ammConfig.fundFeeRate).to.equal(44);
  });

  it('surfaces feeOn and hasDynamicFee on RPC-built API pool info', () => {
    const accInfo = PoolInfoLayout.decode(
      encodePoolLayout({
        feeOn: 1,
        dynamicFeeInfo: dynamicFeeInfo({
          filterPeriod: 10,
          decayPeriod: 20,
          dynamicFeeControl: 30,
          maxVolatilityAccumulator: 40,
        }),
      })
    );
    const service = new RaydiumService({} as any);

    const apiInfo = service.clmmComputeInfoToApiInfo({
      accInfo,
      id: key(9),
      version: 6,
      programId: new PublicKey(AMM_V3_PROGRAM_ADDRESS.toString()),
      mintA: { decimals: 6, extensions: {} },
      mintB: { decimals: 9, extensions: {} },
      ammConfig: {
        id: configKey,
        index: 0,
        protocolFeeRate: 12,
        tradeFeeRate: 400,
        tickSpacing: 8,
        fundFeeRate: 44,
        fundOwner: fundOwner.toBase58(),
        description: '',
      },
      currentPrice: new Decimal('1.23'),
      startTime: 123,
    } as any);

    expect(apiInfo.feeOn).to.contain('Token0Only');
    expect(apiInfo.hasDynamicFee).to.equal(true);
  });

  it('hydrates RPC-built API pool info with indexed Raydium volume stats', () => {
    const accInfo = PoolInfoLayout.decode(encodePoolLayout());
    const service = new RaydiumService({} as any);

    const apiInfo = service.clmmComputeInfoToApiInfo(
      {
        accInfo,
        id: key(9),
        version: 6,
        programId: new PublicKey(AMM_V3_PROGRAM_ADDRESS.toString()),
        mintA: { decimals: 6, extensions: {} },
        mintB: { decimals: 9, extensions: {} },
        ammConfig: {
          id: configKey,
          index: 0,
          protocolFeeRate: 12,
          tradeFeeRate: 400,
          tickSpacing: 8,
          fundFeeRate: 44,
          fundOwner: fundOwner.toBase58(),
          description: '',
        },
        currentPrice: new Decimal('1.23'),
        startTime: 123,
      } as any,
      {
        tvl: 12345,
        day: {
          volume: 101,
          volumeFee: 0.404,
          feeApr: 1.5,
          apr: 2.5,
          priceMin: 1.1,
          priceMax: 1.4,
          rewardApr: { A: 3, B: 4, C: 5 },
        },
        week: {
          volume: 707,
          volumeQuote: 708,
          volumeFee: 2.828,
          feeApr: 10.5,
          apr: 12.5,
          priceMin: 1,
          priceMax: 1.6,
          rewardApr: [6, 7],
        },
        month: {
          volume: 3030,
          volumeFee: 12.12,
          feeApr: 45,
          apr: 50,
          priceMin: 0.9,
          priceMax: 1.7,
        },
      }
    );

    expect(apiInfo.tvl).to.equal(12345);
    expect(apiInfo.day.volume).to.equal(101);
    expect(apiInfo.day.volumeQuote).to.equal(0);
    expect(apiInfo.day.volumeFee).to.equal(0.404);
    expect(apiInfo.day.rewardApr).to.deep.equal([3, 4, 5]);
    expect(apiInfo.week.volume).to.equal(707);
    expect(apiInfo.week.volumeQuote).to.equal(708);
    expect(apiInfo.week.rewardApr).to.deep.equal([6, 7]);
    expect(apiInfo.month.volume).to.equal(3030);
    expect(apiInfo.month.rewardApr).to.deep.equal([]);
  });

  it('keeps the old Raydium math helper behavior through the compatibility shim', () => {
    const price = new Decimal('1.23');
    const tickSpacing = 8;
    const rawTick = TickUtil.priceToTick(price, 6, 9);
    const expectedTick =
      (rawTick < 0 ? Math.floor(rawTick / tickSpacing) : Math.ceil(rawTick / tickSpacing)) * tickSpacing;

    expect(RaydiumTickMath.getTickWithPriceAndTickspacing(price, tickSpacing, 6, 9)).to.equal(expectedTick);
    expect(RaydiumTickUtils.getTickArrayStartIndexByTick(121, tickSpacing)).to.equal(0);

    const lower = RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(-120);
    const upper = RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(120);
    const current = RaydiumSqrtPriceMath.getSqrtPriceX64FromTick(0);
    const liquidity = new BN(100_000_000);
    const amounts = RaydiumLiquidityMath.getAmountsFromLiquidity(current, lower, upper, liquidity, true);

    expect(amounts.amountA.toString()).to.equal('598174');
    expect(amounts.amountB.toString()).to.equal('598174');
  });

  it('keeps Raydium PDA tick indexes encoded as signed big-endian bytes', () => {
    expect(Array.from(i32ToBytes(480))).to.deep.equal([0, 0, 1, 224]);
    expect(Array.from(i32ToBytes(-480))).to.deep.equal([255, 255, 254, 32]);

    const { publicKey, nonce } = getPdaProtocolPositionAddress(
      new PublicKey(AMM_V3_PROGRAM_ADDRESS.toString()),
      key(9),
      -120,
      120
    );

    expect(publicKey.toBase58()).to.equal('CABgxMExCkWFVPZZCYvQYPX96wrjcq6XZhUkBRtGuwG8');
    expect(nonce).to.equal(255);
  });
});
