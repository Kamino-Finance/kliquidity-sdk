import { PublicKey } from '@solana/web3.js';
import { Whirlpool } from '../whirlpools-client/accounts';

export interface WhirlpoolWithAddress {
  whirlpool: Whirlpool;
  address: PublicKey;
}

export default WhirlpoolWithAddress;
