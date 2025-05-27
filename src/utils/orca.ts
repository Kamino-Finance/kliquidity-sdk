import { BN } from '@coral-xyz/anchor';
import {
  address,
  Address,
  GetAccountInfoApi,
  getAddressEncoder,
  GetMultipleAccountsApi,
  getProgramDerivedAddress,
  Rpc,
} from '@solana/kit';
import { ProgramDerivedAddress } from '@solana/addresses/dist/types/program-derived-address';
import { ONE_BN, U64_MAX, ZERO_BN } from '../constants';
import { Percentage } from './types';
import { DEFAULT_ADDRESS, IncreaseLiquidityQuoteParam } from '@orca-so/whirlpools';
import { TickArray, Whirlpool } from '../@codegen/whirlpools/accounts';
import {
  _MAX_TICK_INDEX,
  _MIN_TICK_INDEX,
  getTickArrayStartTickIndex,
  IncreaseLiquidityQuote,
  tickIndexToPrice,
  TransferFee,
} from '@orca-so/whirlpools-core';
import { increaseLiquidityQuoteA, increaseLiquidityQuoteB, increaseLiquidityQuote } from '@orca-so/whirlpools-core';
import { Whirlpool as WhirlpoolAPIResponse, WhirlpoolReward } from '../services/OrcaWhirlpoolsResponse';
import Decimal from 'decimal.js/decimal';
import { getRemoveLiquidityQuote } from './whirlpools';
import { FullBPS } from './CreationParameters';
import { fetchMaybeTickArray, getTickArrayAddress } from '@orca-so/whirlpools-client';
import { sleep } from './utils';
import { ZERO } from './math';

export const defaultSlippagePercentageBPS = 10;
const addressEncoder = getAddressEncoder();

const TICK_ARRAY_SIZE = 88;

const SECONDS_PER_YEAR =
  60 * // SECONDS
  60 * // MINUTES
  24 * // HOURS
  365; // DAYS

function estimateRewardApr(
  reward: WhirlpoolReward,
  rewardTokenDecimals: number,
  concentratedValue: Decimal,
  tokenPrices: Map<Address, Decimal>
) {
  const { mint } = reward;
  const rewardTokenPrice = tokenPrices.get(address(mint));
  const emissionsPerSecond = new Decimal(reward.emissionsPerSecond).div(new Decimal(10).pow(rewardTokenDecimals));
  if (emissionsPerSecond.eq(ZERO) || !rewardTokenPrice) {
    return 0;
  }

  const res = emissionsPerSecond.mul(SECONDS_PER_YEAR).mul(rewardTokenPrice).div(concentratedValue).toNumber();
  return res;
}

export async function getTickArray(
  programId: Address,
  whirlpoolAddress: Address,
  startTick: number
): Promise<ProgramDerivedAddress> {
  return await getProgramDerivedAddress({
    seeds: [Buffer.from('tick_array'), addressEncoder.encode(whirlpoolAddress), Buffer.from(startTick.toString())],
    programAddress: programId,
  });
}

export function getTokenAFromLiquidity(liquidity: BN, sqrtPrice0X64: BN, sqrtPrice1X64: BN, roundUp: boolean) {
  const [sqrtPriceLowerX64, sqrtPriceUpperX64] = orderSqrtPrice(sqrtPrice0X64, sqrtPrice1X64);

  const numerator = liquidity.mul(sqrtPriceUpperX64.sub(sqrtPriceLowerX64)).shln(64);
  const denominator = sqrtPriceUpperX64.mul(sqrtPriceLowerX64);
  if (roundUp) {
    return divRoundUp(numerator, denominator);
  } else {
    return numerator.div(denominator);
  }
}

export function getTokenBFromLiquidity(liquidity: BN, sqrtPrice0X64: BN, sqrtPrice1X64: BN, roundUp: boolean) {
  const [sqrtPriceLowerX64, sqrtPriceUpperX64] = orderSqrtPrice(sqrtPrice0X64, sqrtPrice1X64);

  const result = liquidity.mul(sqrtPriceUpperX64.sub(sqrtPriceLowerX64));
  if (roundUp) {
    return shiftRightRoundUp(result);
  } else {
    return result.shrn(64);
  }
}

export function getNearestValidTickIndexFromTickIndex(tickIndex: number, tickSpacing: number): number {
  return tickIndex - (tickIndex % tickSpacing);
}

export function getIncreaseLiquidityQuote(
  param: IncreaseLiquidityQuoteParam,
  pool: Whirlpool,
  tickLowerIndex: number,
  tickUpperIndex: number,
  slippageToleranceBps: number,
  transferFeeA: TransferFee | undefined,
  transferFeeB: TransferFee | undefined
): IncreaseLiquidityQuote {
  if ('liquidity' in param) {
    return increaseLiquidityQuote(
      param.liquidity,
      slippageToleranceBps,
      BigInt(pool.sqrtPrice.toString()),
      tickLowerIndex,
      tickUpperIndex,
      transferFeeA,
      transferFeeB
    );
  } else if ('tokenA' in param) {
    return increaseLiquidityQuoteA(
      param.tokenA,
      slippageToleranceBps,
      BigInt(pool.sqrtPrice.toString()),
      tickLowerIndex,
      tickUpperIndex,
      transferFeeA,
      transferFeeB
    );
  } else {
    return increaseLiquidityQuoteB(
      param.tokenB,
      slippageToleranceBps,
      BigInt(pool.sqrtPrice.toString()),
      tickLowerIndex,
      tickUpperIndex,
      transferFeeA,
      transferFeeB
    );
  }
}

function orderSqrtPrice(sqrtPrice0X64: BN, sqrtPrice1X64: BN): [BN, BN] {
  if (sqrtPrice0X64.lt(sqrtPrice1X64)) {
    return [sqrtPrice0X64, sqrtPrice1X64];
  } else {
    return [sqrtPrice1X64, sqrtPrice0X64];
  }
}

function shiftRightRoundUp(n: BN): BN {
  let result = n.shrn(64);

  if (n.mod(new BN(U64_MAX)).gt(ZERO_BN)) {
    result = result.add(ONE_BN);
  }

  return result;
}

function divRoundUp(n0: BN, n1: BN): BN {
  const hasRemainder = !n0.mod(n1).eq(ZERO_BN);
  if (hasRemainder) {
    return n0.div(n1).add(ONE_BN);
  } else {
    return n0.div(n1);
  }
}

export function adjustForSlippage(n: BN, { numerator, denominator }: Percentage, adjustUp: boolean): BN {
  if (adjustUp) {
    return n.mul(denominator.add(numerator)).div(denominator);
  } else {
    return n.mul(denominator).div(denominator.add(numerator));
  }
}

export type EstimatedAprs = {
  fee: number;
  rewards: number[];
};

export const ZERO_APR = {
  fee: 0,
  rewards: [0, 0, 0],
};

export function estimateAprsForPriceRange(
  pool: WhirlpoolAPIResponse,
  tokenPrices: Map<Address, Decimal>,
  fees24h: number,
  tickLowerIndex: number,
  tickUpperIndex: number,
  rewardsDecimals: Map<Address, number>
): EstimatedAprs {
  const tokenPriceA = tokenPrices.get(address(pool.tokenMintA));
  const tokenPriceB = tokenPrices.get(address(pool.tokenMintB));

  if (!fees24h || !tokenPriceA || !tokenPriceB || tickLowerIndex >= tickUpperIndex) {
    return ZERO_APR;
  }

  // Value of liquidity if the entire liquidity were concentrated between tickLower/Upper
  // Since this is virtual liquidity, concentratedValue should actually be less than totalValue
  const { minTokenA, minTokenB } = getRemoveLiquidityQuote({
    positionAddress: DEFAULT_ADDRESS,
    tickCurrentIndex: pool.tickCurrentIndex,
    sqrtPrice: new BN(pool.sqrtPrice.toString()),
    tickLowerIndex,
    tickUpperIndex,
    liquidity: new BN(pool.liquidity.toString()),
    slippageTolerance: { numerator: ZERO_BN, denominator: new BN(FullBPS) },
  });
  const tokenValueA = getTokenValue(minTokenA, pool.tokenA.decimals, tokenPriceA);
  const tokenValueB = getTokenValue(minTokenB, pool.tokenB.decimals, tokenPriceB);
  const concentratedValue = tokenValueA.add(tokenValueB);

  const feesPerYear = new Decimal(fees24h).mul(365).div(new Decimal(10).pow(6)); // scale from lamports of USDC to tokens
  const feeApr = feesPerYear.div(concentratedValue).toNumber();

  const rewards = pool.rewards.map((reward) => {
    if (rewardsDecimals.has(address(reward.mint))) {
      return estimateRewardApr(reward, rewardsDecimals.get(address(reward.mint))!, concentratedValue, tokenPrices);
    } else {
      return 0;
    }
  });

  return { fee: feeApr, rewards };
}

function getTokenValue(tokenAmount: BN, decimals: number, tokenPrice: Decimal): Decimal {
  return tokenPrice.mul(new Decimal(tokenAmount.toString()).div(new Decimal(10).pow(decimals)));
}

export async function getLowestInitializedTickArrayTickIndex(
  rpc: Rpc<GetAccountInfoApi>,
  whirlpoolAddress: Address,
  tickSpacing: number
): Promise<number> {
  const minTick = _MIN_TICK_INDEX();
  let startTickIndex = getTickArrayStartTickIndex(minTick, tickSpacing);

  // eslint-disable-next-line
  while (true) {
    const [tickArrayAddress] = await getTickArrayAddress(whirlpoolAddress, startTickIndex);
    const tickArray = await fetchMaybeTickArray(rpc, tickArrayAddress);

    if (tickArray.exists) {
      return startTickIndex;
    }

    startTickIndex += TICK_ARRAY_SIZE * tickSpacing;
    await sleep(500);
  }
}

export async function getHighestInitializedTickArrayTickIndex(
  rpc: Rpc<GetAccountInfoApi>,
  whirlpoolAddress: Address,
  tickSpacing: number
): Promise<number> {
  const maxTick = _MAX_TICK_INDEX();
  let startTickIndex = getTickArrayStartTickIndex(maxTick, tickSpacing);

  // eslint-disable-next-line
  while (true) {
    const [tickArrayAddress] = await getTickArrayAddress(whirlpoolAddress, startTickIndex);
    const tickArray = await fetchMaybeTickArray(rpc, tickArrayAddress);

    if (tickArray.exists) {
      return startTickIndex;
    }

    startTickIndex -= TICK_ARRAY_SIZE * tickSpacing;
    await sleep(500);
  }
}

export type LiquidityDataPoint = {
  liquidity: Decimal;
  price: Decimal;
  tickIndex: number;
};
export type WhirlpoolLiquidityDistribution = {
  currentPrice: Decimal;
  currentTickIndex: number;
  datapoints: LiquidityDataPoint[];
};

export async function getLiquidityDistribution(
  rpc: Rpc<GetMultipleAccountsApi>,
  poolAddress: Address,
  poolData: WhirlpoolAPIResponse,
  tickLower: number,
  tickUpper: number,
  whirlpoolProgramId: Address
): Promise<WhirlpoolLiquidityDistribution> {
  const datapoints: LiquidityDataPoint[] = [];

  const tokenDecimalsA = poolData.tokenA.decimals;
  const tokenDecimalsB = poolData.tokenB.decimals;

  const tickArrayAddresses = await getSurroundingTickArrayAddresses(
    poolAddress,
    poolData,
    tickLower,
    tickUpper,
    whirlpoolProgramId
  );
  const tickArrays = await TickArray.fetchMultiple(rpc, tickArrayAddresses, whirlpoolProgramId);

  const currentLiquidity = new Decimal(poolData.liquidity.toString());
  let relativeLiquidity = currentLiquidity;
  let minLiquidity = new Decimal(0);
  let liquidity = new Decimal(0);

  tickArrays.forEach((tickArray) => {
    if (!tickArray) {
      return;
    }

    const startIndex = tickArray.startTickIndex;
    tickArray.ticks.forEach((tick, index) => {
      const tickIndex = startIndex + index * poolData.tickSpacing;
      const price = tickIndexToPrice(tickIndex, tokenDecimalsA, tokenDecimalsB);
      const liquidityNet = new Decimal(tick.liquidityNet.toString());
      liquidity = liquidity.add(liquidityNet);
      datapoints.push({ liquidity: new Decimal(liquidity), price: new Decimal(price), tickIndex });

      minLiquidity = liquidity.lt(minLiquidity) ? liquidity : minLiquidity;

      if (tickIndex === poolData.tickCurrentIndex) {
        relativeLiquidity = relativeLiquidity.sub(liquidityNet);
      }
    });
  });

  if (!relativeLiquidity.eq(currentLiquidity)) {
    minLiquidity = minLiquidity.add(relativeLiquidity);
    datapoints.forEach((datapoint) => {
      datapoint.liquidity = datapoint.liquidity.add(relativeLiquidity);
    });
  }

  if (minLiquidity.lt(0)) {
    datapoints.forEach((datapoint) => {
      datapoint.liquidity = datapoint.liquidity.add(minLiquidity.neg());
    });
  }

  return {
    currentPrice: new Decimal(poolData.price),
    currentTickIndex: poolData.tickCurrentIndex,
    datapoints,
  };
}

async function getSurroundingTickArrayAddresses(
  poolAddress: Address,
  pool: WhirlpoolAPIResponse,
  tickLower: number,
  tickUpper: number,
  programId: Address
): Promise<Address[]> {
  const tickArrayAddresses: Address[] = [];

  let startIndex = getTickArrayStartTickIndex(tickLower, pool.tickSpacing);
  while (startIndex <= tickUpper) {
    const [address, _bump] = await getTickArrayPda(programId, poolAddress, startIndex);
    tickArrayAddresses.push(address);

    try {
      startIndex = getTickArrayStartTickIndex(startIndex, pool.tickSpacing);
    } catch (_e) {
      return tickArrayAddresses;
    }
  }
  return tickArrayAddresses;
}

export async function getTickArrayPda(
  programId: Address,
  poolAddress: Address,
  startIndex: number
): Promise<[Address, number]> {
  const pdaWithBump = await getProgramDerivedAddress({
    seeds: [Buffer.from('tick_array'), addressEncoder.encode(poolAddress), Buffer.from(startIndex.toString())],
    programAddress: programId,
  });

  return [pdaWithBump[0], pdaWithBump[1]];
}
