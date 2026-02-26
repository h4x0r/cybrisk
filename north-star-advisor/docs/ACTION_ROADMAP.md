# CybRisk: Action Roadmap

> **Tier**: 1 — Strategic Authority
> **Parent**: [STRATEGIC_RECOMMENDATION.md](STRATEGIC_RECOMMENDATION.md)
> **Created**: 2026-02-22
> **Status**: Active
> **Generation Step**: 12 of 13

---

## Document Purpose

This document translates the strategic recommendation (Path C: Balanced) into **concrete next steps**. Given CybRisk's 3-day hackathon constraint, the roadmap is compressed into hours and days rather than weeks and months.

**Decision Rule**: Every action must trace back to the North Star metric (end-to-end completion rate) or a validated strategic move. If it doesn't, it doesn't make the roadmap.

---

# Part 1: Strategic Context

## 1.1 North Star Reminder

> **North Star Metric**: End-to-End Completion Rate
> (Users who land AND complete a full calculation with results)
>
> **Target**: Working demo flow for hackathon submission
> **Gap**: Everything (starting from zero)

## 1.2 Key Strategic Moves

| Move | Type | Why Now |
|------|------|---------|
| Build real FAIR Monte Carlo engine | Offensive | Core differentiator; no competitor offers free self-service |
| Include Gordon-Loeb optimal spend | Offensive | Unique feature; "how much should I spend?" is the money question |
| Ship on Vercel Day 1 | Defensive | Catch deployment issues early; continuous integration |

## 1.3 Current Phase

> **Phase**: MVP (Hackathon)
>
> **Phase Objective**: Working end-to-end calculator deployed on Vercel
>
> **Success Threshold**: Complete flow works in live demo
> **Kill Threshold**: Monte Carlo engine not working by end of Day 1

---

# Part 2: Day 1 (Feb 22-23) — Foundation

**Theme**: "Make the math work"

## 2.1 Focus Areas

### Focus 1: Monte Carlo Engine

**Objective**: `runMonteCarlo(input)` returns valid `SimulationResult` with percentiles

**Why This Matters**: This IS the product. Without working math, everything else is a shell.

**Key Actions**:

| Action | Owner | Due | Definition of Done |
|--------|-------|-----|-------------------|
| Implement PERT distribution (Joehnk algorithm) | Albert | Day 1 AM | `samplePERT(min, mode, max)` returns values in [min, max] with correct mean |
| Implement FAIR tree (TEF * Vuln = LEF, PL + SL = LM) | Albert | Day 1 AM | Given known PERT params, produces plausible loss values |
| Implement 10K iteration loop with percentile extraction | Albert | Day 1 PM | P5/P25/P50/P75/P95 from sorted array; histogram bins |
| Implement Gordon-Loeb optimal spend | Albert | Day 1 PM | `optimalSpend = (1/e) * vulnerability * expectedLoss` |
| Implement lookup tables (industry -> FAIR params) | Albert | Day 1 PM | All 8 industries have valid PERT parameters |

**Blockers/Risks**:
- PERT edge case (mode == min or mode == max) -> Mitigation: clamp mode to be within (min+epsilon, max-epsilon)
- Floating-point accumulation -> Mitigation: use running mean, not sum-then-divide

### Focus 2: API Route

**Objective**: `POST /api/calculate` accepts JSON, returns results

**Why This Matters**: The API is the bridge between UI and math engine.

**Key Actions**:

| Action | Owner | Due | Definition of Done |
|--------|-------|-----|-------------------|
| Create Zod validation schema | Albert | Day 1 PM | Schema rejects invalid inputs, accepts valid ones |
| Create API route handler | Albert | Day 1 PM | Returns 200 with results for valid input, 400 for invalid |
| Test with curl/httpie | Albert | Day 1 PM | `curl -X POST /api/calculate -d '{...}'` returns valid JSON |

### Focus 3: Deploy to Vercel

**Objective**: Production URL accessible and serving the app

**Why This Matters**: Catch deployment issues on Day 1, not Day 3.

**Key Actions**:

| Action | Owner | Due | Definition of Done |
|--------|-------|-----|-------------------|
| Deploy initial Next.js app to Vercel | Albert | Day 1 AM | `cybrisk.vercel.app` returns 200 |
| Verify API route works in production | Albert | Day 1 PM | POST to production `/api/calculate` returns results |

---

## 2.2 What to Avoid (Day 1)

| Avoid | Why It's Tempting | Why We're Saying No |
|-------|-------------------|---------------------|
| Landing page design | It's the first thing users see | Math first; landing page can be minimal |
| Chart styling | Want to see pretty graphs | Math correctness > chart aesthetics |
| Form UI polish | Want professional wizard | Validate the calculation engine before building UI |
| Multiple scenarios | More features = more impressive | One scenario working perfectly > three broken |

---

## 2.3 Day 1 Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Monte Carlo engine produces valid output | Yes | -- |
| API route returns correct JSON | Yes | -- |
| Gordon-Loeb calculation works | Yes | -- |
| App deployed to Vercel | Yes | -- |
| Unit tests pass for math functions | Yes | -- |

**Review**: End of Day 1, verify all criteria met before moving to Day 2.

---

# Part 3: Day 2 (Feb 23-24) — User Interface

**Theme**: "Make it work end-to-end"

## 3.1 Focus Areas

| Focus Area | Objective | Depends On |
|------------|-----------|------------|
| Wizard UI (5 steps) | User can input all parameters | Zod schema (Day 1) |
| Results dashboard | Charts and metrics render | API route (Day 1) |
| End-to-end flow | Landing -> Assess -> Calculate -> Results | All Day 1 work |

## 3.2 Key Actions

| Action | Owner | Due | Definition of Done |
|--------|-------|-----|-------------------|
| Build wizard step components (5 steps) | Albert | Day 2 AM | All steps render, collect data, validate |
| Wire wizard to API call on submit | Albert | Day 2 AM | "Calculate" button triggers API, handles response |
| Build results page with key metrics | Albert | Day 2 PM | ALE, percentiles, Gordon-Loeb displayed |
| Add histogram chart (Recharts BarChart) | Albert | Day 2 PM | Distribution renders from pre-binned data |
| Add loss exceedance curve (stretch) | Albert | Day 2 PM | LEC chart shows probability vs. loss amount |
| Store results in sessionStorage + Context | Albert | Day 2 PM | Results survive page refresh |

## 3.3 Day 2 Success Criteria

| Milestone | Success Signal |
|-----------|----------------|
| Wizard collects all inputs | Can fill all 5 steps without errors |
| API integration works | Calculate button -> results appear |
| Results page shows real data | Charts render with Monte Carlo output |
| End-to-end flow works | Complete journey from landing to results |

---

# Part 4: Day 3 (Feb 24-25) — Polish and Submit

**Theme**: "Make it demo-ready"

## 4.1 Focus Areas

| Focus Area | Objective | Depends On |
|------------|-----------|------------|
| Landing page | Professional first impression | End-to-end flow (Day 2) |
| Visual polish | Dark theme, consistent spacing | All UI components (Day 2) |
| Demo preparation | Smooth 2-minute walkthrough | Everything working |
| Submission package | .zip with all requirements | Deployed production URL |

## 4.2 Key Actions

| Action | Owner | Due | Definition of Done |
|--------|-------|-----|-------------------|
| Build landing page hero section | Albert | Day 3 AM | Headline, subheadline, CTA button |
| Add features section | Albert | Day 3 AM | 3 value prop cards |
| Apply dark theme consistently | Albert | Day 3 AM | slate-900/950 background, consistent accent colors |
| Add trust signals | Albert | Day 3 AM | "Data never stored" badge, FAIR methodology mention |
| Test on multiple browsers | Albert | Day 3 PM | Chrome + Firefox minimum |
| Take landing page screenshot (1280px+) | Albert | Day 3 PM | `landing_page_cybrisk.png` |
| Write explainer.md | Albert | Day 3 PM | Product name, description, team, URLs |
| Rehearse 2-minute demo | Albert | Day 3 PM | Smooth flow, no dead air, backup screenshots |
| Create submission .zip | Albert | Day 3 PM | All files per hackathon requirements |
| Final deploy and verify | Albert | Day 3 PM | Production URL works end-to-end |

## 4.3 Phase Gate (Submission Deadline: Feb 25, 11:59 PM PT)

| Outcome | Criteria | Next Action |
|---------|----------|-------------|
| **Submit** | End-to-end flow works, deployed, screenshots taken | Package and submit |
| **Partial submit** | Math works but UI incomplete | Submit with what's working; note in explainer |
| **No submit** | Monte Carlo engine broken | Fix math, skip UI polish, submit minimal |

---

# Part 5: Risk & Contingency

## 5.1 Top Risks

| Risk | Likelihood | Impact | Mitigation | Trigger |
|------|------------|--------|------------|---------|
| Monte Carlo math bug | Medium | Critical | Unit test extensively; compare to known FAIR scenarios | NaN/Infinity in output |
| Vercel deployment issues | Low | High | Deploy early (Day 1); have Netlify backup | Build fails in CI |
| Scope creep (adding features) | High | High | Stick to this roadmap; "not now" list | Any feature not in this doc |
| Time underestimation | Medium | Medium | Math first (core value); UI can be minimal | Day 1 math not done |
| PERT edge cases | Medium | Medium | Clamp parameters; test degenerate inputs | Test suite catches |

## 5.2 Contingency Plans

| Assumption | If Wrong | Plan B |
|------------|----------|--------|
| Monte Carlo in 1 day | Takes 2 days | Cut wizard to 3 steps; simplify inputs |
| Charts render cleanly | Recharts issues | Static number display (no charts) |
| Vercel works | Deployment fails | Netlify or Railway as backup host |

---

# Part 6: Resource Allocation

## 6.1 Time Allocation

```
Day 1 - Foundation:

Monte Carlo Engine  ████████████████░░░░ 40%
API Route           ████████░░░░░░░░░░░░ 20%
Lookup Tables       ████████░░░░░░░░░░░░ 20%
Testing             ██████░░░░░░░░░░░░░░ 15%
Deploy              ██░░░░░░░░░░░░░░░░░░  5%

Day 2 - UI:

Wizard Steps        ████████████░░░░░░░░ 30%
Results Page        ████████████░░░░░░░░ 30%
Charts              ████████░░░░░░░░░░░░ 20%
Integration         ██████░░░░░░░░░░░░░░ 15%
Buffer              ██░░░░░░░░░░░░░░░░░░  5%

Day 3 - Polish:

Landing Page        ████████████░░░░░░░░ 30%
Visual Polish       ████████░░░░░░░░░░░░ 20%
Testing             ████████░░░░░░░░░░░░ 20%
Demo Prep           ██████░░░░░░░░░░░░░░ 15%
Submission          ██████░░░░░░░░░░░░░░ 15%
```

---

# Part 7: Review Protocol

## 7.1 Daily Check-In

**End of each day**, review:
- [ ] Did we hit today's success criteria?
- [ ] Any blockers for tomorrow?
- [ ] Is the "avoid" list being respected?
- [ ] Is the production URL still working?

## 7.2 Pre-Submission Review (Day 3 PM)

- [ ] End-to-end flow works on production URL
- [ ] All submission artifacts ready (.zip, screenshot, explainer)
- [ ] Demo rehearsed (2 minutes, smooth)
- [ ] No console errors in production
- [ ] Backup screenshots taken

## 7.3 Post-Hackathon Review (Feb 26)

- [ ] What worked well?
- [ ] What would we do differently?
- [ ] Is CybRisk worth continuing?
- [ ] What's the V2 roadmap if yes?

---

*Document generated by North Star Advisor*
