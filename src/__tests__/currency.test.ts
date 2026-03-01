import { describe, it, expect } from 'vitest';
import {
  convertAmount,
  parseYahooFxResponse,
  formatCurrency,
  FALLBACK_RATES,
} from '@/lib/currency';

const TEST_RATES = { USD: 1.00, GBP: 0.79, EUR: 0.92, HKD: 7.78, SGD: 1.35 };

describe('currency utils', () => {
  describe('convertAmount()', () => {
    it('returns same amount for USD', () => {
      expect(convertAmount(1_000_000, 'USD', TEST_RATES)).toBe(1_000_000);
    });

    it('converts USD to GBP', () => {
      expect(convertAmount(1_000_000, 'GBP', TEST_RATES)).toBeCloseTo(790_000, -2);
    });

    it('converts USD to HKD', () => {
      expect(convertAmount(1_000_000, 'HKD', TEST_RATES)).toBeCloseTo(7_780_000, -2);
    });
  });

  describe('parseYahooFxResponse()', () => {
    it('returns FALLBACK_RATES for null input', () => {
      expect(parseYahooFxResponse(null)).toEqual(FALLBACK_RATES);
    });

    it('returns FALLBACK_RATES for malformed input', () => {
      expect(parseYahooFxResponse({ foo: 'bar' })).toEqual(FALLBACK_RATES);
    });

    it('parses a valid Yahoo Finance v7 quote response', () => {
      const fixture = {
        quoteResponse: {
          result: [
            { symbol: 'GBPUSD=X', regularMarketPrice: 1.27 },
            { symbol: 'EURUSD=X', regularMarketPrice: 1.09 },
            { symbol: 'USDHKD=X', regularMarketPrice: 7.82 },
            { symbol: 'USDSGD=X', regularMarketPrice: 1.34 },
          ],
        },
      };
      const rates = parseYahooFxResponse(fixture);
      // GBPUSD=X: 1 GBP = 1.27 USD → GBP rate = 1/1.27 ≈ 0.787
      expect(rates.GBP).toBeCloseTo(1 / 1.27, 3);
      expect(rates.EUR).toBeCloseTo(1 / 1.09, 3);
      expect(rates.HKD).toBeCloseTo(7.82, 2);
      expect(rates.SGD).toBeCloseTo(1.34, 2);
      expect(rates.USD).toBe(1);
    });
  });

  describe('formatCurrency()', () => {
    it('formats USD millions with $ symbol', () => {
      expect(formatCurrency(2_400_000, 'USD', TEST_RATES)).toBe('$2.40M');
    });

    it('formats GBP with £ symbol', () => {
      const result = formatCurrency(2_400_000, 'GBP', TEST_RATES);
      expect(result.startsWith('£')).toBe(true);
    });

    it('formats HKD with HK$ symbol', () => {
      const result = formatCurrency(2_400_000, 'HKD', TEST_RATES);
      expect(result.startsWith('HK$')).toBe(true);
    });
  });
});
