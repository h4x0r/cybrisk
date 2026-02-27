import { describe, it, expect } from 'vitest';
import { THREAT_ACTORS, GEO_COORDINATES } from '@/data/threat-actors';

describe('threat-actors data module', () => {
  it('exports exactly 8 threat actors', () => {
    expect(THREAT_ACTORS).toHaveLength(8);
  });

  it('every actor has all required fields', () => {
    for (const actor of THREAT_ACTORS) {
      expect(actor).toHaveProperty('nation');
      expect(actor).toHaveProperty('iso3');
      expect(actor).toHaveProperty('coordinates');
      expect(actor).toHaveProperty('attributionPct');
      expect(actor).toHaveProperty('type');
    }
  });

  it('all coordinates are within valid geographic bounds', () => {
    for (const actor of THREAT_ACTORS) {
      const [lng, lat] = actor.coordinates;
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
    }
  });

  it('attribution percentages sum to <= 100', () => {
    const total = THREAT_ACTORS.reduce((sum, a) => sum + a.attributionPct, 0);
    expect(total).toBeLessThanOrEqual(100);
  });

  it('all actor types are valid enum values', () => {
    const validTypes = new Set(['state', 'criminal', 'insider']);
    for (const actor of THREAT_ACTORS) {
      expect(validTypes.has(actor.type)).toBe(true);
    }
  });

  it('GEO_COORDINATES has entries for all 6 geography keys', () => {
    const requiredKeys = ['us', 'uk', 'eu', 'hk', 'sg', 'other'];
    for (const key of requiredKeys) {
      expect(GEO_COORDINATES).toHaveProperty(key);
    }
  });

  it('all GEO_COORDINATES are valid [lng, lat] tuples within bounds', () => {
    for (const [key, coords] of Object.entries(GEO_COORDINATES)) {
      const [lng, lat] = coords;
      expect(lng, `${key} lng out of range`).toBeGreaterThanOrEqual(-180);
      expect(lng, `${key} lng out of range`).toBeLessThanOrEqual(180);
      expect(lat, `${key} lat out of range`).toBeGreaterThanOrEqual(-90);
      expect(lat, `${key} lat out of range`).toBeLessThanOrEqual(90);
    }
  });

  it('iso3 codes are exactly 3 uppercase characters', () => {
    for (const actor of THREAT_ACTORS) {
      expect(actor.iso3).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('all attributionPct values are positive numbers', () => {
    for (const actor of THREAT_ACTORS) {
      expect(actor.attributionPct).toBeGreaterThan(0);
    }
  });
});
