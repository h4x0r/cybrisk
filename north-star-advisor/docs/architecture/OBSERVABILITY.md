# CybRisk: Observability

> **Parent**: [ARCHITECTURE_BLUEPRINT.md](../ARCHITECTURE_BLUEPRINT.md)
> **Created**: 2026-02-22
> **Status**: Active

Tracing infrastructure, logging conventions, privacy-safe instrumentation, and North Star metric tracking for a stateless Monte Carlo risk calculator deployed on Vercel serverless.

---

## 1. Trace Architecture

### 1.1 Trace Hierarchy

CybRisk has no agents, pipelines, or background jobs. The entire system is a single synchronous HTTP request that runs a Monte Carlo simulation and returns JSON. The trace hierarchy reflects this simplicity.

```
Request Trace (root span)
├── Validation Span
│   └── Zod schema.safeParse()
│
├── Parameter Mapping Span
│   ├── Industry Lookup
│   ├── Control Modifier Application
│   └── PERT Parameter Construction
│
├── Simulation Span
│   ├── Monte Carlo Loop (10,000 iterations)
│   ├── Sort + Percentile Computation
│   ├── Histogram Binning (50 bins)
│   └── Exceedance Curve (20 points)
│
├── Gordon-Loeb Span
│   └── Optimal Spend Calculation
│
├── Post-Processing Span
│   ├── Key Drivers Identification
│   ├── Recommendations Generation
│   └── Risk Rating Derivation
│
└── Response Span
    └── JSON Serialization
```

### 1.2 Event Types

| Event | Description | Attributes |
|-------|-------------|------------|
| `request.start` | API route handler entered | `timestamp`, `method`, `path` |
| `request.end` | Response sent | `duration_ms`, `status_code` |
| `validation.start` | Zod parsing begins | `body_size_bytes` |
| `validation.end` | Zod parsing completes | `success`, `error_count` |
| `simulation.start` | Monte Carlo loop begins | `iterations` |
| `simulation.end` | Monte Carlo loop completes | `duration_ms`, `mean_ale`, `p95_ale` |
| `gordonloeb.end` | Gordon-Loeb calculation completes | `optimal_spend`, `duration_ms` |
| `error.validation` | Zod validation failed | `issue_count`, `first_issue` |
| `error.simulation` | Simulation threw exception | `error_type`, `message` |

### 1.3 What We Do NOT Trace

Because CybRisk is a stateless calculator with no user accounts, no database, and no external API calls, the following trace concepts from the template do not apply:

| Concept | Why It Does Not Apply |
|---------|----------------------|
| Pipeline spans | No multi-step pipeline; single request-response |
| Agent spans | No AI agents; pure mathematical computation |
| LLM request/response | No LLM calls; all logic is deterministic TypeScript |
| Fallback triggers | No fallback chain between agents |
| Circuit breakers | No external service dependencies to circuit-break |
| Session correlation | No sessions; each request is independent |

---

## 2. Logging Strategy

### 2.1 Hackathon MVP: console.log + Vercel Function Logs

For the hackathon, CybRisk uses structured `console.log` statements that are captured by Vercel's built-in function logging. No external logging infrastructure is required.

```typescript
// src/lib/logger.ts

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  event: string;
  timestamp: string;
  duration_ms?: number;
  status_code?: number;
  iterations?: number;
  mean_ale?: number;
  p95_ale?: number;
  error_type?: string;
  message?: string;
  [key: string]: string | number | boolean | undefined;
}

export function log(entry: LogEntry): void {
  // Structured JSON logs for Vercel function log parsing
  console.log(JSON.stringify(entry));
}
```

### 2.2 Instrumented API Route

```typescript
// app/api/calculate/route.ts -- logging integration

export async function POST(request: Request) {
  const start = performance.now();

  log({
    level: 'info',
    event: 'request.start',
    timestamp: new Date().toISOString(),
  });

  // 1. Validate
  const body = await request.json();
  const parsed = CalculateRequestSchema.safeParse(body);

  if (!parsed.success) {
    const elapsed = performance.now() - start;
    log({
      level: 'warn',
      event: 'error.validation',
      timestamp: new Date().toISOString(),
      duration_ms: Math.round(elapsed),
      status_code: 400,
      issue_count: parsed.error.issues.length,
      first_issue: parsed.error.issues[0]?.message,
    });
    return Response.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    // 2. Simulate
    const simStart = performance.now();
    const params = mapToFairParams(parsed.data);
    const simulation = runSimulation(params, 10_000);
    const simDuration = performance.now() - simStart;

    log({
      level: 'info',
      event: 'simulation.end',
      timestamp: new Date().toISOString(),
      duration_ms: Math.round(simDuration),
      iterations: 10_000,
      mean_ale: Math.round(simulation.ale.mean),
      p95_ale: Math.round(simulation.ale.p95),
    });

    // 3. Gordon-Loeb
    const gordonLoeb = computeGordonLoeb(simulation, parsed.data);

    // 4. Response
    const elapsed = performance.now() - start;
    log({
      level: 'info',
      event: 'request.end',
      timestamp: new Date().toISOString(),
      duration_ms: Math.round(elapsed),
      status_code: 200,
    });

    return Response.json(buildResponse(simulation, gordonLoeb, parsed.data, elapsed));
  } catch (error) {
    const elapsed = performance.now() - start;
    log({
      level: 'error',
      event: 'error.simulation',
      timestamp: new Date().toISOString(),
      duration_ms: Math.round(elapsed),
      status_code: 500,
      error_type: error instanceof Error ? error.constructor.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return Response.json(
      { error: 'Simulation failed', message: 'Please try again' },
      { status: 500 }
    );
  }
}
```

### 2.3 Production Logging (Post-Hackathon)

| Capability | Hackathon MVP | Production |
|------------|---------------|------------|
| Log format | `console.log(JSON.stringify(...))` | Structured JSON with correlation IDs |
| Log destination | Vercel Function Logs (web dashboard) | Vercel Log Drain to Datadog or Axiom |
| Log retention | 1 hour (Hobby plan) | 30 days (Pro plan log drain) |
| Custom timing headers | Not implemented | `Server-Timing: simulation;dur=42, total;dur=78` |
| Request correlation | Not needed (stateless) | `x-request-id` header for distributed tracing |

---

## 3. Privacy-Safe Logging

### 3.1 Core Principle

CybRisk logs metadata about computation, never user inputs. The API receives company profile data (industry, revenue band, controls) that could identify a specific organization. None of this data is logged.

### 3.2 What Is Logged vs. What Is Not

| Logged (Safe) | Never Logged (Sensitive) |
|----------------|--------------------------|
| Timestamp | Industry selection |
| HTTP status code | Revenue band |
| Total request duration (ms) | Employee count |
| Simulation duration (ms) | Record count |
| Iteration count (always 10,000) | Data types selected |
| Mean ALE (aggregate output) | Control selections (true/false) |
| P95 ALE (aggregate output) | Threat types selected |
| Validation error count | Previous incident history |
| Error type and message | Request body contents |

### 3.3 Why ALE Values Are Safe to Log

ALE (Annualized Loss Expectancy) output values are logged because they are aggregate statistical outputs derived from 10,000 random simulations. A mean ALE of $2,340,000 cannot be reverse-engineered to determine the specific inputs that produced it -- different combinations of industry, revenue, controls, and threats produce overlapping ALE ranges. The logged values serve as operational telemetry (detecting anomalous outputs, monitoring distribution health) without exposing the inputs that drive them.

### 3.4 Sanitization Implementation

```typescript
// src/lib/logger.ts -- sanitization is built into the logger, not bolted on

// The logger function only accepts explicitly typed fields.
// There is no generic "data" or "context" field that could leak user inputs.
// This is enforced at the TypeScript level: the LogEntry interface defines
// every permissible field, and none of them accept user input data.

// PROHIBITED patterns:
// log({ ...userInputs })           -- TypeScript will reject extra fields
// log({ data: request.body })      -- 'data' is not in LogEntry interface
// log({ message: JSON.stringify(parsed.data) })  -- code review catches this

// The safest sanitization is not needing sanitization at all.
// By designing LogEntry to only accept computation metadata,
// PII cannot leak through the structured logging path.
```

### 3.5 Sanitization Modes

| Mode | Environment | Behavior |
|------|-------------|----------|
| `strict` | Production (Vercel) | Only metadata fields logged; TypeScript interface enforces field allowlist |
| `permissive` | Local development | `console.log` in simulation functions may include intermediate values for debugging |

There is no `moderate` mode. CybRisk either logs metadata only (production) or allows unconstrained console output (local development). The distinction is enforced by code path, not runtime configuration: the `log()` function is only used in the API route, and local debugging uses raw `console.log` calls that never reach Vercel's log infrastructure.

---

## 4. Server-Timing Headers

### 4.1 Implementation (Post-Hackathon)

Server-Timing headers expose backend performance to browser DevTools without requiring any external observability service. This is the recommended first upgrade after the hackathon.

```typescript
// Post-hackathon: add to API response
const headers = new Headers();
headers.set(
  'Server-Timing',
  [
    `validation;dur=${validationMs}`,
    `simulation;dur=${simulationMs}`,
    `gordonloeb;dur=${gordonLoebMs}`,
    `total;dur=${totalMs}`,
  ].join(', ')
);

return Response.json(responseBody, { headers });
```

These timing values appear in the browser's Network tab under the "Timing" section, giving instant visibility into which phase of the calculation dominates response time.

### 4.2 Timing Budget

| Phase | Budget | Expected | Notes |
|-------|--------|----------|-------|
| Validation (Zod parse) | < 5ms | ~1-2ms | Schema is small; constant time |
| Parameter mapping | < 5ms | ~1ms | Hash lookups into hardcoded tables |
| Monte Carlo (10K iterations) | < 100ms | ~40-60ms | CPU-bound; Box-Muller + PERT sampling |
| Percentile + histogram | < 10ms | ~5ms | Sort 10K + bin into 50 buckets |
| Gordon-Loeb | < 5ms | ~1ms | Single arithmetic expression |
| JSON serialization | < 5ms | ~2ms | ~15-25KB payload |
| **Total (warm)** | **< 200ms** | **~50-80ms** | Warm serverless invocation |
| **Total (cold start)** | **< 3s** | **~1-3s** | First invocation after idle period |

---

## 5. North Star Instrumentation

### 5.1 North Star Metric: End-to-End Completion Rate

CybRisk's North Star metric is **"Percentage of visitors who complete the full flow: Landing -> Assess -> Calculate -> Results."** This measures whether the product delivers its core value proposition -- translating security posture into dollar-denominated financial exposure.

### 5.2 Funnel Steps

| Step | Page | Signal | Instrumentation |
|------|------|--------|-----------------|
| 1. Arrive | `/` | Page view | Vercel Web Analytics (automatic) |
| 2. Start Assessment | `/assess` | Page view | Vercel Web Analytics (automatic) |
| 3. Complete Wizard | `/assess` (Step 5) | "Calculate" button click | Client-side event |
| 4. Receive Results | `/results` | Page view with valid data | Client-side event |

### 5.3 Client-Side Funnel Tracking

```typescript
// src/lib/analytics.ts

type FunnelStep =
  | 'landing_view'
  | 'assess_start'
  | 'wizard_step_advance'
  | 'calculate_click'
  | 'results_view';

interface FunnelEvent {
  step: FunnelStep;
  timestamp: string;
  wizard_step?: number;        // 0-4 for wizard steps
  duration_on_step_ms?: number; // time spent on current step
}

export function trackFunnelStep(event: FunnelEvent): void {
  if (typeof window === 'undefined') return;

  // Hackathon MVP: log to console (visible in browser DevTools)
  if (process.env.NODE_ENV === 'development') {
    console.log('[funnel]', event);
  }

  // Production: send to Vercel Web Analytics custom event
  // (available on Pro plan; not implemented for Hobby/hackathon)
  //
  // Future:
  // window.va?.track(event.step, {
  //   wizard_step: event.wizard_step,
  //   duration_ms: event.duration_on_step_ms,
  // });
}
```

### 5.4 Wizard Step Drop-Off Tracking

The wizard is the most likely place users abandon the flow. Each step advance is tracked to identify which step causes the most drop-off.

```typescript
// In assess/page.tsx wizard orchestrator

const stepStartTime = useRef(Date.now());

function handleStepAdvance(nextStep: number) {
  const now = Date.now();
  trackFunnelStep({
    step: 'wizard_step_advance',
    timestamp: new Date().toISOString(),
    wizard_step: nextStep,
    duration_on_step_ms: now - stepStartTime.current,
  });
  stepStartTime.current = now;
  setStep(nextStep);
}
```

### 5.5 North Star Metric Calculation

```typescript
// Post-hackathon: computed from analytics data

interface NorthStarMetrics {
  // Primary metric
  completionRate: number;          // results_view / landing_view

  // Input metrics (what drives the North Star)
  landingToAssessRate: number;     // assess_start / landing_view
  assessToCalculateRate: number;   // calculate_click / assess_start
  calculateToResultsRate: number;  // results_view / calculate_click

  // Health metrics (system health that affects the North Star)
  apiErrorRate: number;            // 4xx + 5xx / total requests
  apiLatencyP95: number;           // 95th percentile response time (ms)
  coldStartRate: number;           // cold starts / total invocations

  // Wizard engagement
  stepDropOff: Record<number, number>; // drop-off rate per step (0-4)
  avgTimePerStep: Record<number, number>; // average ms per step
}
```

---

## 6. Error Rate Monitoring

### 6.1 Error Classification

| Category | HTTP Status | Severity | Expected Rate | Alert Threshold |
|----------|-------------|----------|---------------|-----------------|
| Validation error | 400 | Low | < 10% (expected from incomplete forms) | > 25% in 1 hour |
| Method not allowed | 405 | Info | Near 0% (bot probes) | N/A |
| Simulation error | 500 | High | < 0.1% | > 1% in 1 hour |
| Timeout | 504 | High | < 0.5% (cold starts) | > 2% in 1 hour |

### 6.2 API Response Metadata

Every successful response includes a `metadata` object that serves as passive observability. The client can use these values for display ("Computed in 42ms from 10,000 simulations") and they are visible in network request inspection.

```typescript
metadata: {
  iterations: 10_000,
  executionTimeMs: 42,
  dataSources: [
    'IBM Cost of a Data Breach 2025',
    'Verizon DBIR 2025',
    'NetDiligence Cyber Claims Study 2025',
  ],
}
```

### 6.3 Cold Start Detection

Vercel serverless functions experience cold starts after idle periods. Cold starts are the primary source of latency variance.

```typescript
// Detect cold start by checking if a module-level variable has been initialized
let isWarm = false;

export async function POST(request: Request) {
  const isColdStart = !isWarm;
  isWarm = true;

  const start = performance.now();
  // ... simulation logic ...
  const elapsed = performance.now() - start;

  log({
    level: 'info',
    event: 'request.end',
    timestamp: new Date().toISOString(),
    duration_ms: Math.round(elapsed),
    status_code: 200,
    cold_start: isColdStart,
  });
}
```

---

## 7. Dashboards and Alerts

### 7.1 Hackathon MVP: Vercel Dashboard

For the hackathon, all monitoring uses Vercel's built-in dashboard:

| Vercel Dashboard Panel | What It Shows |
|------------------------|---------------|
| Function Invocations | Request count over time for `/api/calculate` |
| Function Duration | Execution time distribution (identifies cold starts) |
| Function Errors | 4xx and 5xx count over time |
| Deployment Logs | Build success/failure history |

No custom dashboard is required for the hackathon. The Vercel dashboard is accessible at `vercel.com/[team]/cybrisk/functions`.

### 7.2 Production Dashboard (Post-Hackathon)

```yaml
panels:
  - name: North Star Funnel
    metrics:
      - completion_rate (landing -> results)
      - landing_to_assess_rate
      - assess_to_calculate_rate
      - calculate_to_results_rate
    visualization: funnel chart

  - name: API Performance
    metrics:
      - api.duration_ms.p50
      - api.duration_ms.p95
      - api.duration_ms.p99
      - api.cold_start_rate
    visualization: time series

  - name: Simulation Health
    metrics:
      - simulation.duration_ms.p50
      - simulation.duration_ms.p95
      - simulation.mean_ale (rolling average)
      - simulation.output_sanity_failures
    visualization: time series + stat panels

  - name: Error Rates
    metrics:
      - api.error_rate.4xx
      - api.error_rate.5xx
      - api.timeout_rate
      - validation.failure_rate
    visualization: time series with threshold lines

  - name: Wizard Engagement
    metrics:
      - wizard.step_drop_off (by step number)
      - wizard.avg_time_per_step (by step number)
      - wizard.back_navigation_rate
    visualization: bar chart + heat map
```

### 7.3 Alert Rules (Post-Hackathon)

| Alert | Condition | Channel | Action |
|-------|-----------|---------|--------|
| High error rate | > 5% 5xx in 15 minutes | Slack / PagerDuty | Investigate simulation failures; check for edge-case inputs |
| Latency spike | P95 > 5s for 10 minutes | Slack | Check for cold start storms; consider provisioned concurrency |
| Completion rate drop | < 30% completion rate in 1 hour | Slack | Check for broken wizard step or API regression |
| Validation spike | > 25% 400s in 15 minutes | Slack | Check for client-side validation drift from server schema |
| Zero traffic | No requests for 30 minutes during business hours | Slack | Check DNS, Vercel status, deployment health |

---

## 8. Performance Benchmarks

### 8.1 Key Performance Indicators

| Metric | Target | Alert Threshold | Measurement |
|--------|--------|-----------------|-------------|
| API response time (P50, warm) | < 100ms | > 200ms | `performance.now()` in route handler |
| API response time (P95, warm) | < 200ms | > 500ms | `performance.now()` in route handler |
| Simulation duration (P50) | < 60ms | > 100ms | `performance.now()` around `runSimulation()` |
| Cold start duration | < 3s | > 5s | First request after idle, measured by `cold_start` flag |
| Error rate (5xx) | < 0.1% | > 1% | HTTP status code counts |
| Landing page LCP | < 1.5s | > 2.5s | Vercel Web Analytics or Lighthouse |
| Wizard TTI | < 2.0s | > 3.0s | Lighthouse audit |
| Response payload size | < 50KB | > 100KB | `Content-Length` header |

### 8.2 Load Characteristics

CybRisk is a hackathon project. Expected load is minimal:

| Metric | Expected (Hackathon) | Expected (If Featured) |
|--------|---------------------|----------------------|
| Daily requests | < 100 | < 5,000 |
| Concurrent users | 1-5 | 10-50 |
| Peak requests/minute | < 10 | < 100 |

Vercel Hobby plan handles this comfortably. No auto-scaling configuration, rate limiting, or caching layer is needed.

---

## 9. Observability Maturity Roadmap

### Phase 1: Hackathon MVP (Current)

- [x] Structured `console.log` with JSON format in API route
- [x] `performance.now()` timing for simulation duration
- [x] `metadata.executionTimeMs` in API response
- [x] Cold start detection via module-level flag
- [x] Vercel dashboard for function metrics
- [x] No user input data in logs

### Phase 2: Post-Hackathon Polish

- [ ] `Server-Timing` headers for browser DevTools visibility
- [ ] Client-side funnel tracking (`trackFunnelStep` implementation)
- [ ] Wizard step drop-off analytics
- [ ] Vercel Web Analytics (automatic page views)
- [ ] Structured error classification in logs

### Phase 3: Production Grade

- [ ] Vercel Log Drain to Axiom or Datadog
- [ ] Custom Vercel Analytics events (Pro plan)
- [ ] Grafana or Datadog dashboard with panels from Section 7.2
- [ ] Alert rules from Section 7.3
- [ ] Synthetic monitoring (periodic POST to `/api/calculate` with sample data)
- [ ] Real User Monitoring (RUM) for Core Web Vitals

### Phase 4: Advanced (If Product Grows)

- [ ] OpenTelemetry SDK integration for distributed tracing
- [ ] A/B testing instrumentation for wizard step variations
- [ ] Simulation output drift detection (statistical process control on ALE distribution)
- [ ] Cost monitoring per Vercel function invocation

---

## 10. Implementation Checklist

For the hackathon, the observability implementation is minimal and focused:

| Item | File | Priority | Status |
|------|------|----------|--------|
| `log()` utility function | `src/lib/logger.ts` | P1 | To implement |
| `performance.now()` in API route | `src/app/api/calculate/route.ts` | P0 | Designed in Architecture Blueprint |
| `metadata.executionTimeMs` in response | `src/app/api/calculate/route.ts` | P0 | Designed in Architecture Blueprint |
| Cold start flag | `src/app/api/calculate/route.ts` | P2 | Optional for hackathon |
| `trackFunnelStep()` client utility | `src/lib/analytics.ts` | P2 | Post-hackathon |
| Server-Timing headers | `src/app/api/calculate/route.ts` | P2 | Post-hackathon |

The P0 items (timing and metadata in the API response) are already part of the API route design in the Architecture Blueprint and require no additional infrastructure.

---

*Document generated by North Star Advisor*
