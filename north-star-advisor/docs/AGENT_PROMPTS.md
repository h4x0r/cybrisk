# CybRisk: Component Behavior Specifications

> **Created**: 2026-02-22
> **Status**: Active
> **Builder**: Albert Hui -- Chief Forensicator, Security Ronin
> **Phase**: 7 of North Star Advisor pipeline

Behavior specifications for every major module in CybRisk. Each module is documented as if it were an autonomous agent: purpose, input contract, output contract, behavioral rules, edge cases, and cross-references to other CybRisk documents.

CybRisk is not an agent-based AI product. It is a deterministic calculation pipeline. But each module has a "personality" -- a set of invariants it must uphold, contracts it must honor, and failure modes it must handle. This document defines those personalities.

---

## Module Dependency Diagram

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
     Chart Data Formatter (results components)

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
- No circular dependencies exist. The graph is a directed acyclic graph (DAG).

---

## Module 1: Monte Carlo Engine

**File**: `src/lib/monte-carlo.ts`
**Runtime**: Node.js 20.x serverless (imported by API route)
**Dependencies**: `types.ts`
**Dependents**: `api/calculate/route.ts`

### Purpose

Run 10,000 iterations of the FAIR (Factor Analysis of Information Risk) model. Accept PERT parameters for each FAIR factor (TEF, Vulnerability, Primary Loss, Secondary Loss). Produce a sorted loss array, percentile statistics, pre-binned histogram data, and loss exceedance curve points.

This module is the computational core of CybRisk. It contains no business logic about which industries have which parameters -- that belongs to the lookup table engine. It contains no HTTP handling -- that belongs to the API route. It is a pure function: same inputs, same distribution shape (though individual samples differ due to stochastic sampling).

### Input Contract

```typescript
interface FairParams {
  tef:  { min: number; mode: number; max: number };  // Threat Event Frequency (events/year)
  vuln: { min: number; mode: number; max: number };  // Vulnerability (probability 0-1)
  pl:   { min: number; mode: number; max: number };  // Primary Loss (dollars)
  sl:   { min: number; mode: number; max: number };  // Secondary Loss (dollars)
}

// Function signature
function runSimulation(params: FairParams, iterations: number): SimulationOutput;
```

**Input Invariants:**

| Field | Constraint | Enforcement |
|-------|-----------|-------------|
| All PERT params | `min <= mode <= max` | Caller must guarantee. Engine should clamp if violated (log warning, swap min/max). |
| All PERT params | `min >= 0` | No negative frequencies, probabilities, or losses. Clamp to 0. |
| `vuln.max` | `<= 1.0` | Vulnerability is a probability. Clamp to 1.0. |
| `iterations` | `> 0`, typically 10,000 | Engine does not enforce an upper bound, but the API route hardcodes 10,000. |
| `tef.max` | Reasonable upper bound (e.g., <= 50) | A company experiencing 50 threat events/year is an extreme outlier. No hard enforcement, but lookup tables should not produce values above this. |

### Output Contract

```typescript
interface SimulationOutput {
  ale: {
    mean:   number;  // Arithmetic mean of 10K losses
    median: number;  // 50th percentile
    p5:     number;  // 5th percentile (optimistic case)
    p10:    number;  // 10th percentile
    p90:    number;  // 90th percentile
    p95:    number;  // 95th percentile (Probable Maximum Loss)
  };
  histogram: Array<{ bin: string; count: number }>;         // 50 bins
  exceedanceCurve: Array<{ threshold: number; probability: number }>;  // 20 points
  rawLosses: number[];  // Sorted ascending, length === iterations
}
```

**Output Invariants:**

| Field | Guarantee |
|-------|-----------|
| `ale.mean` | `>= 0`. If all losses are 0, mean is 0. |
| `ale.p5 <= ale.median <= ale.mean <= ale.p95` | Always holds for non-negative, right-skewed distributions. |
| `rawLosses` | Sorted ascending. Length exactly equals `iterations`. |
| `histogram` | Exactly 50 elements. `sum(counts) === iterations`. |
| `exceedanceCurve` | Exactly 20 points. Each `probability` is in [0, 1]. Monotonically decreasing as `threshold` increases. |

### Behavioral Rules

**1. PERT Distribution Sampling (Joehnk Algorithm)**

The engine uses Modified PERT distributions for all FAIR factors. PERT is preferred over triangular because it weights the mode more heavily (lambda=4 by default), producing smoother distributions that better model expert estimates.

```
samplePERT(min, mode, max, lambda=4):
  range = max - min
  if range == 0: return min  // degenerate case
  alpha = 1 + lambda * (mode - min) / range
  beta  = 1 + lambda * (max - mode) / range
  x = sampleBeta(alpha, beta)  // Joehnk algorithm
  return min + x * range
```

**Why Joehnk**: The Joehnk algorithm for Beta sampling is ~20 lines of TypeScript with zero external dependencies. It avoids importing jstat (50KB) for a single function. The algorithm is a rejection sampler: it generates candidate pairs until acceptance. Expected iterations to acceptance: ~1.5-3 depending on alpha/beta values. For the parameter ranges CybRisk uses (alpha and beta typically between 2 and 8), Joehnk is efficient.

**2. Box-Muller Transform**

Available for log-normal severity sampling when PERT is insufficient for heavy-tailed loss modeling. Generates two independent standard normal samples from two uniform samples.

```
boxMuller():
  u1 = Math.random()
  u2 = Math.random()
  return sqrt(-2 * ln(u1)) * cos(2 * PI * u2)
```

**When to use**: If post-hackathon calibration reveals that Primary Loss distributions are more heavy-tailed than PERT captures (common in cyber insurance claims data), switch PL sampling from PERT to log-normal using Box-Muller. For MVP, PERT is sufficient.

**3. FAIR Simulation Loop**

```
for each iteration i in [0, iterations):
  tef  = samplePERT(params.tef)           // events per year
  vuln = clamp(samplePERT(params.vuln), 0, 1)  // probability
  lef  = tef * vuln                        // loss events per year
  pl   = samplePERT(params.pl)             // direct cost per event
  sl   = samplePERT(params.sl)             // indirect cost per event
  losses[i] = lef * (pl + sl)              // annual loss
```

**4. Running Mean (Not Sum-Then-Divide)**

To avoid floating-point overflow on large loss values accumulated over 10,000 iterations, use Welford's online algorithm or a running mean:

```
runningMean = 0
for i in [0, n):
  runningMean += (losses[i] - runningMean) / (i + 1)
```

This avoids the `sum / n` pattern where `sum` could exceed `Number.MAX_SAFE_INTEGER` for organizations with very high revenue bands and many records. In practice with 10K iterations, overflow is unlikely, but the running mean is trivially easy to implement and eliminates the risk entirely.

**5. Percentile Computation**

Use nearest-rank method on the sorted array:

```
percentile(sortedArray, p):
  index = ceil(p / 100 * sortedArray.length) - 1
  return sortedArray[max(0, index)]
```

**6. Histogram Binning**

Pre-bin the 10K losses into exactly 50 buckets before returning. This is a hard requirement -- never pass the raw 10K-element array to the client.

```
buildHistogram(sortedLosses, numBins=50):
  min = sortedLosses[0]
  max = sortedLosses[sortedLosses.length - 1]
  binWidth = (max - min) / numBins
  bins = Array(numBins).fill(0)
  for each loss:
    binIndex = min(floor((loss - min) / binWidth), numBins - 1)
    bins[binIndex]++
  return bins.map((count, i) => ({
    bin: formatDollar(min + i * binWidth),
    count
  }))
```

**7. Loss Exceedance Curve (LEC)**

Compute P(Loss > X) for 20 evenly-spaced threshold points between the minimum and maximum loss:

```
buildExceedanceCurve(sortedLosses, numPoints=20):
  min = sortedLosses[0]
  max = sortedLosses[sortedLosses.length - 1]
  step = (max - min) / (numPoints - 1)
  points = []
  for i in [0, numPoints):
    threshold = min + i * step
    exceedCount = sortedLosses.length - bisectRight(sortedLosses, threshold)
    probability = exceedCount / sortedLosses.length
    points.push({ threshold, probability })
  return points
```

**Optimization note**: Since the array is sorted, use binary search (`bisectRight`) instead of `.filter()` for O(log n) per threshold instead of O(n).

### Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| `mode == min` (left-degenerate PERT) | Alpha approaches 1. Joehnk still works but produces a right-skewed distribution. No special handling needed. |
| `mode == max` (right-degenerate PERT) | Beta approaches 1. Same as above, left-skewed. |
| `mode == min == max` (point value) | Range is 0. Return `min` directly. No sampling needed. |
| `min > max` (inverted bounds) | Log warning. Swap min and max. Set mode to midpoint if mode is outside new bounds. |
| `vuln sample > 1.0` | Clamp to 1.0 after sampling. This can happen when PERT parameters allow max > 1.0 due to lookup table rounding. |
| `vuln sample < 0` | Clamp to 0. Should never happen with valid PERT params, but defend anyway. |
| All TEF samples near 0 | Valid -- a well-protected company in a low-threat industry might have near-zero loss frequency. ALE will be near $0. This is correct behavior, not an error. |
| Loss exceeds 10x revenue | Not the engine's concern. Output capping is the API route's responsibility. The engine reports the raw distribution honestly. |

### Performance Target

| Metric | Target | Notes |
|--------|--------|-------|
| 10K iterations execution | < 100ms | Measured on Node.js 20.x. Typical: 40-60ms. |
| Memory | < 1MB | 10K Float64 values = 80KB. Plus overhead for intermediate calculations. |
| Determinism | Not required | Monte Carlo is inherently stochastic. Same inputs produce different samples but same distribution shape. Coefficient of variation across runs < 5%. |

### Cross-References

- **Architecture Blueprint** (Section 6): Full PERT and FAIR formulas with code samples.
- **North Star** (Architecture Summary): FAIR model tree (TEF -> Vuln -> LEF -> PL + SL -> LM -> Annual Loss).
- **Brand Guidelines** (Core Beliefs #2): "Show the distribution, not just the average" -- this is why the engine returns percentiles and histogram bins, not just the mean.

---

## Module 2: Lookup Table Engine

**File**: `src/lib/lookup-tables.ts`
**Runtime**: Node.js 20.x serverless (imported by API route)
**Dependencies**: `types.ts`
**Dependents**: `monte-carlo.ts` (via API route), `api/calculate/route.ts`

### Purpose

Map questionnaire answers to PERT parameters for the FAIR model. This module is the bridge between human-readable inputs ("healthcare industry, 500,000 records, MFA enabled") and mathematical inputs ("TEF_min=0.5, TEF_mode=1.2, TEF_max=3.0").

All data is hardcoded from three published sources. There are no runtime API calls, no database queries, and no external dependencies. The lookup tables are compiled into the serverless function bundle at build time.

### Data Sources

| Source | What It Provides | Year | Update Cadence |
|--------|-----------------|------|----------------|
| IBM Cost of a Data Breach 2025 | Per-record costs by data type, industry average breach costs, cost impact of security controls | 2025 | Annual (July) |
| Verizon DBIR 2025 | Attack pattern frequency by industry, threat event rates, incident-to-breach ratios | 2025 | Annual (May) |
| NetDiligence Cyber Claims Study 2025 | Claim severity by revenue band, loss distribution parameters, regulatory/legal cost ratios | 2025 | Annual (October) |

### Input Contract

```typescript
interface LookupInputs {
  industry: Industry;          // 17 industries
  revenueBand: RevenueBand;    // 5 bands
  employeeCount: EmployeeCount; // 5 bands
  dataTypes: DataType[];       // 1-6 data types
  recordCount: number;         // 1,000 - 100,000,000
  dataSensitivity: 'low' | 'medium' | 'high';
  controls: Record<Control, boolean>;  // 10 boolean controls
  threatTypes: ThreatType[];   // 1-6 threat types
  previousIncidents: IncidentHistory;  // '0', '1', '2_5', '5_plus'
}
```

### Output Contract

```typescript
interface FairParams {
  tef:  { min: number; mode: number; max: number };
  vuln: { min: number; mode: number; max: number };
  pl:   { min: number; mode: number; max: number };
  sl:   { min: number; mode: number; max: number };
}

// Function signature
function mapToFairParams(inputs: LookupInputs): FairParams;
```

**Output Invariants:**

| Guarantee | Enforcement |
|-----------|-------------|
| `min <= mode <= max` for all four PERT param sets | If a computation produces min > mode or mode > max, clamp: `mode = clamp(mode, min, max)`. |
| All values `>= 0` | No negative frequencies, probabilities, or costs. |
| `vuln.max <= 1.0` | Vulnerability is a probability. Even with all controls disabled, cap at 1.0. |
| Non-zero ranges | If min == max after all adjustments, widen by +/- 10% to ensure the Monte Carlo engine samples a distribution, not a point. |

### Behavioral Rules

**1. Industry Base Parameters**

Each of the 17 industries has base PERT parameters for TEF and Vulnerability, plus an average breach cost for scaling:

```typescript
INDUSTRY_PARAMS['healthcare'] = {
  avgBreachCost: 10_930_000,   // IBM 2025
  baseTEF: { min: 0.5, mode: 1.2, max: 3.0 },
  baseVuln: { min: 0.15, mode: 0.35, max: 0.60 },
};
```

**Sourcing discipline**: Every number must trace to a specific page or table in one of the three source reports. If a number cannot be sourced, use the cross-industry average from IBM 2025 ($4.88M) and document the assumption in a code comment.

**2. Per-Record Cost by Data Type**

```typescript
PER_RECORD_COST = {
  customer_pii: 175,
  employee_pii: 189,
  payment_card: 172,
  health_records: 200,
  intellectual_property: 178,
  financial: 180,
};
```

When multiple data types are selected, use the weighted maximum: `max(per_record_costs for selected types)`. Rationale: breach costs are driven by the most expensive data type compromised, not the average. IBM 2025 reports costs for the dominant data type, not a blend.

**3. Control Effectiveness Modifiers**

Each control reduces the vulnerability parameter. Modifiers are subtractive and applied to the mode of the vulnerability PERT distribution:

```typescript
CONTROL_MODIFIERS = {
  mfa: -0.15,              // IBM: 15.6% cost reduction
  encryption: -0.12,       // IBM: 12.3% cost reduction
  edr: -0.18,              // IBM: 17.9% cost reduction (AI/automation proxy)
  siem: -0.10,             // IBM: 10.2% cost reduction
  irPlan: -0.23,           // IBM: 23.3% cost reduction (tested IR plan)
  backupDr: -0.08,         // DBIR: reduces ransomware impact
  securityTraining: -0.10, // IBM: 10.4% cost reduction
  vulnScanning: -0.10,     // DBIR: estimated from patch cadence data
  networkSegmentation: -0.12, // IBM: 12.1% cost reduction
  waf: -0.08,              // DBIR: estimated from web app attack data
};
```

**Stacking rule**: Modifiers stack additively. A company with MFA (-0.15) and IR Plan (-0.23) gets `vuln_mode = base_vuln_mode + (-0.15) + (-0.23) = base - 0.38`. The result is then clamped to `[0.02, vuln.max]` -- never allow vulnerability to reach exactly 0 (no company is invulnerable).

**Minimum vulnerability floor**: Even with all 10 controls enabled, vulnerability mode cannot drop below 0.02 (2%). This reflects the reality that no control set eliminates all risk. The sum of all modifiers is -1.26, which would produce a negative vulnerability without the floor.

**4. Revenue Band Scaling**

Revenue band affects loss severity (larger companies have larger absolute losses) and provides the denominator for the Gordon-Loeb revenue cap:

```typescript
REVENUE_MIDPOINTS = {
  under_50m: 25_000_000,
  '50m_250m': 150_000_000,
  '250m_1b': 625_000_000,
  '1b_5b': 3_000_000_000,
  over_5b: 10_000_000_000,
};
```

Primary Loss scales logarithmically with revenue: `PL_mode = perRecordCost * recordCount * log10(revenueMidpoint) / log10(25_000_000)`. This ensures that SMBs (under $50M) get a 1x multiplier while large enterprises get progressively larger multipliers, reflecting the IBM finding that larger organizations have higher absolute breach costs.

**5. Threat Type TEF Adjustments**

Selected threat types adjust the base TEF by multiplying against attack pattern frequency data from DBIR 2025:

```typescript
ATTACK_PATTERN_FREQ = {
  ransomware: 1.4,        // DBIR: ransomware involved in 24% of breaches
  bec_phishing: 1.3,      // DBIR: social engineering in 20%+ of breaches
  web_app_attack: 1.2,    // DBIR: basic web app attacks common in retail/tech
  system_intrusion: 1.5,  // DBIR: highest complexity attack pattern
  insider_threat: 1.1,    // DBIR: 15-20% of breaches involve insiders
  third_party: 1.2,       // DBIR: supply chain involvement rising
};
```

**Multiple threat stacking**: Use the maximum multiplier from selected threats, not the product. Selecting all 6 threat types should not produce TEF 6x higher than selecting 1. The logic is: "If your top threat is system intrusion (1.5x), your TEF is calibrated to that threat class."

**6. Incident History TEF Multiplier**

Prior incidents increase TEF because they signal either a persistent threat actor, systemic weakness, or both:

```typescript
INCIDENT_HISTORY_MULTIPLIER = {
  '0': 1.0,    // baseline
  '1': 1.5,    // one prior incident: 50% higher frequency
  '2_5': 2.0,  // repeat victimization pattern
  '5_plus': 3.0, // persistent threat or systemic failure
};
```

### Parameter Assembly Pipeline

```
Step 1: baseTEF = INDUSTRY_PARAMS[industry].baseTEF
Step 2: baseTEF.mode *= max(ATTACK_PATTERN_FREQ[selected threats])
Step 3: baseTEF.mode *= INCIDENT_HISTORY_MULTIPLIER[previousIncidents]
Step 4: Proportionally scale baseTEF.min and baseTEF.max to maintain shape

Step 5: baseVuln = INDUSTRY_PARAMS[industry].baseVuln
Step 6: baseVuln.mode += sum(CONTROL_MODIFIERS[enabled controls])
Step 7: Clamp baseVuln.mode to [0.02, baseVuln.max]
Step 8: Adjust baseVuln.min = max(0.01, baseVuln.mode - 0.15)

Step 9:  perRecordCost = max(PER_RECORD_COST[selected types])
Step 10: PL.mode = perRecordCost * recordCount * revenueScale
Step 11: PL.min = PL.mode * 0.3
Step 12: PL.max = PL.mode * 3.0

Step 13: SL = f(dataSensitivity, industry regulatory exposure)
Step 14: SL.mode = PL.mode * secondaryLossRatio[industry]
Step 15: SL.min = SL.mode * 0.2
Step 16: SL.max = SL.mode * 5.0

Step 17: Return { tef, vuln, pl, sl }
```

### Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| All 10 controls enabled | Vuln mode floors at 0.02. Do not return 0 vulnerability. |
| All 10 controls disabled | Vuln mode stays at industry base. No additional penalty beyond the base (controls are modifiers, not baseline). |
| Record count = 1,000 (minimum) | PL will be small but non-zero. This is a valid scenario for a small company. |
| Record count = 100,000,000 (maximum) | PL will be very large. Output capping is the API route's responsibility, not the lookup engine's. |
| Unknown industry (should not happen with Zod validation) | Fallback to cross-industry average: avgBreachCost $4,880,000 (IBM 2025 global average). |
| Single data type selected | Use that type's per-record cost directly. No averaging needed. |
| All 6 data types selected | Use the maximum per-record cost ($200 for health_records). This is conservative -- a breach involving health records and payment cards will be driven by the HIPAA/PCI regulatory cost, not an average. |

### Cross-References

- **Architecture Blueprint** (Section 8): Table structure, data source details, parameter mapping pipeline diagram.
- **Competitive Landscape**: CybRisk uses cited public data (IBM/DBIR/NetDiligence), unlike competitors with proprietary data.
- **Brand Guidelines** (Core Beliefs #3): "Methodology transparency is non-negotiable" -- every constant in this module must have a source comment.

---

## Module 3: Gordon-Loeb Calculator

**File**: `src/lib/gordon-loeb.ts`
**Runtime**: Node.js 20.x serverless (imported by API route)
**Dependencies**: `types.ts`, receives `SimulationOutput` from `monte-carlo.ts`
**Dependents**: `api/calculate/route.ts`

### Purpose

Calculate the economically optimal security investment using the Gordon-Loeb model (2002). Answer the question: "Given our expected annual loss, how much should we spend on security?"

The Gordon-Loeb model proves mathematically that the optimal investment in information security never exceeds 36.79% (1/e) of the expected loss. This is CybRisk's sharpest competitive differentiator -- no competitor (RiskLens, Safe Security, FAIR-U) includes this calculation.

### The Model

```
Optimal Security Investment <= (1/e) * v * L

Where:
  e = Euler's number (2.71828...)
  v = vulnerability probability (current, before investment)
  L = expected annual loss (ALE mean from Monte Carlo)

Therefore:
  Optimal Spend <= 0.3679 * v * L
```

**Interpretation**: If your ALE is $2M and your vulnerability is 0.5, the Gordon-Loeb model says you should spend no more than `0.3679 * 0.5 * $2M = $367,900` on security. Spending more than this amount has diminishing returns that exceed the marginal risk reduction.

### Input Contract

```typescript
interface GordonLoebInputs {
  simulation: SimulationOutput;         // From Monte Carlo engine
  controls: Record<Control, boolean>;   // From user questionnaire
  revenueBand: RevenueBand;             // For revenue cap calculation
}
```

### Output Contract

```typescript
interface GordonLoebResult {
  optimalSpend: number;   // Recommended annual security investment (dollars)
  currentRisk: number;    // ALE mean (current exposure)
  residualRisk: number;   // ALE after optimal investment (estimated reduction)
}
```

**Output Invariants:**

| Guarantee | Enforcement |
|-----------|-------------|
| `optimalSpend >= 0` | If ALE is 0, optimal spend is 0. |
| `optimalSpend <= revenueMidpoint * 0.05` | Practical cap at 5% of revenue. No board will approve spending more than 5% of revenue on security regardless of what the model says. |
| `residualRisk < currentRisk` | By definition, investing the optimal amount reduces risk. If residual >= current, something is wrong. |
| `residualRisk >= 0` | Risk cannot be negative. |

### Behavioral Rules

**1. Vulnerability Estimation from Controls**

The Gordon-Loeb model requires a vulnerability probability (v). This is estimated from the control questionnaire:

```
estimateVulnerabilityLevel(controls):
  baseVuln = 0.65  // Starting assumption: moderately vulnerable
  for each control in controls:
    if control.enabled:
      baseVuln += CONTROL_MODIFIERS[control]  // negative values reduce vuln
  return clamp(baseVuln, 0.05, 0.95)
```

**Why not use the Monte Carlo vulnerability**: The MC engine samples vulnerability from a PERT distribution -- it produces thousands of different values. Gordon-Loeb needs a single point estimate. We compute this independently from the control modifiers rather than averaging the MC samples, because the GL model was formulated for a single vulnerability parameter, not a distribution.

**2. Revenue Cap**

```
revenueCap = getRevenueMidpoint(revenueBand) * 0.05
cappedSpend = min(optimalSpend, revenueCap)
```

The 5% cap is a practical constraint, not a mathematical one. Gartner reports that typical IT security spending is 3-6% of IT budget, which is roughly 0.5-1.5% of revenue. A 5% revenue cap is generous but prevents the model from recommending implausible spending levels for high-loss, low-revenue scenarios.

**3. Residual Risk Estimate**

```
residualRisk = ale * (1 - v * 0.37)
```

This is an approximation. The Gordon-Loeb model does not specify the exact residual risk function -- it only proves an upper bound on optimal spend. The `v * 0.37` factor is a reasonable estimate of risk reduction from optimal investment, but it should be presented to users as "estimated" rather than "precise."

### Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| ALE mean = 0 | Optimal spend = 0. Residual risk = 0. This is correct: if there is no expected loss, there is no reason to invest in security. (In practice, ALE should never be exactly 0 with valid inputs.) |
| All controls enabled (low vulnerability) | Vulnerability estimate drops to floor (0.05). Optimal spend is small. The message: "You are already well-protected; marginal investment has low returns." |
| All controls disabled (high vulnerability) | Vulnerability estimate near ceiling (0.65 baseline). Optimal spend is large relative to ALE. The message: "You have significant room for improvement." |
| Optimal spend exceeds 5% of revenue | Cap at 5%. Display the uncapped value in methodology section so users understand the model recommends more than the practical cap allows. |
| Very small ALE (< $10,000) | Optimal spend will be very small (possibly < $1,000). This is valid for well-protected small companies. Do not inflate artificially. |

### Cross-References

- **Architecture Blueprint** (Section 6.4): Gordon-Loeb formula and code sample.
- **North Star** (Competitive Landscape): "No competitor includes Gordon-Loeb optimal spend calculation."
- **Brand Guidelines** (Core Beliefs #1): "Risk must be denominated in dollars" -- Gordon-Loeb answers "how many dollars should you spend?"
- **North Star** (Scope): Gordon-Loeb KPI card is a P2 priority, but the calculation itself is P0 (part of the API response).

---

## Module 4: API Route Handler

**File**: `src/app/api/calculate/route.ts`
**Runtime**: Node.js 20.x serverless (`export const runtime = 'nodejs'`)
**Dependencies**: `validation.ts`, `lookup-tables.ts`, `monte-carlo.ts`, `gordon-loeb.ts`, `types.ts`
**Dependents**: Client-side wizard (via HTTP POST)

### Purpose

Orchestrate the entire calculation pipeline. This is the convergence point where all server-side modules meet. It accepts a JSON request body from the wizard, validates it, maps inputs to FAIR parameters, runs the Monte Carlo simulation, computes Gordon-Loeb, and returns a structured JSON response.

This module contains no mathematical logic of its own. It is a coordinator, not a calculator. Its responsibilities are: validation, orchestration, output sanity checks, error handling, and response formatting.

### Pipeline Steps

```
1. Parse request body (JSON)
      |
2. Validate with Zod schema (CalculateRequestSchema)
      |  FAIL -> 400 { error, details: ZodError.issues }
      |
3. Destructure only expected fields (security)
      |
4. mapToFairParams(validatedInputs) -> FairParams
      |
5. runSimulation(fairParams, 10_000) -> SimulationOutput
      |
6. computeGordonLoeb(simulation, validatedInputs) -> GordonLoebResult
      |
7. Output sanity checks:
      |  - ALE mean >= 0
      |  - ALE mean <= 10 * revenueMidpoint (plausibility cap)
      |  - All percentiles non-negative
      |
8. deriveRiskRating(simulation, validatedInputs) -> RiskRating
      |
9. identifyKeyDrivers(validatedInputs, simulation) -> KeyDriver[]
      |
10. generateRecommendations(validatedInputs, simulation, gordonLoeb) -> Recommendation[]
      |
11. Build response JSON with metadata (iterations, executionTimeMs, dataSources)
      |
12. Return Response.json(response, { status: 200 })
```

### Input Contract

The request body must conform to `CalculateRequestSchema` (defined in `validation.ts`). The full Zod schema is documented in the Architecture Blueprint (Section 5.1).

**Security-Critical Rules:**

| Rule | Why |
|------|-----|
| Destructure only expected fields from the parsed body | Prevents prototype pollution. A malicious request could include `__proto__` or `constructor` fields. Zod strips unknown fields with `.strict()` or by only accessing validated output. |
| Hard min/max on all numeric inputs | `recordCount` is bounded to [1,000, 100,000,000]. Without bounds, an attacker could send `recordCount: Number.MAX_SAFE_INTEGER` and cause memory issues or implausible results. |
| Enum constraints on all string inputs | Industry, revenue band, employee count, data sensitivity, and previous incidents are all strict enums. No arbitrary string input reaches the calculation engine. |
| No dynamic code execution | The simulation uses static arithmetic. No input string is ever interpreted as code or passed to any function that executes strings as logic. |
| No logging of user inputs | Privacy by design. The serverless function processes and forgets. Do not add `console.log(body)` even for debugging -- user data must not appear in Vercel function logs. |

### Output Contract

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
  pml: number;
  gordonLoeb: {
    optimalSpend: number;
    currentRisk: number;
    residualRisk: number;
  };
  histogram: Array<{ bin: string; count: number }>;
  exceedanceCurve: Array<{ threshold: number; probability: number }>;
  keyDrivers: Array<{ name: string; impact: 'high' | 'medium' | 'low' }>;
  recommendations: Array<{ action: string; estimatedSavings: number }>;
  metadata: {
    iterations: number;
    executionTimeMs: number;
    dataSources: string[];
  };
}
```

### Behavioral Rules

**1. Risk Rating Derivation**

```
deriveRiskRating(simulation, inputs):
  ratio = simulation.ale.mean / getRevenueMidpoint(inputs.revenueBand)
  if ratio < 0.005:  return 'LOW'       // ALE < 0.5% of revenue
  if ratio < 0.02:   return 'MODERATE'  // ALE 0.5% - 2% of revenue
  if ratio < 0.05:   return 'HIGH'      // ALE 2% - 5% of revenue
  return 'CRITICAL'                     // ALE > 5% of revenue
```

Risk rating always accompanies dollar amounts. Per Brand Guidelines (Core Beliefs #1): the rating is a "quick visual anchor" -- it never appears without the ALE dollar figure.

**2. Key Drivers Identification**

Identify the top 3 factors driving the loss estimate. This is computed by sensitivity analysis: which input change would most reduce the ALE?

```
identifyKeyDrivers(inputs, simulation):
  drivers = []
  for each disabled control:
    controlImpact = abs(CONTROL_MODIFIERS[control]) * simulation.ale.mean
    drivers.push({ name: controlLabel(control), impact: ... })
  sort by impact descending
  return drivers.slice(0, 3)
```

Impact classification: `high` (> 15% of ALE), `medium` (5-15%), `low` (< 5%).

**3. Recommendations Generation**

For each disabled control, generate an actionable recommendation with estimated savings:

```
generateRecommendations(inputs, simulation, gordonLoeb):
  recommendations = []
  for each control where inputs.controls[control] == false:
    savings = abs(CONTROL_MODIFIERS[control]) * simulation.ale.mean
    recommendations.push({
      action: "Implement [controlDescription(control)]",
      estimatedSavings: savings,
    })
  sort by estimatedSavings descending
  return recommendations
```

**4. Output Plausibility Capping**

Before returning results, verify they are plausible:

```
if ale.mean < 0:
  throw new Error('Negative ALE -- check PERT parameters')

if ale.mean > getRevenueMidpoint(revenueBand) * 10:
  // Cap at 10x revenue. A breach costing >10x annual revenue is
  // theoretically possible but practically meaningless for this tool.
  ale.mean = getRevenueMidpoint(revenueBand) * 10
  // Log warning (without user data)
  console.warn('ALE capped at 10x revenue')
```

**5. Performance Timing**

```typescript
const start = performance.now();
// ... pipeline ...
const elapsed = performance.now() - start;
// Include in metadata
metadata.executionTimeMs = Math.round(elapsed);
```

### Error Handling

| Error | Status | Response Body |
|-------|--------|---------------|
| Invalid JSON body | 400 | `{ error: "Invalid JSON" }` |
| Zod validation failure | 400 | `{ error: "Validation failed", details: ZodError.issues }` |
| Non-POST method | 405 | `{ error: "Method not allowed" }` |
| Simulation error (any uncaught exception) | 500 | `{ error: "Simulation failed", message: "Please try again" }` |
| Negative ALE (should never happen) | 500 | `{ error: "Calculation error", message: "Internal validation failed" }` |

**Error response rule**: Never include user input data in error responses. Never include stack traces in production. The error message should help the client recover (retry, fix input) without leaking server internals.

### Cross-References

- **Architecture Blueprint** (Section 5): Full Zod schema, response shape, implementation pattern.
- **Architecture Blueprint** (Section 9): Security considerations for input validation.
- **Architecture Blueprint** (Section 12): Error handling and fallback chain.
- **North Star** (Metrics): Calculation Success Rate target is 99.5%.

---

## Module 5: Wizard State Manager

**File**: `src/app/assess/page.tsx`
**Runtime**: Browser (Client Component)
**Dependencies**: `types.ts`, Shadcn/ui components, Zod schemas from `validation.ts`
**Dependents**: API route (via fetch POST)

### Purpose

Manage the 5-step wizard state. Collect all user inputs required for the Monte Carlo calculation. Validate inputs per step. Submit to the API on step 5. Navigate to results on success.

This module is a state machine with 5 states (steps), forward/backward transitions, and a terminal action (submit). It owns all form data for the assessment lifecycle.

### State Shape

```typescript
// Parent component state
const [step, setStep] = useState(0);  // 0-indexed: 0-4
const [inputs, setInputs] = useState<AssessmentInputs>(defaultInputs);
const [isCalculating, setIsCalculating] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### Step Components

| Step | Component | Fields | Validation |
|------|-----------|--------|------------|
| 0 | `CompanyProfile` | industry, revenueBand, employeeCount | All required. Industry from 17-option dropdown. Revenue and employee from 5-option selectors. |
| 1 | `DataProfile` | dataTypes, recordCount, dataSensitivity | At least 1 data type. Record count: integer 1,000-100,000,000. Sensitivity from 3-option selector. |
| 2 | `SecurityControls` | 10 boolean toggles (mfa, encryption, ...) | No validation needed -- booleans default to false. All combinations are valid. |
| 3 | `ThreatLandscape` | threatTypes, previousIncidents | At least 1 threat type. Previous incidents from 4-option selector. Smart defaults: pre-select top 3 threats for the selected industry (from DBIR data). |
| 4 | `ReviewCalculate` | None (read-only summary) | Displays all inputs in summary cards. "Calculate" button triggers submission. No editable fields. |

### Behavioral Rules

**1. Pattern: Parent useState with Step Components as Children**

```typescript
const steps = [
  <CompanyProfile data={inputs.company} onUpdate={updateCompany} />,
  <DataProfile data={inputs.data} onUpdate={updateData} />,
  <SecurityControls data={inputs.controls} onUpdate={updateControls} />,
  <ThreatLandscape data={inputs.threats} onUpdate={updateThreats} />,
  <ReviewCalculate data={inputs} onCalculate={handleCalculate} />,
];
```

Each step component receives its slice of state and a callback to update it. The parent component merges updates into the full `AssessmentInputs` object. Steps never communicate with each other directly -- they communicate through the parent.

**2. State Preservation on Back/Forward**

When the user navigates backward (Step 3 -> Step 2), all previously entered data is preserved. When the user navigates forward again (Step 2 -> Step 3), the data they entered in Step 3 before is still there.

Implementation: because all state lives in the parent `useState`, and only the `step` index changes, no data is lost during navigation. Step components are not unmounted and remounted -- they are conditionally rendered.

**Caveat**: If using `{steps[step]}` with array indexing, React may unmount/remount components. To preserve internal component state (e.g., local UI state like dropdown open/closed), use `key={step}` carefully or render all steps with `display: none` on inactive ones.

**3. Per-Step Validation**

The "Continue" button is disabled until the current step's Zod schema validates:

```typescript
const stepSchemas = [
  CompanyProfileSchema,   // Step 0
  DataProfileSchema,      // Step 1
  z.object({}),           // Step 2: controls always valid
  ThreatLandscapeSchema,  // Step 3
  z.object({}),           // Step 4: review step, no new validation
];

const isStepValid = stepSchemas[step].safeParse(getCurrentStepData()).success;
```

**4. Submit Flow**

```
User clicks "Calculate" on Step 5
  |
  v
setIsCalculating(true)
  |
  v
POST /api/calculate with inputs (JSON body)
  |
  +-- Success (200):
  |     Store results in sessionStorage
  |     Store results in ResultsContext
  |     router.push('/results')
  |
  +-- Validation Error (400):
  |     Parse error.details to identify which step has invalid input
  |     Navigate to that step
  |     Show inline error
  |     setIsCalculating(false)
  |
  +-- Server Error (500):
  |     setError("Calculation failed. Please try again.")
  |     setIsCalculating(false)
  |     Show retry button
  |
  +-- Network Error:
        setError("Unable to connect. Check your internet connection.")
        setIsCalculating(false)
        Show retry button
```

**5. No External State Library**

Per Architecture Blueprint (Section 4.3): "The wizard is a single-page flow with 5 steps managed by a step index. All state lives in one parent component. There is no state shared across unrelated components, no middleware, and no time-travel debugging need. useState is sufficient and adds zero bundle size."

**6. Accessibility: Step Announcements**

On each step transition, announce the new step to screen readers via a live region:

```typescript
// A11yAnnouncer component
<div role="status" aria-live="polite" className="sr-only">
  {`Step ${step + 1} of 5: ${stepTitles[step]}`}
</div>
```

The wizard progress bar uses `aria-current="step"` on the active step.

### Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| Page refresh during wizard | Wizard resets to Step 1 with default inputs. This is an accepted tradeoff for stateless design. Per North Star: "Page refresh during wizard: Wizard resets to Step 1 (accepted tradeoff)." |
| Browser back button | Does not navigate wizard steps -- it navigates away from `/assess`. If returning to `/assess`, wizard resets to Step 1. (Phase 2 could add URL-encoded step state.) |
| Double-click on "Calculate" | Disable the button immediately on first click (`isCalculating` state). Prevent duplicate API calls. |
| API returns before loading animation finishes | Wait for a minimum 1.5-second animation duration to avoid a flash. The simulation takes < 200ms but the user experience benefits from a brief "Running 10,000 simulations..." animation. |
| User with JavaScript disabled | Client Component requires JS. This is a known limitation of the wizard being a Client Component. The landing page (Server Component) will still render. |

### Cross-References

- **Architecture Blueprint** (Section 4.3): Wizard orchestrator design with code sample.
- **Wireframes**: Step-by-step wizard layout specifications.
- **User Journeys**: Sarah and James journey maps through the wizard flow.
- **Accessibility**: WCAG 2.1 AA requirements for the wizard including focus management and keyboard navigation.
- **UI Design System**: Form input styling, button states, progress indicator design.

---

## Module 6: Results Context

**File**: `src/contexts/results-context.tsx`
**Runtime**: Browser (Client Component)
**Dependencies**: `types.ts`
**Dependents**: `src/app/results/page.tsx`, `src/app/assess/page.tsx`

### Purpose

Transfer calculation results from the API response (received in the wizard page) to the results dashboard page. Provide a React Context for components on the results page to consume without prop drilling. Persist results in sessionStorage to survive page refresh.

### State Shape

```typescript
interface ResultsContextType {
  results: CalculateResponse | null;
  setResults: (results: CalculateResponse) => void;
  clearResults: () => void;
  isLoading: boolean;
}
```

### Behavioral Rules

**1. Dual Storage: Context + sessionStorage**

```
On successful API response:
  1. setResults(apiResponse)          // React Context (instant access)
  2. sessionStorage.setItem(          // Persistence (survives refresh)
       'cybrisk-results',
       JSON.stringify(apiResponse)
     )

On results page load:
  1. Check Context (was it set during this navigation?)
     -> If present: use it (fast path)
  2. Check sessionStorage (page was refreshed?)
     -> If present: parse and load into Context
  3. Neither present?
     -> Redirect to /assess with message
```

**Why both**: React Context provides zero-latency access during the same session (no parsing, no I/O). sessionStorage provides persistence across page refreshes. Neither alone is sufficient: Context is lost on refresh, and sessionStorage requires JSON.parse on every read.

**2. Clear on New Calculation**

When the user starts a new assessment (navigates to `/assess`), clear previous results:

```typescript
clearResults():
  setResults(null)
  sessionStorage.removeItem('cybrisk-results')
```

This prevents stale results from a previous assessment appearing on the results page.

**3. Missing Results Handling**

If the results page loads with no results in Context or sessionStorage:

```typescript
// results/page.tsx
const { results } = useResults();

useEffect(() => {
  if (results === null) {
    router.push('/assess');
  }
}, [results, router]);
```

Display a brief message: "No results found. Start a new assessment." The redirect happens automatically.

**4. sessionStorage Unavailability**

Some browsers (private mode in older Safari, corporate environments with strict policies) disable sessionStorage. Handle gracefully:

```typescript
function safeSetItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch (e) {
    // sessionStorage full or disabled
    console.warn('sessionStorage unavailable; results will not survive refresh');
  }
}
```

If sessionStorage is unavailable, Context still works for the current navigation. Only page refresh will lose results.

**5. Data Size Considerations**

The full `CalculateResponse` includes a 50-element histogram array and a 20-element exceedance curve. Serialized JSON is approximately 3-5KB. sessionStorage limit is typically 5-10MB per origin. No risk of exceeding the limit with a single result set.

However, do NOT store `rawLosses` (the 10,000-element array) in sessionStorage. It would be ~200KB of JSON and is not needed by the results page (which uses the pre-binned histogram and computed percentiles).

### Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| Multiple tabs with different assessments | Each tab has its own React Context. sessionStorage is shared across tabs for the same origin. The last assessment to complete will overwrite sessionStorage. This is acceptable for MVP -- multi-tab scenarios are uncommon and the Context (per-tab) will still show correct results. |
| sessionStorage quota exceeded | Catch the `QuotaExceededError` and continue without persistence. Log a warning. |
| Corrupt JSON in sessionStorage | Wrap `JSON.parse` in try/catch. If parsing fails, treat as "no results" and redirect to `/assess`. |
| User manually clears browser storage | Same as "no results" -- redirect to `/assess`. |
| Results page bookmarked | Bookmark will load `/results` directly. Context is empty. sessionStorage may or may not have data. If no data, redirect to `/assess`. This is expected behavior for a stateless application. |

### Cross-References

- **Architecture Blueprint** (Section 3.3): State management rationale for sessionStorage + Context.
- **Architecture Blueprint** (Section 12.2): Client-side error handling for missing results.
- **North Star** (Architecture Summary): "sessionStorage for client-side result transfer only."

---

## Module 7: Chart Data Formatter

**Files**: `src/components/results/loss-distribution.tsx`, `src/components/results/loss-exceedance.tsx`, `src/components/results/chart-container.tsx`
**Runtime**: Browser (Client Components)
**Dependencies**: `types.ts`, Recharts, `chart-theme.ts`
**Dependents**: `src/app/results/page.tsx`

### Purpose

Transform the pre-processed Monte Carlo output (histogram bins, exceedance points) into Recharts-compatible props. Render the two primary visualizations: the Loss Distribution Histogram and the Loss Exceedance Curve.

These components receive pre-binned data from the API response. They do NOT receive raw simulation arrays. The API route and Monte Carlo engine handle all data reduction -- these components only handle rendering.

### Component Specifications

#### 7.1 Loss Distribution Histogram (`loss-distribution.tsx`)

**Recharts component**: `<BarChart>`

**Input**: `histogram: Array<{ bin: string; count: number }>` (50 elements)

**Rendering rules:**

| Property | Value | Rationale |
|----------|-------|-----------|
| `isAnimationActive` | `false` | Animation on 50 bars is distracting and slows initial render. |
| Bar fill color | Cyan-400 (`#22d3ee`) | Brand primary color. |
| Bar hover color | Cyan-300 (`#67e8f9`) | Lighter shade for hover feedback. |
| X-axis labels | Every 10th bin label shown | Showing all 50 labels causes overlap. Show labels at 0%, 20%, 40%, 60%, 80%, 100% marks. |
| X-axis label format | Dollar abbreviation (`$500K`, `$1.2M`) | Full dollar amounts do not fit. Use `formatCompactDollar()` from `a11y-utils.ts`. |
| Y-axis label | "Frequency" | Number of simulation iterations that fell in this bin. |
| Tooltip | `"$X - $Y: N iterations (P%)"` | Show bin range, count, and percentage of total. |
| ResponsiveContainer | `width="100%"` `height={300}` | Fits within chart-container Card. |

**Accessibility**: The histogram SVG gets `aria-hidden="true"`. A companion `<table>` with `sr-only` class provides the same data in tabular form for screen readers. The table includes every 5th bin (10 rows) to keep it concise.

#### 7.2 Loss Exceedance Curve (`loss-exceedance.tsx`)

**Recharts component**: `<LineChart>`

**Input**: `exceedanceCurve: Array<{ threshold: number; probability: number }>` (20 elements)

**Rendering rules:**

| Property | Value | Rationale |
|----------|-------|-----------|
| `dot` | `false` | 20 dots clutter a smooth curve. |
| `isAnimationActive` | `false` | Consistent with histogram -- no animation. |
| `strokeWidth` | `2` | Visible on dark background without being heavy. |
| `stroke` | Cyan-400 (`#22d3ee`) | Brand primary. |
| X-axis | Dollar thresholds (formatted) | Same compact dollar format as histogram. |
| Y-axis | Probability (0% - 100%) | Formatted as percentage. |
| Tooltip | `"P(Loss > $X) = Y%"` | Clear probabilistic language. |
| Reference lines | P90 and P95 horizontal lines in Amber-400 and Rose-500 | Visual anchors for "90% confidence" and "95% confidence" levels. |
| ResponsiveContainer | `width="100%"` `height={300}` | Same height as histogram for visual consistency. |

**Accessibility**: Same pattern as histogram. `aria-hidden="true"` on SVG. Companion `sr-only` table with all 20 data points: "There is a X% probability that annual losses will exceed $Y."

#### 7.3 Chart Container (`chart-container.tsx`)

**Purpose**: Card wrapper that provides consistent styling, title, and accessibility structure for both charts.

```typescript
interface ChartContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
  srTable: React.ReactNode;  // Screen reader data table
}
```

**Rendering rules:**

| Property | Value |
|----------|-------|
| Card background | Slate-900 (`bg-slate-900`) |
| Card border | Slate-800 (`border-slate-800`) |
| Title font | Inter semibold, text-lg |
| Description font | Slate-400, text-sm |
| Padding | `p-6` |
| Title placement | Above chart, left-aligned |

### Behavioral Rules -- Shared

**1. Never Pass Raw Arrays to Recharts**

The Monte Carlo engine produces 10,000 loss values. The API route reduces these to 50 histogram bins and 20 LEC points. The chart components receive only the reduced data. This is enforced by the TypeScript type system: `CalculateResponse` contains `histogram` and `exceedanceCurve`, not `rawLosses`.

If a developer attempts to add `rawLosses` to the API response and pass it to Recharts, the response payload would grow from ~5KB to ~200KB, the BarChart would attempt to render 10,000 bars (crashing the browser), and the LineChart would have 10,000 points (unusable).

**2. Consistent Formatting**

Dollar values on chart axes use compact notation from `a11y-utils.ts`:

```
formatCompactDollar(value):
  if value >= 1_000_000_000: return "$[value/1e9, 1 decimal]B"
  if value >= 1_000_000:     return "$[value/1e6, 1 decimal]M"
  if value >= 1_000:         return "$[value/1e3, 0 decimal]K"
  return "$[value, 0 decimal]"
```

For `aria-label` overrides, use the full dollar format: `$1,250,000` instead of `$1.2M`. This ensures screen readers speak the full amount.

**3. Color Palette**

All chart colors come from `chart-theme.ts`, which re-exports the brand palette:

```typescript
export const CHART_COLORS = {
  primary: '#22d3ee',    // Cyan-400 (bars, primary line)
  primaryHover: '#67e8f9', // Cyan-300
  warning: '#fbbf24',    // Amber-400 (P90 reference line)
  danger: '#f43f5e',     // Rose-500 (P95 reference line)
  positive: '#34d399',   // Emerald-400 (savings, improvements)
  gridLine: '#1e293b',   // Slate-800 (subtle grid)
  axisText: '#94a3b8',   // Slate-400 (axis labels)
};
```

Never use Recharts' default color palette. The default colors (blue, orange, green) conflict with CybRisk's dark theme and brand identity.

**4. Reduced Motion**

Respect the `prefers-reduced-motion` media query. Since `isAnimationActive` is already `false` by default, this is handled. If animation is ever enabled in a future phase, use the `useReducedMotion()` hook:

```typescript
const prefersReducedMotion = useReducedMotion();
<BarChart>
  <Bar isAnimationActive={!prefersReducedMotion} />
</BarChart>
```

### Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| All losses in same bin | Histogram shows 1 bar with count = 10,000. Other 49 bins are empty. This is valid (a very narrow distribution) but visually uninformative. Consider showing a "Distribution is very narrow" note. |
| Very wide distribution (min loss = $0, max = $100M) | Histogram bins may span very large ranges. X-axis labels will go from "$0" to "$100M". The shape should still be interpretable. |
| Exceedance curve with P(Loss > $0) = 100% | First point on the LEC is always `{ threshold: min_loss, probability: 1.0 }`. This is mathematically correct: every simulation produced a loss above the minimum. |
| Window resize | `<ResponsiveContainer>` handles resize automatically. Charts redraw on container width change. |
| Print mode | Charts render in browser print. `@media print` styles should ensure the dark background does not consume toner: switch to white background with dark data for print. (Phase 2 consideration.) |

### Cross-References

- **Architecture Blueprint** (Section 4.1): File list for results components.
- **UI Design System**: Chart styling specifications, color palette, typography for data.
- **Accessibility**: Chart sr-only data table requirements, aria-label for dollar values.
- **Brand Guidelines** (Design Principles): "Numbers are the hero" -- charts support the KPI cards, they do not replace them. The ALE dollar figure is always more prominent than the chart.
- **Wireframes**: Chart placement within the results dashboard layout.

---

## Module 8: Validation Engine

**File**: `src/lib/validation.ts`
**Runtime**: Both (imported by API route server-side and wizard client-side)
**Dependencies**: `types.ts`, Zod
**Dependents**: `api/calculate/route.ts`, `assess/page.tsx`

### Purpose

Define Zod schemas for all user inputs. Provide a single source of truth for validation rules that is shared between client-side (wizard per-step validation) and server-side (API route request validation).

This module bridges the gap between "helpful UX feedback" (client-side) and "security enforcement" (server-side). The same schemas serve both purposes. Client-side validation is a UX convenience -- it can be bypassed. Server-side validation is a security requirement -- it cannot be bypassed.

### Schema Structure

```typescript
// Per-step schemas (client-side validation)
export const CompanyProfileSchema = z.object({
  industry: z.enum([...INDUSTRIES]),
  revenueBand: z.enum([...REVENUE_BANDS]),
  employeeCount: z.enum([...EMPLOYEE_COUNTS]),
});

export const DataProfileSchema = z.object({
  dataTypes: z.array(z.enum([...DATA_TYPES])).min(1,
    'Select at least one data type'),
  recordCount: z.number().int().min(1000).max(100_000_000),
  dataSensitivity: z.enum(['low', 'medium', 'high']),
});

export const ThreatLandscapeSchema = z.object({
  threatTypes: z.array(z.enum([...THREAT_TYPES])).min(1,
    'Select at least one threat type'),
  previousIncidents: z.enum(['0', '1', '2_5', '5_plus']),
});

// Full request schema (server-side validation)
export const CalculateRequestSchema = z.object({
  ...CompanyProfileSchema.shape,
  ...DataProfileSchema.shape,
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
  ...ThreatLandscapeSchema.shape,
});
```

### Behavioral Rules

**1. Client-side: Validate per step, display inline errors**

When the user attempts to advance from Step 1 to Step 2, run `CompanyProfileSchema.safeParse()`. If it fails, display the error message next to the relevant field. The "Continue" button remains disabled until the step validates.

**2. Server-side: Validate entire request, reject with 400**

The API route runs `CalculateRequestSchema.safeParse()` on the full request body. If validation fails, return a 400 response with `ZodError.issues` so the client can display specific field-level errors.

**3. Never trust client-side validation**

An attacker can bypass all client-side JavaScript. The Zod schema in the API route is the security boundary. Even if the wizard fails to validate a field, the API route will catch it.

**4. Enum values as single source of truth**

Industry names, revenue bands, control names, threat types -- all are defined as TypeScript union types in `types.ts` and referenced by the Zod schemas. There is exactly one place where "healthcare" is defined as a valid industry. If a new industry is added, it is added in `types.ts` and automatically flows to the Zod schema, the lookup tables, and the UI dropdowns.

### Cross-References

- **Architecture Blueprint** (Section 5.1): Full Zod schema listing.
- **Architecture Blueprint** (Section 9.1): Input validation security controls.
- **Architecture Blueprint** (Section 13): Type system and core interfaces.

---

## Quality Standards Summary

### Per-Module Minimums

| Module | Min Lines | Min Test Cases | Performance Target |
|--------|-----------|----------------|-------------------|
| Monte Carlo Engine | ~150 | 8 (happy path, edge cases, percentiles, histogram, LEC) | < 100ms for 10K iterations |
| Lookup Table Engine | ~200 | 12 (each industry, each control combination, edge cases) | < 1ms (pure object lookups) |
| Gordon-Loeb Calculator | ~50 | 5 (zero ALE, high ALE, all controls, no controls, revenue cap) | < 1ms |
| API Route Handler | ~80 | 6 (valid request, invalid request, each error type, timing) | < 200ms warm, < 3s cold |
| Wizard State Manager | ~120 | 5 (step navigation, state preservation, submit, error handling) | N/A (UI responsiveness) |
| Results Context | ~60 | 4 (set/get, sessionStorage, missing results, corruption) | N/A (instant) |
| Chart Data Formatter | ~80/component | 3/component (rendering, empty data, extreme ranges) | < 500ms initial render |
| Validation Engine | ~80 | 10 (each field valid/invalid, combined schema) | < 5ms parse time |

### Content Quality Checklist

- [ ] Every constant in lookup-tables.ts has a source comment citing the specific report and page/table number.
- [ ] Every PERT parameter set satisfies `min <= mode <= max` and `min >= 0`.
- [ ] No raw 10K-element arrays cross the API response boundary.
- [ ] No user input data appears in console.log, error messages, or Vercel function logs.
- [ ] All dollar values use JetBrains Mono font and compact formatting on axes.
- [ ] Chart SVGs have `aria-hidden="true"` and companion sr-only data tables.
- [ ] Risk rating never appears without an accompanying dollar figure.
- [ ] Error responses include actionable recovery instructions (retry, fix input) but never stack traces.

### Cross-Module Invariants

These invariants span multiple modules and must hold across the entire pipeline:

| Invariant | Modules Involved | Verification |
|-----------|-----------------|--------------|
| `ALE >= 0` | Monte Carlo, API Route | API Route checks after simulation and before response. |
| `ALE <= 10x revenue` | Lookup Tables, API Route | API Route caps based on revenue band midpoint. |
| `Vulnerability in [0, 1]` | Lookup Tables, Monte Carlo | Lookup Tables cap at 0.95. MC Engine clamps per-sample to [0, 1]. |
| No raw losses in response | Monte Carlo, API Route | `CalculateResponse` type does not include `rawLosses`. |
| Histogram has 50 bins | Monte Carlo, Chart Formatter | MC Engine builds 50 bins. Histogram component expects 50 elements. |
| LEC has 20 points | Monte Carlo, Chart Formatter | MC Engine builds 20 points. LEC component expects 20 elements. |
| Dollar format consistency | All client modules | `formatCompactDollar()` from `a11y-utils.ts` used everywhere. |
| Zod schema shared | Validation, Wizard, API Route | Single `validation.ts` file imported by both. |

---

## Glossary of Module-Specific Terms

| Term | Definition | Module |
|------|-----------|--------|
| **Joehnk Algorithm** | A rejection-sampling method for generating Beta-distributed random variates. Used to sample PERT distributions without external dependencies. | Monte Carlo Engine |
| **Box-Muller Transform** | A method for generating normally-distributed random variates from uniformly-distributed ones. Used for log-normal severity sampling. | Monte Carlo Engine |
| **PERT Distribution** | A probability distribution defined by (min, mode, max) that assigns more weight to the mode than a triangular distribution. Lambda parameter (default 4) controls the concentration around the mode. | Monte Carlo Engine, Lookup Tables |
| **Running Mean** | Welford's online algorithm for computing the mean incrementally, avoiding floating-point overflow from summing large numbers. | Monte Carlo Engine |
| **Nearest-Rank Percentile** | A method for computing percentiles by finding the value at position `ceil(p/100 * n)` in a sorted array. | Monte Carlo Engine |
| **Control Modifier** | A decimal value (typically negative) representing the reduction in vulnerability when a security control is enabled. Sourced from IBM 2025 cost reduction factors. | Lookup Tables |
| **Revenue Cap** | An upper bound on Gordon-Loeb optimal spend set at 5% of the revenue band midpoint, preventing implausibly high recommendations. | Gordon-Loeb Calculator |
| **Plausibility Cap** | An upper bound on ALE set at 10x the revenue band midpoint, preventing mathematically valid but practically meaningless loss estimates. | API Route Handler |
| **Smart Defaults** | Pre-selected threat types on Step 4 based on the industry selected in Step 1, using DBIR attack pattern frequency data. | Wizard State Manager |
| **Dual Storage** | The pattern of storing results in both React Context (for instant access) and sessionStorage (for refresh resilience). | Results Context |

---

*Document generated by North Star Advisor -- Phase 7: Component Behavior Specifications*
