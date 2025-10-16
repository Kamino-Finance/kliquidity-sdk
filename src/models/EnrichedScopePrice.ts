import Decimal from 'decimal.js';
import { OraclePrices } from '@kamino-finance/scope-sdk/dist/@codegen/scope/accounts/OraclePrices';
import { CollateralInfo } from '../@codegen/kliquidity/types';
import { Address } from '@solana/kit';

export interface EnrichedScopePrice {
  /**
   * Price in USD
   */
  price: Decimal;
  /**
   * Token name (as specified in collateral infos)
   */
  name: string;
}

export interface KaminoPrices {
  /**
   * Spot prices where record key is token mint and value is enriched scope price
   */
  spot: MintToPriceMap;
  /**
   * Twap prices where record key is token mint and value is enriched scope price
   */
  twap: MintToPriceMap;
}

export type MintToPriceMap = Record<string, EnrichedScopePrice>;

export interface OraclePricesAndCollateralInfos {
  oraclePrices: [Address, OraclePrices][];
  collateralInfos: CollateralInfo[];
}
