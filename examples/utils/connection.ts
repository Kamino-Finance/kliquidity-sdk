import { Connection } from '@solana/web3.js';
import { getEnvOrThrow } from './env';
import {
  createDefaultRpcTransport,
  createRpc,
  createSolanaRpcApi,
  createSolanaRpcSubscriptions,
  DEFAULT_RPC_CONFIG,
  Rpc,
  RpcSubscriptions,
  SolanaRpcApi,
  SolanaRpcSubscriptionsApi,
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

export function getWsConnection(): RpcSubscriptions<SolanaRpcSubscriptionsApi> {
  const WS_ENDPOINT = getEnvOrThrow('WS_ENDPOINT');
  console.log('WS_ENDPOINT:', WS_ENDPOINT);

  return createSolanaRpcSubscriptions(WS_ENDPOINT);
}
