# CybRisk Architecture Blueprint

**Product**: CybRisk -- Cyber Risk Posture Calculator
**Version**: 1.0 (Hackathon MVP)
**Date**: 2026-02-22
**Author**: Albert Hui, Chief Forensicator, Security Ronin

---

## 1. System Overview

CybRisk is a stateless, serverless web application that translates a company's security posture into dollar-denominated financial exposure estimates. It runs 10,000 Monte Carlo simulations using the FAIR (Factor Analysis of Information Risk) model, sourced from published actuarial data (IBM Cost of a Data Breach, Verizon DBIR, NetDiligence Cyber Claims Study), and computes a Gordon-Loeb optimal security spend recommendation.

The architecture enforces a single design axiom: **privacy by design through statelessness**. No user data is persisted beyond the HTTP request lifecycle. There is no database, no authentication, and no tracking. The serverless function processes and forgets.

### Design Principles

| Principle | Architectural Implication |
|-----------|--------------------------|
| Dollars Over Scores | All outputs denominated in USD; qualitative labels always paired with dollar figures |
| Distribution Over Point Estimate | Monte Carlo produces full 10K-sample distribution; API returns percentiles and histogram bins |
| Speed Over Precision | 10K iterations with PERT distributions (not 1M with real-time feeds); target < 3s end-to-end |
| Transparency Over Polish | Methodology and data sources embedded in results; every figure traceable |
| Stateless Over Persistent | No database, no accounts, no cookies; sessionStorage for client-side result transfer only |

---

## 2. System Topology

```
                    +---------------------------+
                    |   Vercel Edge Network      |
                    |   (CDN + SSL termination)  |
                    +---------------------------+
                               |
              +----------------+----------------+
              |                                 |
    +---------v----------+         +------------v-------------+
    |  Static Assets     |         |  Node.js Serverless      |
    |  (Next.js SSR/SSG) |         |  Function                |
    |                    |         |                           |
    |  / (Landing)       |         |  POST /api/calculate     |
    |  /assess (Wizard)  |         |  - Zod validation        |
    |  /results (Dash)   |         |  - Lookup table mapping  |
    |                    |         |  - Monte Carlo (10K)     |
    +--------------------+         |  - Gordon-Loeb calc      |
                                   |  - JSON response         |
                                   +---------------------------+
```

### Route Architecture

| Route | Rendering | Runtime | Purpose |
|-------|-----------|---------|---------|
| `/` | Server Component (SSG) | Edge | Landing page with trust signals and CTA |
| `/assess` | Client Component | Browser | 5-step wizard with useState state management |
| `/results` | Client Component | Browser | Results dashboard with charts and KPIs |
| `/api/calculate` | Node.js Serverless | `nodejs20.x` | Monte Carlo simulation endpoint |

The landing page is a Server Component rendered at build time (SSG). The wizard and results pages are Client Components because they require interactivity (form state, chart rendering, sessionStorage access). The API route runs on Node.js serverless (not Edge) because Monte Carlo simulation is CPU-intensive and requires full Node.js APIs including `Math.random()` and typed array operations.

---

## 3. Data Flow

### 3.1 End-to-End Request Flow

```
User Browser                           Vercel
    |                                    |
    |  1. GET /assess                    |
    |  --------------------------------->|  (serve static JS bundle)
    |  <---------------------------------|
    |                                    |
    |  2. User fills 5 wizard steps      |
    |     (state in parent useState)     |
    |                                    |
    |  3. POST /api/calculate            |
    |     { industry, revenue, ...}      |
    |  --------------------------------->|
    |                                    |  4. Zod validation
    |                                    |  5. Map inputs to PERT params
    |                                    |  6. Run 10K MC iterations
    |                                    |  7. Compute percentiles
    |                                    |  8. Compute Gordon-Loeb
    |                                    |  9. Build histogram bins
    |  <---------------------------------|
    |  { ale, pml, gordonLoeb,           |
    |    histogram, exceedance, ... }    |
    |                                    |
    | 10. Store results in               |
    |     sessionStorage + Context       |
    | 11. router.push('/results')        |
    |                                    |
    | 12. Results page reads from        |
    |     Context (fast) or              |
    |     sessionStorage (page refresh)  |
```

### 3.2 FAIR Monte Carlo Engine Data Flow

```
Inputs: Industry, Revenue, Records, Controls, Threats
                    |
                    v
+-------------------------------------------+
|           Lookup Tables                    |
|  (hardcoded from IBM/DBIR/NetDiligence)   |
|                                            |
|  industry -> base TEF, cost/record         |
|  revenue  -> severity scaling              |
|  controls -> vulnerability modifiers       |
|  threats  -> TEF adjustment factors        |
+-------------------------------------------+
                    |
                    v
+-------------------------------------------+
|        PERT Parameter Mapping              |
|                                            |
|  Each FAIR factor gets (min, mode, max):   |
|  TEF:  threat frequency per year           |
|  Vuln: probability threat -> loss          |
|  PL:   direct cost (records * $/record)    |
|  SL:   indirect cost (regulatory + legal)  |
+-------------------------------------------+
                    |
                    v
+-------------------------------------------+
|        Monte Carlo Simulation Loop         |
|        (10,000 iterations)                 |
|                                            |
|  for each iteration:                       |
|    tef  = samplePERT(tef_min/mode/max)     |
|    vuln = samplePERT(vuln_min/mode/max)    |
|    lef  = tef * vuln                       |
|    pl   = samplePERT(pl_min/mode/max)      |
|    sl   = samplePERT(sl_min/mode/max)      |
|    loss = lef * (pl + sl)                  |
|    losses.push(loss)                       |
+-------------------------------------------+
                    |
                    v
+-------------------------------------------+
|        Post-Processing                     |
|                                            |
|  Sort 10K losses ascending                 |
|  Compute: mean, median, P5, P10, P90, P95 |
|  Bin into 50 histogram buckets             |
|  Compute LEC points (20 thresholds)        |
|  Derive risk rating from ALE/revenue ratio |
|  Compute Gordon-Loeb optimal spend         |
|  Identify top 3 key drivers                |
|  Generate ranked recommendations           |
+-------------------------------------------+
                    |
                    v
            JSON Response
```

### 3.3 State Management

| State | Storage | Scope | Lifetime |
|-------|---------|-------|----------|
| Wizard form data | `useState` in parent component | `/assess` page | Until navigation away |
| Wizard step index | `useState` in parent component | `/assess` page | Until navigation away |
| Calculation results | `sessionStorage` + React Context | Cross-page | Browser session |
| No persistent state | N/A | N/A | N/A |

**Why useState over Zustand/Redux**: The wizard is a single-page flow with 5 steps managed by a step index. All state lives in one parent component. There is no state shared across unrelated components, no middleware, and no time-travel debugging need. useState is sufficient and adds zero bundle size.

**Why sessionStorage + Context for results**: Results must survive a page navigation from `/assess` to `/results`. React Context provides instant access on the initial navigation. sessionStorage provides resilience against page refresh. On the results page, the provider checks Context first (populated during the same session) and falls back to sessionStorage (populated before navigation).

---

## 4. Component Architecture

### 4.1 File Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page (Server Component, SSG)
│   ├── layout.tsx                  # Root layout (Inter + JetBrains Mono fonts)
│   ├── globals.css                 # Tailwind base + dark theme tokens
│   ├── assess/
│   │   └── page.tsx                # Wizard orchestrator (Client Component)
│   ├── results/
│   │   └── page.tsx                # Results dashboard (Client Component)
│   └── api/
│       └── calculate/
│           └── route.ts            # Monte Carlo API (Node.js serverless)
│
├── components/
│   ├── ui/                         # Shadcn/ui primitives (Button, Card, Select,
│   │                               #   Switch, Slider, ToggleGroup, Progress)
│   ├── landing/
│   │   ├── hero.tsx                # Hero section with headline + CTA
│   │   ├── features.tsx            # 3 feature cards (Financial, Board-Ready, Benchmarks)
│   │   ├── how-it-works.tsx        # 3-step process diagram
│   │   ├── trust-signals.tsx       # Methodology + data source badges
│   │   └── footer.tsx              # Builder credit + links
│   │
│   ├── assess/
│   │   ├── wizard-progress.tsx     # Horizontal step indicator (nav + aria-current)
│   │   ├── wizard-step-card.tsx    # Card wrapper with step number + title
│   │   ├── company-profile.tsx     # Step 1: industry, revenue, employees
│   │   ├── data-profile.tsx        # Step 2: data types, records, sensitivity
│   │   ├── security-controls.tsx   # Step 3: 10 binary control switches
│   │   ├── threat-landscape.tsx    # Step 4: threat types, prior incidents
│   │   ├── review-calculate.tsx    # Step 5: summary cards + calculate CTA
│   │   ├── simulation-loading.tsx  # Processing overlay with phase rotation
│   │   └── a11y-announcer.tsx      # Screen reader live region announcements
│   │
│   ├── results/
│   │   ├── risk-rating-badge.tsx   # Large pill badge (LOW/MODERATE/HIGH/CRITICAL)
│   │   ├── kpi-card.tsx            # Metric card (label + dollar figure + trend)
│   │   ├── loss-distribution.tsx   # Recharts BarChart histogram (50 bins)
│   │   ├── loss-exceedance.tsx     # Recharts LineChart LEC (20 points)
│   │   ├── key-drivers.tsx         # Ranked impact factors list
│   │   ├── recommendations.tsx     # Actionable savings recommendations
│   │   ├── methodology.tsx         # Collapsible methodology + sources section
│   │   └── chart-container.tsx     # Card wrapper for charts with sr-only data table
│   │
│   └── shared/
│       └── trust-badge.tsx         # Small pill badge for trust signals
│
├── lib/
│   ├── utils.ts                    # Shadcn cn() utility
│   ├── monte-carlo.ts              # FAIR MC engine (PERT sampling, Box-Muller,
│   │                               #   simulation loop, percentile computation)
│   ├── lookup-tables.ts            # Hardcoded actuarial data from IBM/DBIR/NetDiligence
│   ├── gordon-loeb.ts              # Optimal security spend calculation
│   ├── types.ts                    # TypeScript interfaces (AssessmentInputs,
│   │                               #   SimulationResults, APIRequest, APIResponse)
│   ├── validation.ts               # Zod schemas for API request validation
│   ├── chart-theme.ts              # Recharts color palette and axis styling
│   ├── a11y-utils.ts               # Dollar formatting for aria-labels, sr-only helpers
│   └── use-reduced-motion.ts       # prefers-reduced-motion React hook
│
├── data/
│   └── industry-benchmarks.ts      # Industry-specific defaults and smart defaults
│
└── contexts/
    └── results-context.tsx         # React Context + sessionStorage persistence
```

### 4.2 Component Dependency Graph

```
layout.tsx
├── page.tsx (Landing)
│   ├── Hero
│   ├── Features
│   ├── HowItWorks
│   ├── TrustSignals
│   └── Footer
│
├── assess/page.tsx (Wizard Orchestrator)
│   ├── WizardProgress
│   ├── WizardStepCard
│   │   ├── CompanyProfile (Step 1)
│   │   ├── DataProfile (Step 2)
│   │   ├── SecurityControls (Step 3)
│   │   ├── ThreatLandscape (Step 4)
│   │   └── ReviewCalculate (Step 5)
│   ├── SimulationLoading (overlay)
│   └── A11yAnnouncer
│
└── results/page.tsx (Dashboard)
    ├── RiskRatingBadge
    ├── KpiCard (x4)
    ├── ChartContainer
    │   ├── LossDistribution (Recharts BarChart)
    │   └── LossExceedance (Recharts LineChart)
    ├── KeyDrivers
    ├── Recommendations
    └── Methodology
```

### 4.3 Wizard Orchestrator Design

The wizard parent component (`/assess/page.tsx`) owns all form state via a single `useState<AssessmentInputs>` object. Each step component receives the relevant slice of state and an `onUpdate` callback. This avoids prop drilling beyond one level and keeps the state tree flat.

```typescript
// Simplified wizard orchestrator pattern
const [step, setStep] = useState(0);
const [inputs, setInputs] = useState<AssessmentInputs>(defaultInputs);
const [isCalculating, setIsCalculating] = useState(false);

const steps = [
  <CompanyProfile data={inputs.company} onUpdate={...} />,
  <DataProfile data={inputs.data} onUpdate={...} />,
  <SecurityControls data={inputs.controls} onUpdate={...} />,
  <ThreatLandscape data={inputs.threats} onUpdate={...} />,
  <ReviewCalculate data={inputs} onCalculate={handleCalculate} />,
];
```

Step validation uses Zod schemas per step. The "Continue" button is disabled until the current step's schema validates. On the final step, `handleCalculate` POSTs to `/api/calculate`, stores results, and navigates to `/results`.

---

## 5. API Design

### 5.1 Endpoint: POST /api/calculate

**Runtime**: Node.js 20.x serverless (not Edge -- CPU-intensive Monte Carlo requires full Node.js APIs)

**Timeout**: 300 seconds (Vercel Hobby with Fluid Compute). Actual execution: < 200ms for 10K iterations.

#### Request Schema (Zod-validated)

```typescript
const CalculateRequestSchema = z.object({
  industry: z.enum([
    'healthcare', 'financial', 'pharmaceuticals', 'technology',
    'energy', 'industrial', 'services', 'retail', 'education',
    'entertainment', 'communications', 'consumer', 'media',
    'research', 'transportation', 'hospitality', 'public_sector'
  ]),
  revenueBand: z.enum([
    'under_50m', '50m_250m', '250m_1b', '1b_5b', 'over_5b'
  ]),
  employeeCount: z.enum([
    'under_250', '250_1000', '1000_5000', '5000_25000', 'over_25000'
  ]),
  dataTypes: z.array(z.enum([
    'customer_pii', 'employee_pii', 'payment_card',
    'health_records', 'intellectual_property', 'financial'
  ])).min(1),
  recordCount: z.number().int().min(1000).max(100_000_000),
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
  threatTypes: z.array(z.enum([
    'ransomware', 'bec_phishing', 'web_app_attack',
    'system_intrusion', 'insider_threat', 'third_party'
  ])).min(1),
  previousIncidents: z.enum(['0', '1', '2_5', '5_plus']),
});
```

#### Response Shape

```typescript
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
    iterations: number;
    executionTimeMs: number;
    dataSources: string[];
  };
}
```

#### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Zod validation failure | `{ error: "Validation failed", details: ZodError.issues }` |
| 405 | Non-POST method | `{ error: "Method not allowed" }` |
| 500 | Simulation error | `{ error: "Simulation failed", message: string }` |

### 5.2 API Implementation Pattern

```typescript
// app/api/calculate/route.ts
export const runtime = 'nodejs';  // NOT edge -- CPU-intensive

export async function POST(request: Request) {
  const start = performance.now();

  // 1. Parse and validate
  const body = await request.json();
  const parsed = CalculateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    );
  }

  // 2. Map inputs to PERT parameters via lookup tables
  const params = mapToFairParams(parsed.data);

  // 3. Run Monte Carlo simulation
  const simulation = runSimulation(params, 10_000);

  // 4. Compute Gordon-Loeb optimal spend
  const gordonLoeb = computeGordonLoeb(simulation, parsed.data);

  // 5. Build response
  const elapsed = performance.now() - start;
  return Response.json({
    riskRating: deriveRiskRating(simulation, parsed.data),
    ale: simulation.ale,
    pml: simulation.ale.p95,
    gordonLoeb,
    histogram: simulation.histogram,
    exceedanceCurve: simulation.exceedanceCurve,
    keyDrivers: identifyKeyDrivers(parsed.data, simulation),
    recommendations: generateRecommendations(parsed.data, simulation, gordonLoeb),
    metadata: {
      iterations: 10_000,
      executionTimeMs: Math.round(elapsed),
      dataSources: ['IBM Cost of a Data Breach 2025', 'Verizon DBIR 2025', 'NetDiligence Cyber Claims Study 2025'],
    },
  });
}
```

---

## 6. Monte Carlo Engine Design

### 6.1 PERT Distribution Sampling

The engine uses Modified PERT distributions for all FAIR factors. PERT is preferred over triangular because it assigns more weight to the mode and produces smoother distributions, which better models expert estimates of cybersecurity loss parameters.

```typescript
// PERT sampling via Beta distribution (Joehnk algorithm)
function samplePERT(min: number, mode: number, max: number, lambda = 4): number {
  const range = max - min;
  if (range === 0) return min;

  const alpha = 1 + lambda * (mode - min) / range;
  const beta = 1 + lambda * (max - mode) / range;
  const betaSample = sampleBeta(alpha, beta);
  return min + betaSample * range;
}

// Beta distribution sampling (Joehnk algorithm, ~20 lines, no jstat dependency)
function sampleBeta(alpha: number, beta: number): number {
  // Joehnk method for alpha, beta > 0
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
```

### 6.2 Box-Muller Transform

Used for log-normal severity sampling when the PERT distribution is insufficient for heavy-tailed loss modeling.

```typescript
function boxMuller(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
```

### 6.3 FAIR Simulation Loop

```typescript
function runSimulation(params: FairParams, iterations: number): SimulationOutput {
  const losses: number[] = new Array(iterations);

  for (let i = 0; i < iterations; i++) {
    // Threat Event Frequency (events per year)
    const tef = samplePERT(params.tef.min, params.tef.mode, params.tef.max);

    // Vulnerability (probability threat becomes loss)
    const vuln = Math.min(1, Math.max(0,
      samplePERT(params.vuln.min, params.vuln.mode, params.vuln.max)
    ));

    // Loss Event Frequency
    const lef = tef * vuln;

    // Primary Loss (direct costs)
    const pl = samplePERT(params.pl.min, params.pl.mode, params.pl.max);

    // Secondary Loss (regulatory, legal, reputation)
    const sl = samplePERT(params.sl.min, params.sl.mode, params.sl.max);

    // Annual Loss = LEF * Loss Magnitude
    losses[i] = lef * (pl + sl);
  }

  // Sort for percentile computation
  losses.sort((a, b) => a - b);

  return {
    ale: {
      mean: mean(losses),
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
```

### 6.4 Gordon-Loeb Optimal Spend

```typescript
function computeGordonLoeb(
  simulation: SimulationOutput,
  inputs: ValidatedInputs
): GordonLoebResult {
  const ale = simulation.ale.mean;
  const vuln = estimateVulnerabilityLevel(inputs.controls);

  // Gordon-Loeb: optimal spend <= (1/e) * v * L
  // where v = vulnerability, L = expected loss
  const optimalSpend = (1 / Math.E) * vuln * ale;

  // Cap at 5% of revenue (practical upper bound)
  const revenueCap = getRevenueMidpoint(inputs.revenueBand) * 0.05;
  const cappedSpend = Math.min(optimalSpend, revenueCap);

  return {
    optimalSpend: cappedSpend,
    currentRisk: ale,
    residualRisk: ale * (1 - vuln * 0.37),
  };
}
```

### 6.5 Performance Budget

| Metric | Target | Measured (dev) |
|--------|--------|----------------|
| 10K iterations execution | < 100ms | ~40-60ms |
| Memory per invocation | < 128MB | ~80KB for loss array |
| Cold start (first request) | < 3s | 1-3s (Vercel serverless) |
| Warm invocation | < 200ms | ~50-80ms |
| Response payload size | < 50KB | ~15-25KB |

---

## 7. Technology Decisions

### 7.1 Stack Summary

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | Next.js (App Router) | 14+ | Hackathon requirement; SSG landing + client wizard + API routes in one deploy |
| Language | TypeScript | 5.x | Strict mode; type safety for FAIR model interfaces; Zod schema inference |
| Styling | Tailwind CSS | 4.x | Utility-first; dark theme tokens; rapid iteration |
| Components | Shadcn/ui (new-york) | latest | Pre-built accessible primitives (Button, Card, Select, Switch, Slider); tree-shakeable |
| Charts | Recharts | 2.x | Already installed; BarChart for histogram, LineChart for LEC; responsive containers |
| Icons | Lucide React | latest | Already installed; consistent stroke-based icons |
| Forms | React Hook Form + Zod | latest | Per-step validation; type-safe schemas; @hookform/resolvers bridge |
| MC Engine | Pure TypeScript | N/A | Zero external dependencies; PERT via Joehnk algorithm; Box-Muller for normal sampling |
| Runtime | Node.js serverless | 20.x | CPU-intensive math; full Node.js APIs; not Edge (which lacks some math APIs) |
| Hosting | Vercel Hobby | N/A | Required by hackathon; Fluid Compute (300s timeout); automatic SSL; preview deploys |
| Fonts | Inter + JetBrains Mono | variable | Inter for UI text; JetBrains Mono for all dollar figures and data values |

### 7.2 Technology Not Chosen (and Why)

| Technology | Reason for Exclusion |
|-----------|---------------------|
| Zustand / Redux | Wizard state is localized to one parent component; useState is sufficient; zero bundle overhead |
| Python / FastAPI | Hackathon requires single Vercel deploy; TypeScript MC engine avoids dual-language complexity |
| Edge Runtime | Monte Carlo is CPU-intensive; Edge has limited APIs and 30s timeout on Hobby; Node.js serverless is correct |
| jstat | Only needed for Beta distribution CDF/PPF; Joehnk algorithm is ~20 lines of TypeScript; avoids 50KB dependency |
| framer-motion | Nice-to-have for wizard transitions; not justified for hackathon scope; CSS transitions suffice |
| nuqs | URL-encoded shareable state is a stretch goal; sessionStorage is simpler for MVP |
| Database (Supabase/Prisma) | Stateless by design; no persistence needed for hackathon; Phase 3 consideration |
| NextAuth / Clerk | No authentication for MVP; stateless privacy-by-design architecture |
| D3.js | Recharts wraps D3 with React-friendly API; lower-level D3 not needed for histogram + line chart |

### 7.3 Bundle Size Budget

| Category | Budget | Expected |
|----------|--------|----------|
| Landing page JS | < 50KB gzipped | ~30KB (server-rendered, minimal JS) |
| Wizard page JS | < 100KB gzipped | ~70KB (React Hook Form + Zod + Shadcn components) |
| Results page JS | < 150KB gzipped | ~120KB (Recharts is the bulk) |
| API route (server) | N/A (not shipped to client) | ~20KB source |
| Total First Load | < 200KB gzipped | ~150KB |

---

## 8. Lookup Table Architecture

### 8.1 Data Sources

All lookup tables are hardcoded TypeScript objects compiled into the serverless function bundle. They are sourced from three published datasets:

| Source | Data Provided | Update Cadence |
|--------|--------------|----------------|
| IBM Cost of a Data Breach 2025 | Per-record costs by data type, industry average costs, cost modifiers by control | Annual (July) |
| Verizon DBIR 2025 | Attack pattern frequency, threat event rates by industry, vulnerability rates | Annual (May) |
| NetDiligence Cyber Claims Study 2025 | Claim severity by revenue band, claim distribution parameters | Annual (October) |

### 8.2 Table Structure

```typescript
// lookup-tables.ts -- single source of truth for all actuarial data

// Per-record cost by data type (IBM 2025)
export const PER_RECORD_COST: Record<DataType, number> = {
  customer_pii: 175,
  employee_pii: 189,
  payment_card: 172,
  health_records: 200,
  intellectual_property: 178,
  financial: 180,
};

// Industry base parameters
export const INDUSTRY_PARAMS: Record<Industry, IndustryConfig> = {
  healthcare: {
    avgBreachCost: 10_930_000,
    baseTEF: { min: 0.5, mode: 1.2, max: 3.0 },
    baseVuln: { min: 0.15, mode: 0.35, max: 0.60 },
  },
  financial: {
    avgBreachCost: 6_080_000,
    baseTEF: { min: 0.4, mode: 1.0, max: 2.5 },
    baseVuln: { min: 0.10, mode: 0.25, max: 0.50 },
  },
  // ... 15 more industries
};

// Control effectiveness modifiers (IBM 2025 + DBIR estimates)
export const CONTROL_MODIFIERS: Record<Control, number> = {
  mfa: -0.15,
  encryption: -0.12,
  edr: -0.18,
  siem: -0.10,
  irPlan: -0.23,
  backupDr: -0.08,
  securityTraining: -0.10,
  vulnScanning: -0.10,
  networkSegmentation: -0.12,
  waf: -0.08,
};

// Revenue band midpoints for scaling
export const REVENUE_MIDPOINTS: Record<RevenueBand, number> = {
  under_50m: 25_000_000,
  '50m_250m': 150_000_000,
  '250m_1b': 625_000_000,
  '1b_5b': 3_000_000_000,
  over_5b: 10_000_000_000,
};
```

### 8.3 Parameter Mapping Pipeline

```
User Input                    Lookup Table              FAIR Parameter
-----------                   ------------              ---------------
industry = "healthcare"  -->  INDUSTRY_PARAMS     -->   baseTEF, baseVuln, avgCost
revenueBand = "50m_250m" -->  REVENUE_MIDPOINTS   -->   severity scaling factor
recordCount = 500_000    -->  PER_RECORD_COST     -->   primary loss base
controls.mfa = true      -->  CONTROL_MODIFIERS   -->   vuln reduction: -15%
controls.irPlan = true   -->  CONTROL_MODIFIERS   -->   vuln reduction: -23%
threats = ["ransomware"]  --> ATTACK_PATTERN_FREQ  -->   TEF adjustment factor
previousIncidents = "1"  -->  INCIDENT_HISTORY    -->   TEF multiplier: 1.5x
```

---

## 9. Security Considerations

### 9.1 Input Validation

All user inputs are validated server-side with Zod before any computation occurs. Client-side validation exists for UX responsiveness but is never trusted.

| Control | Implementation |
|---------|----------------|
| Schema validation | Zod `.safeParse()` rejects malformed requests before simulation |
| Numeric bounds | `recordCount` capped at 1,000 - 100,000,000; prevents extreme memory allocation |
| Enum constraints | Industry, revenue band, employee count are strict enums; no arbitrary strings |
| Output capping | Loss figures capped at `min(computed, 10 * revenue)` for plausibility |
| Field destructuring | Only expected fields are destructured from request body; prevents prototype pollution |
| No eval/dynamic code | Simulation uses static arithmetic only; no string interpolation into logic |

### 9.2 Privacy by Design

| Property | Implementation |
|----------|----------------|
| No data persistence | No database, no file writes, no logging of user inputs |
| No cookies | No tracking cookies, no analytics cookies |
| No authentication | No accounts, no email capture, no login gates |
| sessionStorage only | Results stored in browser sessionStorage (cleared on tab close) |
| Serverless function | Process-and-forget; no shared state between invocations |
| No external API calls | Lookup tables are hardcoded; no data leaves the Vercel serverless function |

### 9.3 Denial of Service Mitigation

| Vector | Mitigation |
|--------|------------|
| Extreme record counts | Zod enforces max 100M records; simulation time is O(iterations), not O(records) |
| Request flooding | Vercel built-in rate limiting at infrastructure level; not custom-implemented for MVP |
| Large payloads | Next.js default body size limit (1MB); actual request is < 1KB |
| Slow computation | 10K iterations is fixed; no user-controlled iteration count; < 200ms execution |

---

## 10. Deployment Strategy

### 10.1 Environment

| Property | Value |
|----------|-------|
| Platform | Vercel Hobby Plan |
| Region | `iad1` (US East, Washington DC) -- default |
| Node.js version | 20.x |
| Framework preset | Next.js (auto-detected) |
| Build command | `next build` |
| Output | `.next/` (standard) |
| Serverless function timeout | 300s (Fluid Compute) |
| Domain | Auto-generated `.vercel.app` subdomain |

### 10.2 Build and Deploy Pipeline

```
git push to main
       |
       v
Vercel detects push
       |
       v
Install dependencies (npm ci)
       |
       v
next build
  - SSG: / (landing page)
  - Client bundles: /assess, /results
  - Serverless function: /api/calculate
       |
       v
Deploy to Edge Network
  - Static assets to CDN (all regions)
  - Serverless function to iad1
       |
       v
Verify deployment
  - Check deployment status
  - Smoke test: POST /api/calculate with sample data
```

### 10.3 Performance Targets (Production)

| Metric | Target | Notes |
|--------|--------|-------|
| Landing page LCP | < 1.5s | SSG + CDN; minimal JS |
| Wizard TTI | < 2.0s | Client bundle ~70KB gzipped |
| API response (warm) | < 200ms | 10K MC iterations |
| API response (cold) | < 3s | Serverless cold start; subsequent requests warm |
| Results page render | < 500ms | Recharts initial render with 50 histogram bins |
| Total time to value | < 5 min | Landing -> Wizard -> Results |

### 10.4 Monitoring (Post-Hackathon)

For hackathon MVP, monitoring is limited to Vercel's built-in dashboard (function invocations, duration, errors). Post-hackathon, the following would be added:

| Signal | Threshold | Action |
|--------|-----------|--------|
| API error rate | > 5% in 1h | Review Zod validation edge cases |
| P95 response time | > 5s | Profile MC engine; check for cold start regression |
| Function timeout | Any | Investigate input that caused long computation |
| Assessment completion rate | < 50% | Instrument wizard step drop-off |

---

## 11. Accessibility Architecture

Accessibility is built into the component architecture, not bolted on afterward. Target: WCAG 2.1 Level AA.

| Pattern | Implementation |
|---------|----------------|
| Semantic landmarks | `<header>`, `<nav>`, `<main>`, `<footer>` on every page |
| Page titles | Dynamic `<title>` per route: "Step N of 5: {Name} -- CybRisk" |
| Wizard progress | `<nav>` with `aria-current="step"` and sr-only step status prefixes |
| Chart alternatives | `aria-hidden` on SVG + companion `<table>` with `sr-only` class |
| Dollar values | `aria-label` override for abbreviated values ("$1.2M" reads as "$1,250,000") |
| Risk levels | Color + text label + icon shape (never color alone) |
| Loading state | `role="status"` + `aria-live="polite"` for simulation phase announcements |
| Focus management | Step title receives focus on advance; results heading on page load |
| Reduced motion | `prefers-reduced-motion` CSS media query + React hook to suppress animations |
| Contrast ratios | All text meets 4.5:1 minimum; cyan-400 on slate-950 = 10.1:1 (AAA) |
| Keyboard navigation | All interactive elements reachable via Tab; wizard navigable with Enter/Space |

Component-level accessibility is provided by Shadcn/ui's Radix UI primitives (Button keyboard activation, Select ARIA combobox, Switch role and aria-checked, Slider role and value). Custom accessibility work is required for wizard progress navigation, chart data tables, loading live regions, and dollar value formatting.

---

## 12. Error Handling and Resilience

### 12.1 Fallback Chain

```
Primary:    Monte Carlo API (10K iterations)
               |
               v  (if API fails)
Fallback 1: Simplified deterministic calculation
            (mean TEF * mean Vuln * mean LM, no distribution)
               |
               v  (if lookup tables corrupt)
Fallback 2: Cached example results
            (pre-computed sample for "generic mid-market company")
               |
               v  (if all else fails)
Fallback 3: Error state with retry button + edit inputs button
```

### 12.2 Client-Side Error Handling

| Error | User Experience |
|-------|----------------|
| Missing required field | Inline error message; "Continue" button disabled |
| Invalid value | Inline error with corrective guidance |
| Page refresh during wizard | Wizard resets to Step 1 (accepted tradeoff for stateless design) |
| API 400 (validation) | Navigate back to relevant step with error highlighted |
| API 500 (server error) | Retry button + "Edit Your Inputs" button |
| API 504 (timeout) | Retry button (cold start typically resolves on second attempt) |
| Network offline | "Check your connection" message + Retry button |
| Results page without data | Redirect to `/assess` with "Start a new assessment" message |

### 12.3 Server-Side Error Handling

```typescript
// Defensive patterns in API route
try {
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: ... }, { status: 400 });

  const params = mapToFairParams(parsed.data);
  const results = runSimulation(params, 10_000);

  // Output sanity checks
  if (results.ale.mean < 0) throw new Error('Negative ALE');
  if (results.ale.mean > getRevenueMidpoint(parsed.data.revenueBand) * 10) {
    // Cap at 10x revenue for plausibility
    results.ale.mean = getRevenueMidpoint(parsed.data.revenueBand) * 10;
  }

  return Response.json(buildResponse(results));
} catch (error) {
  console.error('Simulation error:', error);
  return Response.json(
    { error: 'Simulation failed', message: 'Please try again' },
    { status: 500 }
  );
}
```

---

## 13. Type System

### 13.1 Core Interfaces

```typescript
// types.ts -- shared between client and server

interface AssessmentInputs {
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

interface SimulationResults {
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
  gordonLoeb: {
    optimalSpend: number;
    currentRisk: number;
    residualRisk: number;
  };
  histogram: HistogramBin[];
  exceedanceCurve: ExceedancePoint[];
  keyDrivers: KeyDriver[];
  recommendations: Recommendation[];
  metadata: SimulationMetadata;
}

type Industry = 'healthcare' | 'financial' | 'pharmaceuticals' | 'technology'
  | 'energy' | 'industrial' | 'services' | 'retail' | 'education'
  | 'entertainment' | 'communications' | 'consumer' | 'media'
  | 'research' | 'transportation' | 'hospitality' | 'public_sector';

type DataType = 'customer_pii' | 'employee_pii' | 'payment_card'
  | 'health_records' | 'intellectual_property' | 'financial';

type Control = 'mfa' | 'encryption' | 'edr' | 'siem' | 'irPlan'
  | 'backupDr' | 'securityTraining' | 'vulnScanning'
  | 'networkSegmentation' | 'waf';

type ThreatType = 'ransomware' | 'bec_phishing' | 'web_app_attack'
  | 'system_intrusion' | 'insider_threat' | 'third_party';

type RiskRating = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
type RevenueBand = 'under_50m' | '50m_250m' | '250m_1b' | '1b_5b' | 'over_5b';
type EmployeeCount = 'under_250' | '250_1000' | '1000_5000' | '5000_25000' | 'over_25000';
type IncidentHistory = '0' | '1' | '2_5' | '5_plus';
```

---

## 14. Implementation Priority

### 14.1 Critical Path (Must Ship for Hackathon)

The critical path determines build order. Each item unblocks the next:

```
1. TypeScript interfaces (types.ts)          -- unblocks everything
       |
2. Lookup tables (lookup-tables.ts)          -- unblocks MC engine
       |
3. Monte Carlo engine (monte-carlo.ts)       -- unblocks API route
       |
4. Gordon-Loeb calculation (gordon-loeb.ts)  -- unblocks API route
       |
5. API route (api/calculate/route.ts)        -- unblocks results page
       |
6. Wizard steps 1-5 (assess/)               -- unblocks end-to-end flow
       |
7. Results dashboard (results/)              -- unblocks demo
       |
8. Landing page (page.tsx)                   -- unblocks submission
       |
9. Vercel deployment                         -- unblocks judging
```

### 14.2 Implementation Tiers

| Priority | Component | Effort | Dependency |
|----------|-----------|--------|------------|
| P0 | `types.ts` | 1h | None |
| P0 | `lookup-tables.ts` | 2h | types.ts |
| P0 | `monte-carlo.ts` | 3h | lookup-tables.ts |
| P0 | `gordon-loeb.ts` | 1h | monte-carlo.ts |
| P0 | `api/calculate/route.ts` | 2h | monte-carlo.ts, gordon-loeb.ts |
| P0 | `validation.ts` (Zod schemas) | 1h | types.ts |
| P0 | Wizard Steps 1-5 | 4h | validation.ts |
| P0 | Results Dashboard (KPIs + charts) | 3h | api route |
| P1 | Landing page | 2h | None |
| P1 | Processing animation | 1h | None |
| P1 | Inline validation per step | 1h | validation.ts |
| P1 | Smart defaults (Step 4) | 0.5h | lookup-tables.ts |
| P2 | Gordon-Loeb KPI card | 0.5h | gordon-loeb.ts |
| P2 | Methodology section | 1h | None |
| P2 | Error recovery (retry/fallback) | 1h | api route |
| P2 | Accessibility enhancements | 3h | All components |

**Total estimated effort**: 12-15 hours for P0, 17-20 hours including P1, 22-27 hours including P2.

---

## 15. Data Source References

- IBM Cost of a Data Breach 2025: https://www.ibm.com/reports/data-breach
- Verizon DBIR 2025: https://www.verizon.com/business/resources/reports/dbir/
- NetDiligence Cyber Claims Study 2025: https://netdiligence.com/cyber-claims-study-2025-report/
- FAIR Institute: https://www.fairinstitute.org/what-is-fair
- Gordon-Loeb Model: https://en.wikipedia.org/wiki/Gordon%E2%80%93Loeb_model
- Actuarial cyber loss distributions: https://arxiv.org/pdf/2202.10189
- VERIS Community Database: https://github.com/vz-risk/VCDB
