# CybRisk: North Star Extract

> Your project's design DNA -- the decisions that should NOT be re-litigated.

**Project:** CybRisk -- Cyber Risk Posture Calculator
**Created:** 2026-02-22
**Last Updated:** 2026-02-22

---

## How to Use This Document

**Read this first** when:
- Starting a planning session
- Onboarding new team members
- Proposing new features
- Making architecture decisions
- Responding to incidents
- Planning maintenance work

**This document captures:**
- Decisions that are settled
- Paths we've explicitly rejected
- Patterns that repeat across the system
- Behaviors that must remain consistent

**For the full story** of how these decisions were made, see [ADR.md](ADR.md).

If a proposal conflicts with this document, it needs overwhelming evidence to proceed.

---

## Core Axioms

These constraints govern every major decision. They are non-negotiable.

| Axiom | What It Means |
|-------|---------------|
| **Dollars > Scores** | When choosing between a financial output and a qualitative rating, always choose the dollar figure. If a feature would display "High Risk" without a corresponding ALE in currency, redesign it. The risk rating label on the results dashboard exists only as a visual anchor -- it never appears without the dollar amount beside it. |
| **Distribution > Point Estimate** | Never show just a mean; always show the range. The ALE is not "$1.2M" -- it is "$1.2M (90% of outcomes between $120K and $3.4M)." The histogram and loss exceedance curve are not optional decorations; they are the core product. A results page that displays a single number without its distribution is broken. |
| **Speed > Precision** | A useful estimate in 5 minutes beats a perfect analysis in 5 days. CybRisk uses PERT distributions with 10,000 Monte Carlo iterations and hardcoded actuarial tables. These are acceptable approximations, not shortcuts. If adding precision (e.g., 100K iterations, real-time data feeds) would push time-to-results beyond 5 minutes, reject the precision. |
| **Transparency > Polish** | Show methodology, data sources, and confidence intervals. Never hide uncertainty behind a clean number. Every figure on the results dashboard must be traceable to its actuarial source (IBM, DBIR, NetDiligence) or calculation step (FAIR TEF, Vuln, PL, SL). If a user cannot audit the path from wizard input to final ALE, the feature is incomplete. |
| **Stateless > Persistent** | No accounts, no storage, no tracking. Privacy by design. Assessment inputs travel to the serverless API, get processed in memory, and return as JSON. Nothing is written to disk, database, or log. If a feature requires user identity or persistent state, it must clear a higher bar of justification (Phase 3 accounts are the one planned exception). |

**How these axioms resolve real conflicts:**

- A designer proposes adding a "Risk Grade" (A-F) to the dashboard. **Dollars > Scores** says: only if the dollar ALE is more prominent. The grade is a supplement, never the headline.
- The Monte Carlo engine could run 1M iterations for tighter confidence intervals, but P95 response time would exceed 5 seconds. **Speed > Precision** says: keep 10K iterations.
- A user requests "hide the methodology section by default -- it's intimidating." **Transparency > Polish** says: progressive disclosure is fine (collapse it), but removal is not.
- A stakeholder asks for saved assessment history in MVP. **Stateless > Persistent** says: not until Phase 3, and even then the no-account path must remain the default.

---

## Explicit Non-Goals

These paths are explicitly rejected. This prevents scope creep and stops reopening closed doors.

### Features We Will Never Build

| Feature | Why We Reject It |
|---------|------------------|
| **Compliance tool** | Compliance asks "did you check the box?" CybRisk asks "what does it cost you if you get breached?" Conflating these questions undermines both. CybRisk takes control posture as input and translates it to financial exposure. Auditing against ISO 27001, SOC 2, or NIST CSF is someone else's job. (**Dollars > Scores**) |
| **Audit framework** | We do not assess controls against regulatory frameworks. We take your control posture as input and compute financial impact. The moment we output "compliant / non-compliant" we have become the thing we are not. (**Dollars > Scores**) |
| **Enterprise security software** | No procurement process, no sales team, no annual contract, no demo calls. If CybRisk requires a salesperson to explain, the product has failed. Self-service is not a go-to-market strategy -- it is a core axiom. (**Speed > Precision**, **Stateless > Persistent**) |
| **Real-time threat intelligence platform** | CybRisk uses hardcoded actuarial data from published reports (IBM, DBIR, NetDiligence), not live threat feeds. Real-time data adds infrastructure complexity, runtime dependencies that can fail during a demo, and an ongoing data cost -- all for marginal improvement over annual actuarial figures for the annualized loss estimate CybRisk produces. (**Speed > Precision**, **Transparency > Polish**) |
| **Replacement for professional risk assessment** | CybRisk produces estimates calibrated against published data, not audited findings. It is a 5-minute starting point for conversation, not an endpoint for legally binding decisions. The disclaimer on the results page is not CYA -- it is honest scoping. (**Transparency > Polish**) |

### Technical Approaches We Rejected

| Approach | Why Rejected | What We Do Instead |
|----------|--------------|---------------------|
| **Enterprise sales motion** | Conflicts with self-service axiom. Sales cycles are weeks; CybRisk's value proposition is 5 minutes. Enterprise buyers also expect SLAs, support contracts, and SOC 2 attestation -- none of which a hackathon project can deliver. | Free, no-account, self-service web tool. Zero friction from URL to results. |
| **Real-time data feeds** | Adds external API dependencies that can timeout, rate-limit, or break during live demos. Real-time threat frequency data changes incrementally; annual actuarial reports are sufficient for annualized loss estimates. Complexity is disproportionate to accuracy gain. | Hardcoded lookup tables from IBM/DBIR/NetDiligence, updated manually when new annual reports publish. |
| **Mobile-first design** | CybRisk's results dashboard is data-dense: 4 KPI cards, a histogram, a loss exceedance curve, benchmark comparisons, and a methodology section. Responsive layout for a 375px viewport would require hiding or collapsing the distribution charts -- which are the core product (**Distribution > Point Estimate**). Desktop is the primary use case for vCISOs and board presentations. | Desktop-optimized dark dashboard. Mobile gets a "best viewed on desktop" note. Mobile-responsive is Phase 2. |
| **Freemium pricing model** | Pricing tiers imply feature gates. Feature gates conflict with **Transparency > Polish** (hiding methodology behind a paywall) and **Stateless > Persistent** (accounts to manage tiers). CybRisk is a hackathon project with no revenue model -- and that is a feature, not a gap. | Entirely free, no pricing tiers, no accounts, MIT license. |
| **Client-side Monte Carlo** | Running 10K iterations in the browser eliminates the network round-trip and enables a literal "no data leaves your device" privacy claim. However, client-side execution prevents server-side Zod validation, makes the engine untestable in isolation, and exposes the calculation logic to tampering. | Server-side Node.js serverless function with Zod input validation. Privacy addressed via stateless architecture (nothing stored). |

**Why this matters:** Every "no" in this list is a "yes" to focus. Features on this list do not get discussed again without new evidence.

---

## Structural Patterns

These patterns repeat across the architecture. They are reusable motifs.

### Core Data Flow: Lookup Table to Visualization

```
Lookup Table (IBM/DBIR/NetDiligence)
    |
    v
PERT Distribution Parameters (min, mode, max for TEF, Vuln, PL, SL)
    |
    v
Monte Carlo Engine (10,000 FAIR iterations)
    |
    v
Percentile Extraction (P10, P25, P50, P75, P90, P95)
    |
    v
Pre-binned Histogram Buckets (50-100 bins) + Exceedance Curve Points
    |
    v
Recharts Visualization (BarChart histogram, LineChart LEC)
```

**When to use:** Every path from raw data to user-visible output follows this pipeline. New data sources, new loss components, or new visualizations all slot into this same flow.

**Why it exists:** Separating each transformation stage makes each one independently testable. The Monte Carlo engine does not know about charts. The charts do not know about lookup tables. The API route is the only component that orchestrates the full pipeline.

### Fallback Chain

When things fail, degrade gracefully:

```
Monte Carlo Engine (10K iterations)
    |-- success --> Full results dashboard
    |-- failure --> Simplified deterministic estimate (mean TEF x mean LM)
                       |-- failure --> Cached example result for selected industry
                                          |-- failure --> Error state with explanation
```

- A simplified deterministic estimate (TEF_mode x Vuln_mode x LM_mode) is better than a timeout
- A cached example result with a disclaimer ("this is a sample, not your actual assessment") is better than a blank page
- An error state that explains what went wrong ("Monte Carlo engine did not converge -- try adjusting your inputs") is better than a generic 500 page

**When to use:** Any computation path that might fail or timeout. The API route handler should wrap the Monte Carlo call in a try/catch that walks this chain.

**Why it exists:** CybRisk's north star metric is Assessment Completion Rate (70% target). A user who hits an error page has not completed the assessment. Graceful degradation preserves completions even when the engine encounters edge cases.

### Conflict Resolution Hierarchy

When design decisions conflict:

```
User Safety > Data Accuracy > Visual Polish > Performance
```

- **User safety**: Never display a result that could cause financial harm if acted upon without context. Always show confidence intervals. Always include the disclaimer that CybRisk produces estimates, not audited findings.
- **Data accuracy**: If a lookup table value seems wrong, surface the uncertainty rather than hiding it. Show the data source and let the user evaluate credibility.
- **Visual polish**: A correctly labeled ugly chart beats a beautiful chart with misleading axes.
- **Performance**: A 4-second response with accurate results beats a 1-second response with approximated results. (But see **Speed > Precision** -- 4 seconds is fine; 30 seconds is not.)

---

## What We Always Do

Behaviors that must remain consistent.

| Behavior | Example |
|----------|---------|
| **Show dollar amounts in JetBrains Mono** | ALE displayed as `$1,200,000` in monospaced font, never in the UI font. Dollar figures are data, not prose. |
| **Cite the data source for every actuarial figure** | "Per-record cost: $165 (IBM Cost of a Data Breach 2025, Financial Services)" -- not just "$165 per record." |
| **Display distributions alongside point estimates** | The ALE KPI card shows the median AND the P10-P90 range. The histogram is always visible on the results page, never hidden behind a tab. |
| **Use "estimated" or "simulated," never "predicted" or "guaranteed"** | Results header reads "Your Estimated Annual Exposure" -- never "Your Annual Loss" or "Your Predicted Breach Cost." |
| **Validate inputs server-side with Zod** | Even if client-side validation passes, the API route re-validates with the same Zod schema. Never trust client-only validation. |
| **Cap outputs at plausible ranges** | Monte Carlo outputs are clamped: minimum $0 (no negative losses), maximum capped at 10x annual revenue. Any iteration producing an implausible result is discarded and re-sampled. |
| **Show the Gordon-Loeb recommendation alongside ALE** | The "recommended spend" card always appears on the results dashboard. It answers "what should I spend?" -- the natural follow-up to "what's my exposure?" |
| **Preserve wizard state on back-navigation** | Clicking "Back" on Step 3 returns to Step 2 with all previously entered values intact. State loss on back-navigation is a completion rate killer. |

---

## What We Never Do

Behaviors that are explicitly prohibited.

| Behavior | Why |
|----------|-----|
| **Display a risk score without a dollar figure** | Risk scores (7.3/10, "High Risk") are the problem CybRisk exists to solve. Shipping one without a corresponding dollar amount recreates the exact failure mode of existing tools. The risk rating on the dashboard exists only as a color-coded anchor that supplements the ALE. (**Dollars > Scores**) |
| **Present a point estimate without its distribution** | "$1.2M annual exposure" without context is a lie by omission. Breach costs are heavy-tailed -- the mean and P95 can differ by 10x. Always show the range. (**Distribution > Point Estimate**) |
| **Use fear, uncertainty, or doubt (FUD)** | "You WILL be breached" is not our voice. Our users are professionals who already understand the threat landscape. FUD insults their intelligence and erodes the analytical credibility that is our actual brand asset. (**Transparency > Polish**) |
| **Store user input data beyond the request lifecycle** | No database writes, no log entries containing assessment inputs, no analytics events that capture revenue or record counts. The serverless function processes and forgets. (**Stateless > Persistent**) |
| **Claim precision we do not have** | Never display more than 2 significant digits in dollar estimates in the UI. "$1,247,832.17" implies false precision from a 10K-iteration simulation using hardcoded lookup tables. "$1.2M" is honest. (**Transparency > Polish**) |
| **Gate content behind signup or email capture** | No modals asking for email. No "create account to see full results." No newsletter popups. The product is the growth engine. If it delivers value, users return and share the URL. (**Speed > Precision**, **Stateless > Persistent**) |
| **Use "AI-powered" in any marketing or UI copy** | CybRisk uses Monte Carlo simulation and actuarial models, not machine learning. Calling it "AI" would be dishonest and would associate us with the hype cycle that is generating skepticism in the security industry. (**Transparency > Polish**) |

---

## When to Re-evaluate

These signals justify revisiting core assumptions.

### Metric Triggers

| Signal | Threshold | What to Do |
|--------|-----------|------------|
| Assessment Completion Rate drops | Below 50% for 3 consecutive cohorts (weekly) | Instrument each wizard step to find the drop-off point. If Step 3 (controls) is the bottleneck, simplify to fewer toggles. If Step 4 (threats) overwhelms, add smarter defaults. Do not add steps -- remove questions. |
| Calculation Success Rate drops | Below 95% for any rolling 24-hour period | Review API error logs for edge-case input combinations. Likely cause: degenerate PERT parameters (mode at boundary) or unexpected industry/size combination not in lookup tables. Fix the engine, not the UI. |
| Time to Results exceeds threshold | P95 above 5 seconds for 1 week | Profile the Monte Carlo engine. If the bottleneck is iteration count, 10K is non-negotiable -- optimize the per-iteration math instead. If the bottleneck is cold start, explore Vercel Fluid Compute warm-up strategies. |
| Users consistently misinterpret results | 3+ independent reports of users citing CybRisk as "guaranteed" loss figure | Strengthen disclaimer language on results page. Add explicit confidence interval callouts. Consider a mandatory "this is an estimate" acknowledgment before displaying results. |

### External Triggers

| Event | What to Reconsider |
|-------|-------------------|
| IBM publishes Cost of a Data Breach 2026 | Update all per-record cost lookup tables, industry averages, and cost factor multipliers. This is the highest-priority data refresh -- it affects every assessment. |
| Verizon publishes DBIR 2026 | Update threat event frequency base rates and industry-specific attack patterns. Second-highest priority data refresh. |
| RiskLens or FAIR Institute launches a free self-service tool | Re-evaluate positioning. If a competitor matches speed + rigor + free, CybRisk's differentiator shifts to Gordon-Loeb, privacy-by-design, and practitioner trust (Albert Hui's credentials). |
| New cyber insurance regulations mandate specific quantification methodology | Evaluate whether CybRisk's FAIR implementation satisfies the requirements. If regulators require features CybRisk explicitly rejects (audit trail, continuous monitoring), acknowledge the limitation clearly rather than scope-creeping. |
| Regulatory changes to SEC cyber disclosure rules | Assess whether CybRisk outputs need additional formatting or caveats for companies using them in 10-K filings. Do not build compliance features -- but do ensure CybRisk does not inadvertently mislead users about regulatory sufficiency. |

### Strategic Triggers

| Trigger | Questions to Ask |
|---------|------------------|
| User base exceeds 10,000 monthly assessments | Does the serverless architecture handle the load? Do we need edge caching for lookup tables? Should we add basic anonymous analytics to understand usage patterns without compromising privacy? |
| Multiple users request the same deferred feature (e.g., scenario comparison) | Re-examine with evidence. If 20+ independent requests reference the same feature, promote it from "Phase 2" to "next sprint." But default to "no" -- vocal users are not representative users. |
| A competing tool undercuts CybRisk's speed (sub-2-minute assessment) | Evaluate whether their speed comes at the cost of rigor. If they maintain FAIR + Monte Carlo + actuarial data at faster speed, study their approach. If they sacrifice methodology, do nothing -- speed without rigor is not our competition. |
| Albert Hui's advisory practice generates demand for custom CybRisk deployments | Consider a "CybRisk for Advisors" tier with white-labeling and saved client histories. This would violate **Stateless > Persistent** for the advisor tier only -- evaluate whether the use case justifies a parallel architecture. |

---

## Document Governance

| Aspect | Policy |
|--------|--------|
| **Who can modify** | Core Axioms require explicit justification with evidence against the original rationale. Non-goal additions require review against the axiom table. Other sections can be updated by the maintainer (Albert Hui). |
| **Review cadence** | After each major phase completion (Phase 1 MVP, Phase 2 Polish, Phase 3 Growth), or when an external trigger fires. |
| **Conflict resolution** | This document wins over implementation docs, feature requests, and user feedback. A change to this document requires stronger evidence than a change to any other document. |
| **Version history** | Changes to Core Axioms or Explicit Non-Goals must be documented in [ADR.md](ADR.md) with the rationale for the change, the evidence that justified it, and the date. |

---

*Document generated by North Star Advisor*
