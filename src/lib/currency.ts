/**
 * Currency conversion utilities for CybRisk results page.
 * FX rates sourced from Yahoo Finance (live) with hardcoded fallback.
 *
 * Yahoo Finance symbols used:
 *   GBPUSD=X  → regularMarketPrice = USD per 1 GBP  → GBP rate = 1/price
 *   EURUSD=X  → regularMarketPrice = USD per 1 EUR  → EUR rate = 1/price
 *   USDHKD=X  → regularMarketPrice = HKD per 1 USD  → HKD rate = price
 *   USDSGD=X  → regularMarketPrice = SGD per 1 USD  → SGD rate = price
 */

export type Currency = 'USD' | 'GBP' | 'EUR' | 'HKD' | 'SGD';

export const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1.00,
  GBP: 0.79,
  EUR: 0.92,
  HKD: 7.78,
  SGD: 1.35,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  HKD: 'HK$',
  SGD: 'S$',
};

/** Convert a USD amount to the target currency using the provided rates. */
export function convertAmount(
  usd: number,
  currency: Currency,
  rates: Record<Currency, number>,
): number {
  return usd * rates[currency];
}

/** Parse Yahoo Finance v7 /quote response into a rates Record. Returns FALLBACK_RATES on any error. */
export function parseYahooFxResponse(json: unknown): Record<Currency, number> {
  try {
    const data = json as {
      quoteResponse?: { result?: Array<{ symbol: string; regularMarketPrice: number }> };
    };
    const results = data?.quoteResponse?.result;
    if (!Array.isArray(results) || results.length === 0) return { ...FALLBACK_RATES };

    const rates: Record<Currency, number> = { ...FALLBACK_RATES };

    for (const quote of results) {
      const { symbol, regularMarketPrice: price } = quote;
      if (typeof price !== 'number' || !isFinite(price) || price <= 0) continue;
      switch (symbol) {
        case 'GBPUSD=X': rates.GBP = 1 / price; break;
        case 'EURUSD=X': rates.EUR = 1 / price; break;
        case 'USDHKD=X': rates.HKD = price; break;
        case 'USDSGD=X': rates.SGD = price; break;
      }
    }
    return rates;
  } catch {
    return { ...FALLBACK_RATES };
  }
}

/** Format a USD amount in the target currency with symbol and M/K suffix. */
export function formatCurrency(
  usd: number,
  currency: Currency,
  rates: Record<Currency, number>,
): string {
  const sym = CURRENCY_SYMBOLS[currency];
  const converted = convertAmount(usd, currency, rates);
  if (converted >= 1_000_000) {
    return `${sym}${(converted / 1_000_000).toFixed(2)}M`;
  }
  if (converted >= 1_000) {
    return `${sym}${(converted / 1_000).toFixed(1)}K`;
  }
  return `${sym}${converted.toFixed(0)}`;
}
