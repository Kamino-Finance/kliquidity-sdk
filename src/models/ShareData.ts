import { Address } from '@solana/kit';
import Decimal from 'decimal.js';
import { StrategyBalances } from './StrategyBalances';
import { WhirlpoolStrategy } from '../@codegen/kliquidity/accounts';
import PriceData from './PriceData';

export type ShareData = {
  balance: StrategyBalances;
  price: Decimal;
};

export type ShareDataWithAddress = {
  shareData: ShareData;
  address: Address;
  strategy: WhirlpoolStrategy;
};

export function getEmptyShareData(prices: PriceData): ShareData {
  return {
    price: new Decimal(0),
    balance: {
      prices,
      tokenAAmounts: new Decimal(0),
      tokenBAmounts: new Decimal(0),
      computedHoldings: {
        available: { a: new Decimal(0), b: new Decimal(0) },
        availableUsd: new Decimal(0),
        investedUsd: new Decimal(0),
        invested: { a: new Decimal(0), b: new Decimal(0) },
        totalSum: new Decimal(0),
      },
    },
  };
}
