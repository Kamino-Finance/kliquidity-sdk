import { Address, Instruction, isSome, Option, TransactionSigner } from '@solana/kit';
import { readU128LE, writeU128LE } from './bytes';
import Decimal from 'decimal.js';
import {
  DriftDirection,
  RebalanceAutodriftStep,
  RebalanceType,
  StakingRateSource,
  StrategyConfigOption,
} from '../@codegen/kliquidity/types';
import { getUpdateStrategyConfigInstruction } from '../@codegen/kliquidity/instructions';
import { RebalanceFieldInfo, RebalanceFieldsDict } from './types';
import { fromBN, toBN } from './raydiumBridge';
import { PoolPriceReferenceType, TwapPriceReferenceType } from './priceReferenceTypes';
import { U64_MAX } from '../constants/numericalValues';
import { SqrtPriceMath } from '@raydium-io/raydium-sdk-v2/lib/raydium/clmm/utils/math';
import { DEFAULT_PUBLIC_KEY } from '../constants/pubkeys';
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { sqrtPriceToPrice as orcaSqrtPriceToPrice } from '@orca-so/whirlpools-core';

export const DollarBasedMintingMethod = new Decimal(0);
export const ProportionalMintingMethod = new Decimal(1);

export const RebalanceParamOffset = new Decimal(256);

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const Dex = ['ORCA', 'RAYDIUM', 'METEORA'] as const;
export type Dex = (typeof Dex)[number];

export const ReferencePriceType = [PoolPriceReferenceType, TwapPriceReferenceType] as const;
export type ReferencePriceType = (typeof ReferencePriceType)[number];

export function dexToNumber(dex: Dex): number {
  for (let i = 0; i < Dex.length; i++) {
    if (Dex[i] === dex) {
      return i;
    }
  }

  throw new Error(`Unknown DEX ${dex}`);
}

export function numberToDex(num: number): Dex {
  const dex = Dex[num];

  if (!dex) {
    throw new Error(`Unknown DEX ${num}`);
  }
  return dex;
}

export function numberToReferencePriceType(num: number): ReferencePriceType {
  const referencePriceType = ReferencePriceType[num];
  if (!referencePriceType) {
    throw new Error(`Strategy has invalid reference price type set: ${num}`);
  }
  return referencePriceType;
}

export function getStrategyConfigValue(value: Decimal): number[] {
  const buf = new Uint8Array(128);
  const dv = new DataView(buf.buffer);
  dv.setBigUint64(0, BigInt(value.toString()), true);
  return [...buf];
}

export function buildStrategyRebalanceParams(
  params: Array<Decimal>,
  rebalance_type: RebalanceType,
  tokenADecimals?: number,
  tokenBDecimals?: number
): number[] {
  const buf = new Uint8Array(128);
  const dv = new DataView(buf.buffer);
  if (rebalance_type === RebalanceType.Manual) {
    // Manual has no params
  } else if (rebalance_type === RebalanceType.PricePercentage) {
    dv.setUint16(0, params[0].toNumber(), true);
    dv.setUint16(2, params[1].toNumber(), true);
  } else if (rebalance_type === RebalanceType.PricePercentageWithReset) {
    dv.setUint16(0, params[0].toNumber(), true);
    dv.setUint16(2, params[1].toNumber(), true);
    dv.setUint16(4, params[2].toNumber(), true);
    dv.setUint16(6, params[3].toNumber(), true);
  } else if (rebalance_type === RebalanceType.Drift) {
    dv.setInt32(0, params[0].toNumber(), true);
    dv.setInt32(4, params[1].toNumber(), true);
    dv.setInt32(8, params[2].toNumber(), true);
    dv.setBigUint64(12, BigInt(params[3].toString()), true);
    dv.setUint8(20, params[4].toNumber());
  } else if (rebalance_type === RebalanceType.TakeProfit) {
    // TODO: fix this for meteora
    const lowerPrice = SqrtPriceMath.priceToSqrtPriceX64(params[0], tokenADecimals!, tokenBDecimals!);
    const upperPrice = SqrtPriceMath.priceToSqrtPriceX64(params[1], tokenADecimals!, tokenBDecimals!);
    writeU128LE(dv, 0, fromBN(lowerPrice));
    writeU128LE(dv, 16, fromBN(upperPrice));
    dv.setUint8(32, params[2].toNumber());
  } else if (rebalance_type === RebalanceType.PeriodicRebalance) {
    dv.setBigUint64(0, BigInt(params[0].toString()), true);
    dv.setUint16(8, params[1].toNumber(), true);
    dv.setUint16(10, params[2].toNumber(), true);
  } else if (rebalance_type === RebalanceType.Expander) {
    dv.setUint16(0, params[0].toNumber(), true);
    dv.setUint16(2, params[1].toNumber(), true);
    dv.setUint16(4, params[2].toNumber(), true);
    dv.setUint16(6, params[3].toNumber(), true);
    dv.setUint16(8, params[4].toNumber(), true);
    dv.setUint16(10, params[5].toNumber(), true);
    dv.setUint8(12, params[6].toNumber());
  } else if (rebalance_type === RebalanceType.Autodrift) {
    dv.setUint32(0, params[0].toNumber(), true);
    dv.setInt32(4, params[1].toNumber(), true);
    dv.setInt32(8, params[2].toNumber(), true);
    dv.setUint16(12, params[3].toNumber(), true);
    dv.setUint8(14, params[4].toNumber());
    dv.setUint8(15, params[5].toNumber());
    dv.setUint8(16, params[6].toNumber());
  } else {
    throw 'Rebalance type not valid ' + rebalance_type;
  }
  return [...buf];
}

export function doesStrategyHaveResetRange(rebalanceTypeNumber: number): boolean {
  const rebalanceType = numberToRebalanceType(rebalanceTypeNumber);
  return rebalanceType === RebalanceType.PricePercentageWithReset || rebalanceType === RebalanceType.Expander;
}

export function numberToDriftDirection(value: number): DriftDirection {
  if (value == 0) {
    return DriftDirection.Increasing;
  } else if (value == 1) {
    return DriftDirection.Decreasing;
  } else {
    throw new Error(`Invalid drift direction ${value.toString()}`);
  }
}

export function numberToStakingRateSource(value: number): StakingRateSource {
  if (value == 0) {
    return StakingRateSource.Constant;
  } else if (value == 1) {
    return StakingRateSource.Scope;
  } else {
    throw new Error(`Invalid staking rate source ${value.toString()}`);
  }
}

export function numberToAutodriftStep(value: number): RebalanceAutodriftStep {
  if (value == 0) {
    return RebalanceAutodriftStep.Uninitialized;
  } else if (value == 1) {
    return RebalanceAutodriftStep.Autodrifting;
  } else {
    throw new Error(`Invalid autodrift step ${value.toString()}`);
  }
}

export function numberToRebalanceType(rebalance_type: number): RebalanceType {
  if (rebalance_type == 0) {
    return RebalanceType.Manual;
  } else if (rebalance_type == 1) {
    return RebalanceType.PricePercentage;
  } else if (rebalance_type == 2) {
    return RebalanceType.PricePercentageWithReset;
  } else if (rebalance_type == 3) {
    return RebalanceType.Drift;
  } else if (rebalance_type == 4) {
    return RebalanceType.TakeProfit;
  } else if (rebalance_type == 5) {
    return RebalanceType.PeriodicRebalance;
  } else if (rebalance_type == 6) {
    return RebalanceType.Expander;
  } else if (rebalance_type == 7) {
    return RebalanceType.Autodrift;
  } else {
    throw new Error(`Invalid rebalance type ${rebalance_type.toString()}`);
  }
}

export async function getUpdateStrategyConfigIx(
  signer: TransactionSigner,
  globalConfig: Address,
  strategy: Address,
  mode: StrategyConfigOption,
  amount: Decimal,
  programId: Address,
  newAccount: Address = DEFAULT_PUBLIC_KEY
): Promise<Instruction> {
  return getUpdateStrategyConfigInstruction(
    {
      adminAuthority: signer,
      newAccount,
      globalConfig,
      strategy,
      systemProgram: SYSTEM_PROGRAM_ADDRESS,
      mode,
      value: new Uint8Array(getStrategyConfigValue(amount)),
    },
    { programAddress: programId }
  );
}

export function collToLamportsDecimal(amount: Decimal, decimals: number): Decimal {
  const factor = new Decimal(10).pow(decimals);
  return amount.mul(factor);
}

export function lamportsToNumberDecimal(amount: Decimal.Value, decimals: number): Decimal {
  const factor = new Decimal(10).pow(decimals);
  return new Decimal(amount).div(factor);
}

export function readBigUint128LE(buf: Uint8Array, offset: number): bigint {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return readU128LE(dv, offset);
}

export function readPriceOption(buf: Uint8Array, offset: number): [number, Decimal] {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint8(offset) == 0) {
    return [offset + 1, new Decimal(0)];
  }
  const value = dv.getBigUint64(offset + 1, true);
  const exp = dv.getBigUint64(offset + 9, true);
  return [offset + 17, new Decimal(value.toString()).div(new Decimal(10).pow(exp.toString()))];
}

export function rebalanceFieldsDictToInfo(rebalanceFields: RebalanceFieldsDict): RebalanceFieldInfo[] {
  const rebalanceFieldsInfo: RebalanceFieldInfo[] = [];
  for (const key in rebalanceFields) {
    const value = rebalanceFields[key];
    rebalanceFieldsInfo.push({
      label: key,
      type: 'number',
      value: value,
      enabled: false,
    });
  }
  return rebalanceFieldsInfo;
}

export function isVaultInitialized(vault: Address, decimals: bigint): boolean {
  return vault !== DEFAULT_PUBLIC_KEY && decimals > 0n;
}

export function sqrtPriceToPrice(sqrtPrice: bigint, dexNo: number, decimalsA: number, decimalsB: number): Decimal {
  const dex = numberToDex(dexNo);
  if (dex == 'ORCA') {
    return new Decimal(orcaSqrtPriceToPrice(sqrtPrice, decimalsA, decimalsB));
  }
  if (dex == 'RAYDIUM') {
    return SqrtPriceMath.sqrtPriceX64ToPrice(toBN(sqrtPrice), decimalsA, decimalsB);
  }
  if (dex == 'METEORA') {
    const price = new Decimal(sqrtPrice.toString());
    return price.div(new Decimal(U64_MAX));
  }
  throw new Error(`Got invalid dex number ${dex}`);
}

// Zero is not a valid TWAP component as that indicates the SOL price
export function stripTwapZeros(chain: number[]): number[] {
  return chain.filter((component) => component > 0);
}

export function percentageToBPS(pct: number): number {
  return pct * 100;
}

export function keyOrDefault(key: Address, defaultKey: Address): Address {
  if (key === DEFAULT_PUBLIC_KEY) {
    return defaultKey;
  }
  return key;
}

// Extract value from Option if Some, otherwise return null
export function optionGetValue<T>(option: Option<T>): T | null {
  return isSome(option) ? (option as any).value : null;
}

// Extract value from Option if Some, otherwise return undefined
export function optionGetValueOrUndefined<T>(option: Option<T>): T | undefined {
  return isSome(option) ? (option as any).value : undefined;
}

// Extract value from Option if Some, otherwise return provided default
export function optionGetValueOrDefault<T>(option: Option<T>, defaultValue: T): T {
  return isSome(option) ? (option as any).value : defaultValue;
}
