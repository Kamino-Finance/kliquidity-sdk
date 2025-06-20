import { PublicKey } from '@solana/web3.js';
import {
  Address,
  SignatureDictionary,
  Transaction,
  TransactionPartialSigner,
  TransactionPartialSignerConfig,
  TransactionSigner,
} from '@solana/kit';

export function toLegacyPublicKey(address: Address): PublicKey {
  return new PublicKey(address.toString());
}

export function noopSigner(address: Address): TransactionSigner {
  const signer: TransactionPartialSigner = {
    address,
    async signTransactions(
      _transactions: readonly Transaction[],
      _config?: TransactionPartialSignerConfig
    ): Promise<readonly SignatureDictionary[]> {
      // Return an array of empty SignatureDictionary objects — one per transaction
      return [];
    },
  };
  return signer;
}
