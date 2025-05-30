import { Connection } from '@solana/web3.js';
import { getEnvOrThrow } from './env';
import {
  createDefaultRpcTransport,
  createRpc,
  createSolanaRpcApi,
  createSolanaRpcSubscriptions,
  DEFAULT_RPC_CONFIG,
  Rpc,
  SolanaRpcApi,
} from '@solana/kit';

export function getLegacyConnection() {
  const RPC_ENDPOINT = getEnvOrThrow('RPC_ENDPOINT');
  console.log('RPC_ENDPOINT:', RPC_ENDPOINT);
  return new Connection(RPC_ENDPOINT);
}

export function getConnection(): Rpc<SolanaRpcApi> {
  const RPC_ENDPOINT = getEnvOrThrow('RPC_ENDPOINT');
  console.log('RPC_ENDPOINT:', RPC_ENDPOINT);

  const api = createSolanaRpcApi<SolanaRpcApi>({
    ...DEFAULT_RPC_CONFIG,
    defaultCommitment: 'processed',
  });
  return createRpc({ api, transport: createDefaultRpcTransport({ url: RPC_ENDPOINT }) });
}

export function 
