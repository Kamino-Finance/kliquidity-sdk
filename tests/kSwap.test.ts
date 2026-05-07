import { Address } from '@solana/kit';
import { expect } from 'chai';
import { getTokensPrices } from '../src/services/kSwap';
import { Logger } from '../src/utils/Logger';

describe('KSwap token prices service', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const tokenAt = (index: number): Address => `Token${index.toString().padStart(39, 'A')}` as Address;

  const quietLogger: Logger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
  };

  it('splits large token lists into URL-length bounded requests', async () => {
    const fetchedUrls: string[] = [];
    const tokens = Array.from({ length: 90 }, (_, index) => tokenAt(index));

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = input.toString();
      fetchedUrls.push(url);

      const requestUrl = new URL(url);
      const data = Object.fromEntries(
        requestUrl.searchParams.getAll('tokens').map((token, index) => [
          token,
          {
            isScaledUiToken: false,
            value: index + 1,
            updateUnixTime: 0,
            updateHumanTime: '',
            priceInNative: 0,
            priceChange24h: 0,
          },
        ])
      );

      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    }) as typeof fetch;

    const prices = await getTokensPrices('https://api.kamino.finance/kswap', tokens, quietLogger);

    expect(fetchedUrls.length).to.be.greaterThan(1);
    for (const url of fetchedUrls) {
      expect(url.length).to.be.lessThanOrEqual(2000);
    }
    expect(prices.size).to.equal(tokens.length);
  });

  it('logs failed request status, URL, and response body', async () => {
    const token = tokenAt(0);
    const errorMessages: string[] = [];
    const logger: Logger = {
      ...quietLogger,
      error: (message: string) => {
        errorMessages.push(message);
      },
    };

    globalThis.fetch = (async () => {
      return new Response('request URI too long', { status: 414, statusText: 'URI Too Long' });
    }) as typeof fetch;

    await getTokensPrices('https://api.kamino.finance/kswap', [token], logger);

    expect(errorMessages[0]).to.contain('414 URI Too Long');
    expect(errorMessages[0]).to.contain(`https://api.kamino.finance/kswap/batch-token-prices?tokens=${token}`);
    expect(errorMessages[0]).to.contain('request URI too long');
  });

  it('logs unexpected successful response bodies with the URL', async () => {
    const token = tokenAt(0);
    const errorMessages: string[] = [];
    const logger: Logger = {
      ...quietLogger,
      error: (message: string) => {
        errorMessages.push(message);
      },
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ success: false }), { status: 200 });
    }) as typeof fetch;

    await getTokensPrices('https://api.kamino.finance/kswap', [token], logger);

    expect(errorMessages[0]).to.contain('Unexpected tokens batch price response');
    expect(errorMessages[0]).to.contain(`https://api.kamino.finance/kswap/batch-token-prices?tokens=${token}`);
    expect(errorMessages[0]).to.contain('{"success":false}');
  });

  it('logs the URL when fetch fails before a response is returned', async () => {
    const token = tokenAt(0);
    const errorMessages: string[] = [];
    const logger: Logger = {
      ...quietLogger,
      error: (message: string) => {
        errorMessages.push(message);
      },
    };

    globalThis.fetch = (async () => {
      throw new Error('fetch failed');
    }) as typeof fetch;

    await getTokensPrices('https://api.kamino.finance/kswap', [token], logger);

    expect(errorMessages[0]).to.contain(`https://api.kamino.finance/kswap/batch-token-prices?tokens=${token}`);
  });
});
