# CybRisk: Handoff Protocol

> **Parent**: [ARCHITECTURE_BLUEPRINT.md](../ARCHITECTURE_BLUEPRINT.md)
> **Created**: 2026-02-22
> **Status**: Active

Formalized component-to-component data flow schemas, validation gates, and error recovery patterns for CybRisk's stateless calculation pipeline.

---

## 1. Handoff Protocol Overview

CybRisk is not an agentic system. There are no AI agents, no orchestrator, and no dynamic delegation. "Handoff" in this document means **typed data crossing a boundary** between two components. Every boundary has:

1. A TypeScript interface defining the exact shape of the data.
2. A validation gate (Zod schema or TypeScript compiler) that rejects malformed data before the receiving component processes it.
3. An error response that tells the sender exactly what went wrong.

The six handoff boundaries in CybRisk form a linear pipeline with one branch:

```
+------------------+     +------------------+     +-------------------+
|  Wizard State    |     |  Zod Validation  |     |  Lookup Table     |
|  Manager         | --> |  Gate            | --> |  Engine           |
|  (assess/page)   |     |  (validation.ts) |     |  (lookup-tables)  |
+------------------+     +------------------+     +-------------------+
        |                         |                        |
   [H1: Form -> API]        [H2: Raw JSON ->         [H3: Validated ->
   JSON POST body             Typed Object]            FAIR Params]
                                                           |
                                                           v
                              +-------------------+   +-------------------+
                              |  Gordon-Loeb      |<--| Monte Carlo       |
                              |  Calculator       |   | Engine            |
                              |  (gordon-loeb.ts) |   | (monte-carlo.ts)  |
                              +-------------------+   +-------------------+
                                        |                    |
                                   [H3b: Simulation    [H4: FAIR Params ->
                                    Output + Inputs ->  SimulationOutput]
                                    GL Result]
                                        |
                              +---------v---------+
                              |  API Route        |
                              |  (route.ts)       |
                              |  Assembles final  |
                              |  response JSON    |
                              +---------+---------+
                                        |
                                   [H5: API -> Client]
                                   JSON response -> sessionStorage + Context
                                        |
                              +---------v---------+
                              |  Results Context  |
                              |  (context.tsx)    |
                              +---------+---------+
                                        |
                                   [H6: Context -> Charts]
                                   Typed results -> Recharts props
                                        |
                    +-------------------+-------------------+
                    |                   |                   |
              +-----v------+    +------v------+    +------v------+
              | KPI Cards  |    | Histogram   |    | Exceedance  |
              | (results)  |    | (BarChart)  |    | (LineChart) |
              +------------+    +-------------+    +-------------+
```

**Key architectural invariant**: Data only flows forward through this pipeline. There is no backward delegation, no retry loop between components, and no circular dependency. If a handoff fails, the error propagates back to the user via HTTP status codes or React error state.

---

## 2. Handoff Schema

> **Note**: All schemas are TypeScript interfaces enforced by the compiler at build time, and Zod schemas enforced at runtime on the API boundary.

### 2.1 H1: Wizard -> API (HandoffRequest)

The wizard serializes its `AssessmentInputs` state into a JSON POST body. This is the only handoff that crosses a network boundary.

```typescript
// Sent as JSON POST body to /api/calculate
// Defined in: src/lib/validation.ts

interface WizardToApiPayload {
  // Step 1: Company Profile
  industry: Industry;            // 17 enum values
  revenueBand: RevenueBand;      // 5 enum values
  employeeCount: EmployeeCount;  // 5 enum values

  // Step 2: Data Profile
  dataTypes: DataType[];         // 1-6 items from 6 enum values
  recordCount: number;           // integer, 1,000 - 100,000,000
  dataSensitivity: 'low' | 'medium' | 'high';

  // Step 3: Security Controls
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

  // Step 4: Threat Landscape
  threatTypes: ThreatType[];     // 1-6 items from 6 enum values
  previousIncidents: '0' | '1' | '2_5' | '5_plus';
}
```

**Validation gate**: Zod `CalculateRequestSchema.safeParse()` in the API route. Client-side per-step Zod schemas provide UX feedback but are not a security boundary.

**Serialization**: `JSON.stringify()` in the wizard's `fetch()` call. `Content-Type: application/json`.

**Size**: < 1KB. All fields are primitives, short strings, or small boolean objects.

### 2.2 H2: Raw JSON -> Validated Object (ValidationGate)

The API route receives raw JSON and produces a typed, validated object. This is the security boundary of the entire application.

```typescript
// Input: unknown (raw JSON from request.json())
// Output: z.infer<typeof CalculateRequestSchema>
// Defined in: src/lib/validation.ts

// Runtime validation
const parsed = CalculateRequestSchema.safeParse(body);

if (!parsed.success) {
  // Handoff REJECTED -- return 400
  return Response.json({
    error: 'Validation failed',
    details: parsed.error.issues,  // Array of { path, message, code }
  }, { status: 400 });
}

// Handoff ACCEPTED -- parsed.data is now fully typed
const validatedInput: ValidatedCalculateRequest = parsed.data;
```

**What Zod enforces at this boundary:**

| Field | Constraint | Attack It Prevents |
|-------|-----------|-------------------|
| `industry` | Strict 17-value enum | Injection of arbitrary strings into lookup table keys |
| `recordCount` | `z.number().int().min(1000).max(100_000_000)` | Memory exhaustion from extreme values; NaN propagation |
| `dataTypes` | `z.array().min(1)` | Empty array causing division by zero in per-record cost calculation |
| `controls.*` | `z.boolean()` | Non-boolean values passed to arithmetic operations |
| All fields | `.strict()` mode (implicit via Zod object parsing) | Prototype pollution via `__proto__` or `constructor` injection |

**Failure mode**: Zod validation failure produces a 400 response. The `details` array contains structured `ZodIssue` objects that the client maps back to specific wizard steps for inline error display.

### 2.3 H3: Validated Input -> FAIR Parameters (LookupMapping)

The lookup table engine transforms human-readable questionnaire answers into PERT distribution parameters for the FAIR model.

```typescript
// Input: ValidatedCalculateRequest (from Zod)
// Output: FairParams (for Monte Carlo engine)
// Defined in: src/lib/lookup-tables.ts

interface FairParams {
  tef:  { min: number; mode: number; max: number };  // Threat Event Frequency
  vuln: { min: number; mode: number; max: number };  // Vulnerability (probability)
  pl:   { min: number; mode: number; max: number };  // Primary Loss (dollars)
  sl:   { min: number; mode: number; max: number };  // Secondary Loss (dollars)
}

function mapToFairParams(inputs: ValidatedCalculateRequest): FairParams;
```

**Output invariants enforced by the lookup engine:**

| Invariant | Enforcement | Why It Matters |
|-----------|------------|----------------|
| `min <= mode <= max` for all four PERT parameter sets | Clamp: `mode = clamp(mode, min, max)` | PERT sampling with inverted bounds produces undefined behavior in the Joehnk algorithm |
| All values `>= 0` | Clamp to 0 | Negative frequencies, probabilities, and dollar losses are meaningless |
| `vuln.max <= 1.0` | Cap at 1.0 | Vulnerability is a probability; values above 1.0 break the LEF calculation |
| `vuln.mode >= 0.02` even with all 10 controls enabled | Floor at 0.02 | No company is invulnerable; ensures non-degenerate Monte Carlo distribution |
| Non-zero ranges when `min == max` | Widen by +/- 10% | Prevents the Monte Carlo engine from producing a point estimate instead of a distribution |

**Validation gate**: TypeScript compiler. `FairParams` is a typed interface. There is no runtime Zod validation at this boundary because the lookup engine is server-side code called directly by the API route -- not an HTTP boundary. Type safety is compile-time.

**Parameter assembly pipeline (17 steps):**

```
Step 1:  baseTEF = INDUSTRY_PARAMS[industry].baseTEF
Step 2:  baseTEF.mode *= max(ATTACK_PATTERN_FREQ[selected threats])
Step 3:  baseTEF.mode *= INCIDENT_HISTORY_MULTIPLIER[previousIncidents]
Step 4:  Proportionally scale baseTEF.min and baseTEF.max to maintain shape

Step 5:  baseVuln = INDUSTRY_PARAMS[industry].baseVuln
Step 6:  baseVuln.mode += sum(CONTROL_MODIFIERS[enabled controls])
Step 7:  Clamp baseVuln.mode to [0.02, baseVuln.max]
Step 8:  Adjust baseVuln.min = max(0.01, baseVuln.mode - 0.15)

Step 9:  perRecordCost = max(PER_RECORD_COST[selected data types])
Step 10: PL.mode = perRecordCost * recordCount * revenueScale
Step 11: PL.min = PL.mode * 0.3
Step 12: PL.max = PL.mode * 3.0

Step 13: SL = f(dataSensitivity, industry regulatory exposure)
Step 14: SL.mode = PL.mode * secondaryLossRatio[industry]
Step 15: SL.min = SL.mode * 0.2
Step 16: SL.max = SL.mode * 5.0

Step 17: Return { tef, vuln, pl, sl }
```

### 2.4 H4: FAIR Params -> SimulationOutput (MonteCarloExecution)

The Monte Carlo engine takes PERT parameters and produces a full loss distribution with pre-computed statistics.

```typescript
// Input: FairParams + iterations count
// Output: SimulationOutput
// Defined in: src/lib/monte-carlo.ts

interface SimulationOutput {
  ale: {
    mean:   number;  // Arithmetic mean of 10K losses (Welford's running mean)
    median: number;  // 50th percentile
    p5:     number;  // 5th percentile (optimistic case)
    p10:    number;  // 10th percentile
    p90:    number;  // 90th percentile
    p95:    number;  // 95th percentile (Probable Maximum Loss)
  };
  histogram: Array<{ bin: string; count: number }>;         // Exactly 50 bins
  exceedanceCurve: Array<{ threshold: number; probability: number }>;  // Exactly 20 points
  rawLosses: number[];  // Sorted ascending, length === iterations. SERVER-ONLY.
}

function runSimulation(params: FairParams, iterations: number): SimulationOutput;
```

**Output invariants:**

| Invariant | Guarantee |
|-----------|-----------|
| `ale.mean >= 0` | All inputs are non-negative; product of non-negatives is non-negative |
| `ale.p5 <= ale.median <= ale.mean <= ale.p95` | Holds for non-negative, right-skewed distributions (FAIR losses are always right-skewed) |
| `rawLosses.length === iterations` | Fixed-length allocation; no early termination |
| `rawLosses` sorted ascending | Sorted after loop for percentile and LEC computation |
| `histogram.length === 50` | Hardcoded bin count. `sum(histogram[*].count) === iterations` |
| `exceedanceCurve.length === 20` | Hardcoded point count. Monotonically decreasing probability as threshold increases |

**Critical boundary rule**: `rawLosses` never crosses the API response boundary. It exists only for internal post-processing (percentiles, histogram binning, LEC computation). The API route accesses `ale`, `histogram`, and `exceedanceCurve` from the output and discards `rawLosses`. This is enforced by the `CalculateResponse` interface which does not include `rawLosses`.

### 2.5 H5: API -> Client (HTTPResponse)

The API route assembles the final JSON response from Monte Carlo output, Gordon-Loeb computation, key drivers, and recommendations.

```typescript
// Input: SimulationOutput + GordonLoebResult + derived analytics
// Output: CalculateResponse (JSON over HTTP)
// Defined in: src/lib/types.ts

interface CalculateResponse {
  riskRating: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  ale: {
    mean: number;
    median: number;
    p5: number;
    p10: number;
    p90: number;
    p95: number;
  };
  pml: number;  // 95th percentile (Probable Maximum Loss)
  gordonLoeb: {
    optimalSpend: number;
    currentRisk: number;
    residualRisk: number;
  };
  histogram: Array<{ bin: string; count: number }>;  // 50 bins
  exceedanceCurve: Array<{ threshold: number; probability: number }>;  // 20 points
  keyDrivers: Array<{ name: string; impact: 'high' | 'medium' | 'low' }>;
  recommendations: Array<{ action: string; estimatedSavings: number }>;
  metadata: {
    iterations: number;          // Always 10,000
    executionTimeMs: number;     // performance.now() delta
    dataSources: string[];       // ["IBM Cost of a Data Breach 2025", ...]
  };
}
```

**Pre-transmission sanity checks** (performed by API route before `Response.json()`):

| Check | Action on Failure |
|-------|------------------|
| `ale.mean < 0` | Throw (should never happen). Return 500. |
| `ale.mean > 10 * revenueMidpoint` | Cap at 10x revenue. Log warning (no user data in log). |
| All percentiles non-negative | Throw if any negative. Return 500. |
| `histogram.length !== 50` | Throw. Indicates Monte Carlo engine bug. Return 500. |
| `exceedanceCurve.length !== 20` | Throw. Indicates Monte Carlo engine bug. Return 500. |

**HTTP semantics:**

| Status | Condition | Body Shape |
|--------|-----------|------------|
| 200 | Success | `CalculateResponse` |
| 400 | Zod validation failure | `{ error: string, details: ZodIssue[] }` |
| 405 | Non-POST method | `{ error: "Method not allowed" }` |
| 500 | Any uncaught exception or sanity check failure | `{ error: string, message: string }` |

**Response size**: 3-5KB JSON. Well within Vercel's response size limits.

**Client handling**:

```typescript
// In wizard's handleCalculate:
const response = await fetch('/api/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(flattenInputs(inputs)),
});

if (response.ok) {
  const results: CalculateResponse = await response.json();
  setResults(results);                                    // React Context
  sessionStorage.setItem('cybrisk-results', JSON.stringify(results));  // Persistence
  router.push('/results');
} else if (response.status === 400) {
  const { details } = await response.json();
  mapZodErrorsToSteps(details);  // Navigate to offending step
} else {
  setError('Calculation failed. Please try again.');
}
```

### 2.6 H6: Context -> Charts (ReactProps)

The results page reads from React Context (or sessionStorage on refresh) and passes typed data slices to chart components.

```typescript
// Input: CalculateResponse from ResultsContext
// Output: Recharts-compatible props per component
// Defined in: src/components/results/*.tsx

// KPI Cards receive:
interface KpiCardProps {
  label: string;        // "Expected Annual Loss (Mean)"
  value: number;        // 1_250_000
  format: 'dollar';     // Determines formatCompactDollar() usage
  trend?: 'up' | 'down' | 'neutral';
}

// Histogram receives:
interface LossDistributionProps {
  data: Array<{ bin: string; count: number }>;  // 50 elements, direct pass-through
}

// Exceedance Curve receives:
interface LossExceedanceProps {
  data: Array<{ threshold: number; probability: number }>;  // 20 elements, direct pass-through
}

// Key Drivers receives:
interface KeyDriversProps {
  drivers: Array<{ name: string; impact: 'high' | 'medium' | 'low' }>;
}

// Recommendations receives:
interface RecommendationsProps {
  recommendations: Array<{ action: string; estimatedSavings: number }>;
}
```

**Validation gate**: TypeScript compiler. There is no runtime validation at this boundary. The data was validated at the API boundary (H2) and has not been modified since. The `CalculateResponse` type flows through React Context unaltered.

**Missing data handling**: If `results` is `null` in Context and sessionStorage, the results page redirects to `/assess`. Chart components never receive `null` -- the redirect fires before rendering.

### 2.7 HandoffDecision Schema (Adapted)

CybRisk does not have dynamic handoff decisions between agents. Instead, the analogous concept is **per-step validation gating** in the wizard:

```typescript
// Each wizard step implicitly makes a "handoff decision":
// Can this step's data proceed to the next step?

interface StepValidationDecision {
  canProceed: boolean;
  confidence: 1;  // Always 1 -- validation is deterministic, not probabilistic

  // If canProceed is false:
  errors: Array<{
    field: string;       // "industry", "recordCount", etc.
    message: string;     // "Select an industry", "Record count must be at least 1,000"
    step: number;        // Which wizard step owns this field
  }>;
}
```

This is computed by running the per-step Zod schema:

```typescript
const decision: StepValidationDecision = {
  canProceed: stepSchemas[step].safeParse(getCurrentStepData()).success,
  confidence: 1,
  errors: stepSchemas[step].safeParse(getCurrentStepData()).error?.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    step: currentStep,
  })) ?? [],
};
```

---

## 3. Handoff Routes

### 3.1 Valid Data Flow Paths

| Source Component | Target Component | Handoff ID | Data Shape | Typical Trigger |
|-----------------|-----------------|------------|------------|-----------------|
| Wizard State Manager | API Route (via HTTP) | H1 | `WizardToApiPayload` (JSON) | User clicks "Calculate" on Step 5 |
| API Route (Zod layer) | Lookup Table Engine | H2 -> H3 | `ValidatedCalculateRequest` -> `FairParams` | Successful Zod parse |
| Lookup Table Engine | Monte Carlo Engine | H3 -> H4 | `FairParams` -> `SimulationOutput` | Always (sequential pipeline) |
| Monte Carlo Engine | Gordon-Loeb Calculator | H4 -> H3b | `SimulationOutput` + `ValidatedCalculateRequest` -> `GordonLoebResult` | Always (sequential pipeline) |
| API Route | Client (via HTTP) | H5 | `CalculateResponse` (JSON) | Successful computation |
| Results Context | Chart Components | H6 | Typed props sliced from `CalculateResponse` | Results page render |
| Zod Validation | Client (via HTTP) | H2-err | `{ error, details: ZodIssue[] }` | Validation failure (400) |
| API Route | Client (via HTTP) | H5-err | `{ error, message }` | Computation failure (500) |

### 3.2 Invalid Data Flow Paths (Anti-patterns)

| Invalid Path | Why Prohibited |
|--------------|----------------|
| Chart Component -> API Route | Charts are read-only renderers. They never trigger recalculation. If the user wants new results, they navigate back to `/assess` and start over. |
| Results Context -> Wizard State | Results do not flow backward into wizard inputs. The wizard owns its own state. Starting a new assessment clears results via `clearResults()`. |
| Monte Carlo Engine -> Lookup Tables | The MC engine does not request new parameters mid-simulation. All PERT parameters are resolved before the simulation loop begins. |
| Client -> API with `rawLosses` | The 10K-element loss array never leaves the server. The `CalculateResponse` interface explicitly excludes it. If a developer adds `rawLosses` to the response, TypeScript compilation fails because `CalculateResponse` does not define it. |
| Wizard Step N -> Wizard Step M (directly) | Steps communicate exclusively through the parent `useState`. Step 3 (Security Controls) cannot read Step 1 (Company Profile) data directly -- it receives its slice from the parent. The exception is Step 4 (Threat Landscape), which uses `inputs.company.industry` for smart defaults, but this data flows through the parent, not peer-to-peer. |

### 3.3 Handoff Limits

```typescript
// CybRisk has no dynamic handoffs, retries, or delegation loops.
// These limits are expressed as architectural constraints instead.

const PIPELINE_CONSTRAINTS = {
  // Maximum API calls per assessment
  maxApiCallsPerAssessment: 1,  // Single POST to /api/calculate. No polling, no streaming.

  // Maximum Monte Carlo iterations
  maxIterations: 10_000,  // Hardcoded in API route. Not user-configurable.

  // API timeout
  apiTimeoutMs: 300_000,  // Vercel Fluid Compute limit. Actual execution: < 200ms.

  // Client-side fetch timeout
  clientFetchTimeoutMs: 30_000,  // AbortController timeout. Covers cold start + computation.

  // Maximum response payload size
  maxResponseSizeBytes: 50_000,  // ~5KB actual. 50KB budget provides headroom.

  // sessionStorage item size limit
  maxSessionStorageSizeBytes: 10_000,  // ~5KB actual. Well within browser limits.
};
```

---

## 4. Handoff Implementation

### 4.1 Pipeline Orchestrator (API Route)

The API route (`src/app/api/calculate/route.ts`) is the sole orchestrator. It calls each server-side module in sequence. There is no HandoffManager class because there is no dynamic routing -- the pipeline is fixed.

```typescript
// src/app/api/calculate/route.ts
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const start = performance.now();

  // ── H1: Receive wizard payload ──────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ── H2: Validation gate ─────────────────────────────────────
  const parsed = CalculateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    );
  }
  const inputs = parsed.data;

  try {
    // ── H3: Lookup table mapping ────────────────────────────────
    const fairParams = mapToFairParams(inputs);

    // ── H4: Monte Carlo simulation ──────────────────────────────
    const simulation = runSimulation(fairParams, 10_000);

    // ── H3b: Gordon-Loeb calculation ────────────────────────────
    const gordonLoeb = computeGordonLoeb(simulation, inputs);

    // ── Sanity checks before H5 ─────────────────────────────────
    if (simulation.ale.mean < 0) {
      throw new Error('Negative ALE');
    }
    const revenueCap = getRevenueMidpoint(inputs.revenueBand) * 10;
    if (simulation.ale.mean > revenueCap) {
      simulation.ale.mean = revenueCap;
      console.warn('ALE capped at 10x revenue');
    }

    // ── H5: Build and return response ───────────────────────────
    const elapsed = performance.now() - start;
    const response: CalculateResponse = {
      riskRating: deriveRiskRating(simulation, inputs),
      ale: simulation.ale,
      pml: simulation.ale.p95,
      gordonLoeb,
      histogram: simulation.histogram,
      exceedanceCurve: simulation.exceedanceCurve,
      keyDrivers: identifyKeyDrivers(inputs, simulation),
      recommendations: generateRecommendations(inputs, simulation, gordonLoeb),
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
    // ── H5-err: Computation failure ─────────────────────────────
    console.error('Simulation error:', error);
    return Response.json(
      { error: 'Simulation failed', message: 'Please try again' },
      { status: 500 }
    );
  }
}
```

### 4.2 Client-Side Handoff Integration (Wizard -> Results)

The wizard component handles the H1 outbound call and the H5 inbound response, then performs the H5 -> H6 transition via React Context and router navigation.

```typescript
// src/app/assess/page.tsx (simplified)

async function handleCalculate() {
  setIsCalculating(true);
  setError(null);

  try {
    // ── H1: Send to API ───────────────────────────────────────
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flattenInputs(inputs)),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // ── H5: Receive response ──────────────────────────────────
    if (response.ok) {
      const results: CalculateResponse = await response.json();

      // ── H5 -> H6: Store for results page ────────────────────
      setResults(results);  // React Context
      try {
        sessionStorage.setItem('cybrisk-results', JSON.stringify(results));
      } catch {
        // sessionStorage unavailable; Context still works for this session
      }

      // Minimum animation duration for UX (simulation < 200ms feels instant)
      await new Promise(resolve => setTimeout(resolve, 1500));
      router.push('/results');

    } else if (response.status === 400) {
      // ── H2-err: Validation failure ──────────────────────────
      const { details } = await response.json();
      const targetStep = mapZodErrorToStep(details);
      setStep(targetStep);
      setError(formatValidationError(details));

    } else {
      // ── H5-err: Server error ────────────────────────────────
      setError('Calculation failed. Please try again.');
    }

  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      setError('Request timed out. Please try again.');
    } else {
      setError('Unable to connect. Check your internet connection.');
    }
  } finally {
    setIsCalculating(false);
  }
}
```

### 4.3 Results Page Data Distribution (H6)

The results page reads from Context and distributes typed slices to child components:

```typescript
// src/app/results/page.tsx (simplified)

export default function ResultsPage() {
  const { results } = useResults();
  const router = useRouter();

  // ── Missing results guard ─────────────────────────────────
  useEffect(() => {
    if (results === null) {
      router.push('/assess');
    }
  }, [results, router]);

  if (!results) return null;

  // ── H6: Distribute to chart components ────────────────────
  return (
    <main>
      <RiskRatingBadge rating={results.riskRating} />

      <KpiCard label="Expected Annual Loss" value={results.ale.mean} format="dollar" />
      <KpiCard label="Probable Maximum Loss" value={results.pml} format="dollar" />
      <KpiCard label="Optimal Security Spend" value={results.gordonLoeb.optimalSpend} format="dollar" />
      <KpiCard label="Residual Risk" value={results.gordonLoeb.residualRisk} format="dollar" />

      <ChartContainer title="Loss Distribution" description="Monte Carlo simulation histogram">
        <LossDistribution data={results.histogram} />
      </ChartContainer>

      <ChartContainer title="Loss Exceedance Curve" description="Probability of exceeding loss thresholds">
        <LossExceedance data={results.exceedanceCurve} />
      </ChartContainer>

      <KeyDrivers drivers={results.keyDrivers} />
      <Recommendations recommendations={results.recommendations} />
      <Methodology metadata={results.metadata} />
    </main>
  );
}
```

---

## 5. Handoff Observability

### 5.1 Trace Attributes

CybRisk is a hackathon project deployed on Vercel Hobby. There is no OpenTelemetry, no Datadog, and no custom tracing infrastructure. Observability is limited to what Vercel provides natively plus strategic `console.warn` / `console.error` calls.

**Vercel-provided observability:**

| Signal | Source | What It Shows |
|--------|--------|---------------|
| Function invocation count | Vercel Dashboard > Functions | How many times `/api/calculate` was called |
| Function duration (p50, p95, p99) | Vercel Dashboard > Functions | End-to-end API latency including cold start |
| Function errors | Vercel Dashboard > Functions | 500-level responses |
| HTTP status distribution | Vercel Dashboard > Analytics | Ratio of 200/400/500 responses |

**Application-level signals (embedded in response metadata):**

```typescript
// Every successful response includes:
metadata: {
  iterations: 10_000,            // Confirms simulation ran in full
  executionTimeMs: number,       // Server-side computation time (excludes network)
  dataSources: string[],         // Confirms which data sources were used
}
```

The client can log `executionTimeMs` to the browser console for debugging. In a production system, this would be sent to an analytics endpoint.

### 5.2 Metrics (Conceptual)

These metrics would be implemented post-hackathon with a proper observability stack:

| Metric | Type | Description |
|--------|------|-------------|
| `pipeline.total_requests` | Counter | Total POST requests to `/api/calculate` |
| `pipeline.validation_failures` | Counter | Requests rejected by Zod (400 responses) |
| `pipeline.computation_errors` | Counter | Uncaught exceptions during simulation (500 responses) |
| `pipeline.duration_ms` | Histogram | End-to-end API latency (cold start + computation) |
| `pipeline.mc_duration_ms` | Histogram | Monte Carlo simulation time only (from `performance.now()` delta) |
| `pipeline.ale_mean` | Histogram | Distribution of ALE values across all calculations (for calibration) |
| `pipeline.ale_capped` | Counter | How often ALE hits the 10x revenue plausibility cap |
| `wizard.step_completions` | Counter (by step) | Drop-off analysis: how many users complete each wizard step |
| `wizard.submit_attempts` | Counter | How many users click "Calculate" |
| `results.page_loads` | Counter | How many users reach the results page |
| `results.context_fallback` | Counter | How many times sessionStorage fallback was used (page refresh) |

### 5.3 Alerting Thresholds (Post-Hackathon)

| Condition | Severity | Action |
|-----------|----------|--------|
| `pipeline.computation_errors` > 5 in 5 min | Warning | Review server logs for uncaught exceptions. Check if a new input combination produces invalid PERT parameters. |
| `pipeline.validation_failures` > 50% of requests in 1 hr | Warning | Likely a client-side bug sending malformed data. Check recent deploy for wizard form regression. |
| `pipeline.duration_ms` p95 > 5,000ms | Warning | Investigate cold start frequency. Consider provisioned concurrency. |
| `pipeline.ale_capped` > 10% of requests | Info | Lookup tables may be producing implausibly high losses for certain input combinations. Review parameter scaling. |
| `wizard.step_completions[4] / wizard.step_completions[0]` < 30% | Info | High wizard abandonment. Review UX friction in middle steps. |

---

## 6. Error Recovery

### 6.1 Error Propagation Model

CybRisk uses a **fail-fast, fail-loud** error model. Errors propagate backward through the pipeline as HTTP status codes and structured error objects. There is no retry logic, no fallback computation, and no degraded mode in the MVP.

```
Error in Lookup Tables     Error in Monte Carlo      Error in Gordon-Loeb
         |                         |                         |
         v                         v                         v
+------------------------------------------------------------------+
|                    API Route try/catch                             |
|  Catches all three. Returns 500 with generic message.            |
|  NEVER includes user input or stack trace in response.            |
+------------------------------------------------------------------+
         |
         v
+------------------------------------------------------------------+
|                    Client Error Handler                            |
|  Displays: "Calculation failed. Please try again."               |
|  Actions: [Retry] [Edit Your Inputs]                             |
+------------------------------------------------------------------+
```

**Zod validation errors take a different path:**

```
Malformed input detected by Zod
         |
         v
+------------------------------------------------------------------+
|                    API Route (before try/catch)                    |
|  Returns 400 with ZodIssue[] details.                            |
+------------------------------------------------------------------+
         |
         v
+------------------------------------------------------------------+
|                    Client Validation Error Handler                 |
|  Maps ZodIssue.path to wizard step number.                       |
|  Navigates to offending step.                                    |
|  Displays inline error next to the specific field.               |
+------------------------------------------------------------------+
```

### 6.2 Recovery Strategies

| Error Type | HTTP Status | Client Behavior | User Action |
|-----------|-------------|-----------------|-------------|
| **Zod validation failure** | 400 | Navigate to offending wizard step. Show inline error. | Fix the highlighted field and resubmit. |
| **Simulation error** | 500 | Show error banner with retry button. | Click "Try Again" (re-sends same payload) or "Edit Your Inputs" (navigate to wizard). |
| **Network timeout** | N/A (AbortError) | Show "Request timed out" message. | Click "Try Again" (cold start usually resolves on second attempt). |
| **Network offline** | N/A (TypeError) | Show "Check your connection" message. | Reconnect and click "Try Again". |
| **Results page without data** | N/A | Automatic redirect to `/assess`. | Start a new assessment. |
| **Corrupt sessionStorage** | N/A | `JSON.parse` try/catch. Treat as "no results". Redirect to `/assess`. | Start a new assessment. |
| **sessionStorage unavailable** | N/A | `setItem` try/catch. Context still works for current navigation. | Results will not survive page refresh. No user action needed. |

### 6.3 Fallback Chain (Post-Hackathon)

The hackathon MVP has no fallback computation. Post-hackathon, the following fallback chain would be implemented:

```
Primary:    Monte Carlo API (10K iterations)
               |
               v  (if API fails)
Fallback 1: Simplified deterministic calculation
            (mean TEF * mean Vuln * mean LM, no distribution)
            Returns point estimate instead of distribution.
            Charts show "Simplified calculation" disclaimer.
               |
               v  (if lookup tables corrupt)
Fallback 2: Cached example results
            Pre-computed sample for "generic mid-market company"
            (healthcare, $50M-$250M, 100K records, 5 controls enabled).
            Results page shows "Example results" banner.
               |
               v  (if all else fails)
Fallback 3: Error state with retry + edit buttons.
            No stale or fabricated data shown.
```

### 6.4 What CybRisk Does Not Need

The template's recovery patterns for agentic systems do not apply. Documenting why:

| Agentic Pattern | CybRisk Equivalent | Why Not Needed |
|----------------|--------------------|-|
| **Retry different target agent** | N/A | There is one computation pipeline. There is no "different agent" to route to. If the Monte Carlo engine fails, there is no alternative engine to try. |
| **Handoff limit exceeded** | N/A | There is exactly one handoff per assessment (wizard -> API). Limits are meaningless with a count of 1. |
| **Circular handoff detection** | N/A | The pipeline is linear. Data flows in one direction. There are no cycles in the dependency graph. |
| **Orchestrator escalation** | N/A | There is no orchestrator agent. The API route is a fixed-sequence function, not a decision-making coordinator. |
| **Human-in-the-loop escalation** | User retries or edits inputs | The "human" is already in the loop -- they are the sole user of the system. Errors return control to them immediately via the UI. |
| **Agent confidence scoring** | Zod `.safeParse().success` | Validation is binary (pass/fail), not probabilistic. There is no confidence threshold to tune. |

---

## Validation Schema

```yaml
# HANDOFF_PROTOCOL validation gate
inputs_required:
  - arch.component_topology: from ARCHITECTURE_BLUEPRINT.md (Section 2, 3, 4)
  - component.specifications: from AGENT_PROMPTS.md (all 8 modules)

outputs_produced:
  - handoff.h1_schema: Wizard -> API payload defined (WizardToApiPayload)
  - handoff.h2_schema: Zod validation gate defined (CalculateRequestSchema)
  - handoff.h3_schema: Lookup mapping defined (ValidatedCalculateRequest -> FairParams)
  - handoff.h4_schema: MC execution defined (FairParams -> SimulationOutput)
  - handoff.h5_schema: API response defined (CalculateResponse)
  - handoff.h6_schema: Context -> Charts defined (typed React props)
  - handoff.routes: 8 valid paths + 5 anti-patterns documented
  - handoff.constraints: Pipeline limits defined (1 API call, 10K iterations, 30s timeout)
  - handoff.observability: Vercel-native signals + conceptual metrics defined
  - handoff.error_recovery: 7 error types with specific recovery strategies

validation_gate:
  required_sections:
    - "Handoff Protocol Overview"        # Present (Section 1)
    - "Handoff Schema"                   # Present (Section 2, 7 schemas)
    - "Handoff Routes"                   # Present (Section 3, valid + invalid paths)
    - "Handoff Implementation"           # Present (Section 4, API route + client + results)
    - "Handoff Observability"            # Present (Section 5, Vercel + conceptual metrics)
    - "Error Recovery"                   # Present (Section 6, 7 error types + fallback chain)

  minimum_content:
    schemas: 7                           # H1-H6 + StepValidationDecision
    valid_routes: 8                      # Table 3.1
    invalid_routes: 5                    # Table 3.2
    recovery_strategies: 7               # Table 6.2

cross_references:
  - components: must_match: ARCHITECTURE_BLUEPRINT.md Section 2-4 topology
  - interfaces: must_match: AGENT_PROMPTS.md module input/output contracts
  - error_codes: must_match: ARCHITECTURE_BLUEPRINT.md Section 5.1 error responses
  - type_system: must_match: ARCHITECTURE_BLUEPRINT.md Section 13

quality_checks:
  - linear_pipeline: verified (no circular dependencies)
  - validation_boundary: HTTP boundary protected by Zod
  - rawLosses_containment: never crosses API response boundary
  - error_propagation: all errors reach user with actionable recovery
  - observability: Vercel-native + conceptual post-hackathon metrics
```

**Verification checklist:**

- [x] All 6 handoff boundaries (H1-H6) have schemas with TypeScript interfaces
- [x] Valid data flow paths cover all component-to-component connections (8 paths)
- [x] Invalid data flow paths (anti-patterns) documented (5 anti-patterns)
- [x] Pipeline is verified as linear DAG with no cycles
- [x] Zod validation gate at HTTP boundary documented with specific constraints
- [x] `rawLosses` containment rule documented (never crosses API boundary)
- [x] Error propagation model documented (fail-fast, fail-loud)
- [x] 7 error recovery strategies with specific user actions
- [x] Observability approach documented (Vercel-native for MVP, conceptual metrics for post-hackathon)
- [x] Fallback chain documented (post-hackathon)
- [x] Explicit documentation of why agentic patterns do not apply

---

*Document generated by North Star Advisor -- Phase 8: Handoff Protocol (Architecture Deep Dive)*
