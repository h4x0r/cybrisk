import { describe, it, expect } from 'vitest';
import {
  sortIndustries,
  scaleBar,
  isUserIndustry,
} from '@/lib/industry-tower-utils';

describe('industry-tower utilities', () => {
  describe('sortIndustries()', () => {
    it('returns exactly 17 entries', () => {
      const sorted = sortIndustries();
      expect(sorted).toHaveLength(17);
    });

    it('is sorted descending by IBM breach cost', () => {
      const sorted = sortIndustries();
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].cost).toBeGreaterThanOrEqual(sorted[i + 1].cost);
      }
    });

    it('healthcare is first (highest cost at $10.93M)', () => {
      const sorted = sortIndustries();
      expect(sorted[0].key).toBe('healthcare');
      expect(sorted[0].cost).toBe(10.93);
    });

    it('public_sector is last (lowest cost at $2.60M)', () => {
      const sorted = sortIndustries();
      expect(sorted[sorted.length - 1].key).toBe('public_sector');
      expect(sorted[sorted.length - 1].cost).toBe(2.6);
    });

    it('each entry has key and cost properties', () => {
      const sorted = sortIndustries();
      for (const entry of sorted) {
        expect(entry).toHaveProperty('key');
        expect(entry).toHaveProperty('cost');
        expect(typeof entry.key).toBe('string');
        expect(typeof entry.cost).toBe('number');
      }
    });
  });

  describe('scaleBar()', () => {
    it('returns 100 when cost equals maxCost', () => {
      expect(scaleBar(10.93, 10.93)).toBe(100);
    });

    it('returns 0 when cost is 0', () => {
      expect(scaleBar(0, 10.93)).toBe(0);
    });

    it('returns a value in [0, 100] for any valid input', () => {
      const result = scaleBar(6.08, 10.93);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('scales proportionally (financial ~55.6% of healthcare)', () => {
      const result = scaleBar(6.08, 10.93);
      // 6.08 / 10.93 * 100 ≈ 55.62
      expect(result).toBeCloseTo(55.62, 1);
    });
  });

  describe('isUserIndustry()', () => {
    it('returns true when industry matches exactly', () => {
      expect(isUserIndustry('healthcare', 'healthcare')).toBe(true);
    });

    it('returns false when industry does not match', () => {
      expect(isUserIndustry('financial', 'healthcare')).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(isUserIndustry('Healthcare', 'healthcare')).toBe(false);
    });
  });
});
