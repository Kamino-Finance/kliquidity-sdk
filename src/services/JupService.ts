import { AccountRole, address, Address, Instruction as SolanaInstruction } from '@solana/kit';
import axios from 'axios';
import Decimal from 'decimal.js';
import {
  QuoteResponse,
  SwapInstructionsResponse as JupSwapInstructionsResponse,
  createJupiterApiClient,
  Instruction,
} from '@jup-ag/api';

const USDC_MINT = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export const DEFAULT_JUP_API_ENDPOINT = 'https://lite-api.jup.ag';
export const DEFAULT_JUP_SWAP_API = 'https://lite-api.jup.ag/swap/v1';

const jupiterSwapApi = createJupiterApiClient({ basePath: DEFAULT_JUP_SWAP_API });

export type SwapTransactionsResponse = {
  setupTransaction: string | undefined;
  swapTransaction: string;
  cleanupTransaction: string | undefined;
};

interface SwapInstructionsResponse {
  tokenLedgerInstruction?: SolanaInstruction;
  computeBudgetInstructions: Array<SolanaInstruction>;
  setupInstructions: Array<SolanaInstruction>;
  swapInstruction: SolanaInstruction;
  cleanupInstruction?: SolanaInstruction;
  addressLookupTableAddresses: Array<Address>;
}

export class JupService {
  // the amounts has to be in lamports
  static getBestRouteV6 = async (
    userAddress: Address,
    amount: Decimal,
    inputMint: Address,
    outputMint: Address,
    slippageBps: number,
    asLegacyTransaction?: boolean,
    maxAccounts?: number,
    onlyDirectRoutes?: boolean
  ): Promise<SwapInstructionsResponse> => {
    try {
      // https://lite-api.jup.ag/swap/v1/quote?inputMint=7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj&outputMint=mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So&amount=71101983&slippageBps=10&onlyDirectRoutes=false&asLegacyTransaction=false&maxAccounts=33

      const res = await this.getBestRouteQuoteV6(
        amount,
        inputMint,
        outputMint,
        slippageBps,
        asLegacyTransaction,
        maxAccounts,
        onlyDirectRoutes
      );

      const ixsResponse = await jupiterSwapApi.swapInstructionsPost({
        swapRequest: { quoteResponse: res, userPublicKey: userAddress, wrapAndUnwrapSol: false },
      });

      const swapIxs: SwapInstructionsResponse = {
        tokenLedgerInstruction: ixsResponse.tokenLedgerInstruction
          ? transformResponseIx(ixsResponse.tokenLedgerInstruction)
          : undefined,
        computeBudgetInstructions: ixsResponse.computeBudgetInstructions.map((ix) => transformResponseIx(ix)),
        setupInstructions: ixsResponse.setupInstructions.map((ix) => transformResponseIx(ix)),
        swapInstruction: transformResponseIx(ixsResponse.swapInstruction),
        cleanupInstruction: ixsResponse.cleanupInstruction
          ? transformResponseIx(ixsResponse.cleanupInstruction)
          : undefined,
        addressLookupTableAddresses: ixsResponse.addressLookupTableAddresses.map((a) => address(a)),
      };

      return swapIxs;
    } catch (error) {
      console.log('getBestRouteV6 error', error);
      throw error;
    }
  };

  static getBestRouteQuoteV6 = async (
    amount: Decimal,
    inputMint: Address,
    outputMint: Address,
    slippageBps: number,
    asLegacyTransaction?: boolean,
    maxAccounts?: number,
    onlyDirectRoutes?: boolean,
    jupEndpoint?: string
  ): Promise<QuoteResponse> => {
    try {
      const params = {
        inputMint,
        outputMint,
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
    userAddress: Address,
    quote: QuoteResponse,
    wrapUnwrapSOL = true,
    asLegacyTransaction?: boolean
  ): Promise<JupSwapInstructionsResponse> => {
    try {
      return await jupiterSwapApi.swapInstructionsPost({
        swapRequest: {
          quoteResponse: quote,
          userPublicKey: userAddress,
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
    inputMint: Address | string,
    outputMint: Address | string,
    jupEndpoint?: string
  ): Promise<number> => {
    const params = { ids: inputMint.toString(), vsToken: outputMint.toString(), vsAmount: 1 };

    // BONK token
    if (outputMint.toString() === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') {
      params.vsAmount = 100;
    }

    const baseURL = jupEndpoint || DEFAULT_JUP_API_ENDPOINT;
    const res = await axios.get(`${baseURL}/price/v3`, { params });
    return res.data[inputMint.toString()].usdPrice;
  };

  static getPrices = async (
    inputMints: (Address | string)[],
    outputMint: Address | string,
    jupEndpoint?: string
  ): Promise<Map<Address, Decimal>> => {
    const mintsCommaSeparated = inputMints.map((mint) => mint.toString()).join(',');
    const params = { ids: mintsCommaSeparated, vsToken: outputMint.toString(), vsAmount: 1 };

    // BONK token
    if (outputMint.toString() === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') {
      params.vsAmount = 100;
    }

    const baseURL = jupEndpoint || DEFAULT_JUP_API_ENDPOINT;
    const prices = new Map<Address, Decimal>();
    try {
      const res = await axios.get(`${baseURL}/price/v3`, { params });
      for (const mint of inputMints) {
        try {
          prices.set(address(mint), new Decimal(res.data[mint.toString()].usdPrice));
        } catch (e) {
          prices.set(address(mint), new Decimal(0));
        }
      }
    } catch (e) {
      // ignore
    }

    return prices;
  };

  static getDollarPrices(inputMints: (Address | string)[], jupEndpoint?: string): Promise<Map<Address, Decimal>> {
    return this.getPrices(inputMints, USDC_MINT, jupEndpoint);
  }

  static getDollarPrice = async (inputMint: Address | string, jupEndpoint?: string): Promise<number> => {
    return this.getPrice(inputMint, USDC_MINT, jupEndpoint);
  };
}

export function transformResponseIx(ix: Instruction): SolanaInstruction {
  return {
    data: ix.data ? Buffer.from(ix.data, 'base64') : undefined,
    programAddress: address(ix.programId),
    accounts: ix.accounts.map((k) => ({
      address: address(k.pubkey),
      role: getAccountRole({ isSigner: k.isSigner, isMut: k.isWritable }),
    })),
  };
}

export function getAccountRole({ isSigner, isMut }: { isSigner: boolean; isMut: boolean }): AccountRole {
  if (isSigner && isMut) {
    return AccountRole.WRITABLE_SIGNER;
  }
  if (isSigner && !isMut) {
    return AccountRole.READONLY_SIGNER;
  }
  if (!isSigner && isMut) {
    return AccountRole.WRITABLE;
  }
  return AccountRole.READONLY;
}
