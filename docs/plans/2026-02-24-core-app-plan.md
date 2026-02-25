# CybRisk Core App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the full CybRisk app: Monte Carlo engine, assessment wizard, simulation console, and results dashboard.

**Architecture:** Client-side Monte Carlo simulation with theatrical UI. Pure TypeScript math engine (no Python). Three new pages (/assess, /simulate, /results) extending the existing dark quant-firm landing page aesthetic.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind CSS v4, Shadcn/ui, Canvas 2D API, Vitest for testing.

---

### Task 0: Test Framework Setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add vitest deps + test script)

**Step 1: Install vitest**

```bash
npm install -D vitest @vitejs/plugin-react
```

**Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Step 3: Add test script to package.json**

Add `"test": "vitest run"` and `"test:watch": "vitest"` to scripts.

**Step 4: Verify**

```bash
npx vitest run
```

Expected: 0 tests, no errors.

**Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test framework"
```

---

### Task 1: Types and Interfaces

**Files:**
- Create: `src/lib/types.ts`

All shared TypeScript interfaces for the application. No tests needed — these are pure type definitions.

**Types to define:**
- `Industry` — union of 17 industry keys
- `RevenueBand` — union of 5 revenue ranges
- `EmployeeCount` — union of 5 size ranges
- `Geography` — union of 6 regions
- `DataType` — union of 6 data types
- `ThreatType` — union of 7 threat types
- `IncidentHistory` — union of 4 ranges
- `CompanyProfile` — { industry, revenueBand, employees, geography }
- `DataProfile` — { dataTypes, recordCount, cloudPercentage }
- `SecurityControls` — { securityTeam, irPlan, aiAutomation, mfa, pentest, cyberInsurance }
- `ThreatLandscape` — { topConcerns (max 3), previousIncidents }
- `AssessmentInputs` — { company, data, controls, threats }
- `RiskRating` — 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
- `DistributionBucket` — { rangeLabel, minValue, maxValue, probability }
- `ExceedancePoint` — { loss, probability }
- `KeyDriver` — { factor, impact: 'HIGH' | 'MEDIUM' | 'LOW', description }
- `SimulationResults` — { ale: { mean, median, p10, p90, p95 }, gordonLoebSpend, riskRating, industryBenchmark: { yourAle, industryMedian, percentileRank }, distributionBuckets, exceedanceCurve, keyDrivers, recommendations, rawLosses }

**Step 1: Create src/lib/types.ts with all types**

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared TypeScript interfaces for assessment and simulation"
```

---

### Task 2: Lookup Tables

**Files:**
- Create: `src/lib/lookup-tables.ts`
- Create: `src/__tests__/lookup-tables.test.ts`

All hardcoded actuarial data from SPEC.md. Tests verify data integrity (correct number of entries, positive values, known values match).

**Data to include (from SPEC.md sections 5.1-5.5):**
- `PER_RECORD_COST` — IBM 2025 per-record costs by data type
- `INDUSTRY_AVG_COST` — IBM 2025 average breach cost by industry (USD millions)
- `COST_MODIFIERS` — Security control cost amplifiers/reducers
- `ATTACK_PATTERN_FREQ` — DBIR 2025 breach frequency by attack pattern
- `INCIDENT_COST_BY_REVENUE` — NetDiligence claim costs by revenue band
- `CLAIM_SEVERITY` — NetDiligence severity distribution parameters
- `REGULATORY_EXPOSURE` — Fine exposure by geography
- `SEVERITY_DISTRIBUTION` — Log-normal parameters for loss severity
- `TEF_BY_INDUSTRY` — Threat event frequency parameters per industry (PERT min/mode/max)
- `BASE_VULNERABILITY` — Base vulnerability rate (DBIR incidents→breaches)
- `REVENUE_MIDPOINTS` — Dollar midpoints for each revenue band (for Gordon-Loeb cap)
- `EMPLOYEE_MULTIPLIERS` — Attack surface multiplier by employee count

**Tests:**
- All 17 industries present in INDUSTRY_AVG_COST
- All 6 data types present in PER_RECORD_COST
- All per-record costs are positive numbers
- COST_MODIFIERS for ir_plan is -0.23
- REGULATORY_EXPOSURE for EU has max_pct_revenue of 0.04

**Step 1: Write failing tests**
**Step 2: Implement lookup-tables.ts**
**Step 3: Run tests, verify pass**
**Step 4: Commit**

---

### Task 3: Gordon-Loeb Calculation

**Files:**
- Create: `src/lib/gordon-loeb.ts`
- Create: `src/__tests__/gordon-loeb.test.ts`

**Function:** `optimalSpend(vulnerability: number, ale: number, revenue: number): number`
**Formula:** `min(0.37 * vulnerability * ale, 0.05 * revenue)`

**Tests:**
- Basic case: v=0.5, ale=1_000_000, revenue=100_000_000 → 185_000
- Cap test: v=1.0, ale=50_000_000, revenue=10_000_000 → 500_000 (capped by 5% of revenue)
- Zero vulnerability: v=0, ale=1_000_000, revenue=100_000_000 → 0
- Edge: v=1.0, ale=0, revenue=100_000_000 → 0

**Step 1: Write failing tests**
**Step 2: Implement gordon-loeb.ts**
**Step 3: Run tests, verify pass**
**Step 4: Commit**

---

### Task 4: Monte Carlo Engine

**Files:**
- Create: `src/lib/monte-carlo.ts`
- Create: `src/__tests__/monte-carlo.test.ts`

This is the core engine. Pure TypeScript, no DOM dependencies.

**Functions to implement:**

1. `sampleUniform()` — wrapper around Math.random for testability (can be seeded)
2. `boxMuller(rng)` — Normal distribution via Box-Muller transform
3. `sampleLogNormal(mu, sigma, rng)` — Log-normal sampling
4. `sampleBeta(alpha, beta, rng)` — Beta distribution (Joehnk's method or rejection)
5. `samplePERT(min, mode, max, rng)` — PERT distribution via Beta
6. `sampleTEF(inputs, rng)` — Threat Event Frequency from industry + employee count
7. `sampleVulnerability(inputs, rng)` — Base rate adjusted by security controls
8. `samplePrimaryLoss(inputs, rng)` — Per-record costs × sampled record count
9. `sampleSecondaryLoss(inputs, primaryLoss, rng)` — Regulatory + litigation + reputation + notification
10. `computeRiskRating(ale, revenue)` — LOW/MODERATE/HIGH/CRITICAL
11. `buildDistributionBuckets(losses)` — Histogram buckets
12. `buildExceedanceCurve(losses)` — P(Loss > X) curve points
13. `identifyKeyDrivers(inputs)` — What contributes most to risk
14. `generateRecommendations(inputs, results)` — Actionable recommendations with $ impact
15. `simulate(inputs, iterations?, rng?)` — Main entry point, returns SimulationResults

**Tests (TDD — write these first):**
- `boxMuller`: Mean of 10K samples ≈ 0 (within 0.05), stddev ≈ 1 (within 0.1)
- `sampleLogNormal`: Mean of 10K samples ≈ exp(mu + sigma²/2) (within 20%)
- `samplePERT`: Mode of 10K samples is within [min, max], mean ≈ (min + 4*mode + max)/6 (within 15%)
- `sampleBeta`: Mean of 10K samples ≈ alpha/(alpha+beta) (within 0.05)
- `sampleTEF`: Returns positive number for valid industry
- `sampleVulnerability`: Base rate reduced by controls (IR plan → lower vuln)
- `samplePrimaryLoss`: Higher record count → higher loss
- `simulate`: Full run returns valid SimulationResults structure
- `simulate`: ALE mean is positive
- `simulate`: p10 < median < p90 < p95
- `simulate`: Gordon-Loeb spend is positive
- `simulate`: Risk rating is one of the 4 values
- `simulate`: Distribution buckets sum to ~1.0
- `simulate`: Exceedance curve starts near 1.0 and ends near 0
- `computeRiskRating`: Correct ratings for known thresholds

**Step 1: Write all failing tests**
**Step 2: Implement functions one by one until all tests pass**
**Step 3: Commit**

---

### Task 5: API Route

**Files:**
- Create: `src/app/api/calculate/route.ts`

Thin POST wrapper around `simulate()`. Validates input shape, calls engine, returns JSON.

**Implementation:**
- Parse JSON body as AssessmentInputs
- Call `simulate(inputs)`
- Return NextResponse.json(results)
- Handle errors with 400/500 status codes

**Step 1: Implement route.ts**
**Step 2: Verify build passes**
**Step 3: Commit**

---

### Task 6: Assessment Wizard

**Files:**
- Create: `src/app/assess/page.tsx`
- Create: `src/components/assess/WizardShell.tsx`
- Create: `src/components/assess/StepCompanyProfile.tsx`
- Create: `src/components/assess/StepDataProfile.tsx`
- Create: `src/components/assess/StepSecurityControls.tsx`
- Create: `src/components/assess/StepThreatLandscape.tsx`
- Create: `src/components/assess/StepReview.tsx`

**Design: Terminal-console flow**

`WizardShell.tsx`:
- Dark card centered on page, max-w-2xl
- Progress bar at top: `█████░░░░░ 3/5 ── SECURITY CONTROLS` (monospace)
- Manages current step index (0-4), animates step transitions (slide in from right)
- Holds assessment state as `useState<Partial<AssessmentInputs>>`
- Back/Next buttons at bottom of each step
- On final step submit: save to sessionStorage, navigate to /simulate

`StepCompanyProfile.tsx`:
- Industry dropdown (17 industries from lookup-tables)
- Revenue band dropdown (5 options)
- Employee count dropdown (5 options)
- Geography dropdown (6 options)
- All using Shadcn Select components, dark-themed

`StepDataProfile.tsx`:
- Data types: checkboxes/toggle group for 6 data types
- Record count: numeric input with formatted display
- Cloud percentage: Shadcn Slider 0-100

`StepSecurityControls.tsx`:
- 6 yes/no questions
- Each as a toggle styled as terminal switch: `[ON]` cyan / `[OFF]` muted
- Questions from SPEC.md section 3: Step 3

`StepThreatLandscape.tsx`:
- Top 3 concerns: multi-select (max 3) from 7 threat types
- Previous incidents: dropdown (0, 1, 2-5, 5+)

`StepReview.tsx`:
- Display all inputs as compact terminal readout (monospace, color-coded)
- "RUN SIMULATION →" button with glow-pulse animation
- On click: sessionStorage.setItem('assessment', JSON.stringify(inputs)), router.push('/simulate')

`page.tsx`:
- 'use client' directive
- Imports ScientistBg (dynamic, no SSR) for atmospheric background
- Renders WizardShell centered

**Aesthetic:**
- Background: #060a18 with ScientistBg canvas
- Card: rgba(4,8,28,0.92) with border-glow animation
- All form elements styled to match dark theme
- Select dropdowns: dark bg, cyan accent on focus
- Animate card entrance with fade-up on page load

**Step 1: Create all files**
**Step 2: Verify build passes**
**Step 3: Commit**

---

### Task 7: Simulation Console with Navier-Stokes

**Files:**
- Create: `src/app/simulate/page.tsx`
- Create: `src/components/simulate/FluidCanvas.tsx`
- Create: `src/components/simulate/SimConsole.tsx`

**Design: Theatrical simulation moment**

`FluidCanvas.tsx`:
- Full-screen canvas, fixed position, behind everything
- 2D Navier-Stokes stable-fluid solver:
  - Grid size: 128×128
  - Fields: velocity (u, v), density/dye, pressure
  - Steps per frame: addSource → diffuse → project → advect → project
  - Diffusion via Gauss-Seidel iteration (20 iterations)
  - Advection via semi-Lagrangian (bilinear interpolation)
  - Pressure projection via Jacobi iteration
- Dye injection: emitters at center, colored by risk severity
  - Blue (#0066ff) → Cyan (#00d4ff) → Amber (#ffd060) → Crimson (#ef4444)
  - Color shifts over 3 seconds as "simulation heats up"
- Fluid velocity: circular vortex pattern, evolving
- ResizeObserver for responsive canvas, DPR handling
- requestAnimationFrame loop with cleanup

`SimConsole.tsx`:
- Centered card (max-w-lg), glassmorphism style
- Receives `inputs: AssessmentInputs` prop
- Displays sequential log lines with typewriter timing (~300ms each):
  ```
  ▸ Loading actuarial parameters...
  ▸ Industry: {industry} — base TEF λ={tef}/yr
  ▸ Adjusting vulnerability: {active controls list}
  ▸ Sampling PERT distributions (N=10,000)...
  ▸ Running Monte Carlo simulation...
    ████████████████░░░░░░░░░░ {pct}%
  ▸ Computing loss exceedance curve...
  ▸ Fitting Gordon-Loeb optimal spend...
  ✓ SIMULATION COMPLETE — ALE: ${ale}
  ```
- Progress bar animates from 0-100% over ~1.5 seconds
- Actual Monte Carlo `simulate()` runs during "Running Monte Carlo" step
- After "COMPLETE" line, 1s pause, then navigate to /results
- Results stored in sessionStorage before navigation

`page.tsx`:
- 'use client' directive
- On mount: read assessment from sessionStorage
- If no assessment data: redirect to /assess
- Render FluidCanvas (full screen) + SimConsole (centered foreground)

**Step 1: Create all files**
**Step 2: Verify build passes**
**Step 3: Commit**

---

### Task 8: Results Dashboard with Lorenz Attractor

**Files:**
- Create: `src/app/results/page.tsx`
- Create: `src/components/results/LorenzCanvas.tsx`
- Create: `src/components/results/TickerBar.tsx`
- Create: `src/components/results/LossDistribution.tsx`
- Create: `src/components/results/ExceedanceCurve.tsx`
- Create: `src/components/results/KeyDrivers.tsx`
- Create: `src/components/results/Recommendations.tsx`
- Create: `src/components/results/IndustryBenchmark.tsx`

**Design: Bloomberg terminal panels**

`LorenzCanvas.tsx`:
- Fixed position canvas behind everything, pointer-events: none
- Lorenz system: dx/dt=σ(y-x), dy/dt=x(ρ-z)-y, dz/dt=xy-βz
- Parameters σ=10, ρ and β seeded from risk outputs (ρ=20+ale_normalized*10, β=2+risk_factor)
- Euler integration, ~500 steps per frame for smooth trail
- 3D→2D projection with slowly rotating view angle
- Trail: last 5000 points, fading opacity, cyan→blue palette
- ResizeObserver + DPR handling

`TickerBar.tsx`:
- Full-width bar at top of results page
- Monospace font, dense layout
- Shows: ALE (cyan), PML₉₅ (red), GORDON-LOEB (green), RISK RATING (color by severity)
- Formatted as currency ($X,XXX,XXX) with pipe separators
- Subtle left-to-right fade-in animation on load

`LossDistribution.tsx`:
- Canvas-rendered histogram
- Bins from distributionBuckets in SimulationResults
- Bars: translucent fill with glow effect (shadowBlur)
- Color: heat-map gradient per bar (blue for low-loss → crimson for high-loss)
- ALE vertical reference line (cyan, dashed)
- PML vertical reference line (red, dashed)
- X-axis: dollar amounts, Y-axis: probability
- Interactive hover: highlight bar, show tooltip with range + probability
- Monospace axis labels

`ExceedanceCurve.tsx`:
- Canvas-rendered S-curve (inverted — P=1.0 at left, drops to ~0)
- Data from exceedanceCurve in SimulationResults
- Neon cyan line with shadowBlur glow (matching landing page surface style)
- Reference lines: ALE (cyan), PML (red), Gordon-Loeb (green) as vertical markers
- Interactive hover crosshair + tooltip (same pattern as landing page HeroChart)
- Tooltip shows: Loss $, P(Loss > x), with exceedance color coding
- Monospace axis labels, dark background

`KeyDrivers.tsx`:
- Table component
- Columns: Factor, Impact (badge: HIGH red, MEDIUM amber, LOW green), Description
- Rows from keyDrivers in SimulationResults
- Monospace font, dark rows with subtle alternating shading
- Fade-up animation on load

`Recommendations.tsx`:
- Ordered list
- Each recommendation: number, text, dollar impact estimate
- Gordon-Loeb callout at bottom with green accent
- Monospace for dollar figures, Geist Sans for text

`IndustryBenchmark.tsx`:
- Horizontal bar visualization
- Shows industry median (marker) and user's ALE (marker) on a scale
- If user ALE < industry median: green tint ("below average risk")
- If user ALE > industry median: red tint ("above average risk")
- Percentile rank displayed as text

`page.tsx`:
- 'use client' directive
- On mount: read results from sessionStorage
- If no results: redirect to /assess
- Layout: LorenzCanvas (background) + main content
- Content grid:
  - TickerBar (full width)
  - LossDistribution (left half) + ExceedanceCurve (right half)
  - KeyDrivers (left half) + Recommendations (right half)
  - IndustryBenchmark (full width)
- "Start New Assessment" button at bottom → /assess
- All panels use glassmorphism card style with border-glow

**Step 1: Create all files**
**Step 2: Verify build passes**
**Step 3: Commit**

---

## Execution Order

Tasks 0-4 are sequential (each depends on previous).
Task 5 depends on Task 4.
Tasks 6-8 depend on Tasks 1-4 (types + engine must exist).
Task 6, 7, 8 can be done sequentially (7 depends on 6 for navigation flow, 8 depends on 7).

```
0 → 1 → 2 → 3 → 4 → 5
                  ↓
                  6 → 7 → 8
```
