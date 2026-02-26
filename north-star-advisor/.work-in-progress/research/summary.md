# Research Summary

## Generated
2026-02-22T16:00:00+08:00

## Project Context
- **Name:** CybRisk
- **Type:** Cyber risk quantification SaaS (hackathon entry)
- **Users:** vCISOs, fractional security advisors, SMB executives, cyber insurance buyers
- **Preferred Stack:** Next.js 14+ App Router, Tailwind + Shadcn/ui, Recharts, TypeScript

---

## Technology Stack

### Recommended / Validated
| Layer | Recommendation | Rationale |
|-------|---------------|-----------|
| Framework | Next.js 14+ App Router | Already chosen; well-suited for wizard → API → dashboard flow |
| Form handling | React Hook Form + Zod + @hookform/resolvers | Per-step validation, type safety, Shadcn/ui integration |
| State (wizard) | Plain `useState` in parent component | Simplest for 5-step wizard; no external library needed |
| State (results) | sessionStorage + React Context | Survives refresh, no URL exposure, instant navigation |
| Charts | Recharts (BarChart for histogram, LineChart for LEC) | Already installed; pre-bin MC results into 50-100 buckets |
| Monte Carlo | Pure TypeScript (Box-Muller + custom Beta sampling) | Zero dependencies; 10K iterations < 100ms on Vercel |
| Runtime | Node.js serverless (NOT Edge) | CPU-intensive math needs full Node.js APIs |
| Deployment | Vercel Hobby with Fluid Compute (300s timeout) | 10K iterations well within limits |

### Key Libraries
- **react-hook-form**: Form state management per step
- **zod**: Schema validation + TypeScript inference
- **@hookform/resolvers**: Bridges Zod ↔ React Hook Form
- **jstat** (optional): Beta distribution sampling — or implement Joehnk algorithm (~20 lines)
- **framer-motion** (optional): Smooth wizard step transitions
- **nuqs** (stretch): URL-encoded shareable state

### NOT Needed
- No Python backend, no database, no formik, no redux, no zustand (plain useState suffices)
- No @data-ui/histogram — Recharts BarChart with pre-binned data is sufficient

---

## Features & UX

### Expected Features (from competitor analysis)
Users of FAIR-based tools expect:
1. **Financial output in dollars** — not heat maps or letter grades
2. **Monte Carlo simulation** with probabilistic outputs
3. **Loss exceedance curves** (the gold standard FAIR visualization)
4. **Scenario-based analysis** with control comparison
5. **Gordon-Loeb optimal spend** recommendation (CybRisk's unique differentiator)
6. **Board-ready reporting** in non-technical language
7. **Industry benchmarks** pre-loaded from actuarial data

### UX Patterns
- **Wizard**: 5-6 numbered steps, inline validation per step, back/forward with state preservation
- **Progress indicator**: "Step 3 of 5: Security Controls" with checkmarks for completed steps
- **Results hierarchy**: Risk rating badge → ALE headline → KPI cards → charts → details
- **Dark theme**: Default, with muted accents; not pure black (#000) — use slate-900/950
- **Trust signals**: "Your data is never stored" + FAIR methodology badge + builder credentials

### Competitor Positioning
| Feature | FAIR-U | RiskLens | Safe Security | **CybRisk** |
|---------|--------|----------|---------------|-------------|
| Self-service | Yes | Limited | No (enterprise) | **Yes** |
| Gordon-Loeb | No | No | No | **Yes** |
| Speed | Slow (manual) | Days | Real-time | **5 minutes** |
| Cost | Free | $$$$ | $$$$ | **Free** |

---

## Architecture

### Recommended Pattern: Single-Page Wizard → API Route → Results Dashboard

```
Landing (Server Component) → /assess (Client, useState wizard) → POST /api/calculate → /results (Client, sessionStorage)
```

### Data Flow
1. User fills wizard steps (state in parent `useState`)
2. On "Calculate": POST form data as JSON to `/api/calculate`
3. API route: validate with Zod → run Monte Carlo → return JSON
4. Store results in sessionStorage + Context → navigate to `/results`
5. Results page reads from Context (fast) or sessionStorage (refresh)

### Monte Carlo Engine Design (from pyfair reference)
- Flat FAIR tree: TEF → Vuln → LEF, PL → SL → LM, Risk = LEF × LM
- User questionnaire maps to PERT parameters via lookup tables
- 10,000 iterations, PERT distribution sampling, Box-Muller for log-normal
- Output: sorted array → compute percentiles, mean, histogram bins

### Performance
- **10K iterations: < 100ms** on Vercel serverless (40K random calls + arithmetic)
- **Memory**: ~80KB for 10K floats — negligible
- **Cold start**: 1-3 seconds on first invocation; keep bundle small
- **No streaming needed**: synchronous JSON response

---

## Pitfalls to Avoid

### FAIR Model
1. **PERT lambda=4 is arbitrary** — document the assumption; consider exposing as configurable
2. **PERT edge case**: mode == mean produces 0/0 — handle explicitly
3. **Highly skewed inputs** (mode within 13% of min/max) degrade the approximation — warn users
4. **Don't back-calculate mode from MC output** — report P50 as central tendency

### Monte Carlo in JavaScript
5. **Math.random() quality is fine** — V8's xorshift128+ passes TestU01 tests
6. **Not seedable** — acceptable for production; use `random-seedable` for demo reproducibility
7. **Floating-point accumulation** — use running mean, not sum-then-divide
8. **10K iterations is the sweet spot** — stable percentiles, <100ms runtime

### API Security
9. **DoS via extreme params** — Zod validation with hard min/max on all inputs
10. **Prototype pollution** — destructure only expected fields, never spread raw input
11. **No rate limiting** — add simple per-IP limit (10 req/min) or skip for hackathon

### Visualization
12. **Never show just a point estimate** — always show distribution (LEC + histogram)
13. **Don't call them "confidence intervals"** — say "90% of simulated outcomes fall between $X and $Y"
14. **Pre-bin histogram data** — never pass 10K raw points to Recharts
15. **Set dot={false}, isAnimationActive={false}** for Recharts performance

### Hackathon
16. **Scope creep is the #1 killer** — resist adding features beyond SPEC
17. **Deploy to Vercel on day 1** — test production URL continuously
18. **Demo script** — have a happy-path walkthrough rehearsed; screenshots as backup
19. **Test Monte Carlo engine first** — it's the mathematical core, hardest to debug visually

---

## Generation Guidance

These findings should inform:
- **Phase 6 (ARCHITECTURE_BLUEPRINT):** Single-page wizard → API → results pattern; Node.js serverless (not Edge); plain useState for wizard state; sessionStorage for results transfer; pure TS Monte Carlo engine
- **Phase 7 (AGENT_PROMPTS):** Not directly applicable (CybRisk is not an agent-based product)
- **Phase 8 (SECURITY_ARCHITECTURE):** Zod input validation, no rate limiting for hackathon MVP, "data never stored" privacy model, no auth needed

---

## Sources Index

### Tech Stack
- [React Hook Form Multi-Step Tutorial](https://www.buildwithmatija.com/blog/master-multi-step-forms-build-a-dynamic-react-form-in-6-simple-steps)
- [Shadcn/ui Multi Form Generator](https://shadcn-ui-multi-form.vercel.app/)
- [nuqs - Type-safe URL State](https://nuqs.dev)
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations)
- [jStat GitHub](https://github.com/jstat/jstat)

### Features & UX
- [FAIR Institute](https://www.fairinstitute.org/what-is-fair)
- [RiskLens - FAIR Standard](https://www.risklens.com/cyber-risk-quantification/the-fair-standard)
- [Safe Security - CRQ](https://safe.security/solutions/crq/)
- [Smashing Magazine - Multistep Forms](https://www.smashingmagazine.com/2024/12/creating-effective-multistep-form-better-user-experience/)

### Architecture
- [pyfair GitHub](https://github.com/Hive-Systems/pyfair)
- [Gordon-Loeb Model - Wikipedia](https://en.wikipedia.org/wiki/Gordon%E2%80%93Loeb_model)
- [PERT Distribution - Wikipedia](https://en.wikipedia.org/wiki/PERT_distribution)
- [Box-Muller Transform](https://mika-s.github.io/javascript/random/normal-distributed/2019/05/15/generating-normally-distributed-random-numbers-in-javascript.html)

### Pitfalls
- [V8 Math.random()](https://v8.dev/blog/math-random)
- [OWASP Serverless Security](https://cheatsheetseries.owasp.org/cheatsheets/Serverless_FaaS_Security_Cheat_Sheet.html)
- [Recharts Performance Guide](https://recharts.github.io/en-US/guide/performance/)
- [MIT Sloan - Hackathon Pitfalls](https://sloanreview.mit.edu/article/avoid-these-five-pitfalls-at-your-next-hackathon/)
