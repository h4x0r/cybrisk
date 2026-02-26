# CybRisk: Pipeline Orchestration

> **Parent**: [ARCHITECTURE_BLUEPRINT.md](../ARCHITECTURE_BLUEPRINT.md)
> **Created**: 2026-02-22
> **Status**: Active
> **Builder**: Albert Hui -- Chief Forensicator, Security Ronin

Pipeline orchestration for CybRisk's stateless FAIR Monte Carlo calculation engine. This document defines the state schema, pipeline composition, execution patterns, validation gates, and performance optimization for the single `POST /api/calculate` endpoint.

**Important context**: CybRisk is not an agentic system. There are no LLM agents, no orchestrator process, and no message-passing between autonomous components. The "pipeline" is a deterministic function composition: pure functions chained together inside a single serverless invocation. This document describes that chain in the same structural rigor as an agent orchestration document, because the engineering discipline is identical -- typed state, validation gates, error boundaries, and performance budgets -- even though the execution model is simpler.

---

## 1. State Schema

### 1.1 Core Pipeline State

CybRisk's pipeline state flows through a single serverless function invocation. There is no persistent session, no database, and no shared memory between invocations. State exists only for the duration of one HTTP request.

```typescript
// src/app/api/calculate/route.ts -- implicit pipeline state

// The pipeline state is not a formal object stored in memory.
// It is the accumulated data flowing through the function chain.
// Each stage receives the output of the previous stage.

// Stage 0: Raw HTTP input
type RawInput = unknown;  // Unparsed JSON body

// Stage 1: Validated input
type ValidatedInput = z.infer<typeof CalculateRequestSchema>;

// Stage 2: FAIR parameters (mapped from validated input)
interface FairParams {
  tef:  { min: number; mode: number; max: number };  // Threat Event Frequency
  vuln: { min: number; mode: number; max: number };  // Vulnerability probability
  pl:   { min: number; mode: number; max: number };  // Primary Loss (dollars)
  sl:   { min: number; mode: number; max: number };  // Secondary Loss (dollars)
}

// Stage 3: Simulation output
interface SimulationOutput {
  ale: {
    mean: number;
    median: number;
    p5: number;
    p10: number;
    p90: number;
    p95: number;
  };
  histogram: Array<{ bin: string; count: number }>;         // 50 bins
  exceedanceCurve: Array<{ threshold: number; probability: number }>;  // 20 points
  rawLosses: number[];  // 10,000 elements, sorted ascending (internal only)
}

// Stage 4: Gordon-Loeb result
interface GordonLoebResult {
  optimalSpend: number;
  currentRisk: number;
  residualRisk: number;
}

// Stage 5: Enrichment outputs (derived from validated input + simulation)
interface EnrichmentOutputs {
  riskRating: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  keyDrivers: Array<{ name: string; impact: 'high' | 'medium' | 'low' }>;
  recommendations: Array<{ action: string; estimatedSavings: number }>;
}

// Stage 6: Final API response (assembled from stages 3-5)
interface CalculateResponse {
  riskRating: RiskRating;
  ale: SimulationOutput['ale'];
  pml: number;
  gordonLoeb: GordonLoebResult;
  histogram: SimulationOutput['histogram'];
  exceedanceCurve: SimulationOutput['exceedanceCurve'];
  keyDrivers: EnrichmentOutputs['keyDrivers'];
  recommendations: EnrichmentOutputs['recommendations'];
  metadata: {
    iterations: number;
    executionTimeMs: number;
    dataSources: string[];
  };
}
// Note: rawLosses is deliberately excluded from the response.
// The 10K-element array stays server-side. Only pre-binned data crosses the wire.
```

### 1.2 Client-Side State (Wizard)

The wizard state machine operates independently from the server pipeline. It collects inputs, submits them, and receives results. It never shares memory with the serverless function.

```typescript
// src/app/assess/page.tsx -- wizard state

interface WizardState {
  step: number;                        // 0-4 (5 steps, 0-indexed)
  inputs: AssessmentInputs;            // All form data
  isCalculating: boolean;              // Loading state during API call
  error: string | null;                // Error message from API or network
}

interface AssessmentInputs {
  company: {
    industry: Industry;                // 17 industries
    revenueBand: RevenueBand;          // 5 bands
    employeeCount: EmployeeCount;      // 5 bands
  };
  data: {
    types: DataType[];                 // 1-6 data types
    recordCount: number;               // 1,000 - 100,000,000
    sensitivity: 'low' | 'medium' | 'high';
  };
  controls: Record<Control, boolean>;  // 10 boolean toggles
  threats: {
    types: ThreatType[];              // 1-6 threat types
    previousIncidents: IncidentHistory;
  };
}
```

### 1.3 Cross-Page State (Results Transfer)

```typescript
// src/contexts/results-context.tsx

interface ResultsContextType {
  results: CalculateResponse | null;
  setResults: (results: CalculateResponse) => void;
  clearResults: () => void;
  isLoading: boolean;
}

// Dual storage: React Context (instant access) + sessionStorage (refresh resilience)
// sessionStorage key: 'cybrisk-results'
// sessionStorage value: JSON.stringify(CalculateResponse) -- approx 3-5KB
// rawLosses is never serialized to sessionStorage
```

### 1.4 State Lifecycle

```
Browser                              Vercel Serverless
───────                              ─────────────────

WizardState created                       (nothing)
  step: 0
  inputs: defaults
  isCalculating: false
  error: null
       |
       |  User fills steps 0-4
       |  (state mutates via useState)
       |
       v
WizardState.isCalculating = true
       |
       |  POST /api/calculate
       |  { industry, revenue, ... }
       |  ──────────────────────────>   RawInput received
       |                                     |
       |                                Stage 1: Zod validates -> ValidatedInput
       |                                     |
       |                                Stage 2: mapToFairParams -> FairParams
       |                                     |
       |                                Stage 3: runSimulation -> SimulationOutput
       |                                     |
       |                                Stage 4: computeGordonLoeb -> GordonLoebResult
       |                                     |
       |                                Stage 5: deriveRiskRating + keyDrivers + recs
       |                                     |
       |                                Stage 6: Assemble CalculateResponse
       |                                     |
       |  <──────────────────────────   JSON response (no rawLosses)
       |                                     |
       v                                (state destroyed -- serverless forgets)
ResultsContext.setResults(response)
sessionStorage.setItem(response)
router.push('/results')
       |
       v
Results page reads from Context
  (or sessionStorage on refresh)
```

---

## 2. Pipeline Orchestrator

### 2.1 Orchestrator Design

CybRisk's orchestrator is not a class with agent registration and message routing. It is a single `async` function that calls pure functions in sequence. The design is intentionally simple because the calculation pipeline has no branching, no parallelism, and no retry loops.

```typescript
// src/app/api/calculate/route.ts

export const runtime = 'nodejs';  // NOT edge -- CPU-intensive Monte Carlo

export async function POST(request: Request): Promise<Response> {
  const start = performance.now();

  try {
    // ── Stage 1: Parse and Validate ──────────────────────────
    const body = await request.json();
    const parsed = CalculateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const inputs = parsed.data;

    // ── Stage 2: Map to FAIR Parameters ──────────────────────
    const fairParams = mapToFairParams(inputs);

    // ── Stage 3: Monte Carlo Simulation ──────────────────────
    const simulation = runSimulation(fairParams, 10_000);

    // ── Stage 4: Gordon-Loeb Optimal Spend ───────────────────
    const gordonLoeb = computeGordonLoeb(simulation, inputs);

    // ── Stage 5: Enrichment ──────────────────────────────────
    const riskRating = deriveRiskRating(simulation, inputs);
    const keyDrivers = identifyKeyDrivers(inputs, simulation);
    const recommendations = generateRecommendations(inputs, simulation, gordonLoeb);

    // ── Stage 6: Sanity Checks and Response Assembly ─────────
    sanitizeOutput(simulation, inputs);

    const elapsed = performance.now() - start;

    return Response.json({
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
    });

  } catch (error) {
    console.error('Pipeline error:', (error as Error).message);
    return Response.json(
      { error: 'Simulation failed', message: 'Please try again' },
      { status: 500 }
    );
  }
}
```

### 2.2 Why Not a Class-Based Orchestrator

The template for this document suggests a `PipelineOrchestrator` class with agent registration, parallel/sequential execution phases, and fallback management. CybRisk does not need any of this because:

| Agent Orchestrator Feature | CybRisk Equivalent | Why Simpler |
|----------------------------|--------------------|-------------|
| Agent registry (`Map<string, BaseAgent>`) | Direct function imports | There are 6 functions, not 6 autonomous agents. No discovery, no registration. |
| Parallel execution (`Promise.all`) | Not needed | Every stage depends on the previous stage's output. No independent computation paths. |
| Sequential execution loop | Linear function calls | `a(); b(a_result); c(b_result)` -- no loop needed when the sequence is fixed. |
| Fallback/retry per agent | Single try/catch | If any stage fails, the entire pipeline fails. There is no partial result that is useful to the user. |
| State merging | Function return values | Each function returns its output. The next function takes it as input. No merging of parallel results. |
| Timeout per agent | Single HTTP timeout | Vercel serverless timeout (300s) covers the entire invocation. Internal stages complete in < 200ms total. |
| Quality gates | Output sanity check | One post-simulation validation step, not per-agent quality loops. |

The simplest correct design is a linear function chain inside a try/catch. Over-engineering with a class-based orchestrator would add abstraction without adding capability.

### 2.3 Function Dependency Chain

```
validate()          [Pure: JSON -> ValidatedInput | ZodError]
     |
     v
mapToFairParams()   [Pure: ValidatedInput -> FairParams]
     |
     v
runSimulation()     [Stochastic: FairParams x iterations -> SimulationOutput]
     |
     v
computeGordonLoeb() [Pure: SimulationOutput x ValidatedInput -> GordonLoebResult]
     |
     +──> deriveRiskRating()        [Pure: SimulationOutput x ValidatedInput -> RiskRating]
     |
     +──> identifyKeyDrivers()      [Pure: ValidatedInput x SimulationOutput -> KeyDriver[]]
     |
     +──> generateRecommendations() [Pure: ValidatedInput x SimulationOutput x GordonLoebResult -> Recommendation[]]
     |
     v
sanitizeOutput()    [Pure: SimulationOutput x ValidatedInput -> void (mutates in place)]
     |
     v
formatResponse()    [Pure: all outputs -> CalculateResponse]
```

**Notation**: Stages 5a-5c (riskRating, keyDrivers, recommendations) could theoretically run in parallel since they depend on the same upstream data and are independent of each other. However, each runs in < 1ms, so `Promise.all` would add overhead (microtask scheduling) without measurable benefit. Sequential execution is correct.

---

## 3. Execution Patterns

### 3.1 Sequential Pipeline (Primary Pattern)

CybRisk uses a single execution pattern: strict sequential function composition. Each stage receives the accumulated output of all previous stages and produces input for the next.

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  validate()  │───>│ mapToFAIR()  │───>│ runMonteCarlo │───>│ gordonLoeb() │
│  (< 1ms)     │    │  (< 1ms)     │    │  (40-60ms)    │    │  (< 1ms)     │
└─────────────┘    └──────────────┘    └───────────────┘    └──────────────┘
                                                                    |
                                                                    v
┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│ formatResp() │<───│ sanitize()   │<───│ enrichment()  │<───│  (continued) │
│  (< 1ms)     │    │  (< 1ms)     │    │  (< 1ms)      │    │              │
└─────────────┘    └──────────────┘    └───────────────┘    └──────────────┘
```

**Total pipeline execution**: 40-80ms (warm), dominated by Monte Carlo simulation.

### 3.2 Why No Parallel Execution

In an agent-based system, independent agents can run concurrently. CybRisk has no such opportunity because every stage depends on the output of its predecessor:

| Stage | Depends On | Why Not Parallelizable |
|-------|-----------|------------------------|
| `validate()` | Raw HTTP body | Must complete before any computation begins. |
| `mapToFairParams()` | Validated input | Lookup tables require validated enum values. |
| `runSimulation()` | FAIR params | Cannot simulate without PERT parameter ranges. |
| `computeGordonLoeb()` | Simulation output | Needs ALE mean from the simulation. |
| `deriveRiskRating()` | Simulation + input | Needs ALE/revenue ratio. |
| `identifyKeyDrivers()` | Simulation + input | Needs ALE for impact calculation. |
| `generateRecommendations()` | Simulation + GL | Needs both for savings estimates. |

The only stages that are independent of each other are `deriveRiskRating`, `identifyKeyDrivers`, and `generateRecommendations` (all depend on simulation output but not on each other). At < 1ms each, parallelizing them would cost more in microtask scheduling than it saves.

### 3.3 No Conditional Execution

There is no routing or branching in the pipeline. Every request follows the same path regardless of input values. A healthcare company with 100 million records takes the same code path as a retail company with 1,000 records -- only the PERT parameters differ.

This is a deliberate design choice. Conditional pipelines (e.g., "skip Gordon-Loeb for companies under $50M revenue") add complexity and make the output less consistent. Every user gets the full analysis.

---

## 4. Validation Gates

CybRisk replaces the template's "Self-Correction Patterns" with validation gates. There is no LLM output to evaluate for quality and retry. Instead, there are deterministic validation checks at pipeline boundaries.

### 4.1 Gate 1: Input Validation (Pre-Pipeline)

**Location**: Top of `POST` handler, before any computation.
**Library**: Zod `safeParse()`
**Failure mode**: HTTP 400 with `ZodError.issues`

```typescript
const parsed = CalculateRequestSchema.safeParse(body);
if (!parsed.success) {
  return Response.json(
    { error: 'Validation failed', details: parsed.error.issues },
    { status: 400 }
  );
}
```

**What it catches:**

| Invalid Input | Zod Rule | Result |
|--------------|----------|--------|
| Industry not in enum | `z.enum([...17 industries])` | `{ code: 'invalid_enum_value', path: ['industry'] }` |
| Record count = 0 | `z.number().min(1000)` | `{ code: 'too_small', path: ['recordCount'] }` |
| Missing data types | `z.array().min(1)` | `{ code: 'too_small', path: ['dataTypes'] }` |
| Extra fields (`__proto__`) | Zod strips unknown keys | Silently removed from validated output |
| Non-JSON body | `request.json()` throws | Caught by outer try/catch, returns 500 |
| Non-POST method | Not Zod -- Next.js routing | Only `POST` export exists; other methods get 405 |

### 4.2 Gate 2: PERT Parameter Invariants (Post-Mapping)

**Location**: Inside `mapToFairParams()`, after applying all modifiers.
**Failure mode**: Silent clamping with console.warn.

```typescript
function ensurePertInvariants(params: PertParams, label: string): PertParams {
  let { min, mode, max } = params;

  // Invariant: min >= 0
  if (min < 0) {
    console.warn(`${label}: min was ${min}, clamped to 0`);
    min = 0;
  }

  // Invariant: min <= mode <= max
  if (min > max) {
    console.warn(`${label}: min (${min}) > max (${max}), swapping`);
    [min, max] = [max, min];
  }
  mode = Math.max(min, Math.min(mode, max));

  // Invariant: non-zero range (prevent point-mass distribution)
  if (min === max) {
    const epsilon = Math.max(min * 0.1, 1);
    min = Math.max(0, min - epsilon);
    max = max + epsilon;
    mode = (min + max) / 2;
  }

  return { min, mode, max };
}
```

**Why clamp instead of reject**: PERT invariant violations are caused by extreme modifier stacking (e.g., all 10 controls reduce vulnerability below the mode floor, plus a low-threat industry). These are valid user inputs that produce edge-case parameters. The correct response is to clamp to valid ranges, not to reject the request.

### 4.3 Gate 3: Vulnerability Bounds (Per-Sample)

**Location**: Inside `runSimulation()`, on each iteration.
**Failure mode**: Clamping to [0, 1].

```typescript
const vuln = Math.min(1, Math.max(0,
  samplePERT(params.vuln.min, params.vuln.mode, params.vuln.max)
));
```

This is the innermost validation gate. It runs 10,000 times per request. It must be a single-line clamp with zero allocation -- no logging, no branching, no error objects.

### 4.4 Gate 4: Output Plausibility (Post-Simulation)

**Location**: `sanitizeOutput()` function, after simulation and before response assembly.
**Failure mode**: Capping with console.warn, or throwing for impossible values.

```typescript
function sanitizeOutput(simulation: SimulationOutput, inputs: ValidatedInput): void {
  const revenueCap = getRevenueMidpoint(inputs.revenueBand) * 10;

  // Invariant: ALE cannot be negative
  if (simulation.ale.mean < 0) {
    throw new Error('Negative ALE: PERT parameters may be inverted');
  }

  // Invariant: ALE should not exceed 10x revenue
  if (simulation.ale.mean > revenueCap) {
    console.warn('ALE capped at 10x revenue');
    const capRatio = revenueCap / simulation.ale.mean;
    simulation.ale.mean = revenueCap;
    simulation.ale.median *= capRatio;
    simulation.ale.p90 *= capRatio;
    simulation.ale.p95 = Math.min(simulation.ale.p95, revenueCap);
  }

  // Invariant: Gordon-Loeb spend cannot exceed 5% of revenue
  // (Already enforced inside computeGordonLoeb, but verify)

  // Invariant: Histogram has exactly 50 bins
  if (simulation.histogram.length !== 50) {
    throw new Error(`Expected 50 histogram bins, got ${simulation.histogram.length}`);
  }

  // Invariant: Exceedance curve has exactly 20 points
  if (simulation.exceedanceCurve.length !== 20) {
    throw new Error(`Expected 20 LEC points, got ${simulation.exceedanceCurve.length}`);
  }
}
```

### 4.5 Gate Summary

```
Request arrives
     |
     v
[Gate 1: Zod Validation]─── FAIL ──> 400 { error, details }
     |
     PASS
     |
     v
[Gate 2: PERT Invariants]── CLAMP ──> params adjusted, warning logged
     |
     v
[Gate 3: Vuln Bounds x10K]─ CLAMP ──> per-sample [0, 1] clamping
     |
     v
[Gate 4: Output Plausibility]── FAIL (negative ALE) ──> 500 { error }
     |                       |── CLAMP (> 10x revenue) ──> values capped
     PASS
     |
     v
Response assembled
```

---

## 5. Performance Optimization

### 5.1 Performance Budget

The end-to-end latency budget from the Architecture Blueprint:

| Phase | Budget | Measured (dev) | Notes |
|-------|--------|----------------|-------|
| HTTP parsing + Zod validation | < 5ms | ~2ms | Zod `.safeParse()` on a ~500-byte JSON body |
| Lookup table mapping | < 1ms | < 0.5ms | Object property access, no I/O |
| Monte Carlo simulation (10K) | < 100ms | 40-60ms | PERT sampling via Joehnk + FAIR loop |
| Percentile computation | < 5ms | ~2ms | Sort 10K floats + index lookups |
| Histogram binning | < 5ms | ~1ms | Single pass over sorted array |
| Exceedance curve | < 5ms | ~1ms | Binary search over sorted array (20 lookups) |
| Gordon-Loeb calculation | < 1ms | < 0.5ms | Three arithmetic operations |
| Enrichment (rating + drivers + recs) | < 5ms | ~1ms | Object iteration + sorting |
| Response assembly + serialization | < 5ms | ~2ms | `JSON.stringify()` on ~5KB object |
| **Total (warm invocation)** | **< 200ms** | **50-80ms** | Dominated by MC simulation |
| **Total (cold start)** | **< 3s** | **1-3s** | Vercel serverless cold start overhead |

### 5.2 Monte Carlo Engine Optimizations

The Monte Carlo engine is the only computationally expensive stage. These optimizations keep 10K iterations under 100ms:

**1. Pre-allocated array (avoid GC pressure)**

```typescript
const losses: number[] = new Array(iterations);
// NOT: const losses = []; with losses.push() -- avoids dynamic resizing
```

**2. Inlined Joehnk algorithm (avoid function call overhead)**

The Joehnk algorithm for Beta sampling is a tight loop. In a hot path called 40,000 times per request (4 PERT samples x 10K iterations), function call overhead matters. The algorithm should be inlined or at minimum defined as a local function to enable V8 inlining optimization.

**3. Math.random() over crypto.getRandomValues()**

Monte Carlo simulation requires speed, not cryptographic security. `Math.random()` provides sufficient quality for risk modeling. `crypto.getRandomValues()` is ~10x slower and unnecessary for this use case.

**4. Sort-once strategy**

The 10K-element loss array is sorted once after the simulation loop. All post-processing (percentiles, histogram, exceedance curve) operates on the sorted array. This is O(n log n) for the sort plus O(n) for each pass, versus re-sorting or using unsorted scans.

**5. Binary search for exceedance curve**

The exceedance curve requires finding how many losses exceed each of 20 thresholds. On a sorted array, this is a binary search (`bisectRight`) per threshold: O(20 * log 10000) = O(280 comparisons), versus a naive filter that would be O(20 * 10000) = O(200,000 comparisons).

### 5.3 Timeout Management

```typescript
// Vercel serverless timeout: 300s (Fluid Compute)
// Actual execution: < 200ms (warm), < 3s (cold)
// No custom timeout logic needed -- the platform timeout is 1500x the actual execution time.

// If future requirements increase iterations (e.g., 100K for enterprise tier),
// add a per-stage timeout:
async function withTimeout<T>(
  fn: () => T,
  timeoutMs: number,
  fallbackFn: () => T
): T {
  const timer = setTimeout(() => {
    throw new Error('Pipeline stage timeout');
  }, timeoutMs);

  try {
    const result = fn();
    clearTimeout(timer);
    return result;
  } catch {
    return fallbackFn();
  }
}
```

For the hackathon MVP, no custom timeout is implemented. The 300s Vercel timeout provides ample headroom for the < 200ms pipeline.

### 5.4 Early Exit on Critical Failure

The pipeline exits early at two points:

**1. Validation failure (Gate 1)**: Returns HTTP 400 immediately. No computation is performed.

**2. Negative ALE (Gate 4)**: Throws an error caught by the outer try/catch. Returns HTTP 500. This should never occur with valid PERT parameters, but the check prevents returning nonsensical results.

```
// Early exit decision tree

Request arrives
     |
     v
Can body be parsed as JSON?
     |── NO  ──> 500 (caught by outer try/catch)
     v
Does Zod validate?
     |── NO  ──> 400 (immediate return, no computation)
     v
Run full pipeline...
     |
Is ALE negative?
     |── YES ──> throw -> 500 (impossible state)
     v
Return 200
```

Non-critical anomalies (ALE > 10x revenue, degenerate PERT distributions) are clamped, not aborted. The user receives results with sensible bounds rather than an error page.

### 5.5 Memory Budget

| Allocation | Size | Lifetime |
|-----------|------|----------|
| Request body (parsed JSON) | ~500 bytes | Duration of function invocation |
| `ValidatedInput` object | ~1 KB | Duration of function invocation |
| `FairParams` object | ~256 bytes | Duration of simulation |
| `losses` array (10K Float64) | ~80 KB | Duration of function invocation |
| `histogram` array (50 bins) | ~2 KB | Returned in response, then GC'd |
| `exceedanceCurve` (20 points) | ~640 bytes | Returned in response, then GC'd |
| Response JSON string | ~5 KB | Written to HTTP stream, then GC'd |
| **Total peak memory** | **~90 KB** | < 128 MB Vercel function limit |

The 10K `losses` array is the dominant allocation. It is pre-allocated (`new Array(iterations)`) and populated in-place. After post-processing, it is not included in the response (`rawLosses` is excluded from `CalculateResponse`), but it remains in memory until the function invocation completes and the garbage collector reclaims it.

---

## 6. Client-Side Pipeline (Wizard State Machine)

The wizard is a state machine that collects inputs for the server-side calculation pipeline. It is documented here because it is the front half of the end-to-end data flow.

### 6.1 State Machine Definition

```
                    ┌───────────────────────────────┐
                    │                               │
                    v                               │
          ┌─────────────────┐                       │
          │  Step 0          │                       │
    ┌────>│  CompanyProfile   │──── Continue ────┐    │
    │     │  (industry,       │                  │    │
    │     │   revenue, size)  │                  │    │
    │     └─────────────────┘                  │    │
    │                                           v    │
    │     ┌─────────────────┐                       │
    │     │  Step 1          │                       │
    │  <──│  DataProfile      │──── Continue ────┐    │
  Back    │  (types, records, │                  │    │
    │     │   sensitivity)    │                  │    │
    │     └─────────────────┘                  │    │
    │                                           v    │
    │     ┌─────────────────┐                       │
    │     │  Step 2          │                       │
    │  <──│  SecurityControls │──── Continue ────┐    │
  Back    │  (10 toggles)     │                  │    │
    │     └─────────────────┘                  │    │
    │                                           v    │
    │     ┌─────────────────┐                       │
    │     │  Step 3          │                       │
    │  <──│  ThreatLandscape  │──── Continue ────┐    │
  Back    │  (threats,        │                  │    │
    │     │   incidents)      │                  │    │
    │     └─────────────────┘                  │    │
    │                                           v    │
    │     ┌─────────────────┐                       │
    │     │  Step 4          │                       │
    └──<──│  ReviewCalculate  │──── Calculate ────┘    │
  Back    │  (read-only       │        |              │
          │   summary)        │        v              │
          └─────────────────┘   POST /api/calculate  │
                                       |              │
                                       v              │
                                ┌──────────────┐      │
                                │ API Success   │      │
                                │ -> /results   │      │
                                └──────────────┘      │
                                       |              │
                                ┌──────────────┐      │
                                │ API Failure   │──────┘
                                │ -> Retry or   │  (navigate back to
                                │   Edit Inputs │   relevant step)
                                └──────────────┘
```

### 6.2 Transition Rules

| Transition | Guard Condition | Side Effect |
|-----------|----------------|-------------|
| Step N -> Step N+1 | `stepSchemas[N].safeParse(data).success` | Focus moves to new step title. Screen reader announces step. |
| Step N -> Step N-1 | Always allowed | No data loss. Previous step data preserved in parent useState. |
| Step 4 -> Calculate | `isCalculating === false` | Button disabled. Loading overlay shown. POST fires. |
| Calculate -> /results | API returns 200 | Results stored in Context + sessionStorage. `router.push('/results')`. |
| Calculate -> Step N (error) | API returns 400 | Error parsed to identify failing step. Navigate to that step. Inline error shown. |
| Calculate -> Retry | API returns 500 or network error | Error message shown. Retry button enabled. |
| Page refresh | Always | Wizard resets to Step 0 with default inputs. Accepted tradeoff. |

### 6.3 Minimum Animation Duration

```typescript
const MIN_LOADING_DURATION_MS = 1500;

async function handleCalculate() {
  setIsCalculating(true);
  const start = Date.now();

  try {
    const response = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flattenInputs(inputs)),
    });

    // Ensure minimum animation duration for UX
    const elapsed = Date.now() - start;
    if (elapsed < MIN_LOADING_DURATION_MS) {
      await new Promise(r => setTimeout(r, MIN_LOADING_DURATION_MS - elapsed));
    }

    if (!response.ok) {
      // Handle 400/500 errors
      const errorBody = await response.json();
      handleApiError(response.status, errorBody);
      return;
    }

    const results = await response.json();
    setResults(results);
    sessionStorage.setItem('cybrisk-results', JSON.stringify(results));
    router.push('/results');

  } catch (error) {
    setError('Unable to connect. Check your internet connection.');
  } finally {
    setIsCalculating(false);
  }
}
```

The 1.5-second minimum loading duration exists because the Monte Carlo simulation completes in < 200ms, which would feel instantaneous and undermine user confidence in the computation. The loading animation ("Running 10,000 simulations...") communicates that real work is happening.

---

## 7. Error Handling and Fallback Chain

### 7.1 Server-Side Error Hierarchy

```
                      POST /api/calculate
                             |
                             v
                    ┌────────────────┐
                    │ try {          │
                    │   parse JSON   │── throws ──> catch: 500 "Invalid request"
                    │   validate     │── fails  ──> 400 { error, details }
                    │   map params   │── (never fails with valid input)
                    │   simulate     │── throws ──> catch: 500 "Simulation failed"
                    │   gordon-loeb  │── (never fails with valid simulation)
                    │   sanitize     │── throws (neg ALE) ──> catch: 500
                    │   respond      │── 200 { results }
                    │ } catch {      │
                    │   500 generic  │
                    │ }              │
                    └────────────────┘
```

### 7.2 Client-Side Fallback Chain

```
Primary:    POST /api/calculate (full Monte Carlo, 10K iterations)
               |
               v  (if API returns 500)
Fallback 1: Retry with same inputs (cold start recovery)
               |
               v  (if retry fails)
Fallback 2: Error screen with two options:
            [Retry Calculation] -- calls API again
            [Edit Your Inputs]  -- navigates to Step 0
               |
               v  (if user clicks Edit)
Fallback 3: Wizard resets, user can modify and resubmit
```

There is no client-side deterministic fallback calculation. The Monte Carlo engine runs only on the server. If the server is unreachable, the user must retry. This is an accepted limitation of the stateless architecture -- there is no cached or pre-computed result to fall back to.

### 7.3 Error Response Contracts

| Status | Condition | Response Body | Client Action |
|--------|-----------|---------------|---------------|
| 200 | Success | `CalculateResponse` | Store results, navigate to /results |
| 400 | Zod validation failure | `{ error: string, details: ZodIssue[] }` | Parse `details` to find failing step, navigate there, show inline error |
| 405 | Non-POST method | `{ error: "Method not allowed" }` | Should never occur from wizard (always POST) |
| 500 | Any server error | `{ error: string, message: string }` | Show retry button + edit inputs button |
| Network error | Fetch throws | No response body | "Check your connection" + retry button |

**Security rule**: Error responses never include user input data, stack traces, or internal function names. The `message` field contains only user-facing guidance ("Please try again").

---

## 8. Cross-Module Data Contracts

These contracts define the exact shape of data flowing between modules. They are the "seams" of the pipeline -- the points where one module ends and another begins.

### 8.1 Contract: Wizard -> API Route

```typescript
// Wizard flattens AssessmentInputs into a flat JSON object for the API:
interface CalculateRequest {
  industry: Industry;
  revenueBand: RevenueBand;
  employeeCount: EmployeeCount;
  dataTypes: DataType[];
  recordCount: number;
  dataSensitivity: 'low' | 'medium' | 'high';
  controls: {
    mfa: boolean;
    encryption: boolean;
    edr: boolean;
    siem: boolean;
    irPlan: boolean;
    backupDr: boolean;
    securityTraining: boolean;
    vulnScanning: boolean;
    networkSegmentation: boolean;
    waf: boolean;
  };
  threatTypes: ThreatType[];
  previousIncidents: IncidentHistory;
}
// Validated by: CalculateRequestSchema (Zod)
// Serialized as: JSON (~500 bytes)
```

### 8.2 Contract: Lookup Tables -> Monte Carlo Engine

```typescript
interface FairParams {
  tef:  { min: number; mode: number; max: number };  // events/year, min >= 0
  vuln: { min: number; mode: number; max: number };  // probability, 0 <= all <= 1
  pl:   { min: number; mode: number; max: number };  // dollars, min >= 0
  sl:   { min: number; mode: number; max: number };  // dollars, min >= 0
}
// Invariants enforced by: Gate 2 (ensurePertInvariants)
// All four tuples satisfy: min <= mode <= max
// All four tuples have: min >= 0
// vuln satisfies: max <= 1.0
```

### 8.3 Contract: Monte Carlo Engine -> Post-Processing

```typescript
interface SimulationOutput {
  ale: {
    mean: number;    // >= 0, computed via Welford's running mean
    median: number;  // >= 0, 50th percentile
    p5: number;      // >= 0, 5th percentile (optimistic bound)
    p10: number;     // >= 0, 10th percentile
    p90: number;     // >= 0, 90th percentile
    p95: number;     // >= 0, 95th percentile (Probable Maximum Loss)
  };
  histogram: Array<{ bin: string; count: number }>;  // exactly 50 elements
  exceedanceCurve: Array<{ threshold: number; probability: number }>;  // exactly 20 elements
  rawLosses: number[];  // exactly 10,000 elements, sorted ascending
}
// Ordering: p5 <= p10 <= median <= mean <= p90 <= p95
// (Holds for non-negative, right-skewed distributions)
// histogram: sum of all counts === 10,000
// exceedanceCurve: probabilities monotonically decreasing
```

### 8.4 Contract: API Route -> Client

```typescript
interface CalculateResponse {
  // Same as SimulationOutput.ale + gordonLoeb + enrichments
  // MINUS rawLosses (never sent to client)
  // PLUS metadata (iterations, timing, sources)
}
// Serialized as: JSON (~3-5 KB)
// Transfer: single HTTP response, no streaming
// Storage: sessionStorage + React Context
```

### 8.5 Cross-Module Invariants

These invariants must hold across the entire pipeline. A violation at any point indicates a bug.

| Invariant | Upstream Module | Downstream Module | Verification Point |
|-----------|----------------|-------------------|-------------------|
| `ALE >= 0` | Monte Carlo | API Route, Client | Gate 4 (sanitizeOutput) |
| `ALE <= 10x revenue` | Monte Carlo | API Route | Gate 4 (plausibility cap) |
| `Vulnerability in [0, 1]` | Lookup Tables | Monte Carlo | Gate 2 + Gate 3 (per-sample clamp) |
| `rawLosses not in response` | Monte Carlo | API Route | TypeScript type system (`CalculateResponse` excludes it) |
| `Histogram has 50 bins` | Monte Carlo | Chart Formatter | Gate 4 + TypeScript type |
| `LEC has 20 points` | Monte Carlo | Chart Formatter | Gate 4 + TypeScript type |
| `min <= mode <= max` (all PERT) | Lookup Tables | Monte Carlo | Gate 2 (ensurePertInvariants) |
| `Optimal spend <= 5% revenue` | Gordon-Loeb | API Route | Enforced inside computeGordonLoeb |
| Zod schema shared | validation.ts | Wizard + API Route | Single import source |
| Dollar format consistent | a11y-utils.ts | All client components | Single formatCompactDollar function |

---

## 9. Integration: End-to-End Pipeline Trace

A complete trace of one assessment, from first click to final chart render.

```
Time   Actor              Action                              State Change
─────  ─────              ──────                              ────────────

T+0s   User               Clicks "Assess Your Risk" on /      (navigates to /assess)

T+1s   Wizard (client)    Renders Step 0: Company Profile     step=0, inputs=defaults

T+30s  User               Selects Healthcare, $50M-$250M,     inputs.company = {
                           250-1000 employees                    industry: 'healthcare',
                                                                 revenueBand: '50m_250m',
                                                                 employeeCount: '250_1000'
                                                               }

T+32s  Wizard             Validates Step 0 via Zod            isStepValid = true
       User               Clicks "Continue"                   step = 1

T+60s  User               Selects Customer PII + Health       inputs.data = {
                           Records, 500K records, High           types: ['customer_pii',
                                                                        'health_records'],
                                                                 recordCount: 500000,
                                                                 sensitivity: 'high'
                                                               }

T+62s  Wizard             Validates Step 1                    step = 2

T+90s  User               Enables MFA, Encryption, EDR,       inputs.controls = {
                           IR Plan, Security Training            mfa: true, encryption: true,
                                                                 edr: true, irPlan: true,
                                                                 securityTraining: true,
                                                                 ... (rest false)
                                                               }

T+91s  Wizard             Step 2 always valid                 step = 3

T+110s User               Selects Ransomware + BEC/Phishing,  inputs.threats = {
                           1 prior incident                      types: ['ransomware',
                                                                         'bec_phishing'],
                                                                 previousIncidents: '1'
                                                               }

T+112s Wizard             Validates Step 3                    step = 4

T+120s User               Reviews summary. Clicks "Calculate" isCalculating = true

T+120s Client             POST /api/calculate {               HTTP request in flight
                             industry: 'healthcare',
                             revenueBand: '50m_250m',
                             ...(full flat object)
                           }

T+120s API Route          Gate 1: Zod validates               ValidatedInput created
       (server)           Gate 2: mapToFairParams()           FairParams = {
                                                                tef: {0.75, 2.52, 4.5},
                                                                vuln: {0.02, 0.12, 0.60},
                                                                pl: {75K, 100M, 300M},
                                                                sl: {15K, 50M, 250M}
                                                              }

T+120s Monte Carlo        10,000 iterations of FAIR loop      losses[10000] computed
       (server)           Sort + percentiles + histogram       SimulationOutput ready
                          ~50ms execution

T+120s Gordon-Loeb        0.3679 * 0.23 * ALE_mean            GordonLoebResult ready
       (server)           Cap at 5% of $150M

T+120s Enrichment         Risk rating = ALE/revenue ratio     riskRating, keyDrivers,
       (server)           Key drivers = disabled controls      recommendations ready
                          Recs = enable missing controls

T+120s API Route          Gate 4: Sanitize output             All invariants pass
       (server)           Assemble JSON response              ~5KB response
                          Return 200                          Serverless state destroyed

T+120s Client             Receives response                   results stored in Context
                          (but min 1.5s animation enforced)    + sessionStorage

T+122s Client             Animation completes                 router.push('/results')
                          Navigate to /results

T+122s Results Page       Reads from ResultsContext           Dashboard renders:
       (client)           Renders KPI cards, charts            - Risk Rating: HIGH
                                                               - ALE Mean: $X.XM
                                                               - P95 (PML): $X.XM
                                                               - Gordon-Loeb: $XXK
                                                               - Histogram (50 bars)
                                                               - LEC (20 points)

T+123s User               Sees complete results dashboard     (end of pipeline)
```

**Total time-to-value**: ~2 minutes of form filling + ~2 seconds of computation = under 3 minutes from click to insight.

---

## 10. Comparison: Agent Orchestration vs. CybRisk Pipeline

For teams evaluating whether to apply agent orchestration patterns to a deterministic calculation system, this comparison clarifies where the patterns align and diverge.

| Concern | Agent Orchestration | CybRisk Pipeline |
|---------|--------------------|--------------------|
| **State management** | Shared mutable state passed between agents | Immutable data flowing through pure functions |
| **Error handling** | Per-agent retry with fallbacks | Single try/catch; fail-fast on validation, clamp on edge cases |
| **Parallelism** | Independent agents run concurrently | All stages are sequential dependencies |
| **Quality control** | LLM output evaluated by quality gates; retry with feedback | Deterministic output validated by invariant checks; clamp or reject |
| **Timeout** | Per-agent timeout with fallback output | Single platform timeout (300s); pipeline completes in < 200ms |
| **Orchestrator complexity** | Class with registry, routing, and state merging | Single function with sequential calls |
| **Scalability concern** | Token costs, rate limits, context windows | CPU time for Monte Carlo (solved: < 100ms for 10K iterations) |
| **Non-determinism** | LLM outputs vary per invocation | Monte Carlo samples vary, but distribution shape is stable (CV < 5%) |
| **Testing** | Difficult (LLM outputs are stochastic and hard to assert) | Statistical tests (mean within confidence interval over N runs) |

---

## Appendix A: Pipeline Stage Reference

| Stage | Function | File | Input | Output | Time | Pure? |
|-------|----------|------|-------|--------|------|-------|
| 0 | `request.json()` | route.ts | HTTP body | `unknown` | < 1ms | N/A |
| 1 | `CalculateRequestSchema.safeParse()` | validation.ts | `unknown` | `ValidatedInput` or `ZodError` | ~2ms | Yes |
| 2 | `mapToFairParams()` | lookup-tables.ts | `ValidatedInput` | `FairParams` | < 1ms | Yes |
| 3 | `runSimulation()` | monte-carlo.ts | `FairParams`, `10000` | `SimulationOutput` | 40-60ms | No (stochastic) |
| 4 | `computeGordonLoeb()` | gordon-loeb.ts | `SimulationOutput`, `ValidatedInput` | `GordonLoebResult` | < 1ms | Yes |
| 5a | `deriveRiskRating()` | route.ts | `SimulationOutput`, `ValidatedInput` | `RiskRating` | < 1ms | Yes |
| 5b | `identifyKeyDrivers()` | route.ts | `ValidatedInput`, `SimulationOutput` | `KeyDriver[]` | < 1ms | Yes |
| 5c | `generateRecommendations()` | route.ts | `ValidatedInput`, `SimulationOutput`, `GordonLoebResult` | `Recommendation[]` | < 1ms | Yes |
| 6 | `sanitizeOutput()` | route.ts | `SimulationOutput`, `ValidatedInput` | void (mutates) | < 1ms | No (mutation) |
| 7 | `Response.json()` | route.ts | all outputs | HTTP 200 JSON | ~2ms | Yes |

---

## Appendix B: Configuration Constants

```typescript
// Pipeline configuration -- all values are compile-time constants

const PIPELINE_CONFIG = {
  // Monte Carlo
  ITERATIONS: 10_000,
  HISTOGRAM_BINS: 50,
  EXCEEDANCE_POINTS: 20,
  PERT_LAMBDA: 4,

  // Validation bounds
  MIN_RECORD_COUNT: 1_000,
  MAX_RECORD_COUNT: 100_000_000,
  MIN_VULNERABILITY: 0.02,
  MAX_VULNERABILITY: 1.0,

  // Plausibility caps
  ALE_REVENUE_CAP_MULTIPLIER: 10,
  GORDON_LOEB_REVENUE_CAP_PERCENT: 0.05,

  // Client UX
  MIN_LOADING_DURATION_MS: 1_500,

  // Metadata
  DATA_SOURCES: [
    'IBM Cost of a Data Breach 2025',
    'Verizon DBIR 2025',
    'NetDiligence Cyber Claims Study 2025',
  ],
} as const;
```

---

*Document generated by North Star Advisor -- Architecture Deep Dive: Pipeline Orchestration*
