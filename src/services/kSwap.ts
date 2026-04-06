import Decimal from 'decimal.js';
import { Address } from '@solana/kit';
import { Logger } from '../utils/Logger';

interface KSwapTokenPriceData {
  isScaledUiToken: boolean;
  value: number;
  updateUnixTime: number;
  updateHumanTime: string;
  priceInNative: number;
  priceChange24h: number;
}

interface KSwapBatchPriceResponse {
  success: boolean;
  data: { [key: string]: KSwapTokenPriceData | null };
}

const BATCH_TOKEN_PRICES_LIMIT = 100;

export const getTokensPrices = async (
  apiBaseUrl: string,
  tokens: Address[],
  logger: Logger = console
): Promise<Map<Address, Decimal>> => {
  if (tokens.length === 0) {
    return new Map<Address, Decimal>();
  }

  const batches: Address[][] = [];
  for (let i = 0; i < tokens.length; i += BATCH_TOKEN_PRICES_LIMIT) {
    batches.push(tokens.slice(i, i + BATCH_TOKEN_PRICES_LIMIT));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const tokensParams = batch.map((token) => `tokens=${encodeURIComponent(token)}`).join('&');
      const url = `${apiBaseUrl}/batch-token-prices?${tokensParams}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        logger.error(`Failed to fetch tokens batch price: ${response.statusText}`);
        return { batch, data: null };
      }
      const data = (await response.json()) as KSwapBatchPriceResponse;
      return { batch, data };
    })
  );

  const prices = new Map<Address, Decimal>();
  for (const { batch, data } of results) {
    for (const token of batch) {
      const tokenData = data?.data[token];
      if (tokenData && tokenData.value !== null && tokenData.value !== undefined) {
        try {
          const price = new Decimal(tokenData.value);
          prices.set(token, price);
        } catch (error) {
          logger.error(`Failed to parse price for token, setting to 0: ${token}:`, error);
          prices.set(token, new Decimal(0));
        }
      } else {
        logger.warn(`No price data available for token ${token}, setting to 0`);
        prices.set(token, new Decimal(0));
      }
    }
  }

  return prices;
};
