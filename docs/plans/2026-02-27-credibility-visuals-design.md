# CybRisk — Credibility Visuals Design

**Date:** 2026-02-27
**Status:** Approved
**Goal:** Three new visualisations that increase board-level credibility by grounding results in sourced geopolitical, industry, and regulatory context.

---

## 1. Architecture

All three features are **read-only presentational components** on the results page. They consume:
- Assessment inputs already in `sessionStorage` (geography, industry)
- New hardcoded data files sourced from DBIR 2025, IBM 2025, and published regulatory frameworks

No new routes, no API calls, no additional state.

**New dependency:** `react-simple-maps` + `world-atlas` — SVG world map renderer (~30KB gzipped). Used by Features A and C.

### New files

```
src/data/
  threat-actors.ts          DBIR 2025 attacker nations, coordinates, attribution %
  regulatory-map.ts         Country-level regulatory intensity + geography framework callouts

src/components/results/
  ThreatOriginMap.tsx        Feature A
  IndustryTower.tsx          Feature B (replaces IndustryBenchmark)
  RegulatoryMap.tsx          Feature C

src/__tests__/
  threat-actors.test.ts      Structural validation of data module
  regulatory-map.test.ts     Structural validation of data module
  industry-tower.test.ts     Data transformation (sort, scale, highlight logic)
```

### Modified files

```
src/app/results/page.tsx     Add three new components; reposition Assumptions section below them
src/components/results/IndustryBenchmark.tsx   Deprecated in favour of IndustryTower
```

### Results page layout (after)

```
[Ticker bar]
[Loss Distribution]  [Exceedance Curve]     ← existing 2-col
[3D Surface]                                 ← existing full-width
[Key Drivers]  [Recommendations]             ← existing 2-col
[Threat Origin Map]  [Industry Tower]        ← NEW 2-col
[Regulatory Choropleth]                      ← NEW full-width
[Assumptions & Limitations]                  ← existing (moved down)
[Actions]                                    ← existing
```

---

## 2. Feature A — Threat Origin Map

### Purpose
Show *where* threats originate, grounding the ALE figure in real-world attacker geography. Static arcs from DBIR-attributed nations to the user's location read as a threat intelligence briefing, not a screensaver.

### Data (`src/data/threat-actors.ts`)

Source: Verizon DBIR 2025, nation-state and criminal attribution by incident count.

```typescript
export interface ThreatActor {
  nation: string;
  iso3: string;
  coordinates: [number, number]; // [lng, lat] for react-simple-maps
  attributionPct: number;        // DBIR 2025 %
  type: 'state' | 'criminal' | 'insider';
}

export const THREAT_ACTORS: ThreatActor[] = [
  { nation: 'Russia',       iso3: 'RUS', coordinates: [90,  60], attributionPct: 25, type: 'state'    },
  { nation: 'China',        iso3: 'CHN', coordinates: [105, 35], attributionPct: 18, type: 'state'    },
  { nation: 'North Korea',  iso3: 'PRK', coordinates: [127, 40], attributionPct: 10, type: 'state'    },
  { nation: 'Iran',         iso3: 'IRN', coordinates: [53,  32], attributionPct:  7, type: 'state'    },
  { nation: 'Romania',      iso3: 'ROU', coordinates: [25,  46], attributionPct:  5, type: 'criminal' },
  { nation: 'Nigeria',      iso3: 'NGA', coordinates: [8,    9], attributionPct:  4, type: 'criminal' },
  { nation: 'Brazil',       iso3: 'BRA', coordinates: [-47,-15], attributionPct:  3, type: 'criminal' },
  { nation: 'USA (insider)',iso3: 'USA', coordinates: [-98, 40], attributionPct:  3, type: 'insider'  },
];

export const GEO_COORDINATES: Record<string, [number, number]> = {
  us: [-98,  40],
  uk: [ -3,  55],
  eu: [ 10,  51],
  hk: [114,  22],
  sg: [104,   1],
  other: [0,  20],
};
```

### Rendering

- `react-simple-maps` `ComposableMap` + `Geographies` for the world base
- `Line` component for each arc (attacker → target)
- Arc stroke-width proportional to `attributionPct` (min 0.5px, max 3px)
- Colors: state `#ef4444`, criminal `#fbbf24`, insider `#06b6d4`
- Target location: pulsing cyan dot using CSS `animate-ping`
- Background countries: `rgba(4,8,28,0.8)` fill, `rgba(0,80,160,0.15)` stroke
- No animation on arcs — static

### Legend
Three rows below the map: State-Sponsored / Criminal / Insider, color-coded, with DBIR source citation.

---

## 3. Feature B — Industry Peer Tower

### Purpose
Replace the single-bar `IndustryBenchmark` with a ranked view of all 17 industries. Answers "where do we sit vs. our peers?" — the first question every board asks.

### Data
Sourced directly from `INDUSTRY_AVG_COST` in `src/lib/lookup-tables.ts` (IBM 2025). No new data file needed.

### Rendering

- Horizontal bar chart built from `div` elements (not Recharts — simpler, more style control)
- Sorted descending by IBM breach cost
- Bar width = `(industryAvgCost / maxCost) * 100%`
- User's industry row: cyan left border glow + `#00d4ff` text + background `rgba(0,180,255,0.06)`
- All other rows: muted `#4a6080` text
- Each row: Lucide icon + industry label + bar + `$X.XXM` value
- User's ALE rendered as a vertical line overlay across all bars (if it differs from industry avg)
- Max width reference: Healthcare `$10.93M`

### Lucide icon mapping

```
healthcare → Heart          financial → TrendingUp     pharmaceuticals → Pill
technology → Cpu            energy → Zap               industrial → Factory
services → Briefcase        retail → ShoppingCart       education → GraduationCap
entertainment → Music       communications → Radio       consumer → Package
media → Monitor             research → FlaskConical     transportation → Truck
hospitality → UtensilsCrossed  public_sector → Landmark
```

### Testable logic
- `sortIndustries()`: returns 17 items descending by cost
- `scaleBar(cost, maxCost)`: returns 0–100 percentage
- `isUserIndustry(industry, userIndustry)`: boolean

---

## 4. Feature C — Regulatory Choropleth

### Purpose
Show *why* secondary losses are what they are — by visualising which regulatory frameworks apply globally and highlighting the user's jurisdiction. Boards in HK/SG/EU respond strongly to seeing their regulatory exposure in geopolitical context.

### Data (`src/data/regulatory-map.ts`)

```typescript
// ISO 3166-1 alpha-3 → regulatory intensity 0–100
export const COUNTRY_INTENSITY: Record<string, number> = {
  // EU member states → 92
  DEU: 92, FRA: 92, NLD: 92, BEL: 92, ITA: 92, ESP: 92, /* all 27 EU members */
  GBR: 85, // UK GDPR
  USA: 78, // HIPAA + CCPA + state patchwork
  CAN: 72, // PIPEDA + provincial
  AUS: 70, // Privacy Act + NDB scheme
  SGP: 68, // PDPA 2021 (turnover cap)
  JPN: 65, // APPI 2022 revision
  BRA: 62, // LGPD
  KOR: 60, // PIPA
  HKG: 48, // PDPO (reform pending)
  CHN: 55, // PIPL 2021 (state-controlled)
  IND: 45, // DPDP Act 2023 (partial commencement)
  // Default for uncoded countries: 20
};

export interface GeoFramework {
  code: string;
  name: string;
  maxFine: string;
  notes?: string;
}

export const GEO_FRAMEWORKS: Record<string, GeoFramework[]> = {
  eu: [
    { code: 'GDPR', name: 'General Data Protection Regulation', maxFine: '€20M or 4% global revenue' },
    { code: 'NIS2', name: 'Network & Information Security Directive 2', maxFine: '€10M or 2% global revenue' },
  ],
  uk: [
    { code: 'UK GDPR', name: 'UK General Data Protection Regulation', maxFine: '£17.5M or 4% global revenue' },
    { code: 'DPA 2018', name: 'Data Protection Act 2018', maxFine: 'Same as UK GDPR' },
  ],
  us: [
    { code: 'HIPAA', name: 'Health Insurance Portability & Accountability Act', maxFine: '$1.9M per violation category/year' },
    { code: 'CCPA/CPRA', name: 'California Consumer Privacy Act', maxFine: '$7,500 per intentional violation' },
    { code: 'FTC Act §5', name: 'Federal Trade Commission Act', maxFine: '$51,744 per violation per day' },
  ],
  sg: [
    { code: 'PDPA', name: 'Personal Data Protection Act 2021', maxFine: 'SGD 1M or 10% annual turnover' },
  ],
  hk: [
    { code: 'PDPO', name: 'Personal Data (Privacy) Ordinance', maxFine: 'HKD 1M + 5 years imprisonment (reform pending)' },
  ],
  other: [
    { code: 'Varies', name: 'Jurisdiction-specific regulations apply', maxFine: 'Subject to local law' },
  ],
};
```

### Rendering

- `react-simple-maps` `ComposableMap` + `Geographies` — same world atlas as Feature A
- Country fill: intensity interpolated from `rgba(4,8,28)` (score 0) → `rgba(120,40,10)` (score 50) → `rgba(239,68,68)` (score 92)
- User's geography countries outlined with `#00d4ff` stroke, 2px
- Callout panel (bottom-right overlay): "Your jurisdiction: [GEO]" + framework table
- Legend: colour scale bar with "Lower regulatory risk → Higher regulatory risk"

---

## 5. Testing Strategy

### Data modules (TDD — tests written first)

**`threat-actors.test.ts`**
- All 8 actors have required fields (`nation`, `iso3`, `coordinates`, `attributionPct`, `type`)
- Coordinates: lng ∈ [-180, 180], lat ∈ [-90, 90]
- Attribution percentages sum ≤ 100
- All types are valid enum values
- `GEO_COORDINATES` has entries for all 6 geography keys

**`regulatory-map.test.ts`**
- All intensity scores ∈ [0, 100]
- `GEO_FRAMEWORKS` has entries for all 6 geography keys
- Each framework entry has `code`, `name`, `maxFine`

**`industry-tower.test.ts`**
- `sortIndustries()` returns 17 items in descending cost order
- `scaleBar()` returns values in [0, 100]
- `scaleBar(maxCost, maxCost)` returns 100
- `scaleBar(0, maxCost)` returns 0
- `isUserIndustry()` matches correctly

### Components
Build-time TypeScript checks. No jsdom tests — purely presentational.

---

## 6. Dependencies

```bash
npm install react-simple-maps world-atlas
npm install --save-dev @types/topojson-specification
```

`react-simple-maps` v3 is ESM-compatible with Next.js 14. Load via `dynamic()` with `ssr: false` (same pattern as `ScientistBg` and `FluidCanvas`).

---

## 7. Success Criteria

- All three components render without errors in production build
- Threat arcs visually connect attacker nations to user's geography
- User's industry row is visually distinct in the tower
- User's geography is highlighted on the choropleth
- All existing tests continue to pass (151+)
- New data module tests pass (TDD)
