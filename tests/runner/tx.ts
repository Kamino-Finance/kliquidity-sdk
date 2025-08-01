import {
  Address,
  AddressesByLookupTableAddress,
  addSignersToTransactionMessage,
  appendTransactionMessageInstructions,
  Blockhash,
  compressTransactionMessageUsingAddressLookupTables,
  createTransactionMessage,
  GetLatestBlockhashApi,
  getSignatureFromTransaction,
  Instruction,
  pipe,
  Rpc,
  RpcSubscriptions,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  Signature,
  signTransactionMessageWithSigners,
  SolanaRpcApi,
  SolanaRpcSubscriptionsApi,
  TransactionSigner,
} from '@solana/kit';
import { fetchAllAddressLookupTable } from '@solana-program/address-lookup-table';

export type ConnectionPool = {
  rpc: Rpc<SolanaRpcApi>;
  wsRpc: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
};

export async function sendAndConfirmTx(
  { rpc, wsRpc }: ConnectionPool,
  payer: TransactionSigner,
  ixs: Instruction[],
  signers: TransactionSigner[] = [],
  luts: Address[] = []
): Promise<Signature> {
  const blockhash = await fetchBlockhash(rpc);

  const lutsByAddress: AddressesByLookupTableAddress = {};
  if (luts.length > 0) {
    const lutAccs = await fetchAllAddressLookupTable(rpc, luts);
    for (const acc of lutAccs) {
      lutsByAddress[acc.address] = acc.data.addresses;
    }
  }

  const tx = await pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => appendTransactionMessageInstructions(ixs, tx),
    (tx) => setTransactionMessageFeePayerSigner(payer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
    (tx) => compressTransactionMessageUsingAddressLookupTables(tx, lutsByAddress),
    (tx) => addSignersToTransactionMessage(signers, tx),
    (tx) => signTransactionMessageWithSigners(tx)
  );

  const sig = getSignatureFromTransaction(tx);

  try {
    await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions: wsRpc })(tx, {
      commitment: 'processed',
      preflightCommitment: 'processed',
      skipPreflight: false,
    });
  } catch (e) {
    console.error(`Transaction ${sig} failed:`, e);
    // await sleep(500);
    let tx;
    try {
      tx = await rpc
        .getTransaction(sig, { maxSupportedTransactionVersion: 0, encoding: 'jsonParsed', commitment: 'confirmed' })
        .send();
    } catch (e2) {
      console.error('Error fetching transaction logs:', e2);
      throw e;
    }
    if (tx && tx.meta?.logMessages) {
      console.log('Transaction logs:', tx.meta.logMessages);
    } else {
      console.log('Transaction logs not found');
    }
    throw e;
  }

  return sig;
}

export type BlockhashWithHeight = { blockhash: Blockhash; lastValidBlockHeight: bigint; slot: bigint };

export async function fetchBlockhash(rpc: Rpc<GetLatestBlockhashApi>): Promise<BlockhashWithHeight> {
  const res = await rpc.getLatestBlockhash({ commitment: 'finalized' }).send();
  return {
    blockhash: res.value.blockhash,
    lastValidBlockHeight: res.value.lastValidBlockHeight,
    slot: res.context.slot,
  };
}
