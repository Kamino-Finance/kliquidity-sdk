import { Address, Slot } from '@solana/kit';
import StrategyWithAddress from '../../src/models/StrategyWithAddress';
import { Kamino } from '../../src';
import { sendAndConfirmTx } from './tx';
import { Env } from './env';

export async function setupStrategyLookupTable(
  env: Env,
  kamino: Kamino,
  strategy: Address | StrategyWithAddress,
  slot?: Slot
): Promise<Address> {
  const { lookupTable, createLookupTableIx, populateLookupTableIxs, updateStrategyLookupTableIx } =
    await kamino.setupStrategyLookupTable(env.admin, strategy, slot);
  const ixs = [createLookupTableIx, ...populateLookupTableIxs, updateStrategyLookupTableIx];
  await sendAndConfirmTx(env.c, env.admin, ixs);
  return lookupTable;
}
