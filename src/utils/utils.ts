import { Address, Instruction, isSome, Option, TransactionSigner } from '@solana/kit';
import Decimal from 'decimal.js';
import {
  DriftDirection,
  DriftDirectionKind,
  RebalanceAutodriftStep,
  RebalanceAutodriftStepKind,
  RebalanceType,
  RebalanceTypeKind,
  StakingRateSource,
  StakingRateSourceKind,
  StrategyConfigOptionKind,
} from '../@codegen/kliquidity/types';
import {
  UpdateStrategyConfigAccounts,
  UpdateStrategyConfigArgs,
  updateStrategyConfig,
} from '../@codegen/kliquidity/instructions';
import { RebalanceFieldInfo, RebalanceFieldsDict } from './types';
import BN from 'bn.js';
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
  const buffer = Buffer.alloc(128);
  writeBNUint64LE(buffer, new BN(value.toString()), 0);
  return [...buffer];
}

export function buildStrategyRebalanceParams(
  params: Array<Decimal>,
  rebalance_type: RebalanceTypeKind,
  tokenADecimals?: number,
  tokenBDecimals?: number
): number[] {
  const buffer = Buffer.alloc(128);
  if (rebalance_type.kind == RebalanceType.Manual.kind) {
    // Manual has no params
  } else if (rebalance_type.kind == RebalanceType.PricePercentage.kind) {
    buffer.writeUint16LE(params[0].toNumber());
    buffer.writeUint16LE(params[1].toNumber(), 2);
  } else if (rebalance_type.kind == RebalanceType.PricePercentageWithReset.kind) {
    buffer.writeUint16LE(params[0].toNumber());
    buffer.writeUint16LE(params[1].toNumber(), 2);
    buffer.writeUint16LE(params[2].toNumber(), 4);
    buffer.writeUint16LE(params[3].toNumber(), 6);
  } else if (rebalance_type.kind == RebalanceType.Drift.kind) {
    buffer.writeInt32LE(params[0].toNumber());
    buffer.writeInt32LE(params[1].toNumber(), 4);
    buffer.writeInt32LE(params[2].toNumber(), 8);
    writeBNUint64LE(buffer, new BN(params[3].toString()), 12);
    buffer.writeUint8(params[4].toNumber(), 20);
  } else if (rebalance_type.kind == RebalanceType.TakeProfit.kind) {
    // TODO: fix this for meteora
    const lowerPrice = SqrtPriceMath.priceToSqrtPriceX64(params[0], tokenADecimals!, tokenBDecimals!);
    const upperPrice = SqrtPriceMath.priceToSqrtPriceX64(params[1], tokenADecimals!, tokenBDecimals!);
    writeBN128LE(buffer, lowerPrice, 0);
    writeBN128LE(buffer, upperPrice, 16);
    buffer.writeUint8(params[2].toNumber(), 32);
  } else if (rebalance_type.kind == RebalanceType.PeriodicRebalance.kind) {
    writeBNUint64LE(buffer, new BN(params[0].toString()), 0);
    buffer.writeUInt16LE(params[1].toNumber(), 8);
    buffer.writeUInt16LE(params[2].toNumber(), 10);
  } else if (rebalance_type.kind == RebalanceType.Expander.kind) {
    buffer.writeUInt16LE(params[0].toNumber(), 0);
    buffer.writeUInt16LE(params[1].toNumber(), 2);
    buffer.writeUInt16LE(params[2].toNumber(), 4);
    buffer.writeUInt16LE(params[3].toNumber(), 6);
    buffer.writeUInt16LE(params[4].toNumber(), 8);
    buffer.writeUInt16LE(params[5].toNumber(), 10);
    buffer.writeUInt8(params[6].toNumber(), 12);
  } else if (rebalance_type.kind == RebalanceType.Autodrift.kind) {
    buffer.writeUInt32LE(params[0].toNumber(), 0);
    buffer.writeInt32LE(params[1].toNumber(), 4);
    buffer.writeInt32LE(params[2].toNumber(), 8);
    buffer.writeUInt16LE(params[3].toNumber(), 12);
    buffer.writeUInt8(params[4].toNumber(), 14);
    buffer.writeUInt8(params[5].toNumber(), 15);
    buffer.writeUInt8(params[6].toNumber(), 16);
  } else {
    throw 'Rebalance type not valid ' + rebalance_type;
  }
  return [...buffer];
}

export function doesStrategyHaveResetRange(rebalanceTypeNumber: number): boolean {
  const rebalanceType = numberToRebalanceType(rebalanceTypeNumber);
  return (
    rebalanceType.kind == RebalanceType.PricePercentageWithReset.kind ||
    rebalanceType.kind == RebalanceType.Expander.kind
  );
}

export function numberToDriftDirection(value: number): DriftDirectionKind {
  if (value == 0) {
    return new DriftDirection.Increasing();
  } else if (value == 1) {
    return new DriftDirection.Decreasing();
  } else {
    throw new Error(`Invalid drift direction ${value.toString()}`);
  }
}

export function numberToStakingRateSource(value: number): StakingRateSourceKind {
  if (value == 0) {
    return new StakingRateSource.Constant();
  } else if (value == 1) {
    return new StakingRateSource.Scope();
  } else {
    throw new Error(`Invalid staking rate source ${value.toString()}`);
  }
}

export function numberToAutodriftStep(value: number): RebalanceAutodriftStepKind {
  if (value == 0) {
    return new RebalanceAutodriftStep.Uninitialized();
  } else if (value == 1) {
    return new RebalanceAutodriftStep.Autodrifting();
  } else {
    throw new Error(`Invalid autodrift step ${value.toString()}`);
  }
}

export function numberToRebalanceType(rebalance_type: number): RebalanceTypeKind {
  if (rebalance_type == 0) {
    return new RebalanceType.Manual();
  } else if (rebalance_type == 1) {
    return new RebalanceType.PricePercentage();
  } else if (rebalance_type == 2) {
    return new RebalanceType.PricePercentageWithReset();
  } else if (rebalance_type == 3) {
    return new RebalanceType.Drift();
  } else if (rebalance_type == 4) {
    return new RebalanceType.TakeProfit();
  } else if (rebalance_type == 5) {
    return new RebalanceType.PeriodicRebalance();
  } else if (rebalance_type == 6) {
    return new RebalanceType.Expander();
  } else if (rebalance_type == 7) {
    return new RebalanceType.Autodrift();
  } else {
    throw new Error(`Invalid rebalance type ${rebalance_type.toString()}`);
  }
}

export async function getUpdateStrategyConfigIx(
  signer: TransactionSigner,
  globalConfig: Address,
  strategy: Address,
  mode: StrategyConfigOptionKind,
  amount: Decimal,
  programId: Address,
  newAccount: Address = DEFAULT_PUBLIC_KEY
): Promise<Instruction> {
  const args: UpdateStrategyConfigArgs = {
    mode: mode.discriminator,
    value: getStrategyConfigValue(amount),
  };

  const accounts: UpdateStrategyConfigAccounts = {
    adminAuthority: signer,
    newAccount,
    globalConfig,
    strategy,
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
  };

  return updateStrategyConfig(args, accounts, undefined, programId);
}

export function collToLamportsDecimal(amount: Decimal, decimals: number): Decimal {
  const factor = new Decimal(10).pow(decimals);
  return amount.mul(factor);
}

export function lamportsToNumberDecimal(amount: Decimal.Value, decimals: number): Decimal {
  const factor = new Decimal(10).pow(decimals);
  return new Decimal(amount).div(factor);
}

export function readBigUint128LE(buffer: Buffer, offset: number): bigint {
  return buffer.readBigUInt64LE(offset) + (buffer.readBigUInt64LE(offset + 8) << BigInt(64));
}

export function readPriceOption(buffer: Buffer, offset: number): [number, Decimal] {
  if (buffer.readUint8(offset) == 0) {
    return [offset + 1, new Decimal(0)];
  }
  const value = buffer.readBigUInt64LE(offset + 1);
  const exp = buffer.readBigUInt64LE(offset + 9);
  return [offset + 17, new Decimal(value.toString()).div(new Decimal(10).pow(exp.toString()))];
}

function writeBNUint64LE(buffer: Buffer, value: BN, offset: number) {
  const lower_half = value.maskn(64).toBuffer('le');
  buffer.set(lower_half, offset);
}

function writeBN128LE(buffer: Buffer, value: BN, offset: number) {
  const lower_half = value.maskn(64).toBuffer('le');
  const upper_half = value.shrn(64).toBuffer('le');
  buffer.set(lower_half, offset);
  buffer.set(upper_half, offset + 8);
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

export function isVaultInitialized(vault: Address, decimals: BN): boolean {
  return vault !== DEFAULT_PUBLIC_KEY && decimals.toNumber() > 0;
}

export function sqrtPriceToPrice(sqrtPrice: BN, dexNo: number, decimalsA: number, decimalsB: number): Decimal {
  const dex = numberToDex(dexNo);
  if (dex == 'ORCA') {
    return new Decimal(orcaSqrtPriceToPrice(BigInt(sqrtPrice.toString()), decimalsA, decimalsB));
  }
  if (dex == 'RAYDIUM') {
    return SqrtPriceMath.sqrtPriceX64ToPrice(sqrtPrice, decimalsA, decimalsB);
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
