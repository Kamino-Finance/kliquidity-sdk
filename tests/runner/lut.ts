import { Address, Slot } from '@solana/kit';
import StrategyWithAddress from '../../src/models/StrategyWithAddress';
import { Kamino } from '../../src';
import { sendAndConfirmTx } from './tx';
import { Env } from './env';

export async function fetchLookupTableSlot(env: Env): Promise<Slot> {
  return env.c.rpc.getSlot({ commitment: 'finalized' }).send();
}

// Pass a fresh finalized slot for each lookup table creation; the lookup table PDA depends on authority + slot.
export async function setupStrategyLookupTable(
  env: Env,
  kamino: Kamino,
  strategy: Address | StrategyWithAddress,
  slot: Slot
): Promise<Address> {
  const { lookupTable, createLookupTableIx, populateLookupTableIxs, updateStrategyLookupTableIx } =
    await kamino.setupStrategyLookupTable(env.admin, strategy, slot);
  const ixs = [createLookupTableIx, ...populateLookupTableIxs, updateStrategyLookupTableIx];
  await sendAndConfirmTx(env.c, env.admin, ixs);
  return lookupTable;
}
