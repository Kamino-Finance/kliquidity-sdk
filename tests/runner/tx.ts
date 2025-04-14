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
  IInstruction,
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
  ixs: IInstruction[],
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

  await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions: wsRpc })(tx, {
    commitment: 'processed',
    preflightCommitment: 'processed',
  });

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
