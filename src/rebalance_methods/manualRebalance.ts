import Decimal from 'decimal.js';
import { RebalanceFieldInfo } from '../utils/types';
import {
  DefaultLowerPercentageBPSDecimal,
  DefaultUpperPercentageBPSDecimal,
  FullBPSDecimal,
} from '../utils/CreationParameters';
import { RebalanceTypeLabelName } from './consts';

export const ManualRebalanceTypeName = 'manual';

export function getManualRebalanceFieldInfos(
  lowerPrice: Decimal,
  upperPrice: Decimal,
  enabled: boolean = true
): RebalanceFieldInfo[] {
  const rebalanceType: RebalanceFieldInfo = {
    label: RebalanceTypeLabelName,
    type: 'string',
    value: ManualRebalanceTypeName,
    enabled,
  };
  const lowerRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'rangePriceLower',
    type: 'number',
    value: lowerPrice,
    enabled,
  };
  const upperRangeRebalanceFieldInfo: RebalanceFieldInfo = {
    label: 'rangePriceUpper',
    type: 'number',
    value: upperPrice,
    enabled,
  };
  return [rebalanceType, lowerRangeRebalanceFieldInfo, upperRangeRebalanceFieldInfo];
}

export function getDefaultManualRebalanceFieldInfos(price: Decimal): RebalanceFieldInfo[] {
  const lowerPrice = price.mul(FullBPSDecimal.sub(DefaultLowerPercentageBPSDecimal)).div(FullBPSDecimal);
  const upperPrice = price.mul(FullBPSDecimal.add(DefaultUpperPercentageBPSDecimal)).div(FullBPSDecimal);

  return getManualRebalanceFieldInfos(lowerPrice, upperPrice);
}
