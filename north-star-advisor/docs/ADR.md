# CybRisk: Architecture Decision Records

> **Parent**: [INDEX.md](INDEX.md)
> **Format**: ADR-NNNN (sequential, never reused)
> **Generation Step**: 9 of 13 — Records decisions made during generation of Steps 1-8

Architecture decisions that shape the CybRisk cyber risk calculator.

---

## How to Use

Record decisions when you:
- Choose between competing approaches
- Reject a popular pattern for good reasons
- Make trade-offs that future developers need to understand

**Keep it brief.** A good ADR fits on one screen.

---

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| 0001 | Stateless Architecture — No Database | Accepted | 2026-02-22 |
| 0002 | No User Authentication | Accepted | 2026-02-22 |
| 0003 | Pure TypeScript Monte Carlo Engine | Accepted | 2026-02-22 |
| 0004 | PERT Distribution via Joehnk Algorithm | Accepted | 2026-02-22 |
| 0005 | Node.js Serverless Runtime (Not Edge) | Accepted | 2026-02-22 |
| 0006 | sessionStorage for Results Transfer | Accepted | 2026-02-22 |
| 0007 | Zod as Single Validation Source of Truth | Accepted | 2026-02-22 |
| 0008 | Plain useState for Wizard State | Accepted | 2026-02-22 |
| 0009 | Pre-Binned Histogram Data for Recharts | Accepted | 2026-02-22 |
| 0010 | OWASP API Security Top 10 (Not Agentic AI) | Accepted | 2026-02-22 |
| 0011 | Fixed 10,000 Monte Carlo Iterations | Accepted | 2026-02-22 |
| 0012 | Gordon-Loeb Model for Optimal Spend | Accepted | 2026-02-22 |

---

## ADR-0001: Stateless Architecture — No Database

**Date**: 2026-02-22
**Status**: Accepted

### Context
CybRisk needs to calculate financial risk exposure from user inputs. We needed to decide whether to persist user data in a database or operate as a stateless calculator.

### Decision
CybRisk operates as a fully stateless calculator. No database, no server-side storage. Each API request is a pure function: input in, JSON out, nothing persisted.

### Alternatives Rejected
1. **PostgreSQL/Supabase for saved reports** — Rejected: adds auth requirement, deployment complexity, and GDPR obligations. Unnecessary for a hackathon MVP where the core value is the calculation, not data persistence.
2. **Vercel KV for session caching** — Rejected: adds a dependency and cost for a stateless calculation that completes in <100ms.
3. **SQLite/Turso for lightweight persistence** — Rejected: still requires schema management and adds failure modes. "Your data is never stored" is a privacy feature, not a limitation.

### Consequences
#### Positive
- Zero GDPR/CCPA compliance burden (no PII stored)
- Simpler deployment (single Next.js app on Vercel)
- "Your data is never stored" becomes a trust signal
- No database migrations, no connection pooling, no cold-start penalties

#### Trade-offs
- Users cannot save or retrieve past assessments
- No usage analytics beyond Vercel function logs
- No A/B testing infrastructure (would need external service)

---

## ADR-0002: No User Authentication

**Date**: 2026-02-22
**Status**: Accepted

### Context
Most SaaS products require user accounts. We needed to decide whether CybRisk needs authentication.

### Decision
No authentication. CybRisk is a public calculator. Anyone can use it without creating an account.

### Alternatives Rejected
1. **NextAuth.js with GitHub/Google OAuth** — Rejected: adds sign-up friction that kills hackathon demo flow. A 2-minute demo cannot include "now create an account."
2. **Anonymous sessions with cookies** — Rejected: adds cookie consent requirements and session management complexity for zero benefit in a stateless app.

### Consequences
#### Positive
- Zero friction: land on page, fill wizard, get results
- No cookie consent banner needed
- No password reset flows, no account management UI
- Faster development (skip entire auth stack)

#### Trade-offs
- Cannot gate premium features
- Cannot track individual user engagement
- Rate limiting must be IP-based (less precise)

---

## ADR-0003: Pure TypeScript Monte Carlo Engine

**Date**: 2026-02-22
**Status**: Accepted

### Context
The Monte Carlo simulation engine is the mathematical core of CybRisk. We needed to decide between a Python backend (scipy/numpy) or a pure TypeScript implementation.

### Decision
Pure TypeScript Monte Carlo engine with no external math libraries. Custom PERT distribution sampling using the Joehnk algorithm for Beta distribution generation.

### Alternatives Rejected
1. **Python FastAPI backend with scipy** — Rejected: hackathon rules require Next.js; adding a Python service means two deployments, CORS configuration, and cold-start coordination.
2. **WebAssembly (Rust/C++ compiled)** — Rejected: massive over-engineering for 10K iterations of basic arithmetic. Development time not justified.
3. **jStat library** — Rejected: large bundle (180KB+) for using only Beta distribution sampling. The Joehnk algorithm is ~20 lines of TypeScript.

### Consequences
#### Positive
- Single deployment on Vercel (no Python dependency)
- 10K iterations complete in <100ms on serverless
- Full control over numerical precision and edge cases
- Zero external dependencies for the math core

#### Trade-offs
- Must implement and validate PERT/Beta sampling ourselves
- No access to scipy's validated statistical functions
- Must handle floating-point edge cases manually

---

## ADR-0004: PERT Distribution via Joehnk Algorithm

**Date**: 2026-02-22
**Status**: Accepted

### Context
The FAIR model uses PERT distributions for loss parameters. We needed a method to sample from Beta distributions (which underlie PERT) in pure TypeScript.

### Decision
Use the Joehnk algorithm for Beta distribution sampling, which requires only uniform random numbers (Math.random()) and basic arithmetic.

### Alternatives Rejected
1. **Inverse CDF with numerical approximation** — Rejected: requires regularized incomplete beta function, which is complex to implement correctly.
2. **Box-Muller + normal-to-beta transform** — Rejected: indirect and less numerically stable for the shape parameters typical in FAIR models.
3. **Acceptance-rejection with jStat** — Rejected: adds a large dependency for a single function.

### Consequences
#### Positive
- ~20 lines of TypeScript, zero dependencies
- Well-studied algorithm with known convergence properties
- Works for all valid Beta shape parameters (alpha, beta > 0)

#### Trade-offs
- Joehnk is efficient only for alpha, beta < 1; for larger parameters, need Cheng's algorithm or similar (FAIR parameters typically stay in the efficient range)
- Must handle edge case: lambda=4 PERT with mode near min/max produces extreme shape parameters

---

## ADR-0005: Node.js Serverless Runtime (Not Edge)

**Date**: 2026-02-22
**Status**: Accepted

### Context
Vercel offers two runtimes: Edge (V8 isolates, global, limited APIs) and Node.js Serverless (full Node.js, regional). We needed to choose for the `/api/calculate` endpoint.

### Decision
Node.js Serverless runtime with Fluid Compute (300s timeout).

### Alternatives Rejected
1. **Edge Runtime** — Rejected: Monte Carlo is CPU-intensive (10K iterations with floating-point math). Edge has stricter CPU limits, no full Node.js APIs, and 30-second timeout. The computation needs headroom.
2. **Client-side calculation (no API)** — Rejected: puts computation load on user's device; inconsistent performance across devices; harder to validate inputs server-side.

### Consequences
#### Positive
- Full Node.js API access (Math, crypto, etc.)
- 300-second timeout (more than enough for 10K iterations at <100ms)
- Vercel Fluid Compute enables efficient cold-start management
- Regional deployment sufficient (not latency-sensitive like streaming)

#### Trade-offs
- Single-region by default (can configure multi-region if needed)
- Cold starts of 1-3 seconds on first invocation
- Higher per-invocation cost than Edge (negligible for hackathon)

---

## ADR-0006: sessionStorage for Results Transfer

**Date**: 2026-02-22
**Status**: Accepted

### Context
After the API returns calculation results, we need to pass them from the `/assess` page to the `/results` page. Several options exist for client-side state transfer.

### Decision
Hybrid approach: sessionStorage for persistence across navigation + React Context for fast in-memory access.

### Alternatives Rejected
1. **URL query parameters** — Rejected: results are too large (percentiles, histogram bins, multiple metrics) for URL encoding. Also exposes data in browser history and shared links.
2. **localStorage** — Rejected: persists beyond tab close, creating stale data. sessionStorage auto-clears on tab close, which matches our "data never stored" promise.
3. **Server-side session (Redis/KV)** — Rejected: breaks stateless architecture, adds infrastructure dependency.
4. **React Context only (no storage)** — Rejected: lost on page refresh. Users who refresh /results would see empty page.

### Consequences
#### Positive
- Survives page refresh (sessionStorage)
- Fast rendering (React Context avoids storage reads)
- Auto-clears on tab close (privacy-friendly)
- No server-side state needed

#### Trade-offs
- Cannot share results via URL (acceptable for MVP)
- Direct navigation to /results without calculation shows empty state (redirect to /assess)
- ~5KB storage limit per origin (sufficient for results JSON)

---

## ADR-0007: Zod as Single Validation Source of Truth

**Date**: 2026-02-22
**Status**: Accepted

### Context
Input validation happens at two layers: client-side (wizard form) and server-side (API route). We needed to ensure consistency between them.

### Decision
Single Zod schema shared between client (via React Hook Form resolver) and server (via `.safeParse()`). The schema definition lives in `src/lib/schemas.ts` and is imported by both.

### Alternatives Rejected
1. **Separate client/server validation** — Rejected: inevitably drifts, creating either false rejections (server stricter) or security gaps (server laxer).
2. **JSON Schema** — Rejected: less ergonomic in TypeScript; no direct type inference. Zod generates TypeScript types automatically.
3. **Yup** — Rejected: less type-safe than Zod; Zod has better TypeScript integration and is the standard for Shadcn/ui projects.

### Consequences
#### Positive
- Single source of truth: change once, enforced everywhere
- TypeScript types auto-derived from schema (`z.infer<typeof schema>`)
- Server-side validation is guaranteed to match client-side
- `.strict()` mode provides prototype pollution protection

#### Trade-offs
- Bundle includes Zod in client bundle (~13KB gzipped)
- Schema changes require testing both client and server paths

---

## ADR-0008: Plain useState for Wizard State

**Date**: 2026-02-22
**Status**: Accepted

### Context
The 5-step wizard needs state management to preserve form data across steps. Options range from simple useState to full state management libraries.

### Decision
Plain `useState` in the parent `/assess` page component. Each step component receives current values and an update callback as props.

### Alternatives Rejected
1. **Redux/Zustand** — Rejected: massive over-engineering for 5 form steps with ~15 fields total. Adds boilerplate, devtools dependency, and conceptual overhead for zero benefit.
2. **React Hook Form with single form** — Rejected: multi-step forms with React Hook Form require careful step registration. Simpler to manage state externally and validate per-step.
3. **URL state (nuqs)** — Rejected: exposes user's risk parameters in URL. Security and privacy concern for sensitive business data.

### Consequences
#### Positive
- Simplest possible implementation
- No external dependencies
- Easy to understand and debug
- Props-down pattern is idiomatic React

#### Trade-offs
- State lost on full page refresh (acceptable — user restarts wizard)
- No time-travel debugging (not needed for 5-step form)
- Parent component holds all state (manageable with ~15 fields)

---

## ADR-0009: Pre-Binned Histogram Data for Recharts

**Date**: 2026-02-22
**Status**: Accepted

### Context
The results dashboard shows a Monte Carlo distribution histogram. We needed to decide how to feed 10,000 simulation results to Recharts.

### Decision
Pre-bin the Monte Carlo results into 50 buckets server-side, returning `{binStart, binEnd, count}[]` in the API response. Recharts renders a BarChart from pre-binned data.

### Alternatives Rejected
1. **Pass raw 10K data points to Recharts** — Rejected: Recharts is not designed for 10K data points. Causes severe rendering lag, memory pressure, and DOM thrashing.
2. **Client-side binning** — Rejected: wastes client CPU; server already has the sorted array and can bin in O(n) during response formatting.
3. **@data-ui/histogram** — Rejected: adds a specialized dependency when Recharts BarChart with pre-binned data works perfectly.

### Consequences
#### Positive
- Recharts renders 50 bars instantly (vs. 10K points)
- Server controls bin width (consistent across clients)
- Smaller JSON response (~2KB bins vs. ~80KB raw floats)
- Recharts animations work smoothly with 50 data points

#### Trade-offs
- Bin width is fixed (user cannot zoom into distribution)
- Some precision lost in binning (acceptable for visualization)

---

## ADR-0010: OWASP API Security Top 10 (Not Agentic AI)

**Date**: 2026-02-22
**Status**: Accepted

### Context
The SECURITY_ARCHITECTURE template defaults to the OWASP Agentic AI Top 10. We needed to determine which threat framework applies to CybRisk.

### Decision
Use OWASP API Security Top 10 (2023). The Agentic AI Top 10 is inapplicable — CybRisk is a stateless calculator with no AI agents, no LLM calls, no autonomous behavior.

### Alternatives Rejected
1. **OWASP Agentic AI Top 10** — Rejected: CybRisk has no agents, no prompts, no LLM integration. Every single ASI01-ASI10 risk is N/A.
2. **OWASP Web Application Top 10** — Considered but secondary: API Security Top 10 is more specific to our single-endpoint API architecture.

### Consequences
#### Positive
- Threat model matches actual attack surface
- Security team understands applicable risks (not confused by inapplicable agentic threats)
- Focused security checklist that's actionable

#### Trade-offs
- If CybRisk later adds AI-generated board summaries (stretch goal), will need to revisit with LLM-specific threats

---

## ADR-0011: Fixed 10,000 Monte Carlo Iterations

**Date**: 2026-02-22
**Status**: Accepted

### Context
Monte Carlo simulation quality improves with more iterations, but runtime increases linearly. We needed to choose the iteration count.

### Decision
Fixed 10,000 iterations, hardcoded and not user-configurable.

### Alternatives Rejected
1. **User-configurable iterations** — Rejected: creates DoS vector (user requests 10M iterations), requires UI for a parameter most users don't understand, and complicates caching.
2. **1,000 iterations** — Rejected: percentile estimates (especially P95, P99) are unstable with only 1K samples. 10K provides stable estimates for all reported percentiles.
3. **100,000 iterations** — Rejected: runtime increases to ~500ms+, pushing against cold-start + computation limits. Marginal accuracy improvement doesn't justify 10x cost.

### Consequences
#### Positive
- Stable percentile estimates (P5 through P99)
- Consistent runtime (~50-80ms computation)
- No DoS vector from iteration count manipulation
- Simple implementation (hardcoded constant)

#### Trade-offs
- Cannot demonstrate convergence to users (no "run more simulations" button)
- P99.9 estimates may be less stable (acceptable — we report P5/P25/P50/P75/P95)

---

## ADR-0012: Gordon-Loeb Model for Optimal Spend

**Date**: 2026-02-22
**Status**: Accepted

### Context
CybRisk's differentiator is not just showing risk, but recommending how much to spend on security. We needed a model for optimal security investment.

### Decision
Implement the Gordon-Loeb model: optimal security spend = (1/e) * vulnerability * expected_loss, where vulnerability is derived from the control maturity assessment.

### Alternatives Rejected
1. **No spend recommendation** — Rejected: misses CybRisk's key differentiator. Competitors show risk but don't tell you what to do about it.
2. **Simple percentage of revenue** — Rejected: not risk-based. "Spend 5% of revenue on security" is the kind of generic advice CybRisk exists to replace.
3. **Full ROSI (Return on Security Investment) model** — Rejected: requires counterfactual data (what would have happened without controls) that we don't have. Gordon-Loeb is analytically tractable with our inputs.

### Consequences
#### Positive
- Academically grounded model (Gordon & Loeb, 2002)
- Simple formula with inputs we already collect (vulnerability from control maturity, expected loss from Monte Carlo)
- Unique differentiator — no competitor offers this in a self-service tool
- Board-friendly output: "Your optimal annual security investment is $X"

#### Trade-offs
- Gordon-Loeb assumes diminishing returns on security investment (may not hold for all scenarios)
- Vulnerability mapping from control maturity is an approximation (documented in methodology)
- Model assumes rational actors (boards may not follow optimal spend recommendations)

---

*Document generated by North Star Advisor*
