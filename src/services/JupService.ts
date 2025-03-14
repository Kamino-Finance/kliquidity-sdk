import { Connection, PublicKey, Transaction, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { SolanaCluster } from '@hubbleprotocol/hubble-config';
import axios from 'axios';
import Decimal from 'decimal.js';
import { DeserializedVersionedTransaction } from '../utils';
import { QuoteResponse, SwapInstructionsResponse, SwapResponse, createJupiterApiClient } from '@jup-ag/api';
import { PubkeyHashMap } from '../utils/pubkey';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export const DEFAULT_JUP_API_ENDPOINT = 'https://api.jup.ag';

export type SwapTransactionsResponse = {
  setupTransaction: string | undefined;
  swapTransaction: string;
  cleanupTransaction: string | undefined;
};

export class JupService {
  private readonly _connection: Connection;
  private readonly _cluster: SolanaCluster;

  constructor(connection: Connection, cluster: SolanaCluster) {
    this._connection = connection;
    this._cluster = cluster;
  }

  // the amounts has to be in lamports
  static getBestRouteV6 = async (
    userPublicKey: PublicKey,
    amount: Decimal,
    inputMint: PublicKey,
    outputMint: PublicKey,
    slippageBps: number,
    asLegacyTransaction?: boolean,
    maxAccounts?: number,
    onlyDirectRoutes?: boolean
  ): Promise<SwapResponse> => {
    try {
      const jupiterQuoteApi = createJupiterApiClient(); // config is optional

      // quote-api.jup.ag/v6/quote?inputMint=7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj&outputMint=mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So&amount=71101983&slippageBps=10&onlyDirectRoutes=false&asLegacyTransaction=false&maxAccounts=33

      const res = await this.getBestRouteQuoteV6(
        amount,
        inputMint,
        outputMint,
        slippageBps,
        asLegacyTransaction,
        maxAccounts,
        onlyDirectRoutes
      );

      const transaction: SwapResponse = await jupiterQuoteApi.swapPost({
        swapRequest: {
          quoteResponse: res,
          userPublicKey: userPublicKey.toString(),
          wrapAndUnwrapSol: false,
        },
      });

      return transaction;
    } catch (error) {
      console.log('getBestRouteV6 error', error);
      throw error;
    }
  };

  static getBestRouteQuoteV6 = async (
    amount: Decimal,
    inputMint: PublicKey,
    outputMint: PublicKey,
    slippageBps: number,
    asLegacyTransaction?: boolean,
    maxAccounts?: number,
    onlyDirectRoutes?: boolean,
    jupEndpoint?: string
  ): Promise<QuoteResponse> => {
    try {
      const params = {
        inputMint: inputMint.toString(),
        outputMint: outputMint.toString(),
        amount: amount.floor().toNumber(),
        slippageBps,
        onlyDirectRoutes: onlyDirectRoutes,
        asLegacyTransaction,
        maxAccounts,
      };

      const baseURL = jupEndpoint || DEFAULT_JUP_API_ENDPOINT;
      const res = await axios.get(`${baseURL}/swap/v1/quote`, { params });
      return res.data as QuoteResponse;
    } catch (error) {
      console.log('getBestRouteQuoteV6 error', error);
      throw error;
    }
  };

  static getSwapIxsFromQuote = async (
    userPublicKey: PublicKey,
    quote: QuoteResponse,
    wrapUnwrapSOL = true,
    asLegacyTransaction?: boolean
  ): Promise<SwapInstructionsResponse> => {
    try {
      const jupiterQuoteApi = createJupiterApiClient(); // config is optional

      return await jupiterQuoteApi.swapInstructionsPost({
        swapRequest: {
          quoteResponse: quote,
          userPublicKey: userPublicKey.toString(),
          wrapAndUnwrapSol: wrapUnwrapSOL,
          asLegacyTransaction: asLegacyTransaction,
        },
      });
    } catch (error) {
      console.log('getSwapTxFromQuote error', error);
      throw error;
    }
  };

  static getPrice = async (
    inputMint: PublicKey | string,
    outputMint: PublicKey | string,
    jupEndpoint?: string
  ): Promise<number> => {
    const params = {
      ids: inputMint.toString(),
      vsToken: outputMint.toString(),
      vsAmount: 1,
    };

    // BONK token
    if (outputMint.toString() === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') {
      params.vsAmount = 100;
    }

    const baseURL = jupEndpoint || DEFAULT_JUP_API_ENDPOINT;
    const res = await axios.get(`${baseURL}/price/v2`, { params });
    return res.data.data[inputMint.toString()].price;
  };

  static getPrices = async (
    inputMints: (PublicKey | string)[],
    outputMint: PublicKey | string,
    jupEndpoint?: string
  ): Promise<PubkeyHashMap<PublicKey, Decimal>> => {
    const mintsCommaSeparated = inputMints.map((mint) => mint.toString()).join(',');
    const params = {
      ids: mintsCommaSeparated,
      vsToken: outputMint.toString(),
      vsAmount: 1,
    };

    // BONK token
    if (outputMint.toString() === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') {
      params.vsAmount = 100;
    }

    const baseURL = jupEndpoint || DEFAULT_JUP_API_ENDPOINT;
    const prices: PubkeyHashMap<PublicKey, Decimal> = new PubkeyHashMap();
    try {
      const res = await axios.get(`${baseURL}/price/v2`, { params });
      for (const mint of inputMints) {
        try {
          prices.set(new PublicKey(mint), new Decimal(res.data.data[mint.toString()].price));
        } catch (e) {
          prices.set(new PublicKey(mint), new Decimal(0));
        }
      }
    } catch (e) {
      // ignore
    }

    return prices;
  };

  static getDollarPrices(
    inputMints: (PublicKey | string)[],
    jupEndpoint?: string
  ): Promise<PubkeyHashMap<PublicKey, Decimal>> {
    return this.getPrices(inputMints, USDC_MINT, jupEndpoint);
  }

  static getDollarPrice = async (inputMint: PublicKey | string, jupEndpoint?: string): Promise<number> => {
    return this.getPrice(inputMint, USDC_MINT, jupEndpoint);
  };

  static buildTransactionsFromSerialized = (serializedTransactions: Array<string | undefined>): Transaction[] => {
    return serializedTransactions.filter(Boolean).map((tx) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return Transaction.from(Buffer.from(tx!, 'base64'));
    });
  };

  static deserealizeVersionedTransactions = async (
    connection: Connection,
    serializedTransactions: Array<string | undefined>
  ): Promise<DeserializedVersionedTransaction> => {
    const filtered = serializedTransactions.filter(Boolean);
    const result: TransactionMessage[] = [];
    let lookupTablesAddresses: PublicKey[] = [];

    for (let i = 0; i < filtered.length; i++) {
      const tx = filtered[i];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      // safe to use as it is filtered above at 120 line
      const buffer = Buffer.from(tx!, 'base64');

      const versionedTx = VersionedTransaction.deserialize(buffer);
      const { addressTableLookups } = versionedTx.message;
      lookupTablesAddresses = [...lookupTablesAddresses, ...addressTableLookups.map((item) => item.accountKey)];

      const lookupTableAccountsRequests = addressTableLookups.map((item) => {
        return JupService.getLookupTableAccount(connection, item.accountKey);
      });

      const lookupTableAccounts = await Promise.all(lookupTableAccountsRequests);

      const decompiledMessage = TransactionMessage.decompile(versionedTx.message, {
        // @ts-ignore
        addressLookupTableAccounts: lookupTableAccounts,
      });
      result.push(decompiledMessage);
    }

    return { txMessage: result, lookupTablesAddresses };
  };

  static getLookupTableAccount = async (connection: Connection, address: string | PublicKey) => {
    return connection.getAddressLookupTable(new PublicKey(address)).then((res) => res.value);
  };
}
