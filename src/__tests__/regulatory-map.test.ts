import { describe, it, expect } from 'vitest';
import { COUNTRY_INTENSITY, GEO_FRAMEWORKS } from '@/data/regulatory-map';

describe('regulatory-map data module', () => {
  it('all intensity scores are in the range [0, 100]', () => {
    for (const [country, score] of Object.entries(COUNTRY_INTENSITY)) {
      expect(score, `${country} score out of range`).toBeGreaterThanOrEqual(0);
      expect(score, `${country} score out of range`).toBeLessThanOrEqual(100);
    }
  });

  it('GEO_FRAMEWORKS has entries for all 6 geography keys', () => {
    const requiredKeys = ['eu', 'uk', 'us', 'sg', 'hk', 'other'];
    for (const key of requiredKeys) {
      expect(GEO_FRAMEWORKS, `missing key: ${key}`).toHaveProperty(key);
    }
  });

  it('every framework entry has code, name, and maxFine fields', () => {
    for (const [geo, frameworks] of Object.entries(GEO_FRAMEWORKS)) {
      expect(Array.isArray(frameworks), `${geo} is not an array`).toBe(true);
      for (const framework of frameworks) {
        expect(framework, `${geo} framework missing 'code'`).toHaveProperty('code');
        expect(framework, `${geo} framework missing 'name'`).toHaveProperty('name');
        expect(framework, `${geo} framework missing 'maxFine'`).toHaveProperty('maxFine');
      }
    }
  });

  it('every geography key has at least one framework', () => {
    for (const [geo, frameworks] of Object.entries(GEO_FRAMEWORKS)) {
      expect(frameworks.length, `${geo} has no frameworks`).toBeGreaterThan(0);
    }
  });

  it('COUNTRY_INTENSITY has entries for major economies', () => {
    const expectedCountries = ['DEU', 'GBR', 'USA', 'CHN', 'SGP', 'HKG'];
    for (const code of expectedCountries) {
      expect(COUNTRY_INTENSITY, `missing ${code}`).toHaveProperty(code);
    }
  });

  it('EU members have intensity score of 92', () => {
    const euMembers = ['DEU', 'FRA', 'NLD', 'BEL', 'ITA', 'ESP'];
    for (const code of euMembers) {
      expect(COUNTRY_INTENSITY[code], `${code} should be 92`).toBe(92);
    }
  });

  it('GBR has intensity score of 85', () => {
    expect(COUNTRY_INTENSITY['GBR']).toBe(85);
  });

  it('all code fields are non-empty strings', () => {
    for (const frameworks of Object.values(GEO_FRAMEWORKS)) {
      for (const fw of frameworks) {
        expect(typeof fw.code).toBe('string');
        expect(fw.code.length).toBeGreaterThan(0);
      }
    }
  });
});
