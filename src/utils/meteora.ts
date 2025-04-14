import { Address, getAddressEncoder, getProgramDerivedAddress } from '@solana/kit';
import Decimal from 'decimal.js';
import { U64_MAX } from '../constants/numericalValues';
import { BinArray } from '../@codegen/meteora/accounts';
import { Bin } from '../@codegen/meteora/types';
import { BN } from '@coral-xyz/anchor';
import { ProgramDerivedAddress } from '@solana/addresses/dist/types/program-derived-address';

const BASIS_POINT_MAX = 10000;
const MAX_BIN_ARRAY_SIZE = 70;

const addressEncoder = getAddressEncoder();

export function getPriceOfBinByBinId(binId: number, tickSpacing: number): Decimal {
  const binStepNum = new Decimal(tickSpacing).div(new Decimal(BASIS_POINT_MAX));
  return new Decimal(1).add(new Decimal(binStepNum)).pow(new Decimal(binId));
}

export function getBinIdFromPrice(price: Decimal, tickSpacing: number, min: boolean): number {
  const binStepNum = new Decimal(tickSpacing).div(new Decimal(BASIS_POINT_MAX));
  const binId = price.log().dividedBy(new Decimal(1).add(binStepNum).log());
  return (min ? binId.floor() : binId.ceil()).toNumber();
}

export function getPriceOfBinByBinIdWithDecimals(
  binId: number,
  tickSpacing: number,
  decimalsA: number,
  decimalsB: number
): Decimal {
  return getPriceOfBinByBinId(binId, tickSpacing)
    .mul(new Decimal(10).pow(decimalsA))
    .div(new Decimal(10).pow(decimalsB));
}

export function getBinIdFromPriceWithDecimals(
  price: Decimal,
  tickSpacing: number,
  min: boolean,
  decimalsA: number,
  decimalsB: number
): number {
  const scaledPrice = price.mul(new Decimal(10).pow(decimalsB)).div(new Decimal(10).pow(decimalsA));
  return getBinIdFromPrice(scaledPrice, tickSpacing, min);
}

export function getPriceFromQ64Price(price: Decimal, decimalsA: number, decimalsB: number): Decimal {
  const scaledPrice = price.mul(new Decimal(10).pow(decimalsA)).div(new Decimal(10).pow(decimalsB));
  return scaledPrice.div(new Decimal(U64_MAX));
}

export function getBinArrayLowerUpperBinId(binArrayIndex: number): [number, number] {
  const lowerBinId = binArrayIndex * MAX_BIN_ARRAY_SIZE;
  const upperBinId = lowerBinId + MAX_BIN_ARRAY_SIZE - 1;

  return [lowerBinId, upperBinId];
}

export function getBinFromBinArray(binIndex: number, binArray: BinArray): Bin | null {
  const [lowerBinId] = getBinArrayLowerUpperBinId(binArray.index.toNumber());
  const offset = binIndex - lowerBinId;
  if (offset >= 0 && offset < binArray.bins.length) {
    return binArray.bins[offset];
  }
  return null;
}

export function getBinFromBinArrays(binIndex: number, binArrays: BinArray[]): Bin | null {
  for (let i = 0; i < binArrays.length; i++) {
    const bin = getBinFromBinArray(binIndex, binArrays[i]);
    if (bin) {
      return bin;
    }
  }
  return null;
}

export function binIdToBinArrayIndex(binId: BN): BN {
  const { div: idx, mod } = binId.divmod(new BN(MAX_BIN_ARRAY_SIZE));
  return binId.isNeg() && !mod.isZero() ? idx.sub(new BN(1)) : idx;
}

export async function deriveBinArray(lbPair: Address, index: BN, programId: Address): Promise<ProgramDerivedAddress> {
  let binArrayBytes: Uint8Array;
  if (index.isNeg()) {
    binArrayBytes = new Uint8Array(index.toTwos(64).toBuffer('le', 8));
  } else {
    binArrayBytes = new Uint8Array(index.toBuffer('le', 8));
  }
  const pda = await getProgramDerivedAddress({
    seeds: [Buffer.from('bin_array'), addressEncoder.encode(lbPair), binArrayBytes],
    programAddress: programId,
  });
  return pda;
}

export type MeteoraPosition = {
  Address: Address;
  amountX: Decimal;
  amountY: Decimal;
};
