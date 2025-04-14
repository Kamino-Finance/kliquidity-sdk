import { Address, getAddressEncoder, getProgramDerivedAddress } from '@solana/kit';
import { ProgramDerivedAddress } from '@solana/addresses/dist/types/program-derived-address';

const addressEncoder = getAddressEncoder();

export async function getTickArray(
  programId: Address,
  whirlpoolAddress: Address,
  startTick: number
): Promise<ProgramDerivedAddress> {
  return await getProgramDerivedAddress({
    seeds: [Buffer.from('tick_array'), addressEncoder.encode(whirlpoolAddress), Buffer.from(startTick.toString())],
    programAddress: programId
  });
}
