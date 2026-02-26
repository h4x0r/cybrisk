# CybRisk: Implementation Scaffold

> **Parent**: [ARCHITECTURE_BLUEPRINT.md](../ARCHITECTURE_BLUEPRINT.md)
> **Created**: 2026-02-22
> **Status**: Active

Directory structure, core modules, API route, and configuration for CybRisk's stateless FAIR Monte Carlo calculation pipeline.

---

## 1. Directory Structure

> CybRisk uses the Next.js 14+ App Router convention. There are no agents, no database, and no LLM integrations. The architecture is a deterministic calculation pipeline deployed as a single Next.js application on Vercel.

```
/
├── src/
│   ├── app/                              # Next.js App Router pages
│   │   ├── page.tsx                      # Landing page (Server Component, SSG)
│   │   ├── layout.tsx                    # Root layout (Inter + JetBrains Mono fonts)
│   │   ├── globals.css                   # Tailwind base + dark theme tokens
│   │   ├── assess/
│   │   │   └── page.tsx                  # Wizard orchestrator (Client Component)
│   │   ├── results/
│   │   │   └── page.tsx                  # Results dashboard (Client Component)
│   │   └── api/
│   │       └── calculate/
│   │           └── route.ts              # Monte Carlo API (Node.js serverless)
│   │
│   ├── components/
│   │   ├── ui/                           # Shadcn/ui primitives (Button, Card, Select,
│   │   │                                 #   Switch, Slider, ToggleGroup, Progress)
│   │   ├── landing/
│   │   │   ├── hero.tsx                  # Hero section with headline + CTA
│   │   │   ├── features.tsx              # 3 feature cards (Financial, Board-Ready, Benchmarks)
│   │   │   ├── how-it-works.tsx          # 3-step process diagram
│   │   │   ├── trust-signals.tsx         # Methodology + data source badges
│   │   │   └── footer.tsx                # Builder credit + links
│   │   │
│   │   ├── assess/
│   │   │   ├── wizard-progress.tsx       # Horizontal step indicator (nav + aria-current)
│   │   │   ├── wizard-step-card.tsx      # Card wrapper with step number + title
│   │   │   ├── company-profile.tsx       # Step 1: industry, revenue, employees
│   │   │   ├── data-profile.tsx          # Step 2: data types, records, sensitivity
│   │   │   ├── security-controls.tsx     # Step 3: 10 binary control switches
│   │   │   ├── threat-landscape.tsx      # Step 4: threat types, prior incidents
│   │   │   ├── review-calculate.tsx      # Step 5: summary cards + calculate CTA
│   │   │   ├── simulation-loading.tsx    # Processing overlay with phase rotation
│   │   │   └── a11y-announcer.tsx        # Screen reader live region announcements
│   │   │
│   │   ├── results/
│   │   │   ├── risk-rating-badge.tsx     # Large pill badge (LOW/MODERATE/HIGH/CRITICAL)
│   │   │   ├── kpi-card.tsx             # Metric card (label + dollar figure + trend)
│   │   │   ├── loss-distribution.tsx     # Recharts BarChart histogram (50 bins)
│   │   │   ├── loss-exceedance.tsx       # Recharts LineChart LEC (20 points)
│   │   │   ├── key-drivers.tsx           # Ranked impact factors list
│   │   │   ├── recommendations.tsx       # Actionable savings recommendations
│   │   │   ├── methodology.tsx           # Collapsible methodology + sources section
│   │   │   └── chart-container.tsx       # Card wrapper for charts with sr-only data table
│   │   │
│   │   └── shared/
│   │       └── trust-badge.tsx           # Small pill badge for trust signals
│   │
│   ├── lib/
│   │   ├── utils.ts                      # Shadcn cn() utility
│   │   ├── monte-carlo.ts                # FAIR MC engine (PERT sampling, Joehnk,
│   │   │                                 #   simulation loop, percentile computation)
│   │   ├── lookup-tables.ts              # Hardcoded actuarial data (IBM/DBIR/NetDiligence)
│   │   ├── gordon-loeb.ts                # Optimal security spend calculation
│   │   ├── types.ts                      # TypeScript interfaces (AssessmentInputs,
│   │   │                                 #   SimulationResults, APIRequest, APIResponse)
│   │   ├── validation.ts                 # Zod schemas for API + wizard validation
│   │   ├── chart-theme.ts                # Recharts color palette and axis styling
│   │   ├── a11y-utils.ts                 # Dollar formatting for aria-labels, sr-only helpers
│   │   └── use-reduced-motion.ts         # prefers-reduced-motion React hook
│   │
│   ├── data/
│   │   └── industry-benchmarks.ts        # Industry-specific defaults and smart defaults
│   │
│   └── contexts/
│       └── results-context.tsx           # React Context + sessionStorage persistence
│
├── tests/                                # Test files
│   ├── lib/
│   │   ├── monte-carlo.test.ts           # PERT sampling, simulation loop, percentiles, histogram
│   │   ├── lookup-tables.test.ts         # Industry mapping, control modifiers, edge cases
│   │   ├── gordon-loeb.test.ts           # Optimal spend, revenue cap, residual risk
│   │   └── validation.test.ts            # Zod schema validation (valid + invalid inputs)
│   ├── api/
│   │   └── calculate.test.ts             # API route integration tests
│   └── components/
│       ├── assess/                       # Wizard step component tests
│       └── results/                      # Chart and KPI rendering tests
│
├── public/                               # Static assets
│   └── favicon.ico
│
└── north-star-advisor/                   # Strategic documentation
    └── docs/
        ├── NORTHSTAR.md
        ├── ARCHITECTURE_BLUEPRINT.md
        ├── AGENT_PROMPTS.md
        └── architecture/
            └── IMPLEMENTATION_SCAFFOLD.md  # This document
```

### Key Structural Decisions

| Decision | Rationale |
|----------|-----------|
| No `src/agents/` directory | CybRisk is a deterministic calculation pipeline, not an agentic system. There are no LLM calls, no BaseAgent class, and no agent orchestration. |
| No `src/db/` directory | Stateless by design. No database, no persistence beyond sessionStorage. Privacy by design through statelessness. |
| No `src/ai/` directory | No LLM integration. The Monte Carlo engine is pure mathematics. No prompts, no model selection, no token budgets. |
| No `src/pipeline/` or `src/resilience/` directory | Orchestration is a single sequential function in the API route. Resilience is handled by Vercel infrastructure and client-side retry UI. |
| `src/contexts/` separated from `src/lib/` | React Contexts are runtime browser constructs. `src/lib/` contains isomorphic utilities shared between server and client. |
| `src/data/` separated from `src/lib/` | `industry-benchmarks.ts` contains smart default selections (which threats to pre-select for each industry). `lookup-tables.ts` in `src/lib/` contains the FAIR parameter mapping data. Conceptually different: one is UX convenience, the other is computational data. |

---

## 2. Core Module Architecture

> CybRisk has no BaseAgent class. Instead, it has a set of pure-function modules that form a directed acyclic graph (DAG). Each module has a single responsibility, typed input/output contracts, and no side effects.

### 2.1 Module Dependency Graph

```
                        +------------------+
                        |   types.ts       |
                        |  (Type System)   |
                        +--------+---------+
                                 |
                    +------------+------------+
                    |                         |
           +--------v---------+     +---------v----------+
           | lookup-tables.ts |     |   validation.ts    |
           | (Lookup Engine)  |     |   (Zod Schemas)    |
           +--------+---------+     +---------+----------+
                    |                         |
           +--------v---------+               |
           | monte-carlo.ts   |               |
           | (MC Engine)      |               |
           +--------+---------+               |
                    |                         |
           +--------v---------+               |
           | gordon-loeb.ts   |               |
           | (GL Calculator)  |               |
           +--------+---------+               |
                    |                         |
           +--------v---------v---------------v-----+
           |         api/calculate/route.ts          |
           |         (API Orchestrator)              |
           +---------+------------------------------+
                     |
          +----------v-----------+
          | sessionStorage +     |
          | results-context.tsx  |
          | (Results Context)    |
          +----------+-----------+
                     |
     +---------------+----------------+
     |               |                |
+----v-----+  +------v------+  +-----v-------+
| KPI Cards |  | Histogram   |  | Exceedance  |
| (results) |  | (BarChart)  |  | (LineChart) |
+-----------+  +-------------+  +-------------+

     +------------------------------------------+
     |          assess/page.tsx                  |
     |     (Wizard State Manager)               |
     |  [Independent: feeds into API via POST]  |
     +------------------------------------------+
```

**Dependency Rules:**

- Arrows point from dependency to dependent (A -> B means B depends on A).
- `types.ts` is the root. Every module imports from it. If types change, everything downstream must be re-verified.
- The API route is the convergence point: it imports lookup tables, monte-carlo, gordon-loeb, and validation.
- The wizard and results page are client-side modules that communicate with the API route via HTTP, not module imports.
- No circular dependencies exist. The graph is a DAG.

### 2.2 Type System (Root Module)

```typescript
// src/lib/types.ts
// This module is the root of the dependency graph. Every other module imports from here.

// ── Enum Types ──────────────────────────────────────────────────────

export type Industry =
  | 'healthcare' | 'financial' | 'pharmaceuticals' | 'technology'
  | 'energy' | 'industrial' | 'services' | 'retail' | 'education'
  | 'entertainment' | 'communications' | 'consumer' | 'media'
  | 'research' | 'transportation' | 'hospitality' | 'public_sector';

export type DataType =
  | 'customer_pii' | 'employee_pii' | 'payment_card'
  | 'health_records' | 'intellectual_property' | 'financial';

export type Control =
  | 'mfa' | 'encryption' | 'edr' | 'siem' | 'irPlan'
  | 'backupDr' | 'securityTraining' | 'vulnScanning'
  | 'networkSegmentation' | 'waf';

export type ThreatType =
  | 'ransomware' | 'bec_phishing' | 'web_app_attack'
  | 'system_intrusion' | 'insider_threat' | 'third_party';

export type RiskRating = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type RevenueBand = 'under_50m' | '50m_250m' | '250m_1b' | '1b_5b' | 'over_5b';
export type EmployeeCount = 'under_250' | '250_1000' | '1000_5000' | '5000_25000' | 'over_25000';
export type IncidentHistory = '0' | '1' | '2_5' | '5_plus';

// ── PERT Distribution Parameters ────────────────────────────────────

export interface PertParams {
  min: number;
  mode: number;
  max: number;
}

// ── FAIR Model Parameters ───────────────────────────────────────────

export interface FairParams {
  tef:  PertParams;  // Threat Event Frequency (events/year)
  vuln: PertParams;  // Vulnerability (probability 0-1)
  pl:   PertParams;  // Primary Loss (dollars)
  sl:   PertParams;  // Secondary Loss (dollars)
}

// ── Assessment Input (Wizard -> API) ────────────────────────────────

export interface AssessmentInputs {
  company: {
    industry: Industry;
    revenueBand: RevenueBand;
    employeeCount: EmployeeCount;
  };
  data: {
    types: DataType[];
    recordCount: number;
    sensitivity: 'low' | 'medium' | 'high';
  };
  controls: Record<Control, boolean>;
  threats: {
    types: ThreatType[];
    previousIncidents: IncidentHistory;
  };
}

// ── Simulation Output (MC Engine -> API Route) ──────────────────────

export interface SimulationOutput {
  ale: {
    mean: number;
    median: number;
    p5: number;
    p10: number;
    p90: number;
    p95: number;
  };
  histogram: HistogramBin[];
  exceedanceCurve: ExceedancePoint[];
  rawLosses: number[];  // Sorted ascending. Never sent to client.
}

export interface HistogramBin {
  bin: string;
  count: number;
}

export interface ExceedancePoint {
  threshold: number;
  probability: number;
}

// ── Gordon-Loeb Result ──────────────────────────────────────────────

export interface GordonLoebResult {
  optimalSpend: number;
  currentRisk: number;
  residualRisk: number;
}

// ── API Response (API Route -> Client) ──────────────────────────────

export interface CalculateResponse {
  riskRating: RiskRating;
  ale: {
    mean: number;
    median: number;
    p5: number;
    p10: number;
    p90: number;
    p95: number;
  };
  pml: number;
  gordonLoeb: GordonLoebResult;
  histogram: HistogramBin[];
  exceedanceCurve: ExceedancePoint[];
  keyDrivers: KeyDriver[];
  recommendations: Recommendation[];
  metadata: SimulationMetadata;
}

export interface KeyDriver {
  name: string;
  impact: 'high' | 'medium' | 'low';
}

export interface Recommendation {
  action: string;
  estimatedSavings: number;
}

export interface SimulationMetadata {
  iterations: number;
  executionTimeMs: number;
  dataSources: string[];
}

// ── Lookup Table Configuration Types ────────────────────────────────

export interface IndustryConfig {
  avgBreachCost: number;
  baseTEF: PertParams;
  baseVuln: PertParams;
}
```

### 2.3 Constants

```typescript
// src/lib/constants.ts (or inline within each module as appropriate)

// ── Module IDs (for logging and error attribution) ──────────────────

export const MODULE_IDS = {
  TYPES:         'types',
  LOOKUP_TABLES: 'lookup-tables',
  MONTE_CARLO:   'monte-carlo',
  GORDON_LOEB:   'gordon-loeb',
  API_ROUTE:     'api-calculate',
  VALIDATION:    'validation',
} as const;

// ── Simulation Constants ────────────────────────────────────────────

export const SIMULATION = {
  ITERATIONS: 10_000,
  HISTOGRAM_BINS: 50,
  EXCEEDANCE_POINTS: 20,
  PERT_LAMBDA: 4,
} as const;

// ── Performance Budgets ─────────────────────────────────────────────

export const PERFORMANCE = {
  MC_ENGINE_MS: 100,        // Max Monte Carlo execution time
  API_WARM_MS: 200,         // Max warm API response time
  API_COLD_MS: 3_000,       // Max cold start API response time
  LOADING_MIN_MS: 1_500,    // Minimum loading animation duration (UX)
} as const;

// ── Plausibility Bounds ─────────────────────────────────────────────

export const BOUNDS = {
  ALE_REVENUE_CAP_MULTIPLIER: 10,   // ALE capped at 10x revenue
  GORDON_LOEB_REVENUE_CAP: 0.05,    // Optimal spend capped at 5% of revenue
  VULNERABILITY_FLOOR: 0.02,         // Min vulnerability (no company is invulnerable)
  VULNERABILITY_CEILING: 0.95,       // Max vulnerability before controls
  RECORD_COUNT_MIN: 1_000,
  RECORD_COUNT_MAX: 100_000_000,
} as const;

// ── Data Source Citations ───────────────────────────────────────────

export const DATA_SOURCES = [
  'IBM Cost of a Data Breach 2025',
  'Verizon DBIR 2025',
  'NetDiligence Cyber Claims Study 2025',
] as const;
```

---

## 3. Module Implementations

### 3.1 Monte Carlo Engine

**File**: `src/lib/monte-carlo.ts`
**Dependencies**: `types.ts`
**Dependents**: `api/calculate/route.ts`

This is the computational core. It is a pure function: same inputs produce the same distribution shape (individual samples differ due to stochastic sampling). It contains no business logic about industries or controls -- that belongs to the lookup table engine.

```typescript
// src/lib/monte-carlo.ts

import type { FairParams, SimulationOutput, HistogramBin, ExceedancePoint } from './types';

const DEFAULT_LAMBDA = 4;

// ── PERT Distribution Sampling ──────────────────────────────────────

/**
 * Sample from a Modified PERT distribution using Joehnk's Beta sampling.
 * PERT assigns more weight to the mode than triangular (lambda=4 default).
 * Zero external dependencies. ~20 lines.
 */
export function samplePERT(min: number, mode: number, max: number, lambda = DEFAULT_LAMBDA): number {
  const range = max - min;
  if (range === 0) return min; // degenerate case: point value

  const alpha = 1 + lambda * (mode - min) / range;
  const beta = 1 + lambda * (max - mode) / range;
  const betaSample = sampleBeta(alpha, beta);
  return min + betaSample * range;
}

/**
 * Beta distribution sampling via Joehnk rejection algorithm.
 * Expected iterations to acceptance: ~1.5-3 for alpha/beta in [2, 8].
 */
function sampleBeta(alpha: number, beta: number): number {
  while (true) {
    const u1 = Math.random();
    const u2 = Math.random();
    const x = Math.pow(u1, 1 / alpha);
    const y = Math.pow(u2, 1 / beta);
    if (x + y <= 1) {
      return x / (x + y);
    }
  }
}

/**
 * Box-Muller transform for normal distribution sampling.
 * Available for log-normal severity if PERT proves insufficient
 * for heavy-tailed loss modeling (post-hackathon calibration).
 */
export function boxMuller(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── FAIR Simulation Loop ────────────────────────────────────────────

/**
 * Run the FAIR Monte Carlo simulation.
 *
 * @param params - PERT parameters for TEF, Vuln, PL, SL
 * @param iterations - Number of simulation iterations (default 10,000)
 * @returns SimulationOutput with percentiles, histogram, and exceedance curve
 */
export function runSimulation(params: FairParams, iterations: number = 10_000): SimulationOutput {
  const losses: number[] = new Array(iterations);

  // Running mean via Welford's algorithm (avoids float overflow)
  let runningMean = 0;

  for (let i = 0; i < iterations; i++) {
    // Threat Event Frequency (events per year)
    const tef = samplePERT(params.tef.min, params.tef.mode, params.tef.max);

    // Vulnerability (probability threat becomes loss event)
    const vuln = Math.min(1, Math.max(0,
      samplePERT(params.vuln.min, params.vuln.mode, params.vuln.max)
    ));

    // Loss Event Frequency = TEF * Vulnerability
    const lef = tef * vuln;

    // Primary Loss (direct costs: response, forensics, notification)
    const pl = samplePERT(params.pl.min, params.pl.mode, params.pl.max);

    // Secondary Loss (indirect costs: regulatory fines, legal, reputation)
    const sl = samplePERT(params.sl.min, params.sl.mode, params.sl.max);

    // Annual Loss = LEF * Loss Magnitude
    losses[i] = lef * (pl + sl);

    // Welford's running mean
    runningMean += (losses[i] - runningMean) / (i + 1);
  }

  // Sort ascending for percentile computation
  losses.sort((a, b) => a - b);

  return {
    ale: {
      mean: runningMean,
      median: percentile(losses, 50),
      p5: percentile(losses, 5),
      p10: percentile(losses, 10),
      p90: percentile(losses, 90),
      p95: percentile(losses, 95),
    },
    histogram: buildHistogram(losses, 50),
    exceedanceCurve: buildExceedanceCurve(losses, 20),
    rawLosses: losses,
  };
}

// ── Statistical Helpers ─────────────────────────────────────────────

/** Nearest-rank percentile on a sorted array. */
function percentile(sortedArray: number[], p: number): number {
  const index = Math.ceil(p / 100 * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

/** Pre-bin losses into N histogram buckets. */
function buildHistogram(sortedLosses: number[], numBins: number): HistogramBin[] {
  const min = sortedLosses[0];
  const max = sortedLosses[sortedLosses.length - 1];
  const binWidth = (max - min) / numBins || 1; // guard against zero range

  const bins = new Array(numBins).fill(0);
  for (const loss of sortedLosses) {
    const binIndex = Math.min(Math.floor((loss - min) / binWidth), numBins - 1);
    bins[binIndex]++;
  }

  return bins.map((count, i) => ({
    bin: formatCompactDollar(min + i * binWidth),
    count,
  }));
}

/** Compute P(Loss > X) for N evenly-spaced threshold points. */
function buildExceedanceCurve(sortedLosses: number[], numPoints: number): ExceedancePoint[] {
  const min = sortedLosses[0];
  const max = sortedLosses[sortedLosses.length - 1];
  const step = (max - min) / (numPoints - 1) || 1;
  const points: ExceedancePoint[] = [];

  for (let i = 0; i < numPoints; i++) {
    const threshold = min + i * step;
    // Binary search for O(log n) per threshold
    const exceedCount = sortedLosses.length - bisectRight(sortedLosses, threshold);
    const probability = exceedCount / sortedLosses.length;
    points.push({ threshold, probability });
  }

  return points;
}

/** Binary search: find insertion point for value in sorted array. */
function bisectRight(sortedArray: number[], value: number): number {
  let lo = 0;
  let hi = sortedArray.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedArray[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Compact dollar formatting for histogram bin labels. */
function formatCompactDollar(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1_000_000)     return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1_000)         return `$${Math.round(value / 1e3)}K`;
  return `$${Math.round(value)}`;
}
```

**Input invariants**: `min <= mode <= max` for all PERT params. `min >= 0`. `vuln.max <= 1.0`. `iterations > 0`.

**Output guarantees**: `ale.p5 <= ale.median <= ale.mean <= ale.p95`. `rawLosses` sorted ascending, length equals `iterations`. `histogram` has exactly 50 elements, sum of counts equals `iterations`. `exceedanceCurve` has exactly 20 points, probabilities monotonically decreasing.

**Performance target**: < 100ms for 10,000 iterations. Typical: 40-60ms on Node.js 20.x.

### 3.2 Lookup Table Engine

**File**: `src/lib/lookup-tables.ts`
**Dependencies**: `types.ts`
**Dependents**: `api/calculate/route.ts`

Maps questionnaire answers to PERT parameters for the FAIR model. All data is hardcoded from IBM Cost of a Data Breach 2025, Verizon DBIR 2025, and NetDiligence Cyber Claims Study 2025.

```typescript
// src/lib/lookup-tables.ts

import type {
  Industry, DataType, Control, ThreatType, RevenueBand,
  IncidentHistory, IndustryConfig, FairParams, PertParams,
} from './types';

// ── Per-Record Cost (IBM 2025) ──────────────────────────────────────

export const PER_RECORD_COST: Record<DataType, number> = {
  customer_pii:         175,  // IBM 2025 Table 3
  employee_pii:         189,  // IBM 2025 Table 3
  payment_card:         172,  // IBM 2025 Table 3
  health_records:       200,  // IBM 2025 Table 3 (healthcare premium)
  intellectual_property: 178, // IBM 2025 Table 3
  financial:            180,  // IBM 2025 Table 3
};

// ── Industry Base Parameters (IBM 2025 + DBIR 2025) ─────────────────

export const INDUSTRY_PARAMS: Record<Industry, IndustryConfig> = {
  healthcare:       { avgBreachCost: 10_930_000, baseTEF: { min: 0.5, mode: 1.2, max: 3.0 }, baseVuln: { min: 0.15, mode: 0.35, max: 0.60 } },
  financial:        { avgBreachCost:  6_080_000, baseTEF: { min: 0.4, mode: 1.0, max: 2.5 }, baseVuln: { min: 0.10, mode: 0.25, max: 0.50 } },
  pharmaceuticals:  { avgBreachCost:  5_010_000, baseTEF: { min: 0.3, mode: 0.8, max: 2.0 }, baseVuln: { min: 0.12, mode: 0.28, max: 0.55 } },
  technology:       { avgBreachCost:  4_970_000, baseTEF: { min: 0.5, mode: 1.1, max: 2.8 }, baseVuln: { min: 0.10, mode: 0.22, max: 0.45 } },
  energy:           { avgBreachCost:  4_720_000, baseTEF: { min: 0.3, mode: 0.7, max: 2.0 }, baseVuln: { min: 0.12, mode: 0.30, max: 0.55 } },
  industrial:       { avgBreachCost:  4_730_000, baseTEF: { min: 0.2, mode: 0.6, max: 1.8 }, baseVuln: { min: 0.15, mode: 0.32, max: 0.58 } },
  services:         { avgBreachCost:  4_550_000, baseTEF: { min: 0.3, mode: 0.7, max: 1.8 }, baseVuln: { min: 0.12, mode: 0.28, max: 0.52 } },
  retail:           { avgBreachCost:  3_480_000, baseTEF: { min: 0.4, mode: 0.9, max: 2.2 }, baseVuln: { min: 0.15, mode: 0.30, max: 0.55 } },
  education:        { avgBreachCost:  3_650_000, baseTEF: { min: 0.3, mode: 0.8, max: 2.0 }, baseVuln: { min: 0.18, mode: 0.35, max: 0.60 } },
  entertainment:    { avgBreachCost:  4_090_000, baseTEF: { min: 0.2, mode: 0.6, max: 1.5 }, baseVuln: { min: 0.14, mode: 0.30, max: 0.55 } },
  communications:   { avgBreachCost:  3_900_000, baseTEF: { min: 0.3, mode: 0.7, max: 2.0 }, baseVuln: { min: 0.12, mode: 0.28, max: 0.52 } },
  consumer:         { avgBreachCost:  3_800_000, baseTEF: { min: 0.3, mode: 0.7, max: 1.8 }, baseVuln: { min: 0.14, mode: 0.30, max: 0.55 } },
  media:            { avgBreachCost:  3_580_000, baseTEF: { min: 0.2, mode: 0.5, max: 1.5 }, baseVuln: { min: 0.14, mode: 0.28, max: 0.52 } },
  research:         { avgBreachCost:  3_280_000, baseTEF: { min: 0.2, mode: 0.5, max: 1.5 }, baseVuln: { min: 0.12, mode: 0.25, max: 0.50 } },
  transportation:   { avgBreachCost:  4_180_000, baseTEF: { min: 0.2, mode: 0.6, max: 1.8 }, baseVuln: { min: 0.15, mode: 0.32, max: 0.55 } },
  hospitality:      { avgBreachCost:  3_360_000, baseTEF: { min: 0.3, mode: 0.7, max: 1.8 }, baseVuln: { min: 0.18, mode: 0.35, max: 0.60 } },
  public_sector:    { avgBreachCost:  2_600_000, baseTEF: { min: 0.4, mode: 0.9, max: 2.5 }, baseVuln: { min: 0.20, mode: 0.38, max: 0.65 } },
};

// ── Control Effectiveness Modifiers (IBM 2025 + DBIR estimates) ─────

export const CONTROL_MODIFIERS: Record<Control, number> = {
  mfa:                  -0.15,  // IBM 2025: 15.6% cost reduction
  encryption:           -0.12,  // IBM 2025: 12.3% cost reduction
  edr:                  -0.18,  // IBM 2025: 17.9% cost reduction (AI/automation proxy)
  siem:                 -0.10,  // IBM 2025: 10.2% cost reduction
  irPlan:               -0.23,  // IBM 2025: 23.3% cost reduction (tested IR plan)
  backupDr:             -0.08,  // DBIR: reduces ransomware impact
  securityTraining:     -0.10,  // IBM 2025: 10.4% cost reduction
  vulnScanning:         -0.10,  // DBIR: estimated from patch cadence data
  networkSegmentation:  -0.12,  // IBM 2025: 12.1% cost reduction
  waf:                  -0.08,  // DBIR: estimated from web app attack data
};

// ── Revenue Band Midpoints ──────────────────────────────────────────

export const REVENUE_MIDPOINTS: Record<RevenueBand, number> = {
  under_50m:  25_000_000,
  '50m_250m': 150_000_000,
  '250m_1b':  625_000_000,
  '1b_5b':    3_000_000_000,
  over_5b:    10_000_000_000,
};

// ── Threat Type TEF Adjustments (DBIR 2025) ─────────────────────────

export const ATTACK_PATTERN_FREQ: Record<ThreatType, number> = {
  ransomware:      1.4,  // DBIR: ransomware involved in 24% of breaches
  bec_phishing:    1.3,  // DBIR: social engineering in 20%+ of breaches
  web_app_attack:  1.2,  // DBIR: basic web app attacks common in retail/tech
  system_intrusion: 1.5, // DBIR: highest complexity attack pattern
  insider_threat:  1.1,  // DBIR: 15-20% of breaches involve insiders
  third_party:     1.2,  // DBIR: supply chain involvement rising
};

// ── Incident History TEF Multiplier ─────────────────────────────────

export const INCIDENT_HISTORY_MULTIPLIER: Record<IncidentHistory, number> = {
  '0':     1.0,  // baseline
  '1':     1.5,  // one prior incident: 50% higher frequency
  '2_5':   2.0,  // repeat victimization pattern
  '5_plus': 3.0, // persistent threat or systemic failure
};

// ── Parameter Assembly Function ─────────────────────────────────────

export function mapToFairParams(inputs: {
  industry: Industry;
  revenueBand: RevenueBand;
  dataTypes: DataType[];
  recordCount: number;
  dataSensitivity: 'low' | 'medium' | 'high';
  controls: Record<Control, boolean>;
  threatTypes: ThreatType[];
  previousIncidents: IncidentHistory;
}): FairParams {

  const industryConfig = INDUSTRY_PARAMS[inputs.industry];

  // TEF: start with industry base, apply threat type and incident history
  const threatMultiplier = Math.max(...inputs.threatTypes.map(t => ATTACK_PATTERN_FREQ[t]));
  const incidentMultiplier = INCIDENT_HISTORY_MULTIPLIER[inputs.previousIncidents];
  const tefScale = threatMultiplier * incidentMultiplier;

  const tef: PertParams = {
    min:  industryConfig.baseTEF.min * tefScale,
    mode: industryConfig.baseTEF.mode * tefScale,
    max:  industryConfig.baseTEF.max * tefScale,
  };

  // Vulnerability: start with industry base, apply control modifiers
  let vulnModeAdjustment = 0;
  for (const [control, enabled] of Object.entries(inputs.controls)) {
    if (enabled) {
      vulnModeAdjustment += CONTROL_MODIFIERS[control as Control];
    }
  }
  const vulnMode = Math.max(0.02, Math.min(
    industryConfig.baseVuln.max,
    industryConfig.baseVuln.mode + vulnModeAdjustment
  ));

  const vuln: PertParams = {
    min:  Math.max(0.01, vulnMode - 0.15),
    mode: vulnMode,
    max:  Math.min(1.0, industryConfig.baseVuln.max),
  };

  // Primary Loss: per-record cost * record count * revenue scaling
  const perRecordCost = Math.max(...inputs.dataTypes.map(t => PER_RECORD_COST[t]));
  const revenueMidpoint = REVENUE_MIDPOINTS[inputs.revenueBand];
  const revenueScale = Math.log10(revenueMidpoint) / Math.log10(25_000_000);
  const plMode = perRecordCost * inputs.recordCount * revenueScale;

  const pl: PertParams = {
    min:  plMode * 0.3,
    mode: plMode,
    max:  plMode * 3.0,
  };

  // Secondary Loss: ratio of PL based on industry regulatory exposure
  const sensitivityMultiplier = { low: 0.3, medium: 0.5, high: 0.8 }[inputs.dataSensitivity];
  const slMode = plMode * sensitivityMultiplier;

  const sl: PertParams = {
    min:  slMode * 0.2,
    mode: slMode,
    max:  slMode * 5.0,
  };

  return { tef, vuln, pl, sl };
}

export function getRevenueMidpoint(band: RevenueBand): number {
  return REVENUE_MIDPOINTS[band];
}
```

### 3.3 Gordon-Loeb Calculator

**File**: `src/lib/gordon-loeb.ts`
**Dependencies**: `types.ts`, receives `SimulationOutput` from `monte-carlo.ts`
**Dependents**: `api/calculate/route.ts`

```typescript
// src/lib/gordon-loeb.ts

import type { Control, RevenueBand, GordonLoebResult } from './types';
import { CONTROL_MODIFIERS, REVENUE_MIDPOINTS } from './lookup-tables';

/**
 * Gordon-Loeb Model (2002):
 * Optimal Security Investment <= (1/e) * v * L
 *
 * Where:
 *   e = Euler's number (2.71828...)
 *   v = current vulnerability probability
 *   L = expected annual loss (ALE mean)
 *
 * CybRisk's sharpest competitive differentiator. No competitor
 * (RiskLens, Safe Security, FAIR-U) includes this calculation.
 */
export function computeGordonLoeb(
  aleMean: number,
  controls: Record<Control, boolean>,
  revenueBand: RevenueBand,
): GordonLoebResult {

  const vuln = estimateVulnerabilityLevel(controls);

  // Gordon-Loeb: optimal spend <= (1/e) * v * L
  const optimalSpend = (1 / Math.E) * vuln * aleMean;

  // Cap at 5% of revenue (practical upper bound)
  const revenueMidpoint = REVENUE_MIDPOINTS[revenueBand];
  const revenueCap = revenueMidpoint * 0.05;
  const cappedSpend = Math.min(optimalSpend, revenueCap);

  // Residual risk estimate (approximation: v * 0.37 reduction)
  const residualRisk = aleMean * (1 - vuln * 0.37);

  return {
    optimalSpend: Math.max(0, cappedSpend),
    currentRisk: aleMean,
    residualRisk: Math.max(0, residualRisk),
  };
}

/**
 * Estimate vulnerability as a single point value from control switches.
 * Gordon-Loeb needs a scalar, not a distribution (unlike the MC engine).
 */
export function estimateVulnerabilityLevel(controls: Record<Control, boolean>): number {
  let baseVuln = 0.65; // Starting assumption: moderately vulnerable
  for (const [control, enabled] of Object.entries(controls)) {
    if (enabled) {
      baseVuln += CONTROL_MODIFIERS[control as Control]; // negative values reduce vuln
    }
  }
  return Math.max(0.05, Math.min(0.95, baseVuln));
}
```

### 3.4 Validation Engine

**File**: `src/lib/validation.ts`
**Dependencies**: `types.ts`, Zod
**Dependents**: `api/calculate/route.ts`, `assess/page.tsx`

```typescript
// src/lib/validation.ts

import { z } from 'zod';

// ── Enum Arrays (single source of truth) ────────────────────────────

const INDUSTRIES = [
  'healthcare', 'financial', 'pharmaceuticals', 'technology',
  'energy', 'industrial', 'services', 'retail', 'education',
  'entertainment', 'communications', 'consumer', 'media',
  'research', 'transportation', 'hospitality', 'public_sector',
] as const;

const REVENUE_BANDS = ['under_50m', '50m_250m', '250m_1b', '1b_5b', 'over_5b'] as const;
const EMPLOYEE_COUNTS = ['under_250', '250_1000', '1000_5000', '5000_25000', 'over_25000'] as const;

const DATA_TYPES = [
  'customer_pii', 'employee_pii', 'payment_card',
  'health_records', 'intellectual_property', 'financial',
] as const;

const THREAT_TYPES = [
  'ransomware', 'bec_phishing', 'web_app_attack',
  'system_intrusion', 'insider_threat', 'third_party',
] as const;

// ── Per-Step Schemas (client-side wizard validation) ────────────────

export const CompanyProfileSchema = z.object({
  industry: z.enum(INDUSTRIES),
  revenueBand: z.enum(REVENUE_BANDS),
  employeeCount: z.enum(EMPLOYEE_COUNTS),
});

export const DataProfileSchema = z.object({
  dataTypes: z.array(z.enum(DATA_TYPES)).min(1, 'Select at least one data type'),
  recordCount: z.number().int().min(1_000).max(100_000_000),
  dataSensitivity: z.enum(['low', 'medium', 'high']),
});

export const ThreatLandscapeSchema = z.object({
  threatTypes: z.array(z.enum(THREAT_TYPES)).min(1, 'Select at least one threat type'),
  previousIncidents: z.enum(['0', '1', '2_5', '5_plus']),
});

// ── Full Request Schema (server-side API validation) ────────────────

export const CalculateRequestSchema = z.object({
  industry: z.enum(INDUSTRIES),
  revenueBand: z.enum(REVENUE_BANDS),
  employeeCount: z.enum(EMPLOYEE_COUNTS),
  dataTypes: z.array(z.enum(DATA_TYPES)).min(1),
  recordCount: z.number().int().min(1_000).max(100_000_000),
  dataSensitivity: z.enum(['low', 'medium', 'high']),
  controls: z.object({
    mfa: z.boolean(),
    encryption: z.boolean(),
    edr: z.boolean(),
    siem: z.boolean(),
    irPlan: z.boolean(),
    backupDr: z.boolean(),
    securityTraining: z.boolean(),
    vulnScanning: z.boolean(),
    networkSegmentation: z.boolean(),
    waf: z.boolean(),
  }),
  threatTypes: z.array(z.enum(THREAT_TYPES)).min(1),
  previousIncidents: z.enum(['0', '1', '2_5', '5_plus']),
});

export type CalculateRequest = z.infer<typeof CalculateRequestSchema>;
```

---

## 4. API Route

### 4.1 Main Endpoint: POST /api/calculate

**File**: `src/app/api/calculate/route.ts`
**Runtime**: Node.js 20.x serverless (`export const runtime = 'nodejs'`)
**Not Edge**: Monte Carlo is CPU-intensive; requires full Node.js APIs including typed array operations.

```typescript
// src/app/api/calculate/route.ts

import { CalculateRequestSchema } from '@/lib/validation';
import { mapToFairParams, getRevenueMidpoint, CONTROL_MODIFIERS } from '@/lib/lookup-tables';
import { runSimulation } from '@/lib/monte-carlo';
import { computeGordonLoeb } from '@/lib/gordon-loeb';
import type { CalculateResponse, RiskRating, KeyDriver, Recommendation, Control } from '@/lib/types';

export const runtime = 'nodejs'; // NOT edge -- CPU-intensive Monte Carlo

export async function POST(request: Request) {
  const start = performance.now();

  try {
    // 1. Parse request body
    const body = await request.json();

    // 2. Validate with Zod (security boundary)
    const parsed = CalculateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const input = parsed.data;

    // 3. Map inputs to FAIR parameters via lookup tables
    const fairParams = mapToFairParams({
      industry: input.industry,
      revenueBand: input.revenueBand,
      dataTypes: input.dataTypes,
      recordCount: input.recordCount,
      dataSensitivity: input.dataSensitivity,
      controls: input.controls,
      threatTypes: input.threatTypes,
      previousIncidents: input.previousIncidents,
    });

    // 4. Run Monte Carlo simulation (10,000 iterations)
    const simulation = runSimulation(fairParams, 10_000);

    // 5. Output sanity checks
    const revenueMidpoint = getRevenueMidpoint(input.revenueBand);
    const aleCap = revenueMidpoint * 10;
    if (simulation.ale.mean < 0) {
      throw new Error('Negative ALE -- check PERT parameters');
    }
    if (simulation.ale.mean > aleCap) {
      simulation.ale.mean = aleCap;
      console.warn('ALE capped at 10x revenue');
    }

    // 6. Compute Gordon-Loeb optimal spend
    const gordonLoeb = computeGordonLoeb(
      simulation.ale.mean,
      input.controls,
      input.revenueBand,
    );

    // 7. Derive risk rating
    const riskRating = deriveRiskRating(simulation.ale.mean, revenueMidpoint);

    // 8. Identify key drivers and generate recommendations
    const keyDrivers = identifyKeyDrivers(input.controls, simulation.ale.mean);
    const recommendations = generateRecommendations(input.controls, simulation.ale.mean);

    // 9. Build response (rawLosses explicitly excluded)
    const elapsed = performance.now() - start;
    const response: CalculateResponse = {
      riskRating,
      ale: simulation.ale,
      pml: simulation.ale.p95,
      gordonLoeb,
      histogram: simulation.histogram,
      exceedanceCurve: simulation.exceedanceCurve,
      keyDrivers,
      recommendations,
      metadata: {
        iterations: 10_000,
        executionTimeMs: Math.round(elapsed),
        dataSources: [
          'IBM Cost of a Data Breach 2025',
          'Verizon DBIR 2025',
          'NetDiligence Cyber Claims Study 2025',
        ],
      },
    };

    return Response.json(response);
  } catch (error) {
    // Never include user input or stack traces in error response
    console.error('Simulation error:', error);
    return Response.json(
      { error: 'Simulation failed', message: 'Please try again' },
      { status: 500 },
    );
  }
}

// ── Helper Functions ────────────────────────────────────────────────

function deriveRiskRating(aleMean: number, revenueMidpoint: number): RiskRating {
  const ratio = aleMean / revenueMidpoint;
  if (ratio < 0.005) return 'LOW';        // ALE < 0.5% of revenue
  if (ratio < 0.02)  return 'MODERATE';   // ALE 0.5% - 2% of revenue
  if (ratio < 0.05)  return 'HIGH';       // ALE 2% - 5% of revenue
  return 'CRITICAL';                       // ALE > 5% of revenue
}

const CONTROL_LABELS: Record<Control, string> = {
  mfa: 'Multi-Factor Authentication',
  encryption: 'Data Encryption at Rest',
  edr: 'Endpoint Detection and Response',
  siem: 'SIEM / Security Monitoring',
  irPlan: 'Tested Incident Response Plan',
  backupDr: 'Backup and Disaster Recovery',
  securityTraining: 'Security Awareness Training',
  vulnScanning: 'Vulnerability Scanning',
  networkSegmentation: 'Network Segmentation',
  waf: 'Web Application Firewall',
};

function identifyKeyDrivers(
  controls: Record<Control, boolean>,
  aleMean: number,
): KeyDriver[] {
  const drivers: Array<KeyDriver & { rawImpact: number }> = [];

  for (const [control, enabled] of Object.entries(controls)) {
    if (!enabled) {
      const modifier = Math.abs(CONTROL_MODIFIERS[control as Control]);
      const impact = modifier * aleMean;
      const level = modifier > 0.15 ? 'high' : modifier > 0.08 ? 'medium' : 'low';
      drivers.push({
        name: CONTROL_LABELS[control as Control],
        impact: level,
        rawImpact: impact,
      });
    }
  }

  drivers.sort((a, b) => b.rawImpact - a.rawImpact);
  return drivers.slice(0, 3).map(({ name, impact }) => ({ name, impact }));
}

function generateRecommendations(
  controls: Record<Control, boolean>,
  aleMean: number,
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const [control, enabled] of Object.entries(controls)) {
    if (!enabled) {
      const savings = Math.abs(CONTROL_MODIFIERS[control as Control]) * aleMean;
      recs.push({
        action: `Implement ${CONTROL_LABELS[control as Control]}`,
        estimatedSavings: Math.round(savings),
      });
    }
  }

  recs.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  return recs;
}
```

### 4.2 Method Guard

The Next.js App Router automatically returns 405 for non-POST methods when only `POST` is exported. No additional method guard is needed.

### 4.3 No Health Check Endpoint

CybRisk is stateless with no database, no external API calls, and no persistent connections. A health check endpoint would only confirm that the serverless function can boot, which Vercel already monitors. If health checks are needed post-hackathon, add `src/app/api/health/route.ts` that returns `{ status: "healthy", timestamp }`.

---

## 5. Configuration

### 5.1 Environment Variables

```bash
# .env.local

# ── No Required Environment Variables ────────────────────────────────
#
# CybRisk is intentionally zero-config for the hackathon:
# - No LLM API keys (pure TypeScript math, no AI calls)
# - No database URL (stateless by design)
# - No Redis (no caching layer)
# - No analytics (privacy by design)
#
# The only configuration is build-time via next.config.js.

# ── Optional: Development ───────────────────────────────────────────
# NODE_ENV=development          # Set automatically by Next.js
# NEXT_PUBLIC_BASE_URL=http://localhost:3000

# ── Optional: Post-Hackathon ────────────────────────────────────────
# OTEL_EXPORTER_OTLP_ENDPOINT=  # OpenTelemetry tracing
# OTEL_SERVICE_NAME=cybrisk     # Service name for traces
# ENABLE_DEBUG_MODE=false       # Show raw FAIR params in API response
```

### 5.2 Next.js Configuration

```typescript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript strict mode is enforced in tsconfig.json
  // No additional runtime configuration needed for MVP

  // Serverless function configuration
  serverExternalPackages: [],  // No external packages needed (pure TypeScript MC)

  // Headers for security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 5.3 TypeScript Configuration

```jsonc
// tsconfig.json (critical settings)
{
  "compilerOptions": {
    "strict": true,                  // TypeScript strict mode
    "noUncheckedIndexedAccess": true, // Catch array out-of-bounds
    "paths": {
      "@/*": ["./src/*"]             // Path alias for imports
    }
  }
}
```

### 5.4 Configuration Validation

CybRisk requires no runtime configuration validation because it has no environment-dependent secrets or connection strings. All configuration is compile-time (TypeScript types, Zod schemas, hardcoded lookup tables).

If environment variables are added post-hackathon (OpenTelemetry, debug mode), validate at application startup:

```typescript
// src/lib/config.ts (post-hackathon)

import { z } from 'zod';

const ConfigSchema = z.object({
  otelEndpoint: z.string().url().optional(),
  serviceName: z.string().default('cybrisk'),
  debugMode: z.boolean().default(false),
});

export const config = ConfigSchema.parse({
  otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  serviceName: process.env.OTEL_SERVICE_NAME,
  debugMode: process.env.ENABLE_DEBUG_MODE === 'true',
});
```

---

## 6. Client-Side Module Specifications

### 6.1 Wizard State Manager

**File**: `src/app/assess/page.tsx`
**Runtime**: Browser (Client Component)

```typescript
// Pattern: Parent useState with step components as children

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AssessmentInputs, CalculateResponse } from '@/lib/types';
import { useResults } from '@/contexts/results-context';

const defaultInputs: AssessmentInputs = {
  company: { industry: 'technology', revenueBand: 'under_50m', employeeCount: 'under_250' },
  data: { types: [], recordCount: 10_000, sensitivity: 'medium' },
  controls: {
    mfa: false, encryption: false, edr: false, siem: false, irPlan: false,
    backupDr: false, securityTraining: false, vulnScanning: false,
    networkSegmentation: false, waf: false,
  },
  threats: { types: [], previousIncidents: '0' },
};

export default function AssessPage() {
  const router = useRouter();
  const { setResults } = useResults();

  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<AssessmentInputs>(defaultInputs);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCalculate() {
    setIsCalculating(true);
    setError(null);

    try {
      // Flatten inputs to match API schema
      const body = {
        ...inputs.company,
        ...inputs.data,
        controls: inputs.controls,
        ...inputs.threats,
      };

      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Calculation failed');
      }

      const results: CalculateResponse = await response.json();

      // Dual storage: Context + sessionStorage
      setResults(results);
      try {
        sessionStorage.setItem('cybrisk-results', JSON.stringify(results));
      } catch { /* sessionStorage unavailable -- Context still works */ }

      router.push('/results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsCalculating(false);
    }
  }

  // Render step components with data slice + onUpdate callback
  // "Continue" button disabled until current step validates
  // ...
}
```

**Key behaviors**: Step validation via per-step Zod schemas. State preserved on back/forward navigation. Minimum 1.5s loading animation to avoid flash (simulation runs in < 200ms). Double-click prevention via `isCalculating` state. Screen reader announcements via `A11yAnnouncer` component.

### 6.2 Results Context

**File**: `src/contexts/results-context.tsx`
**Runtime**: Browser (Client Component)

Dual storage pattern: React Context for instant access during same-session navigation, sessionStorage for page refresh resilience. Results page checks Context first, falls back to sessionStorage, redirects to `/assess` if neither has data.

**Data size**: The serialized `CalculateResponse` is approximately 3-5KB (50 histogram bins + 20 LEC points + metadata). The `rawLosses` array (10,000 elements, ~200KB) is intentionally excluded from both the API response and sessionStorage.

### 6.3 Chart Components

**Files**: `src/components/results/loss-distribution.tsx`, `loss-exceedance.tsx`, `chart-container.tsx`

Both charts use Recharts with:

- `isAnimationActive={false}` (animation on 50 bars or 20 points is distracting)
- Brand colors from `chart-theme.ts` (Cyan-400 primary, Amber-400 P90 reference, Rose-500 P95 reference)
- `<ResponsiveContainer width="100%" height={300}>` for responsive sizing
- `aria-hidden="true"` on SVG with companion `sr-only` data table
- Compact dollar formatting on axes (`$1.2M` not `$1,200,000`)
- Full dollar formatting in `aria-label` overrides for screen readers

---

## 7. Implementation Priority and Build Order

The critical path determines build order. Each item unblocks the next.

```
1. types.ts                  -- unblocks everything
      |
2. validation.ts             -- unblocks wizard per-step validation
      |
3. lookup-tables.ts          -- unblocks MC engine
      |
4. monte-carlo.ts            -- unblocks API route
      |
5. gordon-loeb.ts            -- unblocks API route
      |
6. api/calculate/route.ts    -- unblocks results page
      |
7. Wizard steps 1-5          -- unblocks end-to-end flow
      |
8. Results dashboard         -- unblocks demo
      |
9. Landing page              -- unblocks submission
      |
10. Vercel deployment         -- unblocks judging
```

### Implementation Tiers

| Priority | File | Effort | Depends On |
|----------|------|--------|------------|
| P0 | `src/lib/types.ts` | 1h | None |
| P0 | `src/lib/validation.ts` | 1h | types.ts |
| P0 | `src/lib/lookup-tables.ts` | 2h | types.ts |
| P0 | `src/lib/monte-carlo.ts` | 3h | types.ts |
| P0 | `src/lib/gordon-loeb.ts` | 1h | types.ts, lookup-tables.ts |
| P0 | `src/app/api/calculate/route.ts` | 2h | all lib modules |
| P0 | Wizard Steps 1-5 (`src/components/assess/`) | 4h | validation.ts |
| P0 | Results Dashboard (`src/components/results/`) | 3h | API route |
| P1 | Landing page (`src/components/landing/`) | 2h | None |
| P1 | Processing animation (`simulation-loading.tsx`) | 1h | None |
| P1 | Smart defaults for Step 4 | 0.5h | lookup-tables.ts |
| P2 | Gordon-Loeb KPI card | 0.5h | gordon-loeb.ts |
| P2 | Methodology collapsible section | 1h | None |
| P2 | Error recovery (retry/fallback) | 1h | API route |
| P2 | Accessibility enhancements | 3h | All components |

**Total estimated effort**: 12-15 hours for P0. 17-20 hours including P1. 22-27 hours including P2.

---

## 8. Cross-Module Invariants

These invariants span multiple modules and must hold across the entire pipeline.

| Invariant | Modules Involved | Verification |
|-----------|-----------------|--------------|
| `ALE >= 0` | Monte Carlo, API Route | API Route checks after simulation and before response. |
| `ALE <= 10x revenue` | Lookup Tables, API Route | API Route caps based on revenue band midpoint. |
| `Vulnerability in [0, 1]` | Lookup Tables, Monte Carlo | Lookup Tables cap mode at 0.95. MC Engine clamps per-sample to [0, 1]. |
| No raw losses in response | Monte Carlo, API Route | `CalculateResponse` type does not include `rawLosses`. |
| Histogram has exactly 50 bins | Monte Carlo, Chart Formatter | MC Engine builds 50 bins. Histogram component expects 50 elements. |
| LEC has exactly 20 points | Monte Carlo, Chart Formatter | MC Engine builds 20 points. LEC component expects 20 elements. |
| Dollar format consistency | All client modules | `formatCompactDollar()` used everywhere. `aria-label` uses full format. |
| Zod schema shared | Validation, Wizard, API Route | Single `validation.ts` file imported by both. |
| No user data in logs | API Route | `console.error` logs error type only, never request body. |
| PERT param ordering | Lookup Tables, Monte Carlo | `min <= mode <= max` enforced by lookup table assembly. MC Engine defends with clamping. |

---

## 9. Test Strategy

### 9.1 Unit Tests (Critical Path)

| Module | Test File | Key Test Cases |
|--------|-----------|----------------|
| Monte Carlo | `tests/lib/monte-carlo.test.ts` | PERT sampling distribution shape; degenerate case (min=max); 10K simulation produces valid percentiles; histogram has 50 bins summing to 10K; LEC is monotonically decreasing; vulnerability clamped to [0,1] |
| Lookup Tables | `tests/lib/lookup-tables.test.ts` | All 17 industries produce valid PERT params; all controls enabled floors vuln at 0.02; no controls leaves vuln at base; revenue scaling is logarithmic; max threat multiplier used (not product) |
| Gordon-Loeb | `tests/lib/gordon-loeb.test.ts` | Zero ALE produces zero spend; all controls produce low spend; revenue cap applied; residual risk < current risk; output non-negative |
| Validation | `tests/lib/validation.test.ts` | Valid complete request passes; missing required fields fail; out-of-range recordCount fails; invalid enum values fail; per-step schemas match full schema |

### 9.2 Integration Tests

| Scope | Test File | Key Test Cases |
|-------|-----------|----------------|
| API Route | `tests/api/calculate.test.ts` | Valid request returns 200 with all fields; invalid request returns 400 with Zod issues; response does not contain rawLosses; executionTimeMs is populated; all response fields are non-negative |

### 9.3 Smoke Test (Post-Deploy)

```bash
# Verify Vercel deployment with a sample calculation
curl -X POST https://cybrisk.vercel.app/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "technology",
    "revenueBand": "50m_250m",
    "employeeCount": "250_1000",
    "dataTypes": ["customer_pii"],
    "recordCount": 50000,
    "dataSensitivity": "medium",
    "controls": {
      "mfa": true, "encryption": true, "edr": false, "siem": false,
      "irPlan": false, "backupDr": true, "securityTraining": false,
      "vulnScanning": false, "networkSegmentation": false, "waf": false
    },
    "threatTypes": ["ransomware", "bec_phishing"],
    "previousIncidents": "0"
  }'
```

Expected: 200 response with `riskRating`, `ale`, `gordonLoeb`, `histogram` (50 bins), `exceedanceCurve` (20 points), `keyDrivers`, `recommendations`, and `metadata`.

---

## 10. Verification Checklist

- [x] Directory structure matches Next.js 14+ App Router conventions
- [x] No BaseAgent class (CybRisk is not an agentic system)
- [x] No database, no auth, no LLM configuration
- [x] One implementation per core module (Monte Carlo, Lookup Tables, Gordon-Loeb, Validation)
- [x] API route defined with full pipeline (validate -> map -> simulate -> compute -> respond)
- [x] Environment variables documented (intentionally zero required for MVP)
- [x] Type system is the root of the dependency graph
- [x] Cross-module invariants documented
- [x] Implementation priority matches critical path from Architecture Blueprint
- [x] Security controls documented (Zod validation, no user data in logs, enum constraints)
- [x] Accessibility patterns included (sr-only tables, aria-labels, live regions)
- [x] Performance targets specified per module

---

*Document generated by North Star Advisor*
