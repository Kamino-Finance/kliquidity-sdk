import type { GetProgramAccountsMemcmpFilter } from '@solana/rpc-types';

/**
 * Creates a memcmp filter compatible with all RPC providers.
 *
 * We intentionally omit the `encoding` parameter because:
 * 1. It's optional in the Solana JSON-RPC spec (defaults to base58)
 * 2. Some RPC providers reject the encoding parameter entirely
 * 3. Omitting it provides maximum compatibility
 *
 * Type assertion needed because @solana/kit requires encoding,
 * but the actual spec makes it optional.
 */
export function createMemcmpFilter(bytes: string, offset: bigint): GetProgramAccountsMemcmpFilter {
  return {
    memcmp: {
      bytes,
      offset,
    },
  } as unknown as GetProgramAccountsMemcmpFilter;
}
