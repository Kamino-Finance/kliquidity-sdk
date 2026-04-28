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
const BATCH_TOKEN_PRICES_MAX_URL_LENGTH = 2000;
const BATCH_TOKEN_PRICES_PATH = 'batch-token-prices';
const BATCH_TOKEN_PRICES_QUERY_KEY = 'tokens';

const getBatchTokenPricesBaseUrl = (apiBaseUrl: string): string =>
  `${apiBaseUrl.replace(/\/+$/, '')}/${BATCH_TOKEN_PRICES_PATH}`;

const getBatchTokenPricesUrl = (apiBaseUrl: string, tokens: Address[]): string => {
  const tokensParams = new URLSearchParams();
  for (const token of tokens) {
    tokensParams.append(BATCH_TOKEN_PRICES_QUERY_KEY, token);
  }

  return `${getBatchTokenPricesBaseUrl(apiBaseUrl)}?${tokensParams.toString()}`;
};

const getTokenQueryParamLength = (token: Address): number => {
  const tokenParam = new URLSearchParams();
  tokenParam.append(BATCH_TOKEN_PRICES_QUERY_KEY, token);
  return tokenParam.toString().length;
};

const getTokensPriceBatches = (apiBaseUrl: string, tokens: Address[]): Address[][] => {
  const baseUrlLength = `${getBatchTokenPricesBaseUrl(apiBaseUrl)}?`.length;
  const batches: Address[][] = [];
  let batch: Address[] = [];
  let batchUrlLength = baseUrlLength;

  for (const token of tokens) {
    const tokenParamLength = getTokenQueryParamLength(token);
    const separatorLength = batch.length === 0 ? 0 : 1;
    const nextBatchUrlLength = batchUrlLength + separatorLength + tokenParamLength;
    if (batch.length < BATCH_TOKEN_PRICES_LIMIT && nextBatchUrlLength <= BATCH_TOKEN_PRICES_MAX_URL_LENGTH) {
      batch.push(token);
      batchUrlLength = nextBatchUrlLength;
      continue;
    }

    if (batch.length > 0) {
      batches.push(batch);
    }

    const singleTokenUrl = getBatchTokenPricesUrl(apiBaseUrl, [token]);
    if (singleTokenUrl.length > BATCH_TOKEN_PRICES_MAX_URL_LENGTH) {
      throw new Error(
        `KSwap token price URL length ${singleTokenUrl.length} exceeds limit ${BATCH_TOKEN_PRICES_MAX_URL_LENGTH} for a single token: ${singleTokenUrl}`
      );
    }

    batch = [token];
    batchUrlLength = baseUrlLength + tokenParamLength;
  }

  if (batch.length > 0) {
    batches.push(batch);
  }

  return batches;
};

const getResponseBodyForLog = async (response: Response): Promise<string> => {
  try {
    return await response.text();
  } catch (error) {
    return `Failed to read response body: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const getTokensPrices = async (
  apiBaseUrl: string,
  tokens: Address[],
  logger: Logger = console
): Promise<Map<Address, Decimal>> => {
  if (tokens.length === 0) {
    return new Map<Address, Decimal>();
  }

  const batches = getTokensPriceBatches(apiBaseUrl, tokens);

  const results = await Promise.all(
    batches.map(async (batch) => {
      const url = getBatchTokenPricesUrl(apiBaseUrl, batch);
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        logger.error(`Failed to fetch tokens batch price. URL: ${url}.`, error);
        return { batch, data: null };
      }

      const responseBody = await getResponseBodyForLog(response);
      if (!response.ok) {
        logger.error(
          `Failed to fetch tokens batch price: ${response.status} ${response.statusText}. URL: ${url}. Response body: ${responseBody}`
        );
        return { batch, data: null };
      }
      try {
        const data = JSON.parse(responseBody) as KSwapBatchPriceResponse;
        if (data.success === false || !data.data) {
          logger.error(`Unexpected tokens batch price response. URL: ${url}. Response body: ${responseBody}`);
          return { batch, data: null };
        }
        return { batch, data };
      } catch (error) {
        logger.error(`Failed to parse tokens batch price response. URL: ${url}. Response body: ${responseBody}`, error);
        return { batch, data: null };
      }
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
