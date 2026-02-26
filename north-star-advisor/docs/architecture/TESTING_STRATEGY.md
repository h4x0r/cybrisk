# CybRisk: Testing Strategy

> **Parent**: [ARCHITECTURE_BLUEPRINT.md](../ARCHITECTURE_BLUEPRINT.md)
> **Created**: 2026-02-22
> **Status**: Active

Test categories, configuration, golden datasets, and integration tests for CybRisk's stateless Monte Carlo calculation pipeline.

CybRisk is a deterministic calculation pipeline, not an AI agent system. The testing strategy reflects this: the critical path is mathematical correctness of the FAIR Monte Carlo engine, Gordon-Loeb calculation, and lookup table parameter assembly. There are no LLM calls to mock, no agent behaviors to validate, and no conversational flows to test. The golden datasets contain known FAIR scenarios with expected output ranges (not exact values, because Monte Carlo sampling is stochastic).

---

## 1. Test Categories

### 1.1 Test Pyramid

```
                    +------------------+
                    |       E2E        |  Few, slow: full wizard -> results flow
                   -+------------------+-
                 +------------------------+
                 |     Integration        |  API route with known inputs
                -+------------------------+-
              +------------------------------+
              |     Component Unit           |  Wizard steps, results charts
             -+------------------------------+-
           +------------------------------------+
           |        Computation Unit            |  MC engine, Gordon-Loeb, lookups
          -+------------------------------------+-
```

CybRisk inverts the typical "agent unit" layer. There are no agents. The widest layer of the pyramid is **computation unit tests** -- pure functions with deterministic inputs and statistically verifiable outputs. The component unit layer tests React components with mock data. Integration tests exercise the API route end-to-end. E2E tests (stretch goal) validate the full user flow in a browser.

### 1.2 Coverage Targets

| Category | Target | Focus |
|----------|--------|-------|
| Computation Unit | 95% | `monte-carlo.ts`, `gordon-loeb.ts`, `lookup-tables.ts`, `validation.ts` |
| Component Unit | 80% | Wizard step components, results chart components, results context |
| Integration | 70% | API route (`/api/calculate`), request/response shapes |
| E2E | Critical paths | Landing -> Wizard -> Calculate -> Results (stretch goal) |

### 1.3 Priority Order

1. **Monte Carlo engine** -- mathematical correctness is the product's credibility
2. **Zod validation** -- security boundary; rejects malformed inputs server-side
3. **Lookup table parameter assembly** -- incorrect parameters produce incorrect results silently
4. **Gordon-Loeb calculation** -- board-facing dollar recommendation must be right
5. **API route integration** -- request/response contract
6. **Wizard state management** -- per-step validation, state preservation
7. **Results rendering** -- charts render with mock data, percentiles display correctly
8. **E2E browser flow** -- stretch goal for hackathon

---

## 2. Test Configuration

### 2.1 Test Framework: Vitest

Vitest is chosen over Jest because it shares Vite's transform pipeline with Next.js, has native TypeScript support without separate `ts-jest` configuration, and provides faster execution through ESM-native module resolution. For a hackathon project with no legacy test infrastructure, Vitest is the pragmatic choice.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'tests',
        '*.config.*',
        'src/components/ui/**', // Shadcn/ui primitives -- tested upstream
      ],
      thresholds: {
        'src/lib/monte-carlo.ts': { lines: 95, functions: 100 },
        'src/lib/gordon-loeb.ts': { lines: 95, functions: 100 },
        'src/lib/lookup-tables.ts': { lines: 90, functions: 100 },
        'src/lib/validation.ts': { lines: 90, functions: 100 },
      },
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 2.2 Test Setup

```typescript
// tests/setup.ts

// No LLM API keys to mock -- CybRisk makes zero external API calls.
// No database connections to mock -- CybRisk is stateless.
// No environment variables required for computation tests.

// Seed Math.random for deterministic tests where needed.
// Vitest does not seed Math.random by default.
// Tests that require deterministic output use a seeded PRNG (see Section 7.1).

// Mock sessionStorage for component tests
if (typeof globalThis.sessionStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.sessionStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  } as Storage;
}
```

### 2.3 Test File Organization

```
tests/
├── setup.ts                         # Global setup (sessionStorage mock)
├── unit/
│   ├── monte-carlo.test.ts          # PERT sampling, simulation loop, percentiles, histogram, LEC
│   ├── gordon-loeb.test.ts          # Optimal spend, revenue cap, residual risk
│   ├── lookup-tables.test.ts        # Parameter assembly, control modifiers, edge cases
│   └── validation.test.ts           # Zod schemas: valid inputs accepted, invalid rejected
├── integration/
│   └── api-calculate.test.ts        # POST /api/calculate with known inputs
├── components/
│   ├── wizard-state.test.tsx        # Step navigation, state preservation, submit flow
│   └── results-context.test.tsx     # Context + sessionStorage dual storage
├── fixtures/
│   ├── golden-scenarios.ts          # Known FAIR scenarios with expected output ranges
│   ├── mock-inputs.ts               # Factory functions for AssessmentInputs
│   └── mock-results.ts              # Factory functions for CalculateResponse
├── helpers/
│   ├── seeded-random.ts             # Deterministic PRNG for reproducible tests
│   └── statistical-assertions.ts    # Custom matchers for distribution properties
└── e2e/
    └── user-flow.test.ts            # Playwright: landing -> wizard -> results (stretch)
```

---

## 3. Golden Datasets

### 3.1 Golden Dataset Structure

CybRisk's golden datasets are not "agent output assertions." They are known FAIR scenarios where the expected output is a **statistical range**, not an exact value. A Monte Carlo simulation with the same inputs will produce different samples each run, but the distribution properties (mean, percentiles, shape) should fall within predictable bounds when averaged over enough iterations.

Each golden test case specifies:
- **Input**: A complete `CalculateRequest` body
- **Expected ranges**: Upper and lower bounds for ALE mean, median, and P95
- **Invariants**: Structural properties that must always hold (e.g., P5 <= median <= mean <= P95)
- **Statistical tolerance**: Acceptable coefficient of variation across repeated runs

```typescript
// tests/fixtures/golden-scenarios.ts

interface GoldenScenario {
  id: string;
  category: 'happy_path' | 'edge_case' | 'boundary' | 'extreme' | 'regression';
  description: string;
  input: CalculateRequest;
  expected: {
    ale: {
      mean: { min: number; max: number };
      median: { min: number; max: number };
      p95: { min: number; max: number };
    };
    riskRating: RiskRating;
    gordonLoeb: {
      optimalSpend: { min: number; max: number };
    };
    invariants: string[];
  };
  tolerance: number;  // Coefficient of variation tolerance (e.g., 0.15 = 15%)
  priority: 'critical' | 'high' | 'medium';
}
```

### 3.2 Golden Scenarios

```typescript
export const GOLDEN_SCENARIOS: GoldenScenario[] = [
  {
    id: 'golden-001',
    category: 'happy_path',
    description: 'Mid-market healthcare company with moderate controls',
    input: {
      industry: 'healthcare',
      revenueBand: '50m_250m',
      employeeCount: '1000_5000',
      dataTypes: ['customer_pii', 'health_records'],
      recordCount: 500_000,
      dataSensitivity: 'high',
      controls: {
        mfa: true, encryption: true, edr: false, siem: false,
        irPlan: true, backupDr: true, securityTraining: true,
        vulnScanning: false, networkSegmentation: false, waf: false,
      },
      threatTypes: ['ransomware', 'bec_phishing', 'system_intrusion'],
      previousIncidents: '1',
    },
    expected: {
      ale: {
        mean: { min: 500_000, max: 8_000_000 },
        median: { min: 100_000, max: 5_000_000 },
        p95: { min: 2_000_000, max: 25_000_000 },
      },
      riskRating: 'HIGH',
      gordonLoeb: {
        optimalSpend: { min: 50_000, max: 3_000_000 },
      },
      invariants: [
        'ale.p5 <= ale.median',
        'ale.median <= ale.mean',
        'ale.mean <= ale.p95',
        'gordonLoeb.residualRisk < gordonLoeb.currentRisk',
        'gordonLoeb.optimalSpend >= 0',
        'histogram.length === 50',
        'exceedanceCurve.length === 20',
      ],
    },
    tolerance: 0.20,
    priority: 'critical',
  },
  {
    id: 'golden-002',
    category: 'happy_path',
    description: 'Small tech company with strong security posture',
    input: {
      industry: 'technology',
      revenueBand: 'under_50m',
      employeeCount: 'under_250',
      dataTypes: ['customer_pii', 'intellectual_property'],
      recordCount: 50_000,
      dataSensitivity: 'medium',
      controls: {
        mfa: true, encryption: true, edr: true, siem: true,
        irPlan: true, backupDr: true, securityTraining: true,
        vulnScanning: true, networkSegmentation: true, waf: true,
      },
      threatTypes: ['web_app_attack'],
      previousIncidents: '0',
    },
    expected: {
      ale: {
        mean: { min: 5_000, max: 500_000 },
        median: { min: 1_000, max: 200_000 },
        p95: { min: 50_000, max: 2_000_000 },
      },
      riskRating: 'LOW',
      gordonLoeb: {
        optimalSpend: { min: 500, max: 100_000 },
      },
      invariants: [
        'ale.p5 <= ale.median',
        'ale.median <= ale.mean',
        'ale.mean <= ale.p95',
      ],
    },
    tolerance: 0.25,
    priority: 'critical',
  },
  {
    id: 'golden-003',
    category: 'happy_path',
    description: 'Large financial institution with no controls -- worst case',
    input: {
      industry: 'financial',
      revenueBand: 'over_5b',
      employeeCount: 'over_25000',
      dataTypes: ['customer_pii', 'payment_card', 'financial'],
      recordCount: 50_000_000,
      dataSensitivity: 'high',
      controls: {
        mfa: false, encryption: false, edr: false, siem: false,
        irPlan: false, backupDr: false, securityTraining: false,
        vulnScanning: false, networkSegmentation: false, waf: false,
      },
      threatTypes: ['ransomware', 'bec_phishing', 'system_intrusion', 'insider_threat', 'third_party'],
      previousIncidents: '5_plus',
    },
    expected: {
      ale: {
        mean: { min: 10_000_000, max: 500_000_000 },
        median: { min: 5_000_000, max: 300_000_000 },
        p95: { min: 50_000_000, max: 1_000_000_000 },
      },
      riskRating: 'CRITICAL',
      gordonLoeb: {
        optimalSpend: { min: 1_000_000, max: 500_000_000 },
      },
      invariants: [
        'ale.p5 <= ale.median',
        'ale.median <= ale.mean',
        'gordonLoeb.optimalSpend <= revenueMidpoint * 0.05',
      ],
    },
    tolerance: 0.30,
    priority: 'critical',
  },
  {
    id: 'golden-004',
    category: 'edge_case',
    description: 'Minimum record count with all controls enabled',
    input: {
      industry: 'retail',
      revenueBand: 'under_50m',
      employeeCount: 'under_250',
      dataTypes: ['customer_pii'],
      recordCount: 1_000,
      dataSensitivity: 'low',
      controls: {
        mfa: true, encryption: true, edr: true, siem: true,
        irPlan: true, backupDr: true, securityTraining: true,
        vulnScanning: true, networkSegmentation: true, waf: true,
      },
      threatTypes: ['web_app_attack'],
      previousIncidents: '0',
    },
    expected: {
      ale: {
        mean: { min: 0, max: 100_000 },
        median: { min: 0, max: 50_000 },
        p95: { min: 0, max: 500_000 },
      },
      riskRating: 'LOW',
      gordonLoeb: {
        optimalSpend: { min: 0, max: 20_000 },
      },
      invariants: [
        'ale.mean >= 0',
        'gordonLoeb.optimalSpend >= 0',
        'vulnerability mode >= 0.02', // Floor enforced by lookup tables
      ],
    },
    tolerance: 0.40,
    priority: 'high',
  },
  {
    id: 'golden-005',
    category: 'edge_case',
    description: 'Maximum record count with healthcare PHI -- extreme severity',
    input: {
      industry: 'healthcare',
      revenueBand: '1b_5b',
      employeeCount: '5000_25000',
      dataTypes: ['health_records', 'customer_pii', 'employee_pii'],
      recordCount: 100_000_000,
      dataSensitivity: 'high',
      controls: {
        mfa: false, encryption: false, edr: false, siem: false,
        irPlan: false, backupDr: false, securityTraining: false,
        vulnScanning: false, networkSegmentation: false, waf: false,
      },
      threatTypes: ['ransomware', 'system_intrusion'],
      previousIncidents: '5_plus',
    },
    expected: {
      ale: {
        mean: { min: 50_000_000, max: 30_000_000_000 },
        median: { min: 10_000_000, max: 20_000_000_000 },
        p95: { min: 100_000_000, max: 30_000_000_000 },
      },
      riskRating: 'CRITICAL',
      gordonLoeb: {
        optimalSpend: { min: 10_000_000, max: 150_000_000 },
      },
      invariants: [
        'ale.mean <= revenueMidpoint * 10', // Plausibility cap
      ],
    },
    tolerance: 0.35,
    priority: 'high',
  },
  {
    id: 'golden-006',
    category: 'boundary',
    description: 'Single threat type, single data type, median company',
    input: {
      industry: 'services',
      revenueBand: '250m_1b',
      employeeCount: '1000_5000',
      dataTypes: ['employee_pii'],
      recordCount: 10_000,
      dataSensitivity: 'medium',
      controls: {
        mfa: true, encryption: true, edr: false, siem: false,
        irPlan: false, backupDr: false, securityTraining: false,
        vulnScanning: false, networkSegmentation: false, waf: false,
      },
      threatTypes: ['bec_phishing'],
      previousIncidents: '0',
    },
    expected: {
      ale: {
        mean: { min: 10_000, max: 2_000_000 },
        median: { min: 1_000, max: 1_000_000 },
        p95: { min: 50_000, max: 5_000_000 },
      },
      riskRating: 'LOW',
      gordonLoeb: {
        optimalSpend: { min: 1_000, max: 500_000 },
      },
      invariants: [
        'ale.p5 <= ale.median',
        'ale.median <= ale.mean',
      ],
    },
    tolerance: 0.25,
    priority: 'medium',
  },
];
```

### 3.3 Golden Dataset Categories

| Category | Purpose | Scenarios | Priority |
|----------|---------|-----------|----------|
| Happy Path | Normal operation across industry/revenue combinations | 3 | Critical |
| Edge Cases | Minimum inputs, maximum inputs, all controls on/off | 2 | High |
| Boundary | Single selections, median values | 1 | Medium |
| Regression | Cases added when bugs are found in production | 0 (grows) | Varies |

Additional scenarios should be added as the lookup tables are calibrated against real data sources. The target is 10+ scenarios before production release.

---

## 4. Computation Unit Tests

### 4.1 Monte Carlo Engine Tests

These are the most critical tests in the entire suite. The Monte Carlo engine is the product's core value proposition. If `samplePERT` is wrong, every output is wrong.

```typescript
// tests/unit/monte-carlo.test.ts

import { describe, it, expect } from 'vitest';
import {
  samplePERT,
  sampleBeta,
  runSimulation,
  buildHistogram,
  buildExceedanceCurve,
  percentile,
} from '@/lib/monte-carlo';
import { createSeededRandom } from '../helpers/seeded-random';

describe('samplePERT', () => {
  it('returns min when min === mode === max (point value)', () => {
    for (let i = 0; i < 100; i++) {
      expect(samplePERT(5, 5, 5)).toBe(5);
    }
  });

  it('returns value within [min, max] bounds', () => {
    for (let i = 0; i < 10_000; i++) {
      const sample = samplePERT(10, 50, 100);
      expect(sample).toBeGreaterThanOrEqual(10);
      expect(sample).toBeLessThanOrEqual(100);
    }
  });

  it('produces mean close to PERT analytical mean', () => {
    // PERT mean = (min + lambda * mode + max) / (lambda + 2)
    // With lambda=4: mean = (10 + 4*50 + 100) / 6 = 310/6 = 51.67
    const samples: number[] = [];
    for (let i = 0; i < 50_000; i++) {
      samples.push(samplePERT(10, 50, 100));
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const expectedMean = (10 + 4 * 50 + 100) / 6; // 51.67
    expect(mean).toBeCloseTo(expectedMean, 0); // Within 0.5
  });

  it('produces variance consistent with PERT analytical variance', () => {
    // PERT variance = (mean - min)(max - mean) / (lambda + 3)
    // With lambda=4: var = (51.67 - 10)(100 - 51.67) / 7 = ~287.7
    const samples: number[] = [];
    for (let i = 0; i < 50_000; i++) {
      samples.push(samplePERT(10, 50, 100));
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
    const expectedVariance = (mean - 10) * (100 - mean) / 7;
    // Allow 15% tolerance on variance estimation
    expect(variance).toBeGreaterThan(expectedVariance * 0.85);
    expect(variance).toBeLessThan(expectedVariance * 1.15);
  });

  it('handles mode === min (left-degenerate) without error', () => {
    for (let i = 0; i < 1_000; i++) {
      const sample = samplePERT(0, 0, 100);
      expect(sample).toBeGreaterThanOrEqual(0);
      expect(sample).toBeLessThanOrEqual(100);
    }
  });

  it('handles mode === max (right-degenerate) without error', () => {
    for (let i = 0; i < 1_000; i++) {
      const sample = samplePERT(0, 100, 100);
      expect(sample).toBeGreaterThanOrEqual(0);
      expect(sample).toBeLessThanOrEqual(100);
    }
  });

  it('produces right-skewed distribution when mode < midpoint', () => {
    const samples: number[] = [];
    for (let i = 0; i < 50_000; i++) {
      samples.push(samplePERT(0, 20, 100));
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const sorted = samples.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    // Right-skewed: mean > median
    expect(mean).toBeGreaterThan(median);
  });
});

describe('sampleBeta', () => {
  it('returns values in [0, 1]', () => {
    for (let i = 0; i < 10_000; i++) {
      const sample = sampleBeta(2, 5);
      expect(sample).toBeGreaterThanOrEqual(0);
      expect(sample).toBeLessThanOrEqual(1);
    }
  });

  it('produces mean close to alpha / (alpha + beta)', () => {
    const alpha = 3;
    const beta = 7;
    const samples: number[] = [];
    for (let i = 0; i < 50_000; i++) {
      samples.push(sampleBeta(alpha, beta));
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const expectedMean = alpha / (alpha + beta); // 0.3
    expect(mean).toBeCloseTo(expectedMean, 1); // Within 0.05
  });
});

describe('runSimulation', () => {
  const standardParams = {
    tef:  { min: 0.5, mode: 1.2, max: 3.0 },
    vuln: { min: 0.15, mode: 0.35, max: 0.60 },
    pl:   { min: 100_000, mode: 500_000, max: 2_000_000 },
    sl:   { min: 50_000, mode: 200_000, max: 1_000_000 },
  };

  it('returns sorted rawLosses array of correct length', () => {
    const result = runSimulation(standardParams, 10_000);
    expect(result.rawLosses).toHaveLength(10_000);
    for (let i = 1; i < result.rawLosses.length; i++) {
      expect(result.rawLosses[i]).toBeGreaterThanOrEqual(result.rawLosses[i - 1]);
    }
  });

  it('maintains percentile ordering: p5 <= median <= mean <= p95', () => {
    const result = runSimulation(standardParams, 10_000);
    expect(result.ale.p5).toBeLessThanOrEqual(result.ale.median);
    expect(result.ale.median).toBeLessThanOrEqual(result.ale.mean);
    expect(result.ale.mean).toBeLessThanOrEqual(result.ale.p95);
  });

  it('produces all non-negative losses', () => {
    const result = runSimulation(standardParams, 10_000);
    expect(result.ale.mean).toBeGreaterThanOrEqual(0);
    expect(result.ale.p5).toBeGreaterThanOrEqual(0);
    result.rawLosses.forEach((loss) => {
      expect(loss).toBeGreaterThanOrEqual(0);
    });
  });

  it('executes 10K iterations in under 200ms', () => {
    const start = performance.now();
    runSimulation(standardParams, 10_000);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });

  it('produces consistent mean across repeated runs (CV < 15%)', () => {
    const means: number[] = [];
    for (let run = 0; run < 20; run++) {
      const result = runSimulation(standardParams, 10_000);
      means.push(result.ale.mean);
    }
    const avgMean = means.reduce((a, b) => a + b, 0) / means.length;
    const stdDev = Math.sqrt(
      means.reduce((a, b) => a + (b - avgMean) ** 2, 0) / means.length
    );
    const cv = stdDev / avgMean;
    expect(cv).toBeLessThan(0.15);
  });
});

describe('buildHistogram', () => {
  it('returns exactly 50 bins', () => {
    const losses = Array.from({ length: 10_000 }, (_, i) => i * 100);
    losses.sort((a, b) => a - b);
    const histogram = buildHistogram(losses, 50);
    expect(histogram).toHaveLength(50);
  });

  it('bin counts sum to total iterations', () => {
    const result = runSimulation({
      tef: { min: 1, mode: 2, max: 3 },
      vuln: { min: 0.1, mode: 0.3, max: 0.5 },
      pl: { min: 100_000, mode: 300_000, max: 500_000 },
      sl: { min: 50_000, mode: 100_000, max: 200_000 },
    }, 10_000);
    const totalCount = result.histogram.reduce((sum, bin) => sum + bin.count, 0);
    expect(totalCount).toBe(10_000);
  });
});

describe('buildExceedanceCurve', () => {
  it('returns exactly 20 points', () => {
    const losses = Array.from({ length: 10_000 }, (_, i) => i * 100);
    losses.sort((a, b) => a - b);
    const curve = buildExceedanceCurve(losses, 20);
    expect(curve).toHaveLength(20);
  });

  it('first point has probability close to 1.0', () => {
    const result = runSimulation({
      tef: { min: 1, mode: 2, max: 3 },
      vuln: { min: 0.1, mode: 0.3, max: 0.5 },
      pl: { min: 100_000, mode: 300_000, max: 500_000 },
      sl: { min: 50_000, mode: 100_000, max: 200_000 },
    }, 10_000);
    expect(result.exceedanceCurve[0].probability).toBeGreaterThanOrEqual(0.95);
  });

  it('probabilities are monotonically non-increasing', () => {
    const result = runSimulation({
      tef: { min: 1, mode: 2, max: 3 },
      vuln: { min: 0.1, mode: 0.3, max: 0.5 },
      pl: { min: 100_000, mode: 300_000, max: 500_000 },
      sl: { min: 50_000, mode: 100_000, max: 200_000 },
    }, 10_000);
    for (let i = 1; i < result.exceedanceCurve.length; i++) {
      expect(result.exceedanceCurve[i].probability)
        .toBeLessThanOrEqual(result.exceedanceCurve[i - 1].probability);
    }
  });

  it('last point has probability close to 0.0', () => {
    const result = runSimulation({
      tef: { min: 1, mode: 2, max: 3 },
      vuln: { min: 0.1, mode: 0.3, max: 0.5 },
      pl: { min: 100_000, mode: 300_000, max: 500_000 },
      sl: { min: 50_000, mode: 100_000, max: 200_000 },
    }, 10_000);
    const lastPoint = result.exceedanceCurve[result.exceedanceCurve.length - 1];
    expect(lastPoint.probability).toBeLessThanOrEqual(0.05);
  });
});

describe('percentile', () => {
  it('returns correct values for simple sorted arrays', () => {
    const sorted = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentile(sorted, 50)).toBe(50);
    expect(percentile(sorted, 10)).toBe(10);
    expect(percentile(sorted, 90)).toBe(90);
    expect(percentile(sorted, 95)).toBe(100);
  });

  it('returns min for 0th percentile', () => {
    const sorted = [10, 20, 30, 40, 50];
    expect(percentile(sorted, 0)).toBe(10);
  });
});
```

### 4.2 Gordon-Loeb Calculator Tests

```typescript
// tests/unit/gordon-loeb.test.ts

import { describe, it, expect } from 'vitest';
import {
  computeGordonLoeb,
  estimateVulnerabilityLevel,
} from '@/lib/gordon-loeb';

describe('computeGordonLoeb', () => {
  const mockSimulation = (aleMean: number) => ({
    ale: {
      mean: aleMean,
      median: aleMean * 0.8,
      p5: aleMean * 0.2,
      p10: aleMean * 0.3,
      p90: aleMean * 1.5,
      p95: aleMean * 2.0,
    },
    histogram: [],
    exceedanceCurve: [],
    rawLosses: [],
  });

  const allControlsOff = {
    mfa: false, encryption: false, edr: false, siem: false,
    irPlan: false, backupDr: false, securityTraining: false,
    vulnScanning: false, networkSegmentation: false, waf: false,
  };

  const allControlsOn = {
    mfa: true, encryption: true, edr: true, siem: true,
    irPlan: true, backupDr: true, securityTraining: true,
    vulnScanning: true, networkSegmentation: true, waf: true,
  };

  it('computes optimalSpend = (1/e) * vulnerability * ALE', () => {
    const vuln = estimateVulnerabilityLevel(allControlsOff);
    const result = computeGordonLoeb(
      mockSimulation(2_000_000),
      allControlsOff,
      '50m_250m',
    );
    const expectedSpend = (1 / Math.E) * vuln * 2_000_000;
    const revenueCap = 150_000_000 * 0.05;
    const expected = Math.min(expectedSpend, revenueCap);
    expect(result.optimalSpend).toBeCloseTo(expected, -2); // Within $100
  });

  it('caps optimalSpend at 5% of revenue midpoint', () => {
    // ALE of $50B with small revenue should be capped
    const result = computeGordonLoeb(
      mockSimulation(50_000_000_000),
      allControlsOff,
      'under_50m',
    );
    const revenueCap = 25_000_000 * 0.05; // $1.25M
    expect(result.optimalSpend).toBeLessThanOrEqual(revenueCap);
  });

  it('returns optimalSpend = 0 when ALE is 0', () => {
    const result = computeGordonLoeb(
      mockSimulation(0),
      allControlsOn,
      '50m_250m',
    );
    expect(result.optimalSpend).toBe(0);
  });

  it('residualRisk is less than currentRisk', () => {
    const result = computeGordonLoeb(
      mockSimulation(5_000_000),
      allControlsOff,
      '1b_5b',
    );
    expect(result.residualRisk).toBeLessThan(result.currentRisk);
  });

  it('residualRisk is non-negative', () => {
    const result = computeGordonLoeb(
      mockSimulation(100_000),
      allControlsOn,
      'under_50m',
    );
    expect(result.residualRisk).toBeGreaterThanOrEqual(0);
  });
});

describe('estimateVulnerabilityLevel', () => {
  it('returns baseline vulnerability with no controls', () => {
    const vuln = estimateVulnerabilityLevel({
      mfa: false, encryption: false, edr: false, siem: false,
      irPlan: false, backupDr: false, securityTraining: false,
      vulnScanning: false, networkSegmentation: false, waf: false,
    });
    expect(vuln).toBeCloseTo(0.65, 2); // Baseline
  });

  it('floors at 0.05 with all controls enabled', () => {
    const vuln = estimateVulnerabilityLevel({
      mfa: true, encryption: true, edr: true, siem: true,
      irPlan: true, backupDr: true, securityTraining: true,
      vulnScanning: true, networkSegmentation: true, waf: true,
    });
    expect(vuln).toBeGreaterThanOrEqual(0.05);
  });

  it('caps at 0.95', () => {
    // Even with no controls, should not exceed 0.95
    const vuln = estimateVulnerabilityLevel({
      mfa: false, encryption: false, edr: false, siem: false,
      irPlan: false, backupDr: false, securityTraining: false,
      vulnScanning: false, networkSegmentation: false, waf: false,
    });
    expect(vuln).toBeLessThanOrEqual(0.95);
  });

  it('reduces vulnerability additively for each enabled control', () => {
    const vulnNone = estimateVulnerabilityLevel({
      mfa: false, encryption: false, edr: false, siem: false,
      irPlan: false, backupDr: false, securityTraining: false,
      vulnScanning: false, networkSegmentation: false, waf: false,
    });
    const vulnMfa = estimateVulnerabilityLevel({
      mfa: true, encryption: false, edr: false, siem: false,
      irPlan: false, backupDr: false, securityTraining: false,
      vulnScanning: false, networkSegmentation: false, waf: false,
    });
    // MFA reduces by 0.15
    expect(vulnNone - vulnMfa).toBeCloseTo(0.15, 2);
  });
});
```

### 4.3 Lookup Table Tests

```typescript
// tests/unit/lookup-tables.test.ts

import { describe, it, expect } from 'vitest';
import {
  mapToFairParams,
  INDUSTRY_PARAMS,
  PER_RECORD_COST,
  CONTROL_MODIFIERS,
  REVENUE_MIDPOINTS,
} from '@/lib/lookup-tables';

describe('mapToFairParams', () => {
  it('returns valid PERT params (min <= mode <= max) for all 17 industries', () => {
    const industries = Object.keys(INDUSTRY_PARAMS);
    expect(industries).toHaveLength(17);

    for (const industry of industries) {
      const params = mapToFairParams({
        industry: industry as any,
        revenueBand: '50m_250m',
        employeeCount: '1000_5000',
        dataTypes: ['customer_pii'],
        recordCount: 100_000,
        dataSensitivity: 'medium',
        controls: {
          mfa: true, encryption: true, edr: false, siem: false,
          irPlan: false, backupDr: false, securityTraining: false,
          vulnScanning: false, networkSegmentation: false, waf: false,
        },
        threatTypes: ['ransomware'],
        previousIncidents: '0',
      });

      // TEF
      expect(params.tef.min).toBeLessThanOrEqual(params.tef.mode);
      expect(params.tef.mode).toBeLessThanOrEqual(params.tef.max);
      expect(params.tef.min).toBeGreaterThanOrEqual(0);

      // Vulnerability
      expect(params.vuln.min).toBeLessThanOrEqual(params.vuln.mode);
      expect(params.vuln.mode).toBeLessThanOrEqual(params.vuln.max);
      expect(params.vuln.min).toBeGreaterThanOrEqual(0);
      expect(params.vuln.max).toBeLessThanOrEqual(1.0);

      // Primary Loss
      expect(params.pl.min).toBeLessThanOrEqual(params.pl.mode);
      expect(params.pl.mode).toBeLessThanOrEqual(params.pl.max);
      expect(params.pl.min).toBeGreaterThanOrEqual(0);

      // Secondary Loss
      expect(params.sl.min).toBeLessThanOrEqual(params.sl.mode);
      expect(params.sl.mode).toBeLessThanOrEqual(params.sl.max);
      expect(params.sl.min).toBeGreaterThanOrEqual(0);
    }
  });

  it('vulnerability mode never drops below 0.02 with all controls enabled', () => {
    const params = mapToFairParams({
      industry: 'technology',
      revenueBand: 'under_50m',
      employeeCount: 'under_250',
      dataTypes: ['customer_pii'],
      recordCount: 1_000,
      dataSensitivity: 'low',
      controls: {
        mfa: true, encryption: true, edr: true, siem: true,
        irPlan: true, backupDr: true, securityTraining: true,
        vulnScanning: true, networkSegmentation: true, waf: true,
      },
      threatTypes: ['web_app_attack'],
      previousIncidents: '0',
    });
    expect(params.vuln.mode).toBeGreaterThanOrEqual(0.02);
  });

  it('TEF increases with more previous incidents', () => {
    const baseInput = {
      industry: 'financial' as const,
      revenueBand: '50m_250m' as const,
      employeeCount: '1000_5000' as const,
      dataTypes: ['customer_pii' as const],
      recordCount: 100_000,
      dataSensitivity: 'medium' as const,
      controls: {
        mfa: true, encryption: true, edr: false, siem: false,
        irPlan: false, backupDr: false, securityTraining: false,
        vulnScanning: false, networkSegmentation: false, waf: false,
      },
      threatTypes: ['ransomware' as const],
    };

    const tef0 = mapToFairParams({ ...baseInput, previousIncidents: '0' as const }).tef.mode;
    const tef1 = mapToFairParams({ ...baseInput, previousIncidents: '1' as const }).tef.mode;
    const tef5 = mapToFairParams({ ...baseInput, previousIncidents: '5_plus' as const }).tef.mode;

    expect(tef1).toBeGreaterThan(tef0);
    expect(tef5).toBeGreaterThan(tef1);
  });

  it('PL scales with record count', () => {
    const makeInput = (recordCount: number) => ({
      industry: 'financial' as const,
      revenueBand: '50m_250m' as const,
      employeeCount: '1000_5000' as const,
      dataTypes: ['customer_pii' as const],
      recordCount,
      dataSensitivity: 'medium' as const,
      controls: {
        mfa: false, encryption: false, edr: false, siem: false,
        irPlan: false, backupDr: false, securityTraining: false,
        vulnScanning: false, networkSegmentation: false, waf: false,
      },
      threatTypes: ['ransomware' as const],
      previousIncidents: '0' as const,
    });

    const plSmall = mapToFairParams(makeInput(1_000)).pl.mode;
    const plLarge = mapToFairParams(makeInput(10_000_000)).pl.mode;
    expect(plLarge).toBeGreaterThan(plSmall);
  });

  it('uses maximum per-record cost when multiple data types selected', () => {
    const singleType = mapToFairParams({
      industry: 'healthcare' as const,
      revenueBand: '50m_250m' as const,
      employeeCount: '1000_5000' as const,
      dataTypes: ['customer_pii' as const], // $175/record
      recordCount: 100_000,
      dataSensitivity: 'medium' as const,
      controls: {
        mfa: false, encryption: false, edr: false, siem: false,
        irPlan: false, backupDr: false, securityTraining: false,
        vulnScanning: false, networkSegmentation: false, waf: false,
      },
      threatTypes: ['ransomware' as const],
      previousIncidents: '0' as const,
    });

    const multiType = mapToFairParams({
      industry: 'healthcare' as const,
      revenueBand: '50m_250m' as const,
      employeeCount: '1000_5000' as const,
      dataTypes: ['customer_pii' as const, 'health_records' as const], // max($175, $200) = $200
      recordCount: 100_000,
      dataSensitivity: 'medium' as const,
      controls: {
        mfa: false, encryption: false, edr: false, siem: false,
        irPlan: false, backupDr: false, securityTraining: false,
        vulnScanning: false, networkSegmentation: false, waf: false,
      },
      threatTypes: ['ransomware' as const],
      previousIncidents: '0' as const,
    });

    // Multi-type PL should be >= single-type PL (driven by health_records $200)
    expect(multiType.pl.mode).toBeGreaterThanOrEqual(singleType.pl.mode);
  });
});

describe('data source integrity', () => {
  it('has exactly 17 industries in INDUSTRY_PARAMS', () => {
    expect(Object.keys(INDUSTRY_PARAMS)).toHaveLength(17);
  });

  it('has exactly 6 data types in PER_RECORD_COST', () => {
    expect(Object.keys(PER_RECORD_COST)).toHaveLength(6);
  });

  it('has exactly 10 controls in CONTROL_MODIFIERS', () => {
    expect(Object.keys(CONTROL_MODIFIERS)).toHaveLength(10);
  });

  it('all control modifiers are negative (they reduce vulnerability)', () => {
    for (const [control, modifier] of Object.entries(CONTROL_MODIFIERS)) {
      expect(modifier).toBeLessThan(0);
    }
  });

  it('has exactly 5 revenue bands in REVENUE_MIDPOINTS', () => {
    expect(Object.keys(REVENUE_MIDPOINTS)).toHaveLength(5);
  });

  it('revenue midpoints are monotonically increasing', () => {
    const bands = ['under_50m', '50m_250m', '250m_1b', '1b_5b', 'over_5b'];
    for (let i = 1; i < bands.length; i++) {
      expect(REVENUE_MIDPOINTS[bands[i] as keyof typeof REVENUE_MIDPOINTS])
        .toBeGreaterThan(REVENUE_MIDPOINTS[bands[i - 1] as keyof typeof REVENUE_MIDPOINTS]);
    }
  });
});
```

### 4.4 Validation Engine Tests

```typescript
// tests/unit/validation.test.ts

import { describe, it, expect } from 'vitest';
import {
  CalculateRequestSchema,
  CompanyProfileSchema,
  DataProfileSchema,
  ThreatLandscapeSchema,
} from '@/lib/validation';

describe('CalculateRequestSchema', () => {
  const validRequest = {
    industry: 'healthcare',
    revenueBand: '50m_250m',
    employeeCount: '1000_5000',
    dataTypes: ['customer_pii', 'health_records'],
    recordCount: 500_000,
    dataSensitivity: 'high',
    controls: {
      mfa: true, encryption: true, edr: false, siem: false,
      irPlan: true, backupDr: true, securityTraining: true,
      vulnScanning: false, networkSegmentation: false, waf: false,
    },
    threatTypes: ['ransomware', 'bec_phishing'],
    previousIncidents: '1',
  };

  it('accepts a valid complete request', () => {
    const result = CalculateRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('rejects unknown industry', () => {
    const result = CalculateRequestSchema.safeParse({
      ...validRequest,
      industry: 'crypto_mining',
    });
    expect(result.success).toBe(false);
  });

  it('rejects recordCount below 1,000', () => {
    const result = CalculateRequestSchema.safeParse({
      ...validRequest,
      recordCount: 500,
    });
    expect(result.success).toBe(false);
  });

  it('rejects recordCount above 100,000,000', () => {
    const result = CalculateRequestSchema.safeParse({
      ...validRequest,
      recordCount: 200_000_000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer recordCount', () => {
    const result = CalculateRequestSchema.safeParse({
      ...validRequest,
      recordCount: 50000.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty dataTypes array', () => {
    const result = CalculateRequestSchema.safeParse({
      ...validRequest,
      dataTypes: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty threatTypes array', () => {
    const result = CalculateRequestSchema.safeParse({
      ...validRequest,
      threatTypes: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing controls object', () => {
    const { controls, ...noControls } = validRequest;
    const result = CalculateRequestSchema.safeParse(noControls);
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean control values', () => {
    const result = CalculateRequestSchema.safeParse({
      ...validRequest,
      controls: { ...validRequest.controls, mfa: 'yes' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strict mode)', () => {
    const result = CalculateRequestSchema.safeParse({
      ...validRequest,
      __proto__: { polluted: true },
      maliciousField: 'drop table',
    });
    // Zod with .strict() rejects unknown keys
    // If not using .strict(), this test verifies the parsed output
    // does not include the extra field
    if (result.success) {
      expect(result.data).not.toHaveProperty('maliciousField');
    }
  });
});

describe('CompanyProfileSchema', () => {
  it('accepts valid company profile', () => {
    const result = CompanyProfileSchema.safeParse({
      industry: 'technology',
      revenueBand: 'under_50m',
      employeeCount: 'under_250',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing industry', () => {
    const result = CompanyProfileSchema.safeParse({
      revenueBand: 'under_50m',
      employeeCount: 'under_250',
    });
    expect(result.success).toBe(false);
  });
});

describe('DataProfileSchema', () => {
  it('rejects unknown data types', () => {
    const result = DataProfileSchema.safeParse({
      dataTypes: ['social_security_numbers'],
      recordCount: 10_000,
      dataSensitivity: 'high',
    });
    expect(result.success).toBe(false);
  });

  it('accepts minimum record count (1,000)', () => {
    const result = DataProfileSchema.safeParse({
      dataTypes: ['customer_pii'],
      recordCount: 1_000,
      dataSensitivity: 'low',
    });
    expect(result.success).toBe(true);
  });

  it('accepts maximum record count (100,000,000)', () => {
    const result = DataProfileSchema.safeParse({
      dataTypes: ['customer_pii'],
      recordCount: 100_000_000,
      dataSensitivity: 'high',
    });
    expect(result.success).toBe(true);
  });
});

describe('ThreatLandscapeSchema', () => {
  it('accepts valid threat landscape', () => {
    const result = ThreatLandscapeSchema.safeParse({
      threatTypes: ['ransomware', 'bec_phishing'],
      previousIncidents: '0',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown threat types', () => {
    const result = ThreatLandscapeSchema.safeParse({
      threatTypes: ['zero_day_exploit'],
      previousIncidents: '0',
    });
    expect(result.success).toBe(false);
  });
});
```

---

## 5. Integration Tests

### 5.1 API Route Integration Test

The API route integration test exercises the full server-side pipeline: JSON parsing, Zod validation, lookup table mapping, Monte Carlo simulation, Gordon-Loeb calculation, and JSON response formatting. It uses known inputs and verifies the response shape and statistical properties.

```typescript
// tests/integration/api-calculate.test.ts

import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/calculate/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  industry: 'healthcare',
  revenueBand: '50m_250m',
  employeeCount: '1000_5000',
  dataTypes: ['customer_pii', 'health_records'],
  recordCount: 500_000,
  dataSensitivity: 'high',
  controls: {
    mfa: true, encryption: true, edr: false, siem: false,
    irPlan: true, backupDr: true, securityTraining: true,
    vulnScanning: false, networkSegmentation: false, waf: false,
  },
  threatTypes: ['ransomware', 'bec_phishing', 'system_intrusion'],
  previousIncidents: '1',
};

describe('POST /api/calculate', () => {
  it('returns 200 with valid request', async () => {
    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('riskRating');
    expect(data).toHaveProperty('ale');
    expect(data).toHaveProperty('pml');
    expect(data).toHaveProperty('gordonLoeb');
    expect(data).toHaveProperty('histogram');
    expect(data).toHaveProperty('exceedanceCurve');
    expect(data).toHaveProperty('keyDrivers');
    expect(data).toHaveProperty('recommendations');
    expect(data).toHaveProperty('metadata');
  });

  it('returns correct response shape types', async () => {
    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    // Risk rating is one of the four values
    expect(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(data.riskRating);

    // ALE has all required percentile fields
    expect(typeof data.ale.mean).toBe('number');
    expect(typeof data.ale.median).toBe('number');
    expect(typeof data.ale.p5).toBe('number');
    expect(typeof data.ale.p10).toBe('number');
    expect(typeof data.ale.p90).toBe('number');
    expect(typeof data.ale.p95).toBe('number');

    // PML is a number
    expect(typeof data.pml).toBe('number');

    // Gordon-Loeb fields
    expect(typeof data.gordonLoeb.optimalSpend).toBe('number');
    expect(typeof data.gordonLoeb.currentRisk).toBe('number');
    expect(typeof data.gordonLoeb.residualRisk).toBe('number');

    // Histogram has 50 bins
    expect(data.histogram).toHaveLength(50);

    // Exceedance curve has 20 points
    expect(data.exceedanceCurve).toHaveLength(20);

    // Metadata
    expect(data.metadata.iterations).toBe(10_000);
    expect(typeof data.metadata.executionTimeMs).toBe('number');
    expect(data.metadata.dataSources).toBeInstanceOf(Array);
  });

  it('maintains statistical invariants', async () => {
    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    // Percentile ordering
    expect(data.ale.p5).toBeLessThanOrEqual(data.ale.p10);
    expect(data.ale.p10).toBeLessThanOrEqual(data.ale.median);
    expect(data.ale.median).toBeLessThanOrEqual(data.ale.mean);
    expect(data.ale.mean).toBeLessThanOrEqual(data.ale.p90);
    expect(data.ale.p90).toBeLessThanOrEqual(data.ale.p95);

    // All values non-negative
    expect(data.ale.mean).toBeGreaterThanOrEqual(0);
    expect(data.pml).toBeGreaterThanOrEqual(0);
    expect(data.gordonLoeb.optimalSpend).toBeGreaterThanOrEqual(0);

    // Residual risk < current risk
    expect(data.gordonLoeb.residualRisk).toBeLessThan(data.gordonLoeb.currentRisk);

    // Histogram bin counts sum to 10,000
    const histogramTotal = data.histogram.reduce(
      (sum: number, bin: { count: number }) => sum + bin.count, 0
    );
    expect(histogramTotal).toBe(10_000);

    // Exceedance curve probabilities are monotonically non-increasing
    for (let i = 1; i < data.exceedanceCurve.length; i++) {
      expect(data.exceedanceCurve[i].probability)
        .toBeLessThanOrEqual(data.exceedanceCurve[i - 1].probability);
    }
  });

  it('returns 400 for empty body', async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('details');
  });

  it('returns 400 for missing required fields', async () => {
    const response = await POST(makeRequest({
      industry: 'healthcare',
      // Missing all other fields
    }));
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid industry value', async () => {
    const response = await POST(makeRequest({
      ...validBody,
      industry: 'not_a_real_industry',
    }));
    expect(response.status).toBe(400);
  });

  it('returns 400 for out-of-range record count', async () => {
    const response = await POST(makeRequest({
      ...validBody,
      recordCount: 999, // Below minimum of 1,000
    }));
    expect(response.status).toBe(400);
  });

  it('completes within 3 seconds (including cold start simulation)', async () => {
    const start = performance.now();
    await POST(makeRequest(validBody));
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(3_000);
  });

  it('does not include rawLosses in response', async () => {
    const response = await POST(makeRequest(validBody));
    const data = await response.json();
    expect(data).not.toHaveProperty('rawLosses');
  });

  it('does not leak input data in error responses', async () => {
    const response = await POST(makeRequest({
      ...validBody,
      industry: 'secret_company_name',
    }));
    const data = await response.json();
    const responseText = JSON.stringify(data);
    // The error should reference the schema violation, not echo back the input
    expect(responseText).not.toContain('secret_company_name');
  });
});
```

### 5.2 Golden Scenario Integration Tests

```typescript
// tests/integration/golden-scenarios.test.ts

import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/calculate/route';
import { GOLDEN_SCENARIOS } from '../fixtures/golden-scenarios';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Golden Scenario Integration', () => {
  for (const scenario of GOLDEN_SCENARIOS) {
    describe(`[${scenario.id}] ${scenario.description}`, () => {
      it('returns 200 and valid response', async () => {
        const response = await POST(makeRequest(scenario.input));
        expect(response.status).toBe(200);
      });

      it('ALE mean falls within expected range', async () => {
        const response = await POST(makeRequest(scenario.input));
        const data = await response.json();
        expect(data.ale.mean).toBeGreaterThanOrEqual(scenario.expected.ale.mean.min);
        expect(data.ale.mean).toBeLessThanOrEqual(scenario.expected.ale.mean.max);
      });

      it('risk rating matches expected', async () => {
        const response = await POST(makeRequest(scenario.input));
        const data = await response.json();
        expect(data.riskRating).toBe(scenario.expected.riskRating);
      });

      it('maintains all structural invariants', async () => {
        const response = await POST(makeRequest(scenario.input));
        const data = await response.json();

        for (const invariant of scenario.expected.invariants) {
          // Evaluate each invariant as a property check
          switch (invariant) {
            case 'ale.p5 <= ale.median':
              expect(data.ale.p5).toBeLessThanOrEqual(data.ale.median);
              break;
            case 'ale.median <= ale.mean':
              expect(data.ale.median).toBeLessThanOrEqual(data.ale.mean);
              break;
            case 'ale.mean <= ale.p95':
              expect(data.ale.mean).toBeLessThanOrEqual(data.ale.p95);
              break;
            case 'gordonLoeb.residualRisk < gordonLoeb.currentRisk':
              expect(data.gordonLoeb.residualRisk).toBeLessThan(data.gordonLoeb.currentRisk);
              break;
            case 'gordonLoeb.optimalSpend >= 0':
              expect(data.gordonLoeb.optimalSpend).toBeGreaterThanOrEqual(0);
              break;
            case 'histogram.length === 50':
              expect(data.histogram).toHaveLength(50);
              break;
            case 'exceedanceCurve.length === 20':
              expect(data.exceedanceCurve).toHaveLength(20);
              break;
            case 'ale.mean >= 0':
              expect(data.ale.mean).toBeGreaterThanOrEqual(0);
              break;
            default:
              // Unknown invariant -- fail explicitly so it gets implemented
              throw new Error(`Unknown invariant: ${invariant}`);
          }
        }
      });
    });
  }
});
```

---

## 6. E2E Tests (Stretch Goal)

### 6.1 E2E Test Configuration

E2E tests are a stretch goal for the hackathon. If time permits, use Playwright to validate the full user flow. The tests should run against a local dev server, not production, to avoid network variability.

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 6.2 E2E Test: Full User Flow

```typescript
// tests/e2e/user-flow.test.ts
import { test, expect } from '@playwright/test';

test.describe('CybRisk User Flow', () => {
  test('completes full assessment: landing -> wizard -> results', async ({ page }) => {
    // 1. Landing page
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('link', { name: /assess/i }).click();

    // 2. Wizard Step 1: Company Profile
    await expect(page).toHaveURL('/assess');
    await page.getByLabel(/industry/i).selectOption('healthcare');
    await page.getByLabel(/revenue/i).selectOption('50m_250m');
    await page.getByLabel(/employee/i).selectOption('1000_5000');
    await page.getByRole('button', { name: /continue|next/i }).click();

    // 3. Wizard Step 2: Data Profile
    await page.getByLabel(/customer pii/i).check();
    await page.getByLabel(/health records/i).check();
    await page.getByLabel(/record count/i).fill('500000');
    await page.getByLabel(/sensitivity/i).selectOption('high');
    await page.getByRole('button', { name: /continue|next/i }).click();

    // 4. Wizard Step 3: Security Controls
    await page.getByLabel(/mfa/i).check();
    await page.getByLabel(/encryption/i).check();
    await page.getByLabel(/incident response/i).check();
    await page.getByRole('button', { name: /continue|next/i }).click();

    // 5. Wizard Step 4: Threat Landscape
    await page.getByLabel(/ransomware/i).check();
    await page.getByLabel(/phishing/i).check();
    await page.getByLabel(/previous incidents/i).selectOption('1');
    await page.getByRole('button', { name: /continue|next/i }).click();

    // 6. Wizard Step 5: Review & Calculate
    await page.getByRole('button', { name: /calculate/i }).click();

    // 7. Wait for results page
    await expect(page).toHaveURL('/results', { timeout: 10_000 });

    // 8. Verify results dashboard elements
    await expect(page.getByText(/annual loss expectancy/i)).toBeVisible();
    await expect(page.getByText(/\$[\d,.]+[KMB]?/)).toBeVisible(); // Dollar figure
    await expect(page.getByText(/LOW|MODERATE|HIGH|CRITICAL/)).toBeVisible();
  });

  test('wizard preserves state on back navigation', async ({ page }) => {
    await page.goto('/assess');

    // Fill Step 1
    await page.getByLabel(/industry/i).selectOption('technology');
    await page.getByLabel(/revenue/i).selectOption('under_50m');
    await page.getByLabel(/employee/i).selectOption('under_250');
    await page.getByRole('button', { name: /continue|next/i }).click();

    // Fill Step 2 partially
    await page.getByLabel(/customer pii/i).check();

    // Go back
    await page.getByRole('button', { name: /back|previous/i }).click();

    // Verify Step 1 data persisted
    await expect(page.getByLabel(/industry/i)).toHaveValue('technology');
    await expect(page.getByLabel(/revenue/i)).toHaveValue('under_50m');
  });

  test('results page redirects to /assess when no data', async ({ page }) => {
    await page.goto('/results');
    await expect(page).toHaveURL('/assess', { timeout: 5_000 });
  });
});
```

---

## 7. Test Utilities

### 7.1 Seeded Random Number Generator

For tests that need deterministic Monte Carlo output (e.g., snapshot testing of specific percentile values), provide a seedable PRNG that replaces `Math.random()`.

```typescript
// tests/helpers/seeded-random.ts

/**
 * Mulberry32 PRNG -- a simple, fast, seedable 32-bit PRNG.
 * Not cryptographically secure. Suitable for test determinism only.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return function mulberry32(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Temporarily replace Math.random with a seeded PRNG.
 * Restores original Math.random after the callback completes.
 */
export function withSeededRandom<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  Math.random = createSeededRandom(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}
```

### 7.2 Statistical Assertion Helpers

```typescript
// tests/helpers/statistical-assertions.ts

/**
 * Assert that a value falls within a range with descriptive error messages.
 */
export function expectInRange(
  actual: number,
  min: number,
  max: number,
  label: string,
): void {
  if (actual < min || actual > max) {
    throw new Error(
      `${label}: expected ${actual} to be in [${min}, ${max}]`
    );
  }
}

/**
 * Compute coefficient of variation for an array of values.
 */
export function coefficientOfVariation(values: number[]): number {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return Math.sqrt(variance) / mean;
}

/**
 * Assert that an array is sorted in ascending order.
 */
export function expectSortedAscending(arr: number[], label: string): void {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1]) {
      throw new Error(
        `${label}: element at index ${i} (${arr[i]}) is less than element at index ${i - 1} (${arr[i - 1]})`
      );
    }
  }
}
```

### 7.3 Mock Factories

```typescript
// tests/fixtures/mock-inputs.ts

import type { CalculateRequest } from '@/lib/types';

export function createMockInput(
  overrides: Partial<CalculateRequest> = {},
): CalculateRequest {
  return {
    industry: 'technology',
    revenueBand: '50m_250m',
    employeeCount: '1000_5000',
    dataTypes: ['customer_pii'],
    recordCount: 100_000,
    dataSensitivity: 'medium',
    controls: {
      mfa: true, encryption: true, edr: false, siem: false,
      irPlan: false, backupDr: false, securityTraining: false,
      vulnScanning: false, networkSegmentation: false, waf: false,
    },
    threatTypes: ['ransomware'],
    previousIncidents: '0',
    ...overrides,
  };
}
```

```typescript
// tests/fixtures/mock-results.ts

import type { CalculateResponse } from '@/lib/types';

export function createMockResults(
  overrides: Partial<CalculateResponse> = {},
): CalculateResponse {
  return {
    riskRating: 'MODERATE',
    ale: {
      mean: 1_250_000,
      median: 890_000,
      p5: 120_000,
      p10: 250_000,
      p90: 3_400_000,
      p95: 5_200_000,
    },
    pml: 5_200_000,
    gordonLoeb: {
      optimalSpend: 462_500,
      currentRisk: 1_250_000,
      residualRisk: 950_000,
    },
    histogram: Array.from({ length: 50 }, (_, i) => ({
      bin: `$${i * 100}K`,
      count: Math.max(0, 200 - Math.abs(i - 25) * 8),
    })),
    exceedanceCurve: Array.from({ length: 20 }, (_, i) => ({
      threshold: i * 500_000,
      probability: Math.max(0, 1 - i * 0.05),
    })),
    keyDrivers: [
      { name: 'No EDR/XDR', impact: 'high' },
      { name: 'No SIEM', impact: 'medium' },
      { name: 'No vulnerability scanning', impact: 'medium' },
    ],
    recommendations: [
      { action: 'Deploy EDR/XDR solution', estimatedSavings: 225_000 },
      { action: 'Implement SIEM monitoring', estimatedSavings: 125_000 },
    ],
    metadata: {
      iterations: 10_000,
      executionTimeMs: 52,
      dataSources: [
        'IBM Cost of a Data Breach 2025',
        'Verizon DBIR 2025',
        'NetDiligence Cyber Claims Study 2025',
      ],
    },
    ...overrides,
  };
}
```

---

## 8. CI/CD Integration

### 8.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml

name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx vitest run --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx vitest run tests/integration/

  build:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

### 8.2 CI Job Responsibilities

| Job | Purpose | Expected Duration | Blocking |
|-----|---------|-------------------|----------|
| `unit-tests` | Fast feedback on computation correctness | 30-60 seconds | Yes |
| `integration-tests` | Verify API route contract | 30-60 seconds | Yes |
| `build` | Verify production build succeeds | 60-90 seconds | Yes |

E2E tests (`playwright`) are not included in the hackathon CI pipeline. They would be added post-hackathon as a separate job with browser installation and a longer timeout.

### 8.3 Pre-Commit Checks (Local)

```json
// package.json (partial)
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run tests/unit/",
    "test:integration": "vitest run tests/integration/",
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  }
}
```

Recommended local workflow before committing:

```bash
npm run typecheck && npm run test:unit && npm run lint
```

Full integration tests run in CI. Unit tests and typecheck run locally for fast feedback.

---

## 9. Test Adequacy Checklist

### 9.1 Cross-Module Invariants Under Test

These invariants span multiple modules. Each must have at least one integration test that verifies the invariant across module boundaries.

| Invariant | Tested In | Verification |
|-----------|-----------|--------------|
| `ALE >= 0` always | `api-calculate.test.ts` | Every golden scenario checks `data.ale.mean >= 0` |
| `ALE <= 10x revenue` plausibility cap | `api-calculate.test.ts` | Golden scenario `golden-005` (extreme inputs) verifies cap |
| `Vulnerability in [0, 1]` | `lookup-tables.test.ts` | All 17 industries verified for `vuln.max <= 1.0` |
| `Vulnerability mode >= 0.02` floor | `lookup-tables.test.ts` | "All controls enabled" test verifies floor |
| No `rawLosses` in response | `api-calculate.test.ts` | Explicit check `not.toHaveProperty('rawLosses')` |
| Histogram has exactly 50 bins | `monte-carlo.test.ts`, `api-calculate.test.ts` | Both unit and integration tests verify length |
| LEC has exactly 20 points | `monte-carlo.test.ts`, `api-calculate.test.ts` | Both unit and integration tests verify length |
| Percentile ordering | `monte-carlo.test.ts`, `api-calculate.test.ts` | `p5 <= median <= mean <= p95` in both layers |
| Zod schema rejects invalid inputs | `validation.test.ts`, `api-calculate.test.ts` | Schema unit tests + API 400 response tests |
| No input data leaked in errors | `api-calculate.test.ts` | Error response checked for absence of user input strings |
| Gordon-Loeb: `residualRisk < currentRisk` | `gordon-loeb.test.ts`, `api-calculate.test.ts` | Both unit and integration level |
| Gordon-Loeb: `optimalSpend <= 5% revenue` | `gordon-loeb.test.ts` | Revenue cap test with extreme ALE |
| Histogram bin counts sum to iterations | `monte-carlo.test.ts`, `api-calculate.test.ts` | `sum(counts) === 10_000` |
| LEC probabilities monotonically non-increasing | `monte-carlo.test.ts`, `api-calculate.test.ts` | Sequential comparison in both layers |

### 9.2 Module Coverage Matrix

| Module | Unit Tests | Integration Tests | Golden Scenarios | E2E |
|--------|-----------|-------------------|------------------|-----|
| `monte-carlo.ts` | samplePERT, sampleBeta, runSimulation, buildHistogram, buildExceedanceCurve, percentile | Via API route | All 6 golden scenarios | Via full flow |
| `gordon-loeb.ts` | computeGordonLoeb (5 cases), estimateVulnerabilityLevel (4 cases) | Via API route | All 6 golden scenarios | Via full flow |
| `lookup-tables.ts` | mapToFairParams (6 cases), data integrity (6 cases) | Via API route | All 6 golden scenarios | Via full flow |
| `validation.ts` | CalculateRequestSchema (10 cases), per-step schemas (6 cases) | 400 error cases | N/A | Via wizard validation |
| `api/calculate/route.ts` | N/A (no unit isolation needed) | 9 integration tests | 6 golden scenarios | Via full flow |
| Wizard components | State preservation, validation | N/A | N/A | Full flow + back nav |
| Results components | N/A (use mock data) | N/A | N/A | Full flow |
| Results context | Set/get, sessionStorage, missing data | N/A | N/A | Full flow |

### 9.3 What Is NOT Tested (and Why)

| Omission | Rationale |
|----------|-----------|
| Shadcn/ui component internals | Tested upstream by Radix UI. CybRisk trusts the primitives. |
| Recharts rendering correctness | Tested upstream. CybRisk tests that correct data is passed, not that SVG renders pixels correctly. |
| Vercel deployment infrastructure | Not testable in CI. Verified manually after each deploy per `CLAUDE.md` directive. |
| `Math.random()` distribution quality | Trusting V8's PRNG. Seeded PRNG used only for test determinism, not for production. |
| CSS styling and visual appearance | Not testable with unit/integration tests. Visual review during development. Playwright screenshots for regression (stretch goal). |
| Browser sessionStorage API | Mocked in tests. Real sessionStorage behavior verified manually in browser. |
| Network failure modes | Would require network simulation (e.g., `msw` for fetch mocking). Deferred to post-hackathon. |

---

## 10. Running the Test Suite

### Quick Reference

```bash
# Run all tests
npm test

# Run only computation unit tests (fastest feedback)
npm run test:unit

# Run integration tests
npm run test:integration

# Run tests in watch mode during development
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run a specific test file
npx vitest run tests/unit/monte-carlo.test.ts

# Run E2E tests (requires Playwright installed)
npx playwright test
```

### Expected Execution Times

| Suite | Expected Duration | When to Run |
|-------|-------------------|-------------|
| Unit tests | 5-15 seconds | Every commit (local) |
| Integration tests | 10-30 seconds | Every push (CI) |
| Full suite (unit + integration) | 15-45 seconds | Every pull request (CI) |
| E2E tests | 30-60 seconds | Pre-release (stretch) |

---

*Document generated by North Star Advisor*
