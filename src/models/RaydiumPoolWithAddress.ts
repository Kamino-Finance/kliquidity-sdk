import { Address } from '@solana/kit';
import { PoolState } from '../@codegen/raydium/accounts';

export interface RaydiumPoolWithAddress {
  poolState: PoolState;
  address: Address;
}

export default RaydiumPoolWithAddress;
