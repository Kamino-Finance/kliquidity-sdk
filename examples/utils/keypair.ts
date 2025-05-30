import { readFileSync } from 'fs';
import { getEnvOrThrow } from './env';
import { createKeyPairSignerFromBytes, TransactionSigner } from '@solana/kit';

export async function getKeypair(): Promise<TransactionSigner> {
  const FILE_PATH = getEnvOrThrow('KEYPAIR_FILE');
  const fileContent = readFileSync(FILE_PATH);

  const keypairBytes = new Uint8Array(JSON.parse(fileContent.toString()));

  return await createKeyPairSignerFromBytes(keypairBytes);
}
