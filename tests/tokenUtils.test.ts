import { expect } from 'chai';
import type { CollateralInfo } from '../src/@codegen/kliquidity/types';
import { getTokenNameFromCollateralInfo } from '../src/utils/tokenUtils';

describe('tokenUtils collateral name decoding', () => {
  it('decodes live uint8 arrays', () => {
    const collateralInfo = {
      name: new Uint8Array([83, 79, 76, 0, 0]),
    } as unknown as CollateralInfo;

    expect(getTokenNameFromCollateralInfo(collateralInfo)).to.equal('SOL');
  });

  it('decodes plain arrays', () => {
    const collateralInfo = {
      name: [85, 83, 68, 67, 0],
    } as unknown as CollateralInfo;

    expect(getTokenNameFromCollateralInfo(collateralInfo)).to.equal('USDC');
  });

  it('decodes JSON-round-tripped typed arrays with numeric keys', () => {
    const collateralInfo = {
      name: { 0: 66, 1: 79, 2: 78, 3: 75, 4: 0 },
    } as unknown as CollateralInfo;

    expect(getTokenNameFromCollateralInfo(collateralInfo)).to.equal('BONK');
  });

  it('decodes Buffer-style JSON payloads', () => {
    const collateralInfo = {
      name: { type: 'Buffer', data: [74, 84, 79, 0] },
    } as unknown as CollateralInfo;

    expect(getTokenNameFromCollateralInfo(collateralInfo)).to.equal('JTO');
  });

  it('passes through string values and strips null bytes', () => {
    const collateralInfo = {
      name: 'KMNO\u0000\u0000',
    } as unknown as CollateralInfo;

    expect(getTokenNameFromCollateralInfo(collateralInfo)).to.equal('KMNO');
  });

  it('returns an empty string for unsupported shapes', () => {
    const collateralInfo = {
      name: 42 as unknown,
    } as unknown as CollateralInfo;

    expect(getTokenNameFromCollateralInfo(collateralInfo)).to.equal('');
  });
});
