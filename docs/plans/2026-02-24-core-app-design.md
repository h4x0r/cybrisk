# CybRisk Core App — Design Document

**Date**: 2026-02-24
**Author**: Claude (brainstorming session with Albert)

## Overview

Design for the full CybRisk application: assessment wizard, Monte Carlo simulation engine, theatrical simulation console, and Bloomberg-style results dashboard. Extends "The Quantitative Firm" aesthetic from the landing page.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Wizard UX | Terminal-console flow | Steps slide in, previous steps compress to summary lines — feels like configuring a simulation, not filling a form |
| Results layout | Bloomberg terminal panels | Dense data panels with monospace headers, ticker bar, matching the quant-firm identity |
| Chart rendering | Canvas for both charts | Custom canvas with glow effects, heat-map coloring, interactive hover — cohesive with landing page 3D surface |
| Simulation execution | Client-side with theatrical progress | Real Monte Carlo in ~50ms, stretched to ~3s with terminal log + progress bar for dramatic effect |
| Simulation background | Navier-Stokes fluid solver | 2D fluid sim colored by risk severity — the "wow" moment during calculation |
| Results background | Lorenz attractor | Chaotic system seeded by risk outputs — ambient visual flex, doesn't compete with data |
| Scope | Core only, no stretch goals | No PDF export, no AI summary, no auth, no comparison mode |

## Architecture

```
Landing (done) → /assess (wizard) → /simulate (theatrical) → /results (dashboard)
                                         ↑
                                   Monte Carlo engine
                                   runs client-side
                                         ↑
                              /api/calculate (thin wrapper, same engine)
```

## Data Flow

```
Wizard (useState) → sessionStorage.setItem('assessment', JSON.stringify(inputs))
                  → navigate('/simulate')

Simulate page → sessionStorage.getItem('assessment')
              → import { simulate } from '@/lib/monte-carlo'
              → run simulation, store results
              → sessionStorage.setItem('results', JSON.stringify(results))
              → navigate('/results')

Results page → sessionStorage.getItem('results')
             → render dashboard

API route → same simulate() function, POST handler
          → for future features
```

## Assessment Wizard (/assess)

Single page, single dark card centered on screen. ScientistBg atmospheric canvas behind.

**Progress indicator**: `█████░░░░░ 3/5 ── SECURITY CONTROLS` (monospace)

**5 steps, each slides in from right:**

1. **Company Profile** — Industry (17 industries), revenue band, employee count, geography
2. **Data Profile** — Data types multi-select, record count, cloud percentage slider
3. **Security Controls** — 6 yes/no toggles styled as terminal switches `[ON]`/`[OFF]`
4. **Threat Landscape** — Top 3 concerns, previous incidents
5. **Review & Calculate** — Summary as terminal readout, "RUN SIMULATION" button with glow

State: React useState holding full assessment object. No form library.

## Simulation Console (/simulate)

**Background**: 2D Navier-Stokes fluid simulation on canvas. Simplified stable-fluid solver (velocity field, pressure projection via Jacobi iteration, dye advection with bilinear interpolation). Fluid colored by risk severity (blue→cyan→amber→crimson). Grid: ~128x128.

**Foreground**: Terminal card with scrolling log lines (~300ms apart), progress bar, then "SIMULATION COMPLETE" before auto-navigating to results.

## Results Dashboard (/results)

**Background**: Lorenz attractor (σ, ρ, β seeded from risk outputs). Fading trail of points in cyan/blue, slowly rotating.

**Layout:**

1. **Ticker bar** — Full-width monospace: ALE (cyan), PML (red), Gordon-Loeb (green), Risk Rating
2. **Loss Distribution** (left) — Canvas histogram with glow bars, heat-map coloring, ALE/PML reference lines
3. **Loss Exceedance Curve** (right) — Canvas S-curve, neon cyan with glow, interactive hover crosshair + tooltip
4. **Key Drivers** (bottom-left) — Table with HIGH/MEDIUM/LOW severity badges
5. **Recommendations** (bottom-right) — Ordered list with dollar-impact estimates
6. **Industry Benchmark** — Horizontal bar: Your ALE vs. Industry Median

## Color Palette (shared with landing page)

| Token | Value | Usage |
|-------|-------|-------|
| bg-deep | `#060a18` | Page background |
| card-bg | `rgba(4,8,28,0.92)` | Card backgrounds |
| accent-cyan | `#00d4ff` | Primary accent |
| text-primary | `#f0f4ff` | Headlines |
| text-secondary | `#8899bb` | Body |
| border-glow | `rgba(0,180,255,0.18)` | Card borders |
| danger | `#ef4444` | PML/risk/HIGH |
| success | `#22c55e` | Gordon-Loeb/good |
| gold | `#ffd060` | Highlights/MEDIUM |

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | Shared TypeScript interfaces |
| `src/lib/lookup-tables.ts` | Actuarial data constants |
| `src/lib/gordon-loeb.ts` | Optimal spend calculation |
| `src/lib/monte-carlo.ts` | FAIR Monte Carlo engine |
| `src/app/api/calculate/route.ts` | API wrapper |
| `src/app/assess/page.tsx` | Wizard page |
| `src/components/assess/WizardShell.tsx` | Terminal wizard container |
| `src/components/assess/StepCompanyProfile.tsx` | Step 1 |
| `src/components/assess/StepDataProfile.tsx` | Step 2 |
| `src/components/assess/StepSecurityControls.tsx` | Step 3 |
| `src/components/assess/StepThreatLandscape.tsx` | Step 4 |
| `src/components/assess/StepReview.tsx` | Step 5 |
| `src/app/simulate/page.tsx` | Theatrical simulation |
| `src/components/simulate/FluidCanvas.tsx` | Navier-Stokes fluid sim |
| `src/components/simulate/SimConsole.tsx` | Terminal log display |
| `src/app/results/page.tsx` | Results dashboard |
| `src/components/results/TickerBar.tsx` | Top KPI ticker |
| `src/components/results/LossDistribution.tsx` | Canvas histogram |
| `src/components/results/ExceedanceCurve.tsx` | Canvas S-curve |
| `src/components/results/KeyDrivers.tsx` | Driver table |
| `src/components/results/Recommendations.tsx` | Recommendations panel |
| `src/components/results/IndustryBenchmark.tsx` | Benchmark bar |
| `src/components/results/LorenzCanvas.tsx` | Lorenz attractor background |
