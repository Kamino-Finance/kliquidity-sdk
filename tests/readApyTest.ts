import { address, generateKeyPairSigner } from '@solana/kit';
import { Kamino } from '../src';
import { GlobalConfigMainnet } from './runner/utils';
import { PROGRAM_ID as KLIQUIDITY_PROGRAM_ID } from '../src/@codegen/kliquidity/programId';
import { PROGRAM_ID as WHIRLPOOL_PROGRAM_ID } from '../src/@codegen/whirlpools/programId';
import { PROGRAM_ID as RAYDIUM_PROGRAM_ID } from '../src/@codegen/raydium/programId';
import { initEnv } from './runner/env';

describe('Read APY Test', async () => {
  const cluster = 'mainnet-beta';
  const rpcUrl: string = 'https://api.mainnet-beta.solana.com';
  const wsUrl: string = 'wss://api.mainnet-beta.solana.com';

  const signer = await generateKeyPairSigner();
  const env = await initEnv({
    rpcUrl,
    wsUrl,
    admin: signer,
    kliquidityProgramId: KLIQUIDITY_PROGRAM_ID,
    raydiumProgramId: RAYDIUM_PROGRAM_ID,
  });

  it('read_apy_raydium_strat', async () => {
    const kamino = new Kamino(
      cluster,
      env.c.rpc,
      GlobalConfigMainnet,
      env.kliquidityProgramId,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const raydiumStrat = address('BLP7UHUg1yNry94Qk3sM8pAfEyDhTZirwFghw9DoBjn7');
    const aprApy = await kamino.getStrategyAprApy(raydiumStrat);
    console.log('aprApy', aprApy);
  });
});
