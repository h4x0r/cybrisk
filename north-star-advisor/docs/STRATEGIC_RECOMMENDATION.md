# CybRisk: Strategic Recommendation

> **Tier**: 1 — Strategic Authority
> **Parent**: [NORTHSTAR.md](NORTHSTAR.md)
> **Created**: 2026-02-22
> **Status**: Active
> **Generation Step**: 11 of 13 — Synthesizes all prior documents

---

## Document Purpose

This document distills everything into a **single, well-reasoned recommendation** for CybRisk's strategic path. It synthesizes findings from brand guidelines, competitive landscape, architecture blueprint, security architecture, and research.

---

# Part 1: Situation Summary

## 1.1 The Challenge

> **In one sentence**: How should a solo developer build the most compelling cyber risk calculator possible in 3 days for a hackathon, while creating something that could have real-world utility beyond the competition?

### Context

| Dimension | Current State |
|-----------|---------------|
| **Market Position** | Entering a gap: no free, self-service FAIR-based calculator exists. Competitors are enterprise tools ($50K+/year) or generic risk matrices |
| **Customer Need** | vCISOs and SMB executives need to translate security posture into dollar amounts for board conversations |
| **Technical Reality** | Next.js + Vercel stack is proven; Monte Carlo in TypeScript is feasible at 10K iterations in <100ms; all math is tractable |
| **Resource Constraints** | 1 developer, 3 days (Feb 22-25), no budget, Vercel Hobby plan |
| **Key Risks** | Scope creep kills hackathons; Monte Carlo math errors produce nonsensical results; UI polish vs. calculation depth trade-off |

### What's at Stake

| If We Succeed | If We Fail |
|---------------|------------|
| A working demo that translates security questions into dollar estimates in under 2 minutes | Another risk matrix nobody uses |
| Potential post-hackathon utility for Albert's vCISO practice | Wasted weekend |
| Differentiation from compliance-checklist competitors | Indistinguishable from existing tools |

---

## 1.2 Key Insights (from Analysis)

### Market Insights

| Insight | Source | Implication |
|---------|--------|-------------|
| Enterprise FAIR tools cost $50K-$250K/year | COMPETITIVE_LANDSCAPE | Massive price gap for a free self-service tool |
| No competitor offers Gordon-Loeb optimal spend | COMPETITIVE_LANDSCAPE | Unique differentiator — "how much should I spend?" |
| Risk matrices dominate SMB market | COMPETITIVE_LANDSCAPE | Opportunity to upgrade from qualitative to quantitative |

### Customer Insights

| Insight | Source | Implication |
|---------|--------|-------------|
| vCISOs need board-ready financials, not compliance checklists | NORTHSTAR personas | Dollar outputs, not traffic-light ratings |
| SMB executives have 5 minutes of attention for security topics | NORTHSTAR personas | Wizard must be fast; results must be visually clear |
| Fractional advisors serve 5-10 clients; need repeatable tools | NORTHSTAR personas | Calculator must work across industries without customization |

### Technical Insights

| Insight | Source | Implication |
|---------|--------|-------------|
| 10K Monte Carlo iterations run in <100ms on Vercel | Research (architecture) | Performance is not a constraint; focus on UX |
| PERT via Joehnk algorithm is ~20 lines of TypeScript | Research (tech stack) | Math implementation is tractable for solo dev |
| sessionStorage + Context is sufficient for state transfer | Research (architecture) | No need for complex state management |

### Competitive Insights

| Insight | Source | Implication |
|---------|--------|-------------|
| RiskLens (now acquired by Safe Security) pivoted to enterprise AI | COMPETITIVE_LANDSCAPE | Free self-service space is abandoned |
| Generic risk calculators show heatmaps, not dollars | COMPETITIVE_LANDSCAPE | Dollar output is the differentiator |
| No competitor combines FAIR + Gordon-Loeb in one tool | COMPETITIVE_LANDSCAPE | First-mover advantage in combined approach |

---

# Part 2: Strategic Paths

## 2.1 Path A: Demo-First (Hackathon Optimized)

> **Thesis**: Build the minimum viable demo that impresses judges in 2 minutes, prioritizing visual polish over mathematical depth.

### What This Path Looks Like
- Landing page with strong copy and screenshots
- 3-step simplified wizard (fewer inputs)
- Hardcoded "representative" results for demo reliability
- Beautiful charts and animations
- Skip Gordon-Loeb, skip detailed percentiles

### Trade-offs

| Gain | Cost |
|------|------|
| Guaranteed working demo | Calculator doesn't actually calculate |
| Visual polish impresses judges | No post-hackathon utility |
| Lower risk of math bugs | Loses core differentiator (real math) |

### Best If
- The only goal is winning the hackathon
- Mathematical accuracy doesn't matter to judges

---

## 2.2 Path B: Calculator-First (Real Tool)

> **Thesis**: Build a genuinely working FAIR-based calculator with Monte Carlo simulation and Gordon-Loeb optimization, accepting that UI polish may be secondary.

### What This Path Looks Like
- Full Monte Carlo engine with validated math
- 5-step wizard with real actuarial data lookup tables
- Gordon-Loeb optimal spend calculation
- Distribution histogram and percentile breakdown
- Clean but not flashy UI (Shadcn/ui defaults)

### Trade-offs

| Gain | Cost |
|------|------|
| Real tool with post-hackathon utility | Less visual polish |
| Mathematical credibility (real FAIR model) | Higher risk of math bugs |
| Differentiator works in demo ("this is real math") | More code, tighter timeline |

### Best If
- Post-hackathon utility matters
- Judges value substance over style
- Albert wants to use this in his vCISO practice

---

## 2.3 Path C: Balanced (Recommended)

> **Thesis**: Build the real calculator (Path B) but with strategic shortcuts that ensure a polished demo while maintaining mathematical integrity.

### What This Path Looks Like
- Full Monte Carlo engine (10K iterations, PERT distributions)
- 5-step wizard but with smart defaults (pre-fill common values)
- Gordon-Loeb optimal spend as the "wow factor"
- Pre-binned histogram + key percentile cards (P5/P50/P95)
- Shadcn/ui components with dark theme and professional styling
- Landing page with one strong hero section (not three)

### Trade-offs

| Gain | Cost |
|------|------|
| Real calculator that actually works | Some UI sections minimal |
| Demo flows smoothly with smart defaults | Less customization depth |
| Post-hackathon utility preserved | Not every chart type implemented |

### Best If
- You want both hackathon credibility and a real tool
- You're willing to cut features but not mathematical corners

---

# Part 3: Path Comparison

## 3.1 Side-by-Side Analysis

| Dimension | Path A: Demo-First | Path B: Calculator-First | Path C: Balanced |
|-----------|-------|--------|--------|
| **North Star Impact** | Low (fake results) | High (real tool) | High (real tool, polished) |
| **Time to Demo** | Fast | Slow | Medium |
| **Resource Requirement** | Low | High | Medium |
| **Risk Level** | Low | High (math bugs) | Medium |
| **Competitive Differentiation** | Weak (just UI) | Strong (real FAIR) | Strong |
| **Post-Hackathon Value** | None | High | High |

## 3.2 Decision Matrix

| Criterion | Weight | Path A | Path B | Path C |
|-----------|--------|--------|--------|--------|
| Working demo by deadline | 3 | 5 | 3 | 4 |
| Mathematical credibility | 3 | 1 | 5 | 5 |
| Post-hackathon utility | 2 | 1 | 5 | 4 |
| Visual impression | 2 | 5 | 2 | 3 |
| Differentiator strength | 3 | 2 | 5 | 5 |
| **Weighted Total** | | **36** | **49** | **56** |

---

# Part 4: The Recommendation

## 4.1 Recommended Path

> **We recommend Path C: Balanced — build the real calculator with strategic shortcuts.**

### Why This Path

1. **Best serves the North Star metric**: A real calculator that produces genuine FAIR-based dollar estimates delivers the core value proposition. Fake results would undermine the entire thesis.

2. **Fits the constraints**: By using smart defaults in the wizard and keeping the landing page minimal, the real math gets built within the 3-day window. Shadcn/ui provides professional styling without custom CSS work.

3. **Acceptable trade-offs**: Cutting the landing page to one hero section (instead of three) and limiting chart types to histogram + percentile cards is a small sacrifice for mathematical integrity. Judges can see the real calculation engine in action.

4. **Manages risk**: Building the Monte Carlo engine first (Day 1) and testing with known scenarios creates a safety net. If UI work runs behind schedule, the calculator still works with a minimal interface.

### What We're Betting On

| Assumption | Evidence | Confidence |
|------------|----------|------------|
| Monte Carlo in TypeScript is feasible in a day | Research confirms: Joehnk algorithm ~20 lines, 10K iterations <100ms | High |
| Judges value working product over visual polish | Hackathon rubric likely weights "does it work?" heavily | Medium |
| Smart defaults make the wizard feel fast | Common pattern in calculator UIs (tax calculators, loan calculators) | High |
| Gordon-Loeb is a genuine "wow" moment | No competitor offers it; judges with finance background will appreciate | Medium |

### What Could Prove Us Wrong

| Invalidation Signal | How We'd Know | Response |
|---------------------|---------------|----------|
| Math takes longer than expected | Day 1 ends without working Monte Carlo | Drop to 3-step wizard, simplify inputs |
| Judges only care about visuals | Feedback explicitly mentions "looks basic" | Post-hackathon: add animations, polish |
| PERT edge cases crash production | NaN/Infinity in demo | Use clamped safe defaults, add bounds checking |

---

## 4.2 What to Focus On

### Primary Focus Areas

1. **Monte Carlo Engine First (Day 1)**
   - Why it matters: This IS the product. Everything else is UI around a calculation.
   - Success looks like: `runMonteCarlo(testInput)` returns valid percentiles

2. **End-to-End Flow (Day 2)**
   - Why it matters: A working flow from wizard to results proves the concept
   - Success looks like: Fill wizard -> click Calculate -> see results page with real numbers

3. **Polish and Deploy (Day 3)**
   - Why it matters: Demo must be smooth; production URL must work
   - Success looks like: Live URL works; 2-minute demo rehearsed; screenshots taken

---

## 4.3 What to Avoid

| Avoid | Why It's Tempting | Why We Must Say No |
|-------|-------------------|---------------------|
| Animated landing page sections | Looks impressive | Eats hours better spent on math |
| PDF report generation | "Board-ready output" | Complex; screenshot suffices for demo |
| Multiple scenario comparison | Powerful feature | Day 3 stretch at best; V2 candidate |
| Custom chart styling | Charts look generic | Recharts defaults are clear enough |
| User authentication | "Real SaaS" feel | Adds no demo value; kills user flow |
| Mobile responsiveness | Good practice | Judges demo on laptop; fix post-hackathon |

---

## 4.4 What to Do Next

### Next 24 Hours (Day 1: Feb 22-23)

| Action | Owner | Outcome |
|--------|-------|---------|
| Implement Monte Carlo engine | Albert | `runMonteCarlo()` returns valid SimulationResult |
| Implement PERT sampling | Albert | Beta distribution samples match expected statistics |
| Implement lookup tables | Albert | Industry/size -> FAIR parameters mapping works |
| Implement Gordon-Loeb | Albert | `calculateOptimalSpend()` returns reasonable dollar amount |
| Unit test all math | Albert | Edge cases handled, no NaN/Infinity |

### Next 48 Hours (Day 2: Feb 23-24)

| Milestone | Success Criteria |
|-----------|------------------|
| API route working | POST /api/calculate returns valid JSON |
| Wizard working | 5 steps, Zod validation, state preserved |
| Results page working | Charts render, percentiles displayed |
| End-to-end flow | Landing -> Assess -> Calculate -> Results |

### Next 72 Hours (Day 3: Feb 24-25)

| Milestone | Success Criteria |
|-----------|------------------|
| Deploy to Vercel | Production URL accessible |
| Landing page polished | Hero section, features section, CTA |
| Demo rehearsed | 2-minute walkthrough smooth |
| Submission prepared | Screenshots, explainer.md, .zip package |

---

# Part 5: Confidence Assessment

## 5.1 Recommendation Confidence

| Dimension | Confidence | Rationale |
|-----------|------------|-----------|
| **Problem Understanding** | High | Albert has 20+ years in cyber risk; the problem is lived experience |
| **Solution Fit** | High | FAIR + Monte Carlo + Gordon-Loeb is the right analytical framework |
| **Execution Feasibility** | Medium | 3-day timeline is tight; math-first approach mitigates risk |
| **Market Timing** | High | Free FAIR tools don't exist; enterprise tools are overpriced |
| **Team Capability** | High | Solo developer with deep domain expertise |

**Overall Confidence**: Medium-High

## 5.2 What Would Increase Confidence

| Uncertainty | How to Resolve | Timeline |
|-------------|----------------|----------|
| Can Monte Carlo engine be built in 1 day? | Build it. If Day 1 ends with working engine, confidence becomes High | Day 1 |
| Will judges value math over visuals? | Review hackathon rubric; adjust polish level accordingly | Pre-demo |

---

## 5.3 Review Trigger

Revisit this recommendation if:

- [ ] Monte Carlo engine is not working by end of Day 1 (switch to Path A)
- [ ] PERT edge cases prove intractable (simplify to normal distribution)
- [ ] Vercel deployment fails persistently (have backup deployment on Netlify)
- [ ] Hackathon rules change (verify Next.js + Vercel is still required)
- [ ] Post-hackathon: if >100 users want saved reports, revisit no-auth decision

---

# Appendix: Supporting Analysis

## A. Data Sources

| Source | What It Informed | Confidence |
|--------|------------------|------------|
| IBM Cost of Data Breach 2025 | Per-record breach costs by industry | High |
| Verizon DBIR 2025 | Attack frequency distribution | High |
| NetDiligence Cyber Claims 2025 | Loss magnitude distributions | High |
| Gordon & Loeb (2002) | Optimal security spend model | High |
| FAIR Institute open standards | Risk quantification methodology | High |

## B. Alternatives Considered and Rejected

| Alternative | Why Considered | Why Rejected |
|-------------|----------------|--------------|
| Risk matrix UI (qualitative) | Simpler, faster to build | Doesn't differentiate; "not another heatmap" |
| Python backend for math | scipy validated | Two deployments, CORS, cold starts |
| SaaS with user accounts | "Proper" architecture | Scope creep; auth adds zero demo value |

## C. Key Stakeholder Alignment

| Stakeholder | Their Priority | How This Path Addresses It |
|-------------|----------------|---------------------------|
| Hackathon judges | Working demo, innovation | Real FAIR calculator is novel; Gordon-Loeb is unique |
| Albert (developer) | Post-hackathon utility | Real math engine can be used in vCISO practice |
| Future users (vCISOs) | Quick, credible risk numbers | 5-step wizard -> dollar estimates in under 2 minutes |

---

*Document generated by North Star Advisor*
