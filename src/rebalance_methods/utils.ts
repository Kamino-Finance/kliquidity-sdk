import Decimal from 'decimal.js';
import { RebalanceType } from '../@codegen/kliquidity/types';
import { RebalanceFieldInfo } from '../utils';
import {
  AutodriftMethod,
  DriftRebalanceMethod,
  ExpanderMethod,
  ManualRebalanceMethod,
  PeriodicRebalanceMethod,
  PricePercentageRebalanceMethod,
  PricePercentageWithResetRangeRebalanceMethod,
  RebalanceMethod,
  TakeProfitMethod,
} from '../utils/CreationParameters';
import { AutodriftRebalanceTypeName } from './autodriftRebalance';
import { DriftRebalanceTypeName } from './driftRebalance';
import { ExpanderRebalanceTypeName } from './expanderRebalance';
import { ManualRebalanceTypeName } from './manualRebalance';
import { PeriodicRebalanceTypeName } from './periodicRebalance';
import { PricePercentageRebalanceTypeName } from './pricePercentageRebalance';
import { PricePercentageWithResetRebalanceTypeName } from './pricePercentageWithResetRebalance';
import { TakeProfitRebalanceTypeName } from './takeProfitRebalance';

export function getRebalanceTypeFromRebalanceFields(rebalanceFieldInfos: RebalanceFieldInfo[]): RebalanceType {
  const rebalanceTypeField = rebalanceFieldInfos.find((field) => field.label === 'rebalanceType');
  if (!rebalanceTypeField) {
    throw new Error('Rebalance type field not found');
  }

  switch (rebalanceTypeField.value) {
    case ManualRebalanceTypeName:
      return RebalanceType.Manual;
    case PricePercentageRebalanceTypeName:
      return RebalanceType.PricePercentage;
    case PricePercentageWithResetRebalanceTypeName:
      return RebalanceType.PricePercentageWithReset;
    case DriftRebalanceTypeName:
      return RebalanceType.Drift;
    case TakeProfitRebalanceTypeName:
      return RebalanceType.TakeProfit;
    case PeriodicRebalanceTypeName:
      return RebalanceType.PeriodicRebalance;
    case ExpanderRebalanceTypeName:
      return RebalanceType.Expander;
    case AutodriftRebalanceTypeName:
      return RebalanceType.Autodrift;
    default:
      throw new Error(`Invalid rebalance type ${rebalanceTypeField.value}`);
  }
}

export function rebalanceTypeToRebalanceMethod(rebalanceType: RebalanceType): RebalanceMethod {
  switch (rebalanceType) {
    case RebalanceType.Manual:
      return ManualRebalanceMethod;
    case RebalanceType.PricePercentage:
      return PricePercentageRebalanceMethod;
    case RebalanceType.PricePercentageWithReset:
      return PricePercentageWithResetRangeRebalanceMethod;
    case RebalanceType.Drift:
      return DriftRebalanceMethod;
    case RebalanceType.TakeProfit:
      return TakeProfitMethod;
    case RebalanceType.PeriodicRebalance:
      return PeriodicRebalanceMethod;
    case RebalanceType.Expander:
      return ExpanderMethod;
    case RebalanceType.Autodrift:
      return AutodriftMethod;
    default:
      throw new Error(`Invalid rebalance type ${rebalanceType}`);
  }
}

export function getRebalanceMethodFromRebalanceFields(rebalanceFieldInfos: RebalanceFieldInfo[]): RebalanceMethod {
  const rebalanceType = getRebalanceTypeFromRebalanceFields(rebalanceFieldInfos);
  return rebalanceTypeToRebalanceMethod(rebalanceType);
}

export function upsertRebalanceFieldInfo(
  rebalanceFieldInfos: RebalanceFieldInfo[],
  newFieldInfo: RebalanceFieldInfo
): RebalanceFieldInfo[] {
  const newRebalanceFieldInfoIndex = rebalanceFieldInfos.findIndex(
    (fieldInfo) => fieldInfo.label === newFieldInfo.label
  );

  // if the field is not found, add it
  if (newRebalanceFieldInfoIndex === -1) {
    return [...rebalanceFieldInfos, newFieldInfo];
  } else {
    // if the field is found, update it
    const newRebalanceFieldInfos = [...rebalanceFieldInfos];
    newRebalanceFieldInfos[newRebalanceFieldInfoIndex] = newFieldInfo;
    return newRebalanceFieldInfos;
  }
}

export function upsertManyRebalanceFieldInfos(
  rebalanceFieldInfos: RebalanceFieldInfo[],
  newFieldInfos: RebalanceFieldInfo[]
): RebalanceFieldInfo[] {
  let updatedFieldInfos = [...rebalanceFieldInfos];
  for (const newFieldInfo of newFieldInfos) {
    updatedFieldInfos = upsertRebalanceFieldInfo(updatedFieldInfos, newFieldInfo);
  }

  return updatedFieldInfos;
}

export function extractPricesFromDeserializedState(state: RebalanceFieldInfo[]): [Decimal, Decimal] {
  const resetPriceLower = state.find((param) => param.label == 'resetPriceLower');
  const resetPriceUpper = state.find((param) => param.label == 'resetPriceUpper');
  if (resetPriceLower === undefined || resetPriceUpper === undefined) {
    throw new Error('Expected strategy to have resetPriceLower and resetPriceUpper in the field infos');
  }
  return [new Decimal(resetPriceLower.value.toString()), new Decimal(resetPriceUpper.value.toString())];
}
