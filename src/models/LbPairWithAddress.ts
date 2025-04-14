import { Address } from '@solana/kit';
import { LbPair } from '../@codegen/meteora/accounts';

export interface LbPairWithAddress {
  pool: LbPair;
  address: Address;
}

export default LbPairWithAddress;
