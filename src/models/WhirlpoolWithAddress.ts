import { Address } from '@solana/kit';
import { Whirlpool } from '../@codegen/whirlpools/accounts';

export interface WhirlpoolWithAddress {
  whirlpool: Whirlpool;
  address: Address;
}

export default WhirlpoolWithAddress;
