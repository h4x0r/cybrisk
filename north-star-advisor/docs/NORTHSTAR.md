# CybRisk: North Star Specification

> **Created**: 2026-02-22
> **Status**: Active
> **Builder**: Albert Hui -- Chief Forensicator, Security Ronin

The strategic north star for CybRisk -- defining who we serve, what success looks like, and where the boundaries are drawn.

---

## North Star Metric

### Assessment Completion Rate

**Definition**: The percentage of users who land on the `/assess` wizard and receive a fully rendered results dashboard on `/results`.

**Formula**:

```
Assessment Completion Rate = (Users who reach /results with rendered dashboard) / (Users who load /assess Step 1) * 100
```

**Target**: 70% completion rate for the hackathon demo. For reference, typical multi-step form completion rates in SaaS range from 40-60%. CybRisk targets the upper end because the wizard is only 5 steps, requires no account creation, and delivers an immediate, tangible reward (your financial exposure in dollars).

### Why This Metric

| Criterion | How It Passes |
|-----------|---------------|
| **Leading** | Completions happen before any downstream value (sharing results, acting on recommendations, returning for scenario comparison). If completions are low, nothing else matters. |
| **Actionable** | Every wizard step is a conversion funnel stage. Step 2 drop-off means the data profile questions are confusing. Step 4 drop-off means the threat landscape section overwhelms non-technical users. Each step can be diagnosed and optimized independently. |
| **Customer-centric** | A completed assessment means the user received a dollar-denominated exposure estimate -- the core value promise. This is not a vanity metric like page views or time-on-site. It measures value delivered. |
| **Understandable** | "What percentage of people who start the wizard finish it?" -- anyone on the team (or any hackathon judge) can understand and evaluate this instantly. |
| **Resistant to gaming** | You cannot inflate this metric without actually building a wizard that works end-to-end. There is no shortcut -- the calculation API must return valid results and the dashboard must render them. |

### What This Metric Does NOT Measure

- Quality of the results (are the Monte Carlo outputs calibrated against real actuarial data?)
- User trust (does the user believe the $1.2M estimate?)
- Downstream action (does the user share results with their board?)

These matter, but they are Phase 2 concerns. For a 3-day hackathon, completion rate is the tightest proxy for "does this product work?"

---

## Metrics Hierarchy

The north star metric sits at the top of a hierarchy. Each level decomposes into actionable sub-metrics.

### Level 0: North Star

| Metric | Definition | Target |
|--------|-----------|--------|
| **Assessment Completion Rate** | % of wizard starts that reach results dashboard | 70% |

### Level 1: Funnel Metrics

| Metric | Definition | Target | Diagnostic Signal |
|--------|-----------|--------|-------------------|
| **Landing-to-Wizard Rate** | % of landing page visitors who click "Assess Your Risk" | 30% | Is the value proposition compelling? |
| **Step Completion Rate** | % completion for each wizard step (1-5) | 90%+ per step | Which step is the conversion bottleneck? |
| **Calculation Success Rate** | % of POST /api/calculate that return 200 | 99.5% | Are there edge-case input combos that crash the engine? |
| **Results Render Rate** | % of successful API responses that render a complete dashboard | 99% | Is the client-side rendering robust? |

### Level 2: Quality Metrics

| Metric | Definition | Target | Phase |
|--------|-----------|--------|-------|
| **Time to Results** | Seconds from "Calculate" click to rendered dashboard | < 3s | MVP |
| **Wizard Completion Time** | Minutes from Step 1 load to Step 5 submit | < 5 min | MVP |
| **API Response Time** | P95 response time for /api/calculate | < 2s | MVP |
| **Monte Carlo Stability** | Coefficient of variation across repeat runs with same inputs | < 5% | MVP |

### Level 3: Engagement Metrics (Post-Hackathon)

| Metric | Definition | Target | Phase |
|--------|-----------|--------|-------|
| **Return Rate** | % of users who run a second assessment within 30 days | 15% | Phase 2 |
| **Scenario Comparison Usage** | % of completed assessments that trigger a "what if" comparison | 20% | Phase 2 |
| **Share Rate** | % of results pages where user copies URL or exports PDF | 10% | Phase 2 |

### Metric Anti-Patterns

These are metrics we explicitly do not optimize for:

| Anti-Metric | Why We Reject It |
|-------------|------------------|
| **Time on site** | We want users to finish fast. Longer time means the wizard is confusing, not that users are "engaged." |
| **Page views** | More page views means a broken wizard with unnecessary steps. We want fewer pages, not more. |
| **Number of assessments run** | A user running 10 assessments might mean the tool is unreliable and they are re-running to check. Quality over quantity. |
| **Risk score** | CybRisk does not output risk scores. We output dollars. Any metric that reduces financial exposure to a scalar score contradicts our core belief. |

---

## Personas

### Primary: Sarah Chen -- Fractional vCISO

**Role**: Independent vCISO managing 8 SMB clients across Hong Kong and Southeast Asia

**Demographics**: 38, based in Hong Kong, 12 years in information security, CISSP + CISM, former Big 4 cyber consulting

**Day in the Life**: Sarah spends Monday mornings preparing for client board meetings. Each client expects a risk summary in financial terms, but she has no tool that generates these quickly. She currently builds Excel models manually for each client -- 2-3 hours per model, using industry averages she pulls from IBM and DBIR reports herself. She reuses models across clients but still tweaks parameters manually.

**Goals**:
- Generate a credible dollar-denominated risk estimate for a new client in under 10 minutes
- Produce a visual artifact (chart, dashboard) she can screenshot for board presentations
- Validate her manual models against a Monte Carlo simulation to increase her confidence in recommendations

**Pains**:
- Manual Excel modeling is time-consuming and error-prone
- Clients question her estimates because they see a single number, not a probability distribution
- RiskLens is too expensive ($100K+/year) for a solo practice; FAIR-U is too manual and slow
- She needs something between "back of napkin" and "6-week engagement" for initial client scoping

**CybRisk Moment**: Sarah takes on a new logistics client. Before the scoping call, she runs CybRisk with the client's profile: 500 employees, transportation industry, basic controls. In 4 minutes she has a loss distribution showing $800K-$4.2M annual exposure range, plus a Gordon-Loeb recommended spend of $310K. She screenshots the results dashboard for tomorrow's presentation. The client sees a probability curve instead of a single number and immediately trusts the methodology.

**Forces of Progress (Sarah)**:

| Force | Description |
|-------|-------------|
| **Push (away from current solution)** | Excel models take 2-3 hours per client. Clients challenge her single-number estimates. She cannot show distributions in Excel without significant VBA work. Her models are not reproducible or auditable. |
| **Pull (toward CybRisk)** | 5-minute assessment with Monte Carlo simulation. Visual loss distribution she can screenshot. FAIR methodology adds credibility. Gordon-Loeb spend recommendation gives her a talking point for the investment discussion. |
| **Anxiety (about switching)** | "Is a free hackathon tool credible enough to present to a board?" "Are the hardcoded lookup tables accurate enough?" "Will my clients trust a tool that has no enterprise brand behind it?" |
| **Inertia (habit of current solution)** | She already has Excel templates that "sort of work." She knows the IBM numbers by heart. Her current process is good enough for most conversations. The 2-3 hour cost is amortized across the engagement. |

**How CybRisk Overcomes Anxiety**: Methodology transparency. Every number in CybRisk traces to a published source (IBM, DBIR, NetDiligence). The FAIR model is an industry standard she already knows. Sarah does not need to trust CybRisk's brand -- she can verify the math.

**How CybRisk Overcomes Inertia**: The 4-minute vs 3-hour comparison is not just faster -- it is qualitatively different. CybRisk produces a 10,000-iteration Monte Carlo distribution. Sarah's Excel model produces a deterministic estimate. The distribution IS the upgrade.

### Secondary: James Okonkwo -- SMB CFO/Founder

**Role**: CFO and co-founder of a 120-person fintech startup, Series B, processing payment card data

**Demographics**: 44, based in Singapore, MBA (finance background), no formal security training, reports to a board that includes institutional investors

**Day in the Life**: James has a board meeting next Thursday. The agenda includes a new item: "Cybersecurity Risk Assessment" -- added after a competitor disclosed a breach last month. The board wants to know: what is our exposure? How much should we spend on security? James has no CISO (the team shares a fractional advisor) and no idea how to quantify cyber risk in financial terms. He has been Googling "cyber risk calculator" for 30 minutes.

**Goals**:
- Get a defensible dollar figure for cyber exposure before next Thursday's board meeting
- Understand whether the company's current security spend ($180K/year) is adequate
- Present something credible without pretending to be a security expert

**Pains**:
- Has no security background -- compliance frameworks (ISO 27001, SOC 2) are meaningless to him
- Security vendors pitch $500K enterprise solutions he cannot justify or evaluate
- The board expects financial language, not technical jargon
- He needs an answer this week, not after a 6-week engagement

**CybRisk Moment**: James finds CybRisk through a Google search. No signup required -- he starts the wizard immediately. Step 1 asks about his industry (financial services) and revenue ($35M). Step 2 asks about data types (payment card, customer PII). He has answers for all of these. Step 3 asks about security controls in yes/no format -- he checks with his fractional advisor on Slack and fills it out in 2 minutes. He clicks "Calculate" and 3 seconds later sees: ALE of $2.1M, recommended spend of $780K, and a note that his current $180K/year spend is significantly below the Gordon-Loeb optimal. He screenshots the dashboard for Thursday's board deck.

**Forces of Progress (James)**:

| Force | Description |
|-------|-------------|
| **Push (away from current solution)** | Board is asking a question he cannot answer. Googling produces enterprise sales pitches or generic articles. His fractional security advisor can give a qualitative opinion but not a financial estimate. The board meeting is in 5 days. |
| **Pull (toward CybRisk)** | No account required -- he can try it immediately. Questions are in plain English, not security jargon. Output is in dollars, which is his native language as CFO. 5-minute process fits a busy executive's schedule. |
| **Anxiety (about switching)** | "Am I qualified to fill out a security questionnaire?" "Will the board question a free tool's credibility?" "What if I answer the controls questions wrong?" |
| **Inertia (habit of current solution)** | He could ask the fractional advisor for a manual estimate, but that will take days. He could hire a consulting firm, but that will take weeks and cost $50-100K. He could present qualitative risk language without numbers, but the board explicitly asked for dollar figures. |

**How CybRisk Overcomes Anxiety**: Smart defaults and plain-language questions. Step 3 (security controls) uses yes/no toggles, not technical configuration. The results page cites its sources explicitly ("Based on IBM Cost of a Data Breach 2025 data"). James does not need to be a security expert -- he just needs to know whether his company has MFA and an incident response plan.

**How CybRisk Overcomes Inertia**: The board meeting is in 5 days. There is no inertia because there is no existing solution -- James has never quantified cyber risk before. CybRisk is competing against "nothing" and "panic."

### Tertiary: Rachel Torres -- Cyber Insurance Broker

**Role**: Commercial insurance broker specializing in cyber liability, 45-client book of business

**Demographics**: 35, based in California, 8 years in commercial insurance, transitioning from general P&C to cyber specialty

**Day in the Life**: Rachel is preparing renewal applications for three clients. The underwriters want loss estimates to price the policies. Rachel currently uses carrier-provided questionnaires (40-60 questions each) and her own judgment to estimate exposure. She wishes she had a quick pre-qualification tool to triage clients before the full underwriting process.

**Goals**:
- Pre-qualify clients for cyber insurance with a quick exposure estimate
- Compare CybRisk estimates against carrier models as a sanity check
- Give clients a tangible sense of their exposure before discussing coverage limits

**CybRisk Moment**: Rachel sends the CybRisk link to a client before their renewal meeting. "Run this 5-minute assessment and send me the results dashboard." The client does it in their own time. Rachel reviews the output, compares the ALE against the client's current $2M policy limit, and identifies that the 90th percentile loss ($5.1M) exceeds coverage. She recommends increasing the limit -- with data to back it up.

**Note**: Rachel is a tertiary persona. CybRisk does not optimize for her workflow in Phase 1. However, her use case validates the "self-service, no-account" model -- she distributes the tool to others without any onboarding friction.

---

## Scope

### In Scope (Phase 1 -- Hackathon MVP)

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| **Landing page** | Dark-themed marketing page with value proposition, feature cards, trust signals, and CTA | Hero with tagline, 3 feature cards, "How It Works" section, builder credentials, single CTA to `/assess` |
| **5-step wizard** | Multi-step form collecting company profile, data profile, security controls, threat landscape, and review/submit | All 5 steps navigable with back/forward, inline validation per step, state preserved in `useState`, summary on Step 5 |
| **Monte Carlo API** | POST /api/calculate endpoint running 10,000 FAIR model iterations | Returns ALE (mean, median, P10, P90, P95), PML, Gordon-Loeb spend, histogram buckets, exceedance curve data, key drivers, recommendations. Zod input validation. <2s P95 response time. |
| **Results dashboard** | Visual presentation of Monte Carlo output with 4 KPI cards and charts | ALE headline, KPI cards (ALE median, PML 95th, recommended spend, risk rating), loss distribution histogram, loss exceedance curve, industry benchmark comparison, key drivers list |
| **Lookup tables** | Hardcoded actuarial data from IBM, DBIR, and NetDiligence | Industry costs, per-record costs, control modifiers, regulatory exposure, claim severity distribution -- all sourced and cited |
| **Gordon-Loeb calculation** | Optimal security spend recommendation | Formula: min(ALE x 0.37, revenue x 0.05), displayed as KPI card with explanation |

### Out of Scope (Explicitly Not in Phase 1)

| Feature | Why Out | Phase |
|---------|---------|-------|
| **User accounts / auth** | Adds complexity without value for a hackathon demo. CybRisk is stateless by design -- no data to persist means no accounts to manage. | Phase 3 |
| **Database / persistent storage** | All calculation is stateless. Results live in sessionStorage for the browser session. This is a feature, not a limitation -- "we never store your data" is a trust signal. | Phase 3 |
| **PDF export** | Nice-to-have but not core value. Screenshots serve the demo. PDF generation adds a dependency and complexity. | Phase 2 |
| **Scenario comparison ("what if")** | Requires running the Monte Carlo engine twice and displaying a diff. Valuable but scope-creep for a 3-day build. | Phase 2 |
| **Shareable URLs** | Encoding results in URL params (via nuqs) is a stretch goal. Not blocking for the demo. | Phase 2 |
| **Mobile-responsive layout** | Dark dashboard with data-dense charts is a desktop experience. Mobile optimization is not trivial and would consume 4+ hours. | Phase 2 |
| **Real-time threat intel** | CybRisk uses hardcoded actuarial data, not live feeds. This is honest about its limitations and avoids a dependency on external APIs that could fail during the demo. | Phase 3 |
| **AI-generated board summary** | Requires LLM API integration. Interesting but not the core value prop -- the charts and numbers are the product. | Phase 2 |
| **Enterprise pricing / billing** | CybRisk is free. Period. This is a hackathon project, not a business. | Never (for this version) |
| **Internationalization / multi-currency** | USD only for MVP. Dollar-denominated is the brand promise. | Phase 3 |

### Scope Decision Framework

When a new feature idea emerges during the 3-day build, apply this test:

1. **Does it increase Assessment Completion Rate?** If no, defer it.
2. **Can the demo work without it?** If yes, defer it.
3. **Does it take less than 30 minutes to implement?** If no, defer it.
4. **Does it affect the critical path (wizard -> API -> results)?** If no, defer it.

If all four answers point to "defer," the feature goes on the Phase 2 list. No exceptions.

---

## Success Phases

### Phase 1: Hackathon MVP (Feb 21-25, 2026)

**Theme**: "End-to-end flow works, looks impressive, survives a 2-minute demo."

**Success Criteria**:

| Criterion | Measurement | Kill Threshold |
|-----------|-------------|----------------|
| Working wizard (5 steps) | All 5 steps render, accept input, and navigate correctly | If any step crashes or loses state, this is a blocker |
| Monte Carlo API returns valid results | 10,000 iterations complete for all valid input combinations | If calculation fails for any industry/revenue/control combo, this is a blocker |
| Results dashboard renders 4 KPI cards + 2 charts | ALE, PML, recommended spend, risk rating visible; histogram and LEC render | If charts do not render or show garbage data, this is a blocker |
| Deployed on Vercel | Production URL is publicly accessible and loads in < 5s | If deployment fails or URL is broken, the submission is invalid |
| Visual quality | Dark theme, consistent typography, no broken layouts | If it looks like a dev prototype (unstyled HTML, missing colors), judges will not engage |
| Demo path works | Landing -> Wizard -> Results produces a plausible financial exposure estimate | If the happy path takes > 3 minutes or produces obviously wrong numbers ($0 or $999B), the demo fails |

**Kill Threshold**: If by end of Day 2 (Feb 23) the Monte Carlo API does not return valid results for at least 3 industry/revenue combinations, stop building features and focus exclusively on making the calculation engine work. The engine IS the product -- no amount of UI polish saves a broken calculator.

**Deliverables**:
1. Production URL on Vercel
2. Landing page screenshot (1280px+ wide)
3. Explainer document with product name, description, team, live URL, GitHub URL, problem statement
4. Working end-to-end assessment flow

### Phase 2: Post-Hackathon Polish (Feb 26 - Mar 31, 2026)

**Theme**: "Make it useful beyond the demo."

**Success Criteria**:

| Criterion | Measurement | Kill Threshold |
|-----------|-------------|----------------|
| Scenario comparison | User can run "what if I add MFA?" and see before/after ALE delta | If the engine cannot diff two parameter sets, the comparison is meaningless |
| PDF export | Downloadable PDF with KPI summary, charts, and methodology notes | If PDF is ugly or missing charts, users will not share it |
| Shareable URLs | URL-encoded params via nuqs that reproduce a results dashboard | If URL params exceed browser limits or produce different results, sharing is broken |
| Mobile-responsive results | Results dashboard readable on 375px viewport | If charts are unreadable or KPI cards overflow, mobile is not done |
| Error handling | Graceful degradation for edge-case inputs (0 records, max revenue, all controls off) | If any valid input combination produces an error page instead of results, the product is unreliable |

**Kill Threshold**: If PDF export takes more than 2 weeks to implement with acceptable quality (charts render in PDF, formatting is clean), drop it and focus on shareable URLs instead. Users can screenshot a URL-shareable dashboard -- they do not need a PDF if the URL works.

**Deliverables**:
1. Scenario comparison mode
2. PDF or shareable URL (at least one)
3. Mobile-responsive results page
4. Comprehensive input validation with helpful error messages

### Phase 3: Growth (Apr - Jun 2026)

**Theme**: "Make it sticky."

**Success Criteria**:

| Criterion | Measurement | Kill Threshold |
|-----------|-------------|----------------|
| User accounts | Supabase auth with email/password or OAuth | If auth adds > 10s to time-to-results for returning users, it is too friction-heavy |
| Saved assessments | User can save, name, and retrieve past assessments | If save/load is unreliable or loses data, it erodes trust faster than it builds convenience |
| Trend tracking | Dashboard showing ALE over time as controls change | If the trend chart requires 3+ data points to be useful and users only run 1-2 assessments, the feature is premature |
| API access | Public REST API for programmatic risk calculation | If API documentation takes more than 1 week to write and maintain, it is not worth the support burden |

**Kill Threshold**: If user account registration-to-first-assessment flow exceeds 2 minutes (including email verification), simplify auth. Magic links or OAuth only -- no email/password with verification. The "no account required" principle from Phase 1 should remain the default path; accounts are for returning users who want to save history, not a gate on first use.

**Deliverables**:
1. User accounts with saved assessment history
2. Trend dashboard showing risk posture changes over time
3. Public API with documentation
4. Multi-currency support (GBP, EUR, HKD, SGD)

---

## Architecture Summary

### System Topology

```
[Browser]
    |
    |-- GET / ----------------> [Landing Page - Server Component]
    |
    |-- GET /assess ----------> [Wizard - Client Component]
    |      |                        |
    |      |-- useState ----------> [Form State: 5 steps]
    |      |
    |      |-- POST /api/calculate --> [API Route - Node.js Serverless]
    |             |                         |
    |             |                         |-- Zod validation
    |             |                         |-- Lookup tables (hardcoded)
    |             |                         |-- Monte Carlo engine (10K iterations)
    |             |                         |-- Gordon-Loeb calculation
    |             |                         |-- JSON response
    |             |
    |-- sessionStorage -------> [Results Context]
    |
    |-- GET /results ---------> [Dashboard - Client Component]
           |
           |-- Recharts (histogram, LEC, benchmark)
           |-- KPI cards (ALE, PML, spend, rating)
```

### Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Framework** | Next.js 14+ App Router | Hackathon requirement. App Router enables Server Components for landing page (fast initial load) and Client Components for wizard/results (interactive). |
| **Wizard state** | Plain `useState` in parent component | 5-step wizard does not need Redux, Zustand, or any state library. useState is the simplest correct solution. Adding a library would be resume-driven development. |
| **Form validation** | React Hook Form + Zod | Per-step validation, TypeScript inference from Zod schemas, and native Shadcn/ui integration. This is the standard pattern for Next.js forms. |
| **Results transfer** | sessionStorage + React Context | Results survive page refresh (sessionStorage) and are instantly available in the component tree (Context). No URL exposure of sensitive data. No database required. |
| **Monte Carlo runtime** | Node.js serverless (NOT Edge) | 10,000 iterations with PERT distribution sampling is CPU-intensive. Edge runtime has execution time limits and no access to full Node.js APIs. Serverless with Fluid Compute (300s timeout) is safe. |
| **Charts** | Recharts | Already installed. BarChart for histogram (pre-bin 10K results into 50-100 buckets), LineChart for loss exceedance curve. Performance: `dot={false}`, `isAnimationActive={false}`. |
| **Styling** | Tailwind CSS + Shadcn/ui | Consistent dark theme, accessible components, rapid development. No custom CSS required for the MVP. |
| **Deployment** | Vercel Hobby | Hackathon requirement. Single push deploys. Fluid Compute handles the Monte Carlo API without timeout issues. |

### Data Flow

1. **User fills wizard** (client-side): Form state managed in `useState`. Each step validates via Zod schema before advancing. Back navigation preserves all state.

2. **Submit** (client -> server): POST `/api/calculate` with JSON body. Zod validates all inputs server-side (never trust client validation alone). Invalid inputs return 400 with specific error messages.

3. **Calculate** (server-side): Monte Carlo engine runs 10,000 iterations of the FAIR model:
   - Sample TEF from PERT distribution (calibrated by industry + company size from DBIR data)
   - Sample Vulnerability from PERT distribution (base rate from DBIR, modified by security controls)
   - Compute LEF = TEF x Vulnerability
   - Sample Primary Loss from log-normal distribution (per-record cost x records, from IBM data)
   - Sample Secondary Loss (regulatory + litigation + reputation, from NetDiligence data)
   - Compute Loss Magnitude = PL + SL
   - Compute Annual Loss = LEF x LM
   - Sort 10,000 results, compute percentiles, bin for histogram

4. **Return results** (server -> client): JSON response with ALE statistics, distribution buckets, exceedance curve points, Gordon-Loeb spend, risk rating, key drivers, and recommendations.

5. **Display** (client-side): Store results in sessionStorage and React Context. Navigate to `/results`. Dashboard reads from Context (instant) or falls back to sessionStorage (page refresh). Recharts renders histogram and LEC from pre-binned data.

### FAIR Model Implementation

```
                     Risk
                   /      \
                LEF        LM
               /   \      /   \
            TEF   Vuln  PL    SL
```

| Component | Source | Distribution |
|-----------|--------|-------------|
| **TEF** (Threat Event Frequency) | Verizon DBIR industry incident rates, adjusted by company size | PERT |
| **Vuln** (Vulnerability) | DBIR incident-to-breach ratio, modified by control questionnaire | PERT |
| **PL** (Primary Loss) | IBM per-record cost x sampled record count | Log-normal |
| **SL** (Secondary Loss) | NetDiligence claims data (regulatory + litigation + reputation) | PERT |

### Gordon-Loeb Optimal Spend

```
Optimal Investment <= (1/e) x v x L = 0.37 x v x L

Where:
  v = vulnerability probability (from controls assessment)
  L = Annual Loss Expectancy (from Monte Carlo mean)

Capped at: min(Gordon-Loeb result, 5% of annual revenue)
```

This provides a concrete, defensible answer to "how much should we spend on security?" -- the question every board asks and no compliance tool answers.

---

## Competitive Landscape

### Direct Competitors

| | FAIR-U | RiskLens | Safe Security | **CybRisk** |
|---|--------|----------|---------------|-------------|
| **Model** | Open FAIR | FAIR + proprietary | Proprietary CRQ | Open FAIR + Gordon-Loeb |
| **Self-service** | Yes | Limited (enterprise sales) | No (enterprise only) | **Yes -- no account required** |
| **Speed** | 30-60 min (manual) | Days (consultant-assisted) | Real-time (after onboarding) | **5 minutes** |
| **Cost** | Free | $100K+/year | $100K+/year | **Free** |
| **Gordon-Loeb** | No | No | No | **Yes** |
| **Monte Carlo** | No (deterministic) | Yes | Yes | **Yes (10K iterations)** |
| **Output** | Single estimate | Distribution + report | Continuous score | **Distribution + dashboard** |
| **Data sources** | User-provided | Proprietary + user | Telemetry | **IBM/DBIR/NetDiligence (cited)** |

### Differentiation

CybRisk occupies a unique position: **free, self-service, instant, and distribution-based**. No existing tool offers all four. FAIR-U is free but manual and deterministic. RiskLens has distributions but costs $100K+ and requires weeks. Safe Security is real-time but enterprise-only.

CybRisk is not competing with RiskLens for Fortune 500 engagements. CybRisk is competing with "nothing" -- the SMB CFO who has never quantified cyber risk, the vCISO who builds Excel models manually, the insurance broker who estimates exposure by gut feel.

### Unique Value: Gordon-Loeb

No competitor includes Gordon-Loeb optimal spend calculation. This is CybRisk's sharpest differentiator because it answers the most actionable question: not just "what is my exposure?" but "what should I spend to reduce it?" The Gordon-Loeb model proves mathematically that optimal security investment never exceeds 37% of expected loss -- a counterintuitive result that gives boards a concrete spending ceiling.

---

## Risks and Mitigations

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Monte Carlo engine produces implausible results (negative losses, $0, or >$10B) | Medium | Critical | Clamp outputs to plausible ranges. Unit test with known industry profiles. Validate against IBM average total cost by industry. |
| Vercel cold start causes timeout on first /api/calculate call | Medium | High | Keep the serverless function bundle small (<1MB). Pre-warm with a health check. Show loading animation that sets user expectation for 3-5s wait. |
| Recharts chokes on 10K data points | High | Medium | Pre-bin Monte Carlo results into 50-100 histogram buckets before passing to Recharts. Never send raw simulation array to the chart component. |
| PERT distribution edge case (mode equals min or max) | Low | Medium | Handle degenerate cases explicitly: if mode == min, use triangular distribution skewed right. If mode == max, skew left. |
| Browser sessionStorage full or disabled | Low | Low | Fallback to React Context only (results survive within session but not refresh). Warn user if sessionStorage is unavailable. |

### Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users do not trust results from a free hackathon tool | High | High | Methodology transparency: cite every data source, explain the FAIR model, show the distribution (not just a number). Link to IBM/DBIR/NetDiligence reports. Display builder credentials (20+ years DFIR). |
| Wizard is too long / users drop off before completing | Medium | Critical | 5 steps is the minimum viable information set. Each step should take < 60 seconds. Progress indicator shows completion. Smart defaults for advanced fields (Step 4 threat landscape). |
| Results are overwhelmed with charts and numbers | Medium | Medium | Progressive disclosure: headline ALE first, then KPI cards, then charts, then methodology. Users control depth. |
| Scope creep kills the 3-day timeline | High | Critical | Scope decision framework (above). If it does not increase Assessment Completion Rate, defer it. No exceptions. |

### External Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Vercel goes down during demo | Low | Critical | Have screenshots and a screen recording as backup. Deploy to a second Vercel project as redundancy. |
| Judges evaluate on mobile | Medium | Medium | Accept the tradeoff: desktop-optimized dashboard. Include a "Best viewed on desktop" note. Ensure landing page is at minimum readable on mobile. |
| Another hackathon team builds something similar | Low | Low | CybRisk's differentiator is depth (FAIR + Monte Carlo + Gordon-Loeb + real actuarial data), not breadth. A competitor would need the same domain expertise to match the methodology. |

---

## Guiding Principles

These principles are derived from the brand beliefs and constrain all product decisions.

### 1. Dollars, Not Scores

Every output must be denominated in currency. If a feature produces a qualitative label (High/Medium/Low) without a corresponding dollar figure, it violates this principle and should be redesigned. The risk rating on the results dashboard exists only as a quick visual anchor -- it always appears alongside the dollar-denominated ALE.

**Test**: Can you remove the risk rating label and still understand the results? If yes, the dollars are doing the work. If no, the dollars are insufficient.

### 2. Distribution, Not Point Estimate

Every financial metric must show a range. The ALE is not "$1.2M" -- it is "$1.2M (90% of outcomes between $120K and $3.4M)." The histogram and loss exceedance curve are not optional visualizations -- they are the core product. A results page without distribution information is broken.

**Test**: If a user screenshots only one element from the results page, would they capture a distribution? If the most prominent element is a single number, redesign the layout.

### 3. Transparent Methodology

Every number must be traceable. The results page should link to or cite: the FAIR model, IBM Cost of a Data Breach 2025, Verizon DBIR 2025, NetDiligence Cyber Claims Study 2025, and the Gordon-Loeb formula. "Trust us" is not a citation.

**Test**: Can a skeptical security professional audit the calculation path from wizard input to final ALE output? If any step is opaque, document it.

### 4. Respect the Clock

The user's time is the scarcest resource. The entire flow -- landing page to results dashboard -- must complete in under 5 minutes. Every additional wizard step, every additional form field, every additional page load must justify itself against this budget.

**Test**: Time yourself completing the wizard with realistic inputs. If it takes more than 5 minutes, remove fields until it fits. Do not add an explanation -- remove a question.

### 5. Ship Over Perfect

This is a 3-day hackathon build by one developer. The Monte Carlo engine will use 10,000 iterations, not 1,000,000. The lookup tables will use 2025 report data, not real-time feeds. The UI will use Shadcn/ui defaults, not custom components. These are not compromises -- they are correct scoping decisions. A shipped calculator with honest limitations beats an unshipped simulator with theoretical precision.

**Test**: If a feature is 80% done and shipping it would let you move to the next feature, ship it. If a feature is 80% done and shipping it would break the critical path (wizard -> API -> results), finish it.

---

## Open Questions

These questions are deferred from Phase 1 but will need answers in subsequent phases.

| Question | Context | Phase |
|----------|---------|-------|
| Should the Monte Carlo engine run client-side for privacy? | Server-side enables Zod validation and keeps the engine testable. Client-side eliminates network latency and the "we never send your data to a server" claim becomes literal. Both are defensible. | Phase 2 |
| What loading/animation treatment for the calculation step? | 10K iterations take <100ms on the server, but the network round-trip is 1-3s. A progress animation that simulates iteration progress would be dishonest (the real bottleneck is the network, not the math). A simple spinner with "Running 10,000 simulations..." is honest. | Phase 1 (implementation detail) |
| Should results be URL-shareable via encoded params? | nuqs enables type-safe URL state. But encoding all Monte Carlo outputs in a URL is impractical (the distribution has 10K points). Encode only the input params and re-run the calculation on load? That produces different results each time (Monte Carlo is stochastic). Seed the PRNG? | Phase 2 |
| How do we handle the credibility gap of a free hackathon tool? | The brand guidelines address this with methodology transparency and builder credentials. But will users actually trust the output enough to present it to a board? This needs real user feedback. | Phase 2 |
| Should CybRisk offer an API for programmatic access? | Insurance brokers and vCISOs might want to batch-process client portfolios. An API is trivial (the POST /api/calculate endpoint already exists). Documentation and rate limiting are the real cost. | Phase 3 |

---

## Dependencies

### External Dependencies

| Dependency | Type | Risk | Mitigation |
|-----------|------|------|------------|
| **Vercel** | Hosting platform | Low (99.99% uptime SLA) | Backup deployment on second Vercel project |
| **IBM Cost of a Data Breach 2025** | Data source (hardcoded) | None (data is already extracted into lookup tables) | Data is static; no runtime dependency |
| **Verizon DBIR 2025** | Data source (hardcoded) | None | Same as above |
| **NetDiligence Cyber Claims Study 2025** | Data source (hardcoded) | None | Same as above |
| **Shadcn/ui** | UI component library | Low (installed, no CDN dependency) | All components are copied into the project, not fetched at runtime |
| **Recharts** | Chart library | Low (installed, no CDN dependency) | Bundled with the application |

### Internal Dependencies

| Dependency | Blocked By | Blocks |
|-----------|------------|--------|
| Landing page | Nothing | Nothing (can be built in parallel) |
| Wizard UI | Nothing | API integration (needs form schema to match API input) |
| Monte Carlo engine | Lookup tables (needs data to simulate) | API route, Results dashboard |
| Lookup tables | Nothing | Monte Carlo engine |
| API route | Monte Carlo engine, Zod schemas | Results dashboard |
| Results dashboard | API route (needs response schema), Recharts setup | Nothing |
| Vercel deployment | Any working page | Demo readiness |

**Critical Path**: Lookup tables -> Monte Carlo engine -> API route -> Results dashboard -> Vercel deployment

The landing page and wizard UI are off the critical path and can be built in parallel with the engine.

---

## Glossary

| Term | Definition |
|------|-----------|
| **ALE** | Annual Loss Expectancy -- the mean of the Monte Carlo loss distribution. Represents expected annual financial exposure from cyber incidents. |
| **DBIR** | Data Breach Investigations Report -- annual report by Verizon analyzing confirmed data breaches. Primary source for threat event frequency and attack pattern data. |
| **FAIR** | Factor Analysis of Information Risk -- an open standard quantitative risk model. Decomposes risk into Threat Event Frequency, Vulnerability, Primary Loss, and Secondary Loss. |
| **Gordon-Loeb** | Economic model by Lawrence Gordon and Martin Loeb proving that optimal security investment never exceeds 37% (1/e) of expected loss. Published in ACM Transactions on Information and System Security, 2002. |
| **LEF** | Loss Event Frequency -- the product of Threat Event Frequency and Vulnerability. Represents how often a threat event results in an actual loss. |
| **LEC** | Loss Exceedance Curve -- a chart showing the probability that annual loss will exceed a given dollar amount. The standard FAIR output visualization. |
| **LM** | Loss Magnitude -- the sum of Primary Loss and Secondary Loss for a single event. |
| **Monte Carlo** | A simulation technique that runs thousands of random iterations to produce a probability distribution. CybRisk uses 10,000 iterations to model the range of possible annual losses. |
| **PERT** | Program Evaluation and Review Technique -- a probability distribution defined by minimum, most likely (mode), and maximum values. Used to model expert estimates of uncertain quantities. |
| **PL** | Primary Loss -- direct costs of a breach: incident response, forensics, notification, per-record costs. |
| **PML** | Probable Maximum Loss -- the 95th percentile of the Monte Carlo distribution. Represents a worst-case (but plausible) annual loss. |
| **SL** | Secondary Loss -- indirect costs: regulatory fines, litigation, reputation damage, business interruption. |
| **TEF** | Threat Event Frequency -- how often threat events (attacks, incidents) occur per year, regardless of whether they result in a loss. |
| **vCISO** | Virtual Chief Information Security Officer -- a fractional or part-time CISO who serves multiple organizations, typically SMBs that cannot justify a full-time CISO. |
| **Vuln** | Vulnerability (in FAIR context) -- the probability that a threat event results in a loss event. Not the same as a software vulnerability. |

---

*Document generated by North Star Advisor*
