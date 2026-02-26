# CybRisk: Resilience Patterns

> **Parent**: [ARCHITECTURE_BLUEPRINT.md](../ARCHITECTURE_BLUEPRINT.md)
> **Created**: 2026-02-22
> **Status**: Active

Computation safety, input validation, fallback chains, timeout handling, and graceful degradation patterns for a stateless Monte Carlo calculator with zero external dependencies.

---

## Design Context: Resilience in a Stateless Calculator

CybRisk has no database connections, no external API calls, no message queues, and no inter-service communication. The traditional resilience patterns -- circuit breakers, distributed retries, idempotency stores -- do not apply. There is nothing to circuit-break. There is nothing to retry against. There is no state to make idempotent.

CybRisk's failure modes are different:

| Failure Mode | Root Cause | Probability |
|-------------|------------|-------------|
| NaN/Infinity in loss calculations | Degenerate PERT parameters, division by zero in binning | Medium |
| Floating-point accumulation error | Sum-then-divide on 10K large values | Low |
| Vercel cold start timeout | First request after idle period spins up serverless function | Medium |
| Malformed user input bypasses client validation | Direct POST to API, browser extensions, disabled JS | Medium |
| sessionStorage empty on direct /results navigation | Bookmarked URL, shared link, page refresh race | High |
| Histogram/LEC computation on degenerate distribution | All losses identical, min == max | Low |
| Browser memory pressure from chart rendering | Edge case: 50 histogram bins with extreme value ranges | Very Low |

Resilience in CybRisk means: every computation produces a finite, non-negative, plausible number -- or fails explicitly with a recoverable error. There are no silent corruptions. There are no hanging requests. There are no mystery NaN values propagating through the results dashboard.

---

## 1. Computation Safety Patterns

> CybRisk's "circuit breakers" are mathematical guards. Instead of protecting against network failures, they protect against numerical failures.

### 1.1 PERT Distribution Guards

The PERT distribution is the foundation of every Monte Carlo sample. It is parameterized by `(min, mode, max)` with a shape parameter `lambda = 4`. Several input combinations produce degenerate or invalid distributions that must be handled before sampling begins.

```typescript
// src/lib/monte-carlo.ts

function samplePERT(min: number, mode: number, max: number, lambda = 4): number {
  // Guard 1: Zero range (point value)
  // When min == mode == max, the distribution collapses to a constant.
  // No sampling needed. Return the value directly.
  const range = max - min;
  if (range <= 0) return min;

  // Guard 2: Mode outside bounds (inverted or shifted parameters)
  // Lookup table rounding or control modifier stacking can push mode
  // outside [min, max]. Clamp before computing alpha/beta.
  const clampedMode = Math.max(min, Math.min(max, mode));

  // Guard 3: Alpha/Beta computation
  // alpha = 1 + lambda * (mode - min) / range
  // beta  = 1 + lambda * (max - mode) / range
  // When mode == min: alpha = 1 (exponential-like, right-skewed)
  // When mode == max: beta = 1 (exponential-like, left-skewed)
  // Both are valid PERT distributions. Joehnk handles alpha=1 or beta=1.
  const alpha = 1 + lambda * (clampedMode - min) / range;
  const beta = 1 + lambda * (max - clampedMode) / range;

  // Guard 4: Beta sample validity
  // Joehnk rejection sampler can theoretically loop indefinitely for
  // extreme alpha/beta ratios. Cap iterations to prevent hanging.
  const betaSample = sampleBetaSafe(alpha, beta);

  // Guard 5: Final result must be finite
  const result = min + betaSample * range;
  if (!Number.isFinite(result)) return clampedMode; // Fallback to mode
  return result;
}
```

### 1.2 Beta Sampling Safety (Joehnk with Iteration Cap)

The Joehnk algorithm is a rejection sampler. For well-behaved alpha/beta values (2-8, typical for CybRisk), acceptance rate is high (~50-70%). For extreme values (alpha or beta near 1), acceptance rate drops. An iteration cap prevents infinite loops.

```typescript
// src/lib/monte-carlo.ts

const MAX_JOEHNK_ITERATIONS = 1000;

function sampleBetaSafe(alpha: number, beta: number): number {
  // Guard: alpha and beta must be positive
  if (alpha <= 0 || beta <= 0) return 0.5; // Fallback: midpoint

  for (let i = 0; i < MAX_JOEHNK_ITERATIONS; i++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const x = Math.pow(u1, 1 / alpha);
    const y = Math.pow(u2, 1 / beta);
    if (x + y <= 1) {
      return x / (x + y);
    }
  }

  // Fallback: if rejection sampler fails to accept after 1000 tries,
  // return the expected value of Beta(alpha, beta) = alpha / (alpha + beta).
  // This is deterministic but mathematically correct as a point estimate.
  return alpha / (alpha + beta);
}
```

**Why 1000 iterations**: For CybRisk's parameter ranges (alpha between 1 and 9, beta between 1 and 9), the probability of needing more than 100 iterations is effectively zero. 1000 is a generous safety margin. If this fallback triggers, it indicates a bug in the lookup table parameter mapping, not a normal operating condition. The fallback value (expected value of the Beta distribution) ensures the simulation continues with a reasonable number rather than hanging or crashing.

### 1.3 Vulnerability Clamping

Vulnerability is a probability. It must be in [0, 1] after every operation. Two modules independently enforce this:

```
Lookup Table Engine (mapToFairParams):
  Step 6: vuln.mode += sum(control modifiers)   // Can go negative
  Step 7: vuln.mode = clamp(vuln.mode, 0.02, vuln.max)  // Floor at 2%
  Step 8: vuln.min = max(0.01, vuln.mode - 0.15)

Monte Carlo Engine (runSimulation loop):
  vuln_sample = samplePERT(params.vuln)
  vuln_sample = Math.max(0, Math.min(1, vuln_sample))  // Hard [0, 1] clamp
```

**Defense in depth**: The lookup engine enforces bounds on the PERT parameters. The Monte Carlo engine enforces bounds on each individual sample. Even if a future code change breaks the lookup engine's clamping, the MC engine's per-sample clamp catches it. Neither module trusts the other.

### 1.4 Running Mean (Welford's Algorithm)

The standard mean computation `sum / n` risks floating-point overflow when summing large loss values across 10,000 iterations. A healthcare company with 100M records and high severity could produce individual losses in the tens of billions. Summing 10,000 such values approaches `Number.MAX_SAFE_INTEGER`.

```typescript
// src/lib/monte-carlo.ts

function computeMean(losses: number[]): number {
  let mean = 0;
  for (let i = 0; i < losses.length; i++) {
    mean += (losses[i] - mean) / (i + 1);
  }
  return mean;
}
```

**Why this matters**: `Number.MAX_SAFE_INTEGER` is ~9 x 10^15. If average loss per iteration is $10B (extreme but possible for `over_5b` revenue band with 100M records and all controls disabled), the raw sum would be $100T (10^14), which is within safe integer range. Overflow is unlikely in practice with 10K iterations, but Welford's algorithm eliminates the risk at zero performance cost. It is also more numerically stable -- the error bound is O(epsilon) per step instead of O(n * epsilon) for naive summation.

### 1.5 NaN/Infinity Propagation Guard

A single NaN in the loss array propagates through sorting, percentile computation, histogram binning, and the exceedance curve -- corrupting the entire response. Guard at the source:

```typescript
// src/lib/monte-carlo.ts -- inside simulation loop

const loss = lef * (pl + sl);

// Guard: Replace non-finite results with 0 (no loss for this iteration)
// NaN can occur if: tef=0 and vuln=0 producing 0*Infinity
// Infinity can occur if: PERT samples at extreme range with floating-point edge
losses[i] = Number.isFinite(loss) ? loss : 0;
```

**Why replace with 0, not skip**: The loss array must have exactly `iterations` elements. Skipping would produce a shorter array, breaking percentile computation and histogram bin counts. A loss of $0 is a valid outcome (the company was not breached in this simulation iteration) and does not distort the distribution.

### 1.6 Output Plausibility Capping

The API route applies a final sanity check on all output values before building the JSON response. This catches any numerical anomaly that slipped through the computation guards:

```typescript
// src/app/api/calculate/route.ts

function sanitizeOutput(ale: ALEStats, revenueBand: RevenueBand): ALEStats {
  const revenueMidpoint = REVENUE_MIDPOINTS[revenueBand];
  const plausibilityCap = revenueMidpoint * 10;

  return {
    mean:   clampFinite(ale.mean,   0, plausibilityCap),
    median: clampFinite(ale.median, 0, plausibilityCap),
    p5:     clampFinite(ale.p5,     0, plausibilityCap),
    p10:    clampFinite(ale.p10,    0, plausibilityCap),
    p90:    clampFinite(ale.p90,    0, plausibilityCap),
    p95:    clampFinite(ale.p95,    0, plausibilityCap),
  };
}

function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;  // NaN/Infinity -> floor
  return Math.max(min, Math.min(max, value));
}
```

**The 10x revenue cap**: A breach costing more than 10x annual revenue is theoretically possible but practically meaningless for a risk advisory tool. The IBM Cost of a Data Breach 2025 reports the largest observed breach cost as a small fraction of the breached company's revenue. Capping at 10x is generous and prevents implausible numbers from reaching the UI.

---

## 2. Fallback Chains

### 2.1 Fallback Strategy

CybRisk does not call external services, so its fallback chain is about computation resilience, not service redundancy:

```
Level 1 (Primary):   Monte Carlo simulation (10K iterations, full PERT sampling)
                        |
                        v  (if simulation throws or produces all-NaN)
Level 2 (Degraded):  Deterministic point estimate
                     (mean TEF * mean Vuln * mean LM -- no distribution, no percentiles)
                        |
                        v  (if lookup tables produce invalid params)
Level 3 (Cached):    Pre-computed example results for "generic mid-market company"
                     (hardcoded JSON: services industry, $150M revenue, 100K records)
                        |
                        v  (if all server-side computation fails)
Level 4 (Client):    Error state with Retry + Edit Inputs buttons
                     (no results displayed -- user retries or modifies inputs)
```

### 2.2 Per-Module Fallback Configuration

| Module | Primary | Fallback 1 | Fallback 2 | Final |
|--------|---------|------------|------------|-------|
| Monte Carlo Engine | 10K PERT iterations | Point estimate (mode values only) | Return ALE = 0 with warning flag | Throw to API route |
| Lookup Table Engine | Full parameter mapping | Cross-industry average params (IBM 2025 global: $4.88M breach cost) | Hardcoded conservative defaults | Throw to API route |
| Gordon-Loeb Calculator | Full GL model | Simplified: optimalSpend = ALE * 0.37 | optimalSpend = 0 with "unable to compute" note | Return zeroed result |
| Histogram Builder | 50-bin histogram | 10-bin histogram (if 50 bins are too granular for narrow distribution) | Single bar with total count | Return empty array |
| Exceedance Curve Builder | 20-point LEC | 5-point LEC (P5, P25, P50, P75, P95) | Linear interpolation between min and max | Return empty array |

### 2.3 Deterministic Fallback Implementation

When the stochastic simulation fails, compute a single-point deterministic estimate. This produces no distribution, no histogram, and no exceedance curve -- but it produces a dollar figure, which is the minimum viable output.

```typescript
// src/lib/monte-carlo.ts

function deterministicFallback(params: FairParams): SimulationOutput {
  const tef = params.tef.mode;
  const vuln = Math.min(1, Math.max(0, params.vuln.mode));
  const lef = tef * vuln;
  const pl = params.pl.mode;
  const sl = params.sl.mode;
  const pointEstimate = lef * (pl + sl);

  return {
    ale: {
      mean: pointEstimate,
      median: pointEstimate,
      p5: pointEstimate * 0.3,   // Rough lower bound
      p10: pointEstimate * 0.5,
      p90: pointEstimate * 2.0,
      p95: pointEstimate * 3.0,  // Rough upper bound
    },
    histogram: [{ bin: formatDollar(pointEstimate), count: 1 }],
    exceedanceCurve: [
      { threshold: 0, probability: 1.0 },
      { threshold: pointEstimate, probability: 0.5 },
    ],
    rawLosses: [pointEstimate],
  };
}
```

**Why the rough multipliers (0.3x-3.0x)**: Without a full Monte Carlo run, we cannot compute real percentiles. These multipliers approximate a typical right-skewed loss distribution. They are clearly labeled as "estimated" in the results UI if this fallback triggers. The multipliers are deliberately conservative (the 95th percentile at 3x is lower than a typical PERT-based MC would produce) to avoid overstating risk from a degraded calculation.

### 2.4 Cached Example Results

If both the Monte Carlo simulation and deterministic fallback fail (which would require a bug in the PERT parameter mapping or a corrupted lookup table), the API route returns a pre-computed example result set for a "generic mid-market services company":

```typescript
// src/lib/fallback-results.ts

export const CACHED_FALLBACK_RESULTS: CalculateResponse = {
  riskRating: 'MODERATE',
  ale: {
    mean: 2_450_000,
    median: 1_800_000,
    p5: 320_000,
    p10: 580_000,
    p90: 5_200_000,
    p95: 7_800_000,
  },
  pml: 7_800_000,
  gordonLoeb: {
    optimalSpend: 450_000,
    currentRisk: 2_450_000,
    residualRisk: 1_550_000,
  },
  histogram: [], // Omitted -- chart shows "Unable to generate distribution" message
  exceedanceCurve: [],
  keyDrivers: [
    { name: 'Incident Response Plan', impact: 'high' },
    { name: 'Endpoint Detection', impact: 'high' },
    { name: 'Multi-Factor Authentication', impact: 'medium' },
  ],
  recommendations: [
    { action: 'Implement a tested incident response plan', estimatedSavings: 570_000 },
    { action: 'Deploy endpoint detection and response (EDR)', estimatedSavings: 440_000 },
    { action: 'Enable multi-factor authentication', estimatedSavings: 370_000 },
  ],
  metadata: {
    iterations: 0,  // Signals this is a fallback result
    executionTimeMs: 0,
    dataSources: ['Cached fallback -- actual simulation failed'],
  },
};
```

**How the client detects fallback**: When `metadata.iterations === 0`, the results page displays a banner: "These are approximate results. The full simulation could not be completed. Please try again or modify your inputs." The Retry button re-submits the original request. The "Edit Inputs" button navigates back to `/assess`.

---

## 3. Timeout Handling

### 3.1 Timeout Budget

CybRisk has a single API endpoint. The timeout budget is simple:

| Component | Timeout | Rationale |
|-----------|---------|-----------|
| Vercel Serverless Function | 300s (Fluid Compute) | Platform-enforced maximum. Irrelevant in practice since computation takes < 200ms. |
| Client fetch() timeout | 15s | Covers cold start (1-3s) + computation (< 200ms) + response transfer + generous buffer. If the API does not respond in 15s, something is wrong beyond a normal cold start. |
| Minimum loading animation | 1.5s | UX requirement: the "Running 10,000 simulations..." animation should play for at least 1.5s even if the API responds in 80ms, to avoid a jarring flash. |
| sessionStorage write | Synchronous | sessionStorage.setItem is synchronous. No timeout needed. If it throws (quota exceeded), catch and continue. |
| Client-side chart render | 3s soft budget | Recharts initial render with 50 histogram bins. If rendering takes longer than 3s, the page is still responsive -- this is a soft performance target, not a hard timeout. |

### 3.2 Client-Side Fetch with Timeout

```typescript
// src/app/assess/page.tsx

const FETCH_TIMEOUT_MS = 15_000;

async function calculateRisk(inputs: AssessmentInputs): Promise<CalculateResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flattenInputs(inputs)),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new CalculationError(
        response.status,
        errorBody.error || 'Calculation failed',
        errorBody.details
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new CalculationError(
        504,
        'The calculation timed out. This usually resolves on retry (server was warming up).',
        null
      );
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new CalculationError(
        0,
        'Unable to connect. Please check your internet connection.',
        null
      );
    }

    throw error;
  }
}
```

### 3.3 Cold Start Mitigation

Vercel serverless functions experience cold starts after periods of inactivity. For CybRisk, this means the first request after idle takes 1-3 seconds instead of 50-80ms. This is the most common "timeout-like" experience users will encounter.

**Mitigation strategies (implemented)**:

| Strategy | Implementation |
|----------|----------------|
| Loading animation with phase messages | Rotate through "Analyzing your risk profile...", "Running 10,000 simulations...", "Computing financial exposure..." every 2 seconds. This sets user expectations for a multi-second wait. |
| Retry suggestion in timeout error | If the 15s timeout fires, the error message says "This usually resolves on retry (server was warming up)." Cold starts are transient -- the second request will be warm. |
| Minimum animation duration | The loading overlay stays visible for at least 1.5s even if the API responds instantly. This prevents the user from seeing a flash and wondering if anything happened. |

**Not implemented (not needed for MVP)**:

| Strategy | Why Not |
|----------|---------|
| Vercel cron keep-warm | Requires Pro plan. Hobby plan is sufficient for hackathon. |
| Edge middleware pre-warm | The API route runs on Node.js serverless (not Edge). Edge middleware cannot pre-warm a serverless function. |
| Client-side pre-fetch on wizard Step 4 | The request body is not complete until Step 5. Pre-fetching would require speculative parameters, adding complexity for marginal benefit. |

### 3.4 Simulation Loop Timeout Guard

The Monte Carlo loop itself (10K iterations of PERT sampling) should complete in < 100ms. If it does not, something is pathologically wrong (e.g., the Joehnk sampler is stuck in a near-infinite rejection loop). A loop-level guard prevents runaway computation:

```typescript
// src/lib/monte-carlo.ts

const SIMULATION_TIMEOUT_MS = 5_000;  // 5 seconds -- extremely generous

function runSimulation(params: FairParams, iterations: number): SimulationOutput {
  const startTime = performance.now();
  const losses: number[] = new Array(iterations);

  for (let i = 0; i < iterations; i++) {
    // Check timeout every 1000 iterations (avoid per-iteration overhead)
    if (i % 1000 === 0 && performance.now() - startTime > SIMULATION_TIMEOUT_MS) {
      // Return partial results with however many iterations completed
      const completedLosses = losses.slice(0, i);
      completedLosses.sort((a, b) => a - b);
      return buildOutput(completedLosses);
    }

    const tef = samplePERT(params.tef.min, params.tef.mode, params.tef.max);
    const vuln = Math.max(0, Math.min(1,
      samplePERT(params.vuln.min, params.vuln.mode, params.vuln.max)
    ));
    const lef = tef * vuln;
    const pl = samplePERT(params.pl.min, params.pl.mode, params.pl.max);
    const sl = samplePERT(params.sl.min, params.sl.mode, params.sl.max);
    const loss = lef * (pl + sl);
    losses[i] = Number.isFinite(loss) ? loss : 0;
  }

  losses.sort((a, b) => a - b);
  return buildOutput(losses);
}
```

**Partial results are still useful**: If the simulation completes 7,000 of 10,000 iterations before the timeout, the distribution shape is already well-established. Percentiles and histogram computed from 7K samples are statistically close to 10K samples. The `metadata.iterations` field in the response will report 7,000, and the results page can display a note: "Based on 7,000 simulations (target: 10,000)."

---

## 4. Input Validation as Resilience

> In a stateless calculator with no external dependencies, input validation IS the primary resilience mechanism. Invalid input is the most likely cause of failure.

### 4.1 Validation Layer Architecture

```
User Input (browser)
       |
       v
Client-Side Zod Validation (per wizard step)
  - UX convenience: instant feedback
  - Can be bypassed (JS disabled, direct API call)
       |
       v
HTTP POST /api/calculate
       |
       v
Server-Side Zod Validation (full request schema)
  - Security boundary: cannot be bypassed
  - Rejects invalid input before any computation
       |
       v
Lookup Table Parameter Bounds Checking
  - Clamps computed PERT params to valid ranges
  - Ensures min <= mode <= max
  - Ensures vuln <= 1.0
       |
       v
Monte Carlo Per-Sample Clamping
  - Clamps individual samples (vuln to [0,1])
  - Replaces NaN/Infinity with 0
       |
       v
Output Plausibility Capping
  - Caps ALE at 10x revenue
  - Ensures all values finite and non-negative
```

**Five independent validation layers**. Any single layer can fail, and the layers below it catch the error. This is not redundancy for its own sake -- each layer validates at a different semantic level:

| Layer | What It Validates | Example |
|-------|-------------------|---------|
| Client Zod | Data types and field presence | "Industry is required" |
| Server Zod | Data types, ranges, and enums | "recordCount must be between 1,000 and 100,000,000" |
| Lookup bounds | Computed PERT parameter validity | "vuln.mode was pushed to -0.3 by control stacking; clamped to 0.02" |
| Per-sample clamp | Individual stochastic sample validity | "vuln sample was 1.03 from PERT tail; clamped to 1.0" |
| Output cap | Final result plausibility | "ALE was $500B for a $150M company; capped to $1.5B" |

### 4.2 Zod Schema as Security Boundary

The `CalculateRequestSchema` in `validation.ts` is the security boundary. It is the only thing standing between an attacker's crafted JSON payload and the computation engine.

```typescript
// src/lib/validation.ts -- critical security properties

const CalculateRequestSchema = z.object({
  industry: z.enum([/* 17 strict values */]),      // No arbitrary strings
  revenueBand: z.enum([/* 5 strict values */]),     // No arbitrary strings
  employeeCount: z.enum([/* 5 strict values */]),   // No arbitrary strings
  dataTypes: z.array(z.enum([/* 6 values */])).min(1).max(6),
  recordCount: z.number()
    .int()                                          // No floating point
    .min(1_000)                                     // Floor
    .max(100_000_000),                              // Ceiling
  dataSensitivity: z.enum(['low', 'medium', 'high']),
  controls: z.object({
    // 10 strictly boolean fields -- no strings, no numbers
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
  threatTypes: z.array(z.enum([/* 6 values */])).min(1).max(6),
  previousIncidents: z.enum(['0', '1', '2_5', '5_plus']),
}).strict();  // .strict() rejects unexpected fields (prototype pollution defense)
```

**Why `.strict()`**: Without `.strict()`, Zod silently strips unknown fields. This is fine for most use cases, but CybRisk adds `.strict()` as an explicit defense against prototype pollution. If an attacker sends `{ "__proto__": { "isAdmin": true }, ... }`, `.strict()` rejects the entire request with a 400 error instead of silently stripping `__proto__` and proceeding.

### 4.3 Record Count Bounds and Computation Impact

`recordCount` is the only user-controlled numeric input that directly scales the loss magnitude. Bounding it is critical:

| Bound | Value | Rationale |
|-------|-------|-----------|
| Minimum | 1,000 | Below 1,000 records, per-record breach cost models break down. A company with 100 records has fundamentally different risk characteristics than the actuarial data supports. |
| Maximum | 100,000,000 | Above 100M records, the company is in the top 0.01% globally and should use enterprise risk tooling (RiskLens, Archer), not a self-service calculator. Also prevents memory-safe but implausible loss figures. |

**Computation impact**: `recordCount` feeds into Primary Loss calculation: `PL_mode = perRecordCost * recordCount * revenueScale`. At maximum (100M records * $200/record * ~2x revenue scale), PL_mode is ~$40B. Over 10K iterations with TEF and Vuln sampling, this produces ALE values in the billions. These are large but finite numbers -- well within JavaScript's safe integer range. The 10x revenue plausibility cap catches any resulting ALE that exceeds credible exposure.

---

## 5. Client-Side Resilience

### 5.1 Results Page Navigation Guard

The most common client-side failure mode is navigating to `/results` without calculation data. This happens when a user bookmarks the results URL, shares a link, refreshes the page before sessionStorage is written, or navigates directly via the address bar.

```typescript
// src/app/results/page.tsx

export default function ResultsPage() {
  const { results, isLoading } = useResults();
  const router = useRouter();

  useEffect(() => {
    // Priority 1: Check React Context (set during current navigation)
    if (results) return;

    // Priority 2: Check sessionStorage (set before navigation, survives refresh)
    try {
      const stored = sessionStorage.getItem('cybrisk-results');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate structure before trusting
        if (parsed && typeof parsed.ale === 'object' && typeof parsed.ale.mean === 'number') {
          setResults(parsed);
          return;
        }
      }
    } catch {
      // Corrupt sessionStorage -- fall through to redirect
    }

    // Priority 3: No results available -- redirect to assessment
    router.replace('/assess');
  }, [results, router]);

  if (!results) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-400">Redirecting to assessment...</p>
      </div>
    );
  }

  return <ResultsDashboard results={results} />;
}
```

**Why `router.replace` instead of `router.push`**: Using `replace` prevents the user from hitting the back button and landing on the empty results page again. The browser history entry for `/results` is replaced with `/assess`, so back-button behavior is clean.

### 5.2 sessionStorage Safety Wrapper

sessionStorage can throw in several scenarios: private browsing mode (older Safari), storage quota exceeded, or corporate browser lockdowns. All reads and writes are wrapped:

```typescript
// src/contexts/results-context.tsx

const STORAGE_KEY = 'cybrisk-results';

function safeWrite(results: CalculateResponse): void {
  try {
    // Strip rawLosses before storing (200KB savings)
    const { rawLosses, ...storable } = results as any;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(storable));
  } catch (e) {
    // QuotaExceededError or SecurityError
    // Context still works for current navigation. Refresh will lose results.
    console.warn('sessionStorage unavailable; results will not survive page refresh');
  }
}

function safeRead(): CalculateResponse | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Minimal structural validation
    if (!parsed || typeof parsed.ale?.mean !== 'number') return null;
    return parsed;
  } catch {
    // Parse error or SecurityError
    return null;
  }
}
```

### 5.3 Chart Rendering Resilience

Recharts can throw or render incorrectly if given unexpected data shapes. Each chart component validates its props before rendering:

```typescript
// src/components/results/loss-distribution.tsx

interface LossDistributionProps {
  histogram: Array<{ bin: string; count: number }>;
}

export function LossDistribution({ histogram }: LossDistributionProps) {
  // Guard: empty or invalid histogram data
  if (!histogram || histogram.length === 0) {
    return (
      <ChartContainer title="Loss Distribution" description="Histogram unavailable">
        <div className="flex items-center justify-center h-[300px] text-slate-500">
          Distribution data is not available for this assessment.
        </div>
      </ChartContainer>
    );
  }

  // Guard: all counts are zero (degenerate distribution)
  const totalCount = histogram.reduce((sum, bin) => sum + bin.count, 0);
  if (totalCount === 0) {
    return (
      <ChartContainer title="Loss Distribution" description="No loss events simulated">
        <div className="flex items-center justify-center h-[300px] text-slate-500">
          All simulation iterations produced zero loss.
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="Loss Distribution"
      description={`Distribution of ${totalCount.toLocaleString()} simulated annual losses`}
      srTable={<HistogramTable data={histogram} total={totalCount} />}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={histogram}>
          {/* ... chart configuration ... */}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

### 5.4 Network Error Handling Matrix

| Error Condition | Detection | User Message | Recovery Action |
|----------------|-----------|--------------|-----------------|
| AbortError (fetch timeout) | `error.name === 'AbortError'` | "The calculation timed out. This usually resolves on retry (server was warming up)." | Retry button |
| TypeError (network failure) | `error instanceof TypeError` | "Unable to connect. Please check your internet connection." | Retry button |
| HTTP 400 (validation) | `response.status === 400` | Field-specific error from `ZodError.issues`, displayed inline on the relevant wizard step | Navigate to failing step |
| HTTP 405 (wrong method) | `response.status === 405` | "Something went wrong. Please try again." | Retry button (should never happen from the wizard) |
| HTTP 500 (server error) | `response.status === 500` | "The calculation encountered an error. Please try again." | Retry button + Edit Inputs button |
| JSON parse error on response | `SyntaxError` in `.json()` | "Received an invalid response. Please try again." | Retry button |

---

## 6. Histogram and Exceedance Curve Edge Cases

### 6.1 Degenerate Distribution Handling

When all 10,000 simulated losses are identical (or very nearly identical), histogram binning and exceedance curve computation produce degenerate results. This can happen when all PERT parameters have zero range (min == mode == max for all four factors).

```typescript
// src/lib/monte-carlo.ts

function buildHistogram(sortedLosses: number[], numBins = 50): HistogramBin[] {
  const min = sortedLosses[0];
  const max = sortedLosses[sortedLosses.length - 1];
  const range = max - min;

  // Degenerate case: all losses are identical (or nearly so)
  if (range < 0.01) {
    return [{
      bin: formatDollar(min),
      count: sortedLosses.length,
    }];
  }

  const binWidth = range / numBins;
  const bins: number[] = new Array(numBins).fill(0);

  for (const loss of sortedLosses) {
    const index = Math.min(
      Math.floor((loss - min) / binWidth),
      numBins - 1  // Last bin is inclusive of max
    );
    bins[index]++;
  }

  return bins.map((count, i) => ({
    bin: formatDollar(min + i * binWidth),
    count,
  }));
}

function buildExceedanceCurve(
  sortedLosses: number[],
  numPoints = 20
): ExceedancePoint[] {
  const min = sortedLosses[0];
  const max = sortedLosses[sortedLosses.length - 1];
  const range = max - min;

  // Degenerate case: all losses are identical
  if (range < 0.01) {
    return [
      { threshold: min * 0.9, probability: 1.0 },
      { threshold: min, probability: 0.5 },
      { threshold: min * 1.1, probability: 0.0 },
    ];
  }

  const step = range / (numPoints - 1);
  const points: ExceedancePoint[] = [];

  for (let i = 0; i < numPoints; i++) {
    const threshold = min + i * step;
    // Binary search for efficiency on sorted array
    const exceedCount = sortedLosses.length - bisectRight(sortedLosses, threshold);
    points.push({
      threshold,
      probability: exceedCount / sortedLosses.length,
    });
  }

  return points;
}
```

### 6.2 Zero-Loss Iterations

A well-protected company in a low-threat industry may produce many iterations where TEF * Vuln rounds to near zero, producing $0 annual loss. This is correct behavior -- not an error. The histogram will show a tall bar at $0 and a long right tail. The exceedance curve will start below 1.0 (not all iterations exceed $0). The ALE mean will be pulled up by the tail.

No special handling needed. The UI should not display warnings for this case -- it means the company's risk posture is genuinely low.

### 6.3 Histogram Bin Width Edge Case: Division by Zero

If `max - min` is exactly 0.0 (not just "nearly zero" but bit-identical), `binWidth` becomes 0 and `Math.floor((loss - min) / 0)` produces `Infinity` or `NaN`. The `range < 0.01` guard in Section 6.1 catches this before division occurs.

---

## 7. Health Checks

### 7.1 Application Health (Vercel Built-In)

CybRisk runs on Vercel, which provides built-in health monitoring:

| Signal | Source | Threshold | Visibility |
|--------|--------|-----------|------------|
| Function invocations | Vercel Analytics | N/A | Vercel dashboard |
| Function duration (P50, P99) | Vercel Analytics | P99 < 5s | Vercel dashboard |
| Function errors | Vercel Analytics | Error rate < 5% | Vercel dashboard |
| Cold start frequency | Vercel Analytics | N/A (informational) | Vercel dashboard |
| Deployment status | Vercel CLI | Build success/failure | `vercel ls --limit 1` |

### 7.2 Computation Health Check Endpoint

A lightweight health check endpoint that verifies the Monte Carlo engine is functional without running a full simulation:

```typescript
// src/app/api/health/route.ts

export const runtime = 'nodejs';

export async function GET() {
  const start = performance.now();

  try {
    // Smoke test: run 100 iterations (not 10K) to verify engine works
    const testParams: FairParams = {
      tef:  { min: 0.5, mode: 1.0, max: 2.0 },
      vuln: { min: 0.1, mode: 0.3, max: 0.5 },
      pl:   { min: 100_000, mode: 500_000, max: 1_000_000 },
      sl:   { min: 50_000, mode: 200_000, max: 500_000 },
    };

    const result = runSimulation(testParams, 100);

    // Verify output sanity
    const healthy =
      Number.isFinite(result.ale.mean) &&
      result.ale.mean >= 0 &&
      result.ale.p5 <= result.ale.p95;

    const elapsed = performance.now() - start;

    return Response.json({
      status: healthy ? 'healthy' : 'degraded',
      engine: 'monte-carlo',
      smokeTest: {
        iterations: 100,
        aleMean: result.ale.mean,
        executionMs: Math.round(elapsed),
      },
      timestamp: new Date().toISOString(),
    }, { status: healthy ? 200 : 503 });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: 'Smoke test failed',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
```

**Why 100 iterations for health check**: 100 iterations take < 1ms and are sufficient to verify that PERT sampling, Joehnk algorithm, simulation loop, percentile computation, and histogram binning all function correctly. The health check should be cheap enough to call frequently without impacting performance.

### 7.3 Client-Side Health Indicators

The results page includes metadata from the API response that serves as a client-visible health indicator:

| Indicator | Location | Healthy Value | Warning Value |
|-----------|----------|---------------|---------------|
| `metadata.iterations` | Methodology section | 10,000 | < 10,000 (partial simulation) or 0 (fallback) |
| `metadata.executionTimeMs` | Methodology section | < 200 | > 5,000 (performance degradation) |
| `metadata.dataSources` | Methodology section | 3 named sources | "Cached fallback" (engine failure) |
| Histogram bin count | Chart component | 50 bins | < 50 (degenerate distribution) or 0 (fallback) |
| Exceedance curve points | Chart component | 20 points | < 20 or 0 (fallback) |

---

## 8. Error Response Contracts

### 8.1 Server Error Response Shape

All API error responses follow a consistent shape that the client can parse reliably:

```typescript
// Error response types

// Validation error (400)
interface ValidationErrorResponse {
  error: 'Validation failed';
  details: Array<{
    path: string[];
    message: string;
    code: string;
  }>;
}

// Method error (405)
interface MethodErrorResponse {
  error: 'Method not allowed';
}

// Server error (500)
interface ServerErrorResponse {
  error: 'Simulation failed' | 'Calculation error';
  message: string;  // Human-readable, safe to display
  // Never includes: stack trace, user input, internal state
}
```

### 8.2 Error Handling Rules

| Rule | Rationale |
|------|-----------|
| Never include user input in error responses | Privacy by design. User data must not appear in logs or responses that could be cached or intercepted. |
| Never include stack traces in production | Security. Stack traces reveal file paths, dependency versions, and internal logic. |
| Always include a human-readable `message` | The client displays this directly. It must be helpful: "Please try again" or "Check your internet connection." |
| Use standard HTTP status codes | 400 for client errors, 405 for method errors, 500 for server errors. No custom codes. |
| Validation errors include field paths | The client uses `details[].path` to highlight the specific field that failed. This enables "Navigate to Step 2 and fix the record count" UX. |

### 8.3 Error Recovery Paths

```
Error Type              Client Behavior
-----------             ---------------
400 Validation     -->  Parse details[].path
                        Map path to wizard step number
                        Navigate to that step
                        Highlight failing field with inline error
                        User fixes input, re-submits

500 Server Error   -->  Display error message
                        Show "Try Again" button (re-submits same inputs)
                        Show "Edit Inputs" button (navigates to /assess Step 5)
                        If retry also fails, show "Try a different configuration"

504 Timeout        -->  Display "Server was warming up" message
                        Show "Try Again" button
                        Second attempt usually succeeds (function is now warm)

Network Error      -->  Display "Check your connection" message
                        Show "Try Again" button
                        Poll navigator.onLine for reconnection
```

---

## 9. Resilience Testing Checklist

These tests verify that resilience patterns work correctly. Each test should be implemented as a unit test or integration test.

### 9.1 Computation Safety Tests

| Test | Input | Expected Output |
|------|-------|-----------------|
| PERT with zero range | `samplePERT(100, 100, 100)` | Returns 100 (no sampling) |
| PERT with mode == min | `samplePERT(0.5, 0.5, 3.0)` | Returns value in [0.5, 3.0], right-skewed |
| PERT with mode == max | `samplePERT(0.5, 3.0, 3.0)` | Returns value in [0.5, 3.0], left-skewed |
| PERT with inverted bounds | `samplePERT(3.0, 1.0, 0.5)` | Clamps mode, returns value in [0.5, 3.0] |
| Vulnerability > 1.0 | PERT params allowing max > 1.0 | Sample clamped to 1.0 |
| All losses produce NaN | Force NaN in TEF sampling | All NaN replaced with 0; ALE mean = 0 |
| Running mean accuracy | 10K values known to sum beyond MAX_SAFE_INTEGER | Mean matches expected value within 0.01% |
| Joehnk iteration cap | alpha=0.001, beta=0.001 (extreme rejection rate) | Returns expected value after 1000 iterations |

### 9.2 Fallback Chain Tests

| Test | Trigger | Expected Behavior |
|------|---------|-------------------|
| Deterministic fallback | Force `runSimulation` to throw | API returns point estimate with `metadata.iterations = 1` |
| Cached fallback | Force both simulation and deterministic to throw | API returns hardcoded mid-market results with `metadata.iterations = 0` |
| Partial simulation | Inject 6-second delay per iteration (triggers 5s timeout) | API returns results with iterations < 10,000 |

### 9.3 Client-Side Resilience Tests

| Test | Scenario | Expected Behavior |
|------|----------|-------------------|
| Direct /results navigation | Navigate to /results without completing wizard | Redirect to /assess |
| sessionStorage disabled | Mock sessionStorage to throw on setItem | Results display correctly via Context; refresh loses data |
| Corrupt sessionStorage | Set invalid JSON in sessionStorage | Redirect to /assess (parse failure caught) |
| Network offline | Disable network during fetch | "Check your connection" error with Retry button |
| API 400 on submit | Send request that fails server validation | Navigate to relevant wizard step with inline error |
| API 500 on submit | Force 500 from API | Error state with Retry + Edit Inputs buttons |
| Double-click Calculate | Click "Calculate" button twice rapidly | Only one API request sent (button disabled on first click) |
| Empty histogram data | API returns empty histogram array | Chart area shows "Distribution data is not available" message |

---

## Summary: CybRisk Resilience Philosophy

CybRisk's resilience is not about surviving network partitions or recovering from database failures. It has neither. Its resilience is about three things:

1. **Every number is finite, non-negative, and plausible.** Five independent validation layers ensure that no NaN, Infinity, or negative dollar figure reaches the user. The PERT sampler guards against degenerate parameters. The MC engine guards against per-sample anomalies. The API route guards against implausible totals. The client guards against missing data. The charts guard against rendering failures.

2. **Every failure has a recovery path.** Cold start timeouts get a retry button. Validation errors navigate to the relevant wizard step. Server errors offer retry and edit options. Missing results redirect to the assessment. No failure produces a blank screen or an unrecoverable state.

3. **The architecture makes most failure modes impossible.** No database connections means no connection pool exhaustion. No external APIs means no circuit breakers needed. No authentication means no token expiry. No persistent state means no data corruption. The stateless design eliminates entire categories of failure by not having the components that fail.

The most reliable distributed system is the one with the fewest distributed parts.

---

*Document generated by North Star Advisor*
