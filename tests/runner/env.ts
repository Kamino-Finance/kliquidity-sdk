import {
  address,
  Address,
  createDefaultRpcTransport,
  createRpc,
  createSolanaRpcApi,
  createSolanaRpcSubscriptions,
  DEFAULT_RPC_CONFIG,
  generateKeyPairSigner,
  lamports,
  SolanaRpcApi,
  TransactionSigner,
} from '@solana/kit';
import { ConnectionPool } from './tx';
import { Connection } from '@solana/web3.js';
import { sleep } from '../../src';

export const LOCAL_RAYDIUM_PROGRAM_ID: Address = address('devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH');

export type Env = {
  admin: TransactionSigner;
  c: ConnectionPool;
  legacyConnection: Connection;
  kliquidityProgramId: Address;
  raydiumProgramId: Address;
};

export type InitEnvParams = {
  rpcUrl?: string;
  wsUrl?: string;
  admin?: TransactionSigner;
  kliquidityProgramId?: Address;
  raydiumProgramId?: Address;
};

export async function initEnv({
  rpcUrl = 'http://localhost:8899',
  wsUrl = 'ws://localhost:8900',
  kliquidityProgramId = address('E6qbhrt4pFmCotNUSSEh6E5cRQCEJpMcd79Z56EG9KY'),
  raydiumProgramId = LOCAL_RAYDIUM_PROGRAM_ID,
  admin,
}: InitEnvParams = {}): Promise<Env> {
  const api = createSolanaRpcApi<SolanaRpcApi>({
    ...DEFAULT_RPC_CONFIG,
    defaultCommitment: 'processed',
  });
  const rpc = createRpc({ api, transport: createDefaultRpcTransport({ url: rpcUrl }) });
  const ws = createSolanaRpcSubscriptions(wsUrl);

  const adminSigner = admin ?? (await generateKeyPairSigner());

  const solAirdrop = 1000;
  await rpc.requestAirdrop(adminSigner.address, lamports(BigInt(solAirdrop * 1e9))).send();
  await sleep(2000);
  console.log(`Airdropping ${solAirdrop} SOL to admin: ${adminSigner.address}...`);

  const legacyConnection = new Connection(rpcUrl, 'processed');

  const env: Env = {
    admin: adminSigner,
    c: { rpc, wsRpc: ws },
    legacyConnection,
    kliquidityProgramId,
    raydiumProgramId,
  };

  return env;
}
