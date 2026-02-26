# Credibility Visuals Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three board-credibility visualisations to the results page — a Threat Origin Map (SVG arc map), an Industry Peer Tower (ranked horizontal bar chart), and a Regulatory Choropleth (world intensity map) — all grounded in DBIR 2025 / IBM 2025 / regulatory framework data.

**Architecture:** Two new hardcoded data modules feed three new presentational components that slot into the existing results page layout below Key Drivers / Recommendations. The map components use `react-simple-maps` loaded via `next/dynamic` with `ssr: false` (same pattern as `ScientistBg`). No new routes, no API calls, no new state.

**Tech Stack:** Vitest (tests), react-simple-maps + world-atlas (maps), Lucide React (icons), Tailwind CSS + inline styles (styling), Next.js dynamic imports (SSR avoidance).

---

## Pre-flight

Before starting any task, confirm the baseline is green:

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run
```

Expected: **151 passed**. If not, stop and fix before proceeding.

---

## Task 1: Install new dependencies

**Files:**
- Modify: `/Users/4n6h4x0r/src/cybrisk/package.json` (via npm, not manual edit)

**Step 1: Install runtime and dev packages**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npm install react-simple-maps world-atlas
npm install --save-dev @types/topojson-specification
```

**Step 2: Verify installation succeeded**

```bash
cd /Users/4n6h4x0r/src/cybrisk
node -e "require('react-simple-maps'); require('world-atlas'); console.log('ok')"
```

Expected output: `ok`

**Step 3: Run existing tests to confirm nothing broke**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run
```

Expected: **151 passed**

**Step 4: Commit**

```bash
cd /Users/4n6h4x0r/src/cybrisk
git add package.json package-lock.json
git commit -m "chore: add react-simple-maps, world-atlas, @types/topojson-specification"
```

---

## Task 2: Write failing tests for `threat-actors.ts` data module

**Files:**
- Create: `/Users/4n6h4x0r/src/cybrisk/src/__tests__/threat-actors.test.ts`

**Step 1: Write the failing tests**

Create `/Users/4n6h4x0r/src/cybrisk/src/__tests__/threat-actors.test.ts` with this exact content:

```typescript
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
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run src/__tests__/threat-actors.test.ts
```

Expected: FAIL — `Cannot find module '@/data/threat-actors'`

---

## Task 3: Implement `threat-actors.ts` data module

**Files:**
- Create: `/Users/4n6h4x0r/src/cybrisk/src/data/threat-actors.ts`

**Step 1: Write the implementation**

Create `/Users/4n6h4x0r/src/cybrisk/src/data/threat-actors.ts` with this exact content:

```typescript
/**
 * DBIR 2025 — nation-state and criminal threat actor attribution data.
 * Source: Verizon Data Breach Investigations Report 2025.
 *
 * Coordinates are [longitude, latitude] for react-simple-maps.
 */

export interface ThreatActor {
  nation: string;
  iso3: string;
  coordinates: [number, number]; // [lng, lat]
  attributionPct: number;        // DBIR 2025 %
  type: 'state' | 'criminal' | 'insider';
}

export const THREAT_ACTORS: ThreatActor[] = [
  { nation: 'Russia',        iso3: 'RUS', coordinates: [90,   60], attributionPct: 25, type: 'state'    },
  { nation: 'China',         iso3: 'CHN', coordinates: [105,  35], attributionPct: 18, type: 'state'    },
  { nation: 'North Korea',   iso3: 'PRK', coordinates: [127,  40], attributionPct: 10, type: 'state'    },
  { nation: 'Iran',          iso3: 'IRN', coordinates: [53,   32], attributionPct:  7, type: 'state'    },
  { nation: 'Romania',       iso3: 'ROU', coordinates: [25,   46], attributionPct:  5, type: 'criminal' },
  { nation: 'Nigeria',       iso3: 'NGA', coordinates: [8,     9], attributionPct:  4, type: 'criminal' },
  { nation: 'Brazil',        iso3: 'BRA', coordinates: [-47, -15], attributionPct:  3, type: 'criminal' },
  { nation: 'USA (insider)', iso3: 'USA', coordinates: [-98,  40], attributionPct:  3, type: 'insider'  },
];

/**
 * Target coordinates for the user's selected geography.
 * Represents a central point for arc destination rendering.
 */
export const GEO_COORDINATES: Record<string, [number, number]> = {
  us:    [-98,  40],
  uk:    [ -3,  55],
  eu:    [ 10,  51],
  hk:    [114,  22],
  sg:    [104,   1],
  other: [  0,  20],
};
```

**Step 2: Run the threat-actors tests to verify they pass**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run src/__tests__/threat-actors.test.ts
```

Expected: **9 passed**

**Step 3: Run full suite to confirm existing tests still pass**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run
```

Expected: **160 passed** (151 + 9)

**Step 4: Commit**

```bash
cd /Users/4n6h4x0r/src/cybrisk
git add src/__tests__/threat-actors.test.ts src/data/threat-actors.ts
git commit -m "feat(data): add threat-actors module with TDD (DBIR 2025)"
```

---

## Task 4: Write failing tests for `regulatory-map.ts` data module

**Files:**
- Create: `/Users/4n6h4x0r/src/cybrisk/src/__tests__/regulatory-map.test.ts`

**Step 1: Write the failing tests**

Create `/Users/4n6h4x0r/src/cybrisk/src/__tests__/regulatory-map.test.ts` with this exact content:

```typescript
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
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run src/__tests__/regulatory-map.test.ts
```

Expected: FAIL — `Cannot find module '@/data/regulatory-map'`

---

## Task 5: Implement `regulatory-map.ts` data module

**Files:**
- Create: `/Users/4n6h4x0r/src/cybrisk/src/data/regulatory-map.ts`

**Step 1: Write the implementation**

Create `/Users/4n6h4x0r/src/cybrisk/src/data/regulatory-map.ts` with this exact content:

```typescript
/**
 * Regulatory intensity scores and framework definitions by geography.
 *
 * COUNTRY_INTENSITY: ISO 3166-1 alpha-3 → regulatory intensity 0–100
 * Sources: GDPR, UK GDPR, HIPAA, CCPA, PDPA 2021, APPI 2022, LGPD, PIPA, PDPO, PIPL, DPDP Act 2023
 */

// ISO 3166-1 alpha-3 → regulatory intensity 0–100
export const COUNTRY_INTENSITY: Record<string, number> = {
  // EU member states (GDPR + NIS2) → 92
  DEU: 92, FRA: 92, NLD: 92, BEL: 92, ITA: 92, ESP: 92,
  POL: 92, ROU: 92, NOR: 92, SWE: 92, DNK: 92, FIN: 92,
  AUT: 92, CHE: 92, PRT: 92, GRC: 92, HUN: 92, CZE: 92,
  SVK: 92, BGR: 92, HRV: 92, SVN: 92, EST: 92, LVA: 92,
  LTU: 92, LUX: 92, MLT: 92, CYP: 92, IRL: 92,
  // Other major jurisdictions
  GBR: 85, // UK GDPR
  USA: 78, // HIPAA + CCPA + state patchwork
  CAN: 72, // PIPEDA + provincial
  AUS: 70, // Privacy Act + NDB scheme
  SGP: 68, // PDPA 2021 (turnover cap)
  JPN: 65, // APPI 2022 revision
  BRA: 62, // LGPD
  KOR: 60, // PIPA
  CHN: 55, // PIPL 2021 (state-controlled)
  HKG: 48, // PDPO (reform pending)
  IND: 45, // DPDP Act 2023 (partial commencement)
  ZAF: 55, // POPIA
  MEX: 50, // LFPDPPP
  ARG: 48, // PDPA
  COL: 45, // Law 1581
  // Default for uncoded countries: 20 (applied at render time)
};

export interface GeoFramework {
  code: string;
  name: string;
  maxFine: string;
  notes?: string;
}

export const GEO_FRAMEWORKS: Record<string, GeoFramework[]> = {
  eu: [
    {
      code: 'GDPR',
      name: 'General Data Protection Regulation',
      maxFine: '€20M or 4% global revenue',
    },
    {
      code: 'NIS2',
      name: 'Network & Information Security Directive 2',
      maxFine: '€10M or 2% global revenue',
    },
  ],
  uk: [
    {
      code: 'UK GDPR',
      name: 'UK General Data Protection Regulation',
      maxFine: '£17.5M or 4% global revenue',
    },
    {
      code: 'DPA 2018',
      name: 'Data Protection Act 2018',
      maxFine: 'Same as UK GDPR',
    },
  ],
  us: [
    {
      code: 'HIPAA',
      name: 'Health Insurance Portability & Accountability Act',
      maxFine: '$1.9M per violation category/year',
    },
    {
      code: 'CCPA/CPRA',
      name: 'California Consumer Privacy Act',
      maxFine: '$7,500 per intentional violation',
    },
    {
      code: 'FTC Act §5',
      name: 'Federal Trade Commission Act',
      maxFine: '$51,744 per violation per day',
    },
  ],
  sg: [
    {
      code: 'PDPA',
      name: 'Personal Data Protection Act 2021',
      maxFine: 'SGD 1M or 10% annual turnover',
    },
  ],
  hk: [
    {
      code: 'PDPO',
      name: 'Personal Data (Privacy) Ordinance',
      maxFine: 'HKD 1M + 5 years imprisonment (reform pending)',
    },
  ],
  other: [
    {
      code: 'Varies',
      name: 'Jurisdiction-specific regulations apply',
      maxFine: 'Subject to local law',
    },
  ],
};
```

**Step 2: Run the regulatory-map tests to verify they pass**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run src/__tests__/regulatory-map.test.ts
```

Expected: **8 passed**

**Step 3: Run full suite**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run
```

Expected: **168 passed** (160 + 8)

**Step 4: Commit**

```bash
cd /Users/4n6h4x0r/src/cybrisk
git add src/__tests__/regulatory-map.test.ts src/data/regulatory-map.ts
git commit -m "feat(data): add regulatory-map module with TDD (GDPR/PDPA/HIPAA/PDPO)"
```

---

## Task 6: Write failing tests for `IndustryTower` pure logic

**Files:**
- Create: `/Users/4n6h4x0r/src/cybrisk/src/__tests__/industry-tower.test.ts`

These tests cover the three pure functions that will live in `IndustryTower.tsx` (or a co-located utils module). We test them in isolation without rendering any React.

**Step 1: Write the failing tests**

Create `/Users/4n6h4x0r/src/cybrisk/src/__tests__/industry-tower.test.ts` with this exact content:

```typescript
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
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run src/__tests__/industry-tower.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/industry-tower-utils'`

---

## Task 7: Implement `industry-tower-utils.ts`

**Files:**
- Create: `/Users/4n6h4x0r/src/cybrisk/src/lib/industry-tower-utils.ts`

**Step 1: Write the implementation**

Create `/Users/4n6h4x0r/src/cybrisk/src/lib/industry-tower-utils.ts` with this exact content:

```typescript
/**
 * Pure utility functions for the IndustryTower component.
 * Kept separate so they can be unit-tested in a Node environment
 * without importing React or react-simple-maps.
 */

import { INDUSTRY_AVG_COST } from '@/lib/lookup-tables';
import type { Industry } from '@/lib/types';

export interface IndustryRow {
  key: Industry;
  cost: number; // IBM 2025 average breach cost in USD millions
}

/**
 * Returns all 17 industries sorted descending by IBM 2025 average breach cost.
 */
export function sortIndustries(): IndustryRow[] {
  return (Object.entries(INDUSTRY_AVG_COST) as [Industry, number][])
    .map(([key, cost]) => ({ key, cost }))
    .sort((a, b) => b.cost - a.cost);
}

/**
 * Scales an industry's breach cost to a bar width percentage [0, 100].
 * @param cost - The industry's average breach cost (USD millions)
 * @param maxCost - The maximum cost across all industries (used as 100% reference)
 */
export function scaleBar(cost: number, maxCost: number): number {
  if (maxCost === 0) return 0;
  return (cost / maxCost) * 100;
}

/**
 * Returns true if the given industry key matches the user's selected industry.
 */
export function isUserIndustry(industry: string, userIndustry: string): boolean {
  return industry === userIndustry;
}
```

**Step 2: Run the industry-tower tests to verify they pass**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run src/__tests__/industry-tower.test.ts
```

Expected: **13 passed**

**Step 3: Run full suite**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run
```

Expected: **181 passed** (168 + 13)

**Step 4: Commit**

```bash
cd /Users/4n6h4x0r/src/cybrisk
git add src/__tests__/industry-tower.test.ts src/lib/industry-tower-utils.ts
git commit -m "feat(utils): add industry-tower-utils with TDD (sort, scale, highlight)"
```

---

## Task 8: Build `ThreatOriginMap.tsx` component

**Files:**
- Create: `/Users/4n6h4x0r/src/cybrisk/src/components/results/ThreatOriginMap.tsx`

This is a pure presentational component. It has no unit tests (purely visual SVG rendering; tested by TypeScript type-check + build).

**Step 1: Write the component**

Create `/Users/4n6h4x0r/src/cybrisk/src/components/results/ThreatOriginMap.tsx` with this exact content:

```tsx
'use client';
import React from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
} from 'react-simple-maps';
import type { Geography as GeographyType } from '@/lib/types';
import { THREAT_ACTORS, GEO_COORDINATES } from '@/data/threat-actors';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const TYPE_COLORS: Record<string, string> = {
  state:    '#ef4444',
  criminal: '#fbbf24',
  insider:  '#06b6d4',
};

function arcStrokeWidth(pct: number): number {
  // Map attributionPct range [3,25] to stroke [0.5,3]
  return Math.min(3, Math.max(0.5, (pct / 25) * 3));
}

interface ThreatOriginMapProps {
  userGeography: GeographyType;
}

export default function ThreatOriginMap({ userGeography }: ThreatOriginMapProps) {
  const target = GEO_COORDINATES[userGeography] ?? GEO_COORDINATES['other'];

  return (
    <div className="animate-fade-up">
      <div
        className="text-[11px] tracking-[0.15em] uppercase mb-4"
        style={{ fontFamily: 'var(--font-geist-mono)', color: '#8899bb' }}
      >
        THREAT ORIGIN MAP
      </div>

      <div className="relative w-full" style={{ background: 'rgba(4,8,28,0.6)', borderRadius: 8 }}>
        <ComposableMap
          projectionConfig={{ scale: 130 }}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="rgba(4,8,28,0.8)"
                  stroke="rgba(0,80,160,0.15)"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover:   { outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Threat arcs */}
          {THREAT_ACTORS.map((actor) => (
            <Line
              key={actor.iso3}
              from={actor.coordinates}
              to={target}
              stroke={TYPE_COLORS[actor.type]}
              strokeWidth={arcStrokeWidth(actor.attributionPct)}
              strokeLinecap="round"
              strokeOpacity={0.7}
            />
          ))}

          {/* Target: pulsing cyan dot */}
          <Marker coordinates={target}>
            <circle r={5} fill="#00d4ff" opacity={0.9} />
            <circle r={10} fill="none" stroke="#00d4ff" strokeWidth={1.5} opacity={0.4}>
              <animate
                attributeName="r"
                from="8"
                to="18"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                from="0.4"
                to="0"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </Marker>
        </ComposableMap>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-col gap-1.5">
        {(['state', 'criminal', 'insider'] as const).map((type) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-3 h-0.5 rounded"
              style={{ background: TYPE_COLORS[type] }}
            />
            <span
              className="text-[11px] capitalize"
              style={{ fontFamily: 'var(--font-geist-mono)', color: '#8899bb' }}
            >
              {type === 'state' ? 'State-Sponsored' : type === 'criminal' ? 'Criminal' : 'Insider'}
            </span>
          </div>
        ))}
        <span
          className="text-[10px] mt-1"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          Source: Verizon DBIR 2025
        </span>
      </div>
    </div>
  );
}
```

**Step 2: Type-check**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to this file)

**Step 3: Run full test suite**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run
```

Expected: **181 passed** (unchanged — no new tests for this component)

**Step 4: Commit**

```bash
cd /Users/4n6h4x0r/src/cybrisk
git add src/components/results/ThreatOriginMap.tsx
git commit -m "feat(ui): add ThreatOriginMap component (DBIR 2025 arc arcs)"
```

---

## Task 9: Build `IndustryTower.tsx` component

**Files:**
- Create: `/Users/4n6h4x0r/src/cybrisk/src/components/results/IndustryTower.tsx`

This component uses only `div` elements (no Recharts, no react-simple-maps) and the pure utils from Task 7.

**Step 1: Write the component**

Create `/Users/4n6h4x0r/src/cybrisk/src/components/results/IndustryTower.tsx` with this exact content:

```tsx
'use client';
import React from 'react';
import {
  Heart, TrendingUp, Pill, Cpu, Zap, Factory,
  Briefcase, ShoppingCart, GraduationCap, Music,
  Radio, Package, Monitor, FlaskConical, Truck,
  UtensilsCrossed, Landmark,
} from 'lucide-react';
import type { Industry } from '@/lib/types';
import { sortIndustries, scaleBar, isUserIndustry } from '@/lib/industry-tower-utils';

const ICONS: Record<Industry, React.ElementType> = {
  healthcare:     Heart,
  financial:      TrendingUp,
  pharmaceuticals: Pill,
  technology:     Cpu,
  energy:         Zap,
  industrial:     Factory,
  services:       Briefcase,
  retail:         ShoppingCart,
  education:      GraduationCap,
  entertainment:  Music,
  communications: Radio,
  consumer:       Package,
  media:          Monitor,
  research:       FlaskConical,
  transportation: Truck,
  hospitality:    UtensilsCrossed,
  public_sector:  Landmark,
};

function fmtM(cost: number): string {
  return `$${cost.toFixed(2)}M`;
}

interface IndustryTowerProps {
  userIndustry: Industry;
  userAle: number; // in USD (raw, not millions)
}

export default function IndustryTower({ userIndustry, userAle }: IndustryTowerProps) {
  const rows = sortIndustries();
  const maxCost = rows[0].cost; // healthcare = 10.93
  const userAleMillion = userAle / 1_000_000;

  return (
    <div className="animate-fade-up">
      <div
        className="text-[11px] tracking-[0.15em] uppercase mb-4"
        style={{ fontFamily: 'var(--font-geist-mono)', color: '#8899bb' }}
      >
        INDUSTRY PEER TOWER
      </div>

      <div className="flex flex-col gap-2">
        {rows.map(({ key, cost }) => {
          const barPct = scaleBar(cost, maxCost);
          const isUser = isUserIndustry(key, userIndustry);
          const Icon = ICONS[key];

          return (
            <div
              key={key}
              className="relative flex items-center gap-2 px-2 py-1 rounded"
              style={{
                background: isUser ? 'rgba(0,180,255,0.06)' : 'transparent',
                borderLeft: isUser ? '2px solid #00d4ff' : '2px solid transparent',
              }}
            >
              {/* Icon */}
              <Icon
                size={12}
                style={{ color: isUser ? '#00d4ff' : '#4a6080', flexShrink: 0 }}
              />

              {/* Label */}
              <span
                className="text-[11px] w-28 shrink-0 truncate"
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  color: isUser ? '#00d4ff' : '#4a6080',
                }}
              >
                {key.replace(/_/g, ' ')}
              </span>

              {/* Bar track */}
              <div
                className="relative flex-1 h-3 rounded overflow-hidden"
                style={{ background: 'rgba(0,20,50,0.6)' }}
              >
                {/* Industry bar */}
                <div
                  className="absolute top-0 left-0 h-full rounded"
                  style={{
                    width: `${barPct}%`,
                    background: isUser
                      ? 'rgba(0,180,255,0.25)'
                      : 'rgba(74,96,128,0.3)',
                  }}
                />

                {/* User ALE overlay line */}
                {(() => {
                  const alePct = scaleBar(userAleMillion, maxCost);
                  if (alePct <= 0 || alePct > 100) return null;
                  return (
                    <div
                      className="absolute top-0 h-full w-px"
                      style={{
                        left: `${alePct}%`,
                        background: '#00d4ff',
                        opacity: 0.6,
                      }}
                    />
                  );
                })()}
              </div>

              {/* Value */}
              <span
                className="text-[11px] w-16 text-right shrink-0"
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  color: isUser ? '#00d4ff' : '#4a6080',
                }}
              >
                {fmtM(cost)}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="mt-3 text-[10px]"
        style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
      >
        Source: IBM Cost of a Data Breach 2025. Cyan line = your estimated ALE.
      </div>
    </div>
  );
}
```

**Step 2: Type-check**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx tsc --noEmit
```

Expected: no new errors

**Step 3: Run full test suite**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run
```

Expected: **181 passed** (unchanged)

**Step 4: Commit**

```bash
cd /Users/4n6h4x0r/src/cybrisk
git add src/components/results/IndustryTower.tsx
git commit -m "feat(ui): add IndustryTower component — ranked peer comparison (IBM 2025)"
```

---

## Task 10: Build `RegulatoryMap.tsx` component

**Files:**
- Create: `/Users/4n6h4x0r/src/cybrisk/src/components/results/RegulatoryMap.tsx`

**Step 1: Write the component**

Create `/Users/4n6h4x0r/src/cybrisk/src/components/results/RegulatoryMap.tsx` with this exact content:

```tsx
'use client';
import React from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import type { Geography as GeographyType } from '@/lib/types';
import { COUNTRY_INTENSITY, GEO_FRAMEWORKS } from '@/data/regulatory-map';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ISO 3166-1 alpha-3 codes that belong to each user geography
const GEO_ISO3: Record<GeographyType, string[]> = {
  eu:    ['DEU', 'FRA', 'NLD', 'BEL', 'ITA', 'ESP', 'POL', 'ROU', 'SWE', 'DNK',
          'FIN', 'AUT', 'PRT', 'GRC', 'HUN', 'CZE', 'SVK', 'BGR', 'HRV', 'SVN',
          'EST', 'LVA', 'LTU', 'LUX', 'MLT', 'CYP', 'IRL'],
  uk:    ['GBR'],
  us:    ['USA'],
  hk:    ['HKG'],
  sg:    ['SGP'],
  other: [],
};

/**
 * Interpolate intensity score (0–100) to a dark-red heat colour.
 * 0   → rgba(4,8,28)       (almost black)
 * 50  → rgba(120,40,10)    (dark red)
 * 92+ → rgba(239,68,68)    (bright red)
 */
function intensityToColor(score: number): string {
  if (score <= 0) return 'rgba(4,8,28,1)';
  if (score >= 92) return 'rgba(239,68,68,0.9)';
  if (score <= 50) {
    const t = score / 50;
    const r = Math.round(4 + t * (120 - 4));
    const g = Math.round(8 + t * (40 - 8));
    const b = Math.round(28 + t * (10 - 28));
    return `rgba(${r},${g},${b},0.85)`;
  }
  const t = (score - 50) / 42;
  const r = Math.round(120 + t * (239 - 120));
  const g = Math.round(40 + t * (68 - 40));
  const b = Math.round(10 + t * (68 - 10));
  return `rgba(${r},${g},${b},0.9)`;
}

interface RegulatoryMapProps {
  userGeography: GeographyType;
}

export default function RegulatoryMap({ userGeography }: RegulatoryMapProps) {
  const userIso3Set = new Set(GEO_ISO3[userGeography] ?? []);
  const frameworks = GEO_FRAMEWORKS[userGeography] ?? GEO_FRAMEWORKS['other'];

  return (
    <div className="animate-fade-up">
      <div
        className="text-[11px] tracking-[0.15em] uppercase mb-4"
        style={{ fontFamily: 'var(--font-geist-mono)', color: '#8899bb' }}
      >
        REGULATORY EXPOSURE MAP
      </div>

      <div
        className="relative w-full"
        style={{ background: 'rgba(4,8,28,0.6)', borderRadius: 8 }}
      >
        <ComposableMap
          projectionConfig={{ scale: 130 }}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const iso3: string = geo.properties?.['ISO_A3'] ?? geo.properties?.['iso_a3'] ?? '';
                const score = COUNTRY_INTENSITY[iso3] ?? 20;
                const isUserGeo = userIso3Set.has(iso3);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={intensityToColor(score)}
                    stroke={isUserGeo ? '#00d4ff' : 'rgba(0,80,160,0.1)'}
                    strokeWidth={isUserGeo ? 2 : 0.5}
                    style={{
                      default: { outline: 'none' },
                      hover:   { outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {/* Callout panel — bottom-right overlay */}
        <div
          className="absolute bottom-3 right-3 p-3 rounded-lg text-[11px] max-w-xs"
          style={{
            background: 'rgba(4,8,28,0.92)',
            border: '1px solid rgba(0,180,255,0.2)',
            fontFamily: 'var(--font-geist-mono)',
          }}
        >
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: '#8899bb' }}>
            Your jurisdiction: {userGeography.toUpperCase()}
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[10px] pb-1" style={{ color: '#4a6080' }}>Framework</th>
                <th className="text-left text-[10px] pb-1" style={{ color: '#4a6080' }}>Max Fine</th>
              </tr>
            </thead>
            <tbody>
              {frameworks.map((fw) => (
                <tr key={fw.code}>
                  <td className="pr-3 py-0.5" style={{ color: '#00d4ff' }}>{fw.code}</td>
                  <td className="py-0.5" style={{ color: '#8899bb' }}>{fw.maxFine}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend: colour scale bar */}
      <div className="mt-3 flex items-center gap-3">
        <span
          className="text-[10px] shrink-0"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          Lower regulatory risk
        </span>
        <div
          className="flex-1 h-2 rounded"
          style={{
            background: 'linear-gradient(to right, rgba(4,8,28,1), rgba(120,40,10,0.85), rgba(239,68,68,0.9))',
          }}
        />
        <span
          className="text-[10px] shrink-0"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          Higher regulatory risk
        </span>
      </div>

      <div
        className="mt-2 text-[10px]"
        style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
      >
        Sources: GDPR, UK GDPR, HIPAA, CCPA, PDPA 2021, PDPO, APPI 2022, LGPD, PIPA, PIPL, DPDP Act 2023
      </div>
    </div>
  );
}
```

**Step 2: Type-check**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx tsc --noEmit
```

Expected: no new errors

**Step 3: Run full test suite**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run
```

Expected: **181 passed** (unchanged)

**Step 4: Commit**

```bash
cd /Users/4n6h4x0r/src/cybrisk
git add src/components/results/RegulatoryMap.tsx
git commit -m "feat(ui): add RegulatoryMap choropleth component (GDPR/PDPA/PDPO intensity)"
```

---

## Task 11: Wire all three components into the results page

**Files:**
- Modify: `/Users/4n6h4x0r/src/cybrisk/src/app/results/page.tsx`

The map components must be loaded with `next/dynamic` + `ssr: false` because `react-simple-maps` uses browser-only SVG APIs. `IndustryTower` uses only divs but also gets dynamic-loaded for consistency (avoids hydration mismatch from Lucide).

**Step 1: Add dynamic imports and update the layout**

Open `/Users/4n6h4x0r/src/cybrisk/src/app/results/page.tsx`.

After the existing import block (after line 14, `import { encodeInputs, deriveShareSeed } from '@/lib/share-url';`), add:

```typescript
import dynamic from 'next/dynamic';

const ThreatOriginMap = dynamic(
  () => import('@/components/results/ThreatOriginMap'),
  { ssr: false },
);
const IndustryTower = dynamic(
  () => import('@/components/results/IndustryTower'),
  { ssr: false },
);
const RegulatoryMap = dynamic(
  () => import('@/components/results/RegulatoryMap'),
  { ssr: false },
);
```

**Step 2: Replace the "Benchmark - full width" section**

Find and replace this block in the JSX (currently lines 173–180):

```tsx
        {/* Benchmark - full width */}
        <div style={glassmorphism} className="mt-6">
          <IndustryBenchmark
            yourAle={results.industryBenchmark.yourAle}
            industryMedian={results.industryBenchmark.industryMedian}
            percentileRank={results.industryBenchmark.percentileRank}
          />
        </div>
```

Replace with:

```tsx
        {/* NEW: Threat Origin Map + Industry Tower — 2 columns */}
        {inputs && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div style={glassmorphism}>
              <ThreatOriginMap userGeography={inputs.company.geography} />
            </div>
            <div style={glassmorphism}>
              <IndustryTower
                userIndustry={inputs.company.industry}
                userAle={results.industryBenchmark.yourAle}
              />
            </div>
          </div>
        )}

        {/* NEW: Regulatory Choropleth — full width */}
        {inputs && (
          <div style={glassmorphism} className="mt-6">
            <RegulatoryMap userGeography={inputs.company.geography} />
          </div>
        )}
```

**Step 3: Remove the now-unused `IndustryBenchmark` import**

Remove line:
```typescript
import IndustryBenchmark from '@/components/results/IndustryBenchmark';
```

**Step 4: Type-check**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx tsc --noEmit
```

Expected: no new errors

**Step 5: Run full test suite**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run
```

Expected: **181 passed**

**Step 6: Verify production build compiles**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npm run build 2>&1 | tail -30
```

Expected: no errors; warnings about image optimization are acceptable

**Step 7: Commit**

```bash
cd /Users/4n6h4x0r/src/cybrisk
git add src/app/results/page.tsx
git commit -m "feat(results): wire ThreatOriginMap, IndustryTower, RegulatoryMap into results page"
```

---

## Task 12: Deprecate `IndustryBenchmark.tsx`

The old single-bar component is no longer imported by any page. We keep the file but add a deprecation comment so it's clear it was intentionally replaced.

**Files:**
- Modify: `/Users/4n6h4x0r/src/cybrisk/src/components/results/IndustryBenchmark.tsx`

**Step 1: Add deprecation comment**

Add to the top of the file (before `'use client'`):

```typescript
/**
 * @deprecated Replaced by IndustryTower in the results page layout.
 * Kept for reference. Do not import from new code.
 */
```

**Step 2: Run full test suite (final green-wall check)**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run
```

Expected: **181 passed**

**Step 3: Commit**

```bash
cd /Users/4n6h4x0r/src/cybrisk
git add src/components/results/IndustryBenchmark.tsx
git commit -m "chore: deprecate IndustryBenchmark (superseded by IndustryTower)"
```

---

## Final verification checklist

Run these in order after all tasks are complete:

```bash
cd /Users/4n6h4x0r/src/cybrisk

# 1. All tests green
npx vitest run
# Expected: 181 passed (0 failed)

# 2. TypeScript clean
npx tsc --noEmit
# Expected: no errors

# 3. Production build succeeds
npm run build
# Expected: Build succeeded. No error output.

# 4. Lint clean
npm run lint
# Expected: No ESLint errors
```

If all four pass, the feature is complete. Push to the preview branch and verify the Vercel deployment per the global CLAUDE.md instructions.

---

## Test count summary

| Task | New tests | Running total |
|------|-----------|---------------|
| Baseline | 151 | 151 |
| Task 3 (threat-actors data) | +9 | 160 |
| Task 5 (regulatory-map data) | +8 | 168 |
| Task 7 (industry-tower utils) | +13 | 181 |
| Tasks 8–12 (components + wiring) | +0 | 181 |

All 181 tests must be green at every commit. The 151 pre-existing tests must never be broken.
