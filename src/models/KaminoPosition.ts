import { Address } from '@solana/kit';
import Decimal from 'decimal.js';
import { Dex } from '../utils';

export interface KaminoPosition {
  strategy: Address;
  shareMint: Address;
  sharesAmount: Decimal;
  strategyDex: Dex;
}

export default KaminoPosition;
