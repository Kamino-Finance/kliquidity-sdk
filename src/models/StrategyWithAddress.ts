import { WhirlpoolStrategy } from '../@codegen/kliquidity/accounts';
import { Address } from '@solana/kit';

export interface StrategyWithAddress {
  strategy: WhirlpoolStrategy;
  address: Address;
}

export default StrategyWithAddress;
