import Decimal from 'decimal.js';
import { Address } from '@solana/kit';

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

export const getTokensPrices = async (apiBaseUrl: string, tokens: Address[]): Promise<Map<Address, Decimal>> => {
  const tokensParams = tokens.map((token) => `tokens=${encodeURIComponent(token)}`).join('&');
  const url = `${apiBaseUrl}/batch-token-prices?${tokensParams}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    console.error(`Failed to fetch tokens batch price: ${response.statusText}`);
    return new Map<Address, Decimal>();
  }

  const data = (await response.json()) as KSwapBatchPriceResponse;

  const prices = new Map<Address, Decimal>();
  for (const token of tokens) {
    const tokenData = data.data[token];
    if (tokenData && tokenData.value !== null && tokenData.value !== undefined) {
      try {
        const price = new Decimal(tokenData.value);
        prices.set(token, price);
      } catch (error) {
        console.error(`Failed to parse price for token, setting to 0: ${token}: ${error}`);
        prices.set(token, new Decimal(0));
      }
    } else {
      console.warn(`No price data available for token ${token}, setting to 0`);
      prices.set(token, new Decimal(0));
    }
  }
  return prices;
};
