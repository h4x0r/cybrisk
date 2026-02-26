# Competitive Landscape: CybRisk

> **Category**: Self-service cyber risk quantification (CRQ)
> **Prepared**: 2026-02-22
> **Product**: CybRisk -- Cyber Risk Posture Calculator
> **Tagline**: "Know your cyber risk in dollars, not checkboxes."

---

## 1. Market Context

Cyber risk quantification (CRQ) is transitioning from a niche enterprise discipline to a mainstream business requirement. Three converging forces are accelerating this shift:

1. **Regulatory pressure**: The SEC's 2023 cybersecurity disclosure rules (Item 1C of Form 10-K) require public companies to describe material cyber risks in financial terms. Boards can no longer accept "we're mostly compliant" -- they need dollar figures.

2. **Insurance economics**: Cyber insurance carriers have hardened underwriting standards dramatically since 2021. Premiums rose 50-100% across 2022-2023, and carriers now require applicants to demonstrate quantified risk exposure, not just completed questionnaires.

3. **Fractional security workforce**: The vCISO and fractional security advisor market has grown 30%+ annually as SMBs that cannot afford full-time security leadership hire part-time experts. These advisors need scalable, repeatable tools -- not bespoke consulting engagements.

Despite these tailwinds, the CRQ market remains bifurcated. Enterprise platforms (RiskLens, Safe Security) serve Fortune 500 companies at six-figure price points. Everyone else uses spreadsheets. There is no credible self-service CRQ tool for the mid-market.

CybRisk targets this gap.

---

## 2. Competitive Categories

### 2.1 Direct Competitors (CRQ Tools)

These products explicitly perform cyber risk quantification using financial models.

#### FAIR-U (FAIR Institute)

| Dimension | Detail |
|-----------|--------|
| **What it does** | Free, browser-based FAIR analysis tool from the FAIR Institute |
| **Target user** | Risk analysts learning FAIR methodology |
| **Pricing** | Free (requires FAIR Institute account) |
| **Strengths** | Official FAIR pedigree; educational value; free |
| **Weaknesses** | Manual input for every parameter (no built-in data); no Monte Carlo simulation; spreadsheet-like UX; single-scenario only; no Gordon-Loeb or optimal spend output |
| **Time to insight** | 30-60 minutes per scenario (requires user to source all loss magnitude and frequency data) |
| **Financial rigor** | Medium -- follows FAIR taxonomy but relies entirely on user-supplied estimates with no actuarial grounding |

**CybRisk advantage over FAIR-U**: CybRisk bakes in real actuarial data (IBM Cost of a Data Breach, Verizon DBIR, NetDiligence claims data) so users do not need to source loss parameters. CybRisk runs 10,000 Monte Carlo iterations producing probabilistic distributions in under 5 minutes. FAIR-U produces single-point estimates from manual inputs in 30-60 minutes.

#### RiskLens

| Dimension | Detail |
|-----------|--------|
| **What it does** | Enterprise FAIR-based CRQ platform; the market leader in quantitative cyber risk analysis |
| **Target user** | Fortune 500 CISOs, enterprise risk managers, dedicated risk analysts |
| **Pricing** | $100K-$500K+ annually (enterprise contracts) |
| **Strengths** | Most mature FAIR implementation; deep scenario modeling; integrations with GRC tools; strong analyst support; regulatory-grade reporting |
| **Weaknesses** | Requires weeks of configuration; needs dedicated analyst to operate; inaccessible to SMBs; no self-service option; no free tier |
| **Time to insight** | Days to weeks (initial setup), hours per scenario (ongoing) |
| **Financial rigor** | High -- gold standard FAIR implementation with extensive calibration |

**CybRisk advantage over RiskLens**: CybRisk delivers 80% of the financial insight in 0.1% of the time and 0% of the cost. RiskLens is the right tool for a Fortune 500 company with a dedicated risk team. CybRisk is the right tool for a vCISO who needs a defensible dollar figure for a client board meeting tomorrow.

#### Safe Security

| Dimension | Detail |
|-----------|--------|
| **What it does** | Real-time CRQ platform that aggregates signals from security tools (SIEM, EDR, vulnerability scanners) to produce continuous risk scores and financial estimates |
| **Target user** | Enterprise CISOs, security operations teams |
| **Pricing** | Enterprise only (custom pricing, typically $80K-$300K+) |
| **Strengths** | Real-time risk posture; integrates with existing security stack; continuous monitoring; strong board reporting |
| **Weaknesses** | Requires extensive integration (weeks); enterprise-only; no self-service; depends on deployed security tooling for signal input |
| **Time to insight** | Weeks (integration + calibration) |
| **Financial rigor** | High -- combines FAIR with real-time telemetry |

**CybRisk advantage over Safe Security**: CybRisk requires zero integrations and zero existing security tooling. Safe Security produces better continuous monitoring for large enterprises. CybRisk produces a credible first estimate for organizations that have no security tooling to integrate with -- which describes most SMBs.

### 2.2 Category-Adjacent Competitors

These products operate in overlapping territory but serve a fundamentally different job-to-be-done.

#### SecurityScorecard / BitSight

| Dimension | Detail |
|-----------|--------|
| **What they do** | External-facing cyber risk ratings (letter grades A-F) based on passive internet scanning |
| **Pricing** | $15K-$100K+ annually |
| **Key difference from CybRisk** | They answer "how do we look from the outside?" (reputation signal). CybRisk answers "what's our financial exposure?" (decision input). SecurityScorecard gives you a B+; CybRisk gives you $2.4M expected annual loss. |
| **Overlap** | Both inform cyber insurance and vendor risk decisions |

#### Balbix

| Dimension | Detail |
|-----------|--------|
| **What it does** | AI-based cyber risk quantification with agent-deployed asset discovery |
| **Pricing** | Enterprise (custom, $100K+) |
| **Key difference from CybRisk** | Requires deployed agents on endpoints; enterprise-only; continuous monitoring vs. point-in-time assessment |
| **Overlap** | Both produce dollar-denominated risk figures |

#### Axio360

| Dimension | Detail |
|-----------|--------|
| **What it does** | Cyber risk quantification platform with scenario-based modeling |
| **Pricing** | Mid-market to enterprise ($30K-$150K) |
| **Key difference from CybRisk** | Requires account setup and configuration; subscription model; broader GRC features |
| **Overlap** | Both use scenario-based quantification; both target the "dollars not scores" positioning |

### 2.3 Indirect Competitors / Status Quo

These are the alternatives CybRisk users would otherwise resort to.

#### Excel Spreadsheets

The most common "tool" for ad hoc cyber risk quantification. A vCISO like Sarah Chen currently builds custom Excel models for each client -- 2-3 hours per engagement. The spreadsheet lacks Monte Carlo simulation, uses guessed parameters, produces no distributional output, and carries no methodological credibility in a board presentation.

**CybRisk advantage**: Replaces 2-3 hours of manual modeling with a 5-minute guided assessment backed by published actuarial data and 10,000 Monte Carlo iterations.

#### Consulting Firms (Big 4 / Boutique)

Deloitte, PwC, EY, and KPMG all offer cyber risk quantification as part of advisory engagements. Cost: $50,000-$200,000+ per assessment. Timeline: 4-12 weeks. Output: PDF report with custom analysis.

**CybRisk advantage**: Free, instant, repeatable. CybRisk is not a replacement for a full Big 4 engagement -- but it is a replacement for doing nothing, which is what most SMBs choose when the alternative costs $50K.

#### Do Nothing

The most common competitor. The vast majority of SMBs do not quantify their cyber risk at all. They rely on qualitative heat maps, gut feeling, or whatever their insurance broker tells them. The "do nothing" option wins whenever the cost (in time or money) of quantification exceeds the perceived benefit.

**CybRisk advantage**: Zero cost, zero setup, 5 minutes. The barrier to "do something" drops to near zero.

---

## 3. Feature Comparison Matrix

| Capability | CybRisk | FAIR-U | RiskLens | Safe Security | SecurityScorecard | Excel |
|------------|---------|--------|----------|---------------|-------------------|-------|
| **Dollar-denominated output** | Yes | Yes | Yes | Yes | No (letter grades) | Manual |
| **FAIR methodology** | Yes | Yes | Yes | Yes | No | Manual |
| **Monte Carlo simulation** | 10K iterations | No | Yes | Yes | No | Manual (VBA) |
| **Gordon-Loeb optimal spend** | Yes | No | No | No | No | No |
| **Built-in actuarial data** | Yes (IBM/DBIR/NetDiligence) | No | Partial | Partial | N/A | No |
| **Self-service (no analyst)** | Yes | Yes | No | No | Partial | Yes |
| **Time to first result** | < 5 minutes | 30-60 min | Days-weeks | Weeks | Hours (setup) | 2-3 hours |
| **Free tier** | Entirely free | Free (account req.) | No | No | No | Free |
| **No account required** | Yes | No | No | No | No | Yes |
| **Probabilistic distribution** | Yes (histogram + LEC) | No | Yes | Yes | No | No |
| **Board-ready visualization** | Yes | No | Yes | Yes | Yes | Manual |
| **Scenario comparison** | Phase 2 | No | Yes | Yes | N/A | Manual |
| **Continuous monitoring** | No | No | No | Yes | Yes | No |
| **API/integrations** | Phase 3 | No | Yes | Yes | Yes | No |
| **Multi-industry support** | 12 industries | N/A (manual) | Yes | Yes | Yes | Manual |

---

## 4. Positioning Matrix

**Axes**: Speed to Insight (x-axis) vs. Financial Rigor (y-axis)

```
                        HIGH FINANCIAL RIGOR
                              |
                  RiskLens    |
                     *        |
                              |
           Safe Security      |         CybRisk
                *             |            *
                              |
                  Axio360     |
                    *         |        FAIR-U
                              |          *
                              |
       ───────────────────────┼────────────────────────
           SLOW               |              FAST
                              |
              Balbix          |
                *             |
                              |
          Big 4 Consulting    |    SecurityScorecard
                *             |          *
                              |
                              |      Excel / Do Nothing
                              |           *
                              |
                        LOW FINANCIAL RIGOR
```

**Quadrant analysis**:

- **High rigor, slow** (top-left): RiskLens, Safe Security, Axio360. Enterprise tools that produce excellent financial analysis but require weeks of setup and six-figure budgets. Inaccessible to SMBs.

- **High rigor, fast** (top-right): **CybRisk occupies this quadrant alone.** Combines FAIR methodology with Monte Carlo simulation and built-in actuarial data, delivering probabilistic financial output in under 5 minutes. No other tool offers this combination.

- **Low rigor, slow** (bottom-left): Big 4 consulting (rigorous but slow and expensive for what most SMBs need), Balbix (requires agent deployment). These options are worse on both axes for the self-service use case.

- **Low rigor, fast** (bottom-right): SecurityScorecard (fast but produces ratings, not dollars), Excel (fast for experts but no methodology), Do Nothing (instant but zero value). These are the "easy" options that fail to produce defensible financial figures.

**Key insight**: The top-right quadrant has been empty because achieving both speed and rigor requires opinionated defaults -- baking in actuarial data rather than asking users to source it. Enterprise tools cannot do this because their customers demand configurability. CybRisk can do this because its users demand speed.

---

## 5. Differentiation Deep Dive

### 5.1 Gordon-Loeb Optimal Security Spend

No competitor in any category offers Gordon-Loeb optimal investment calculation. The Gordon-Loeb model (2002, widely cited in information economics literature) determines the optimal level of security investment given the vulnerability level and potential loss. CybRisk integrates this directly into the results dashboard, answering not just "what's my exposure?" but "how much should I spend to reduce it?"

This is a genuine capability gap in the market. RiskLens helps organizations model the impact of specific controls, but does not compute an optimization function. FAIR-U does not address investment at all.

### 5.2 Built-In Actuarial Data

CybRisk hardcodes published data from three authoritative sources:

1. **IBM Cost of a Data Breach Report** -- industry-specific per-record breach costs, mean time to identify/contain, cost factors by control type
2. **Verizon Data Breach Investigations Report (DBIR)** -- threat action frequencies, actor categories, industry-specific breach patterns
3. **NetDiligence Cyber Claims Study** -- actual insurance claims data including loss distributions by company size and industry

Most CRQ tools either require users to source this data themselves (FAIR-U) or keep it locked behind enterprise contracts (RiskLens, Safe Security). By baking it in, CybRisk eliminates the highest-friction step in any risk quantification exercise: parameterization.

### 5.3 Privacy-by-Design Architecture

CybRisk is stateless. No accounts. No database. No data retention. Assessment inputs are sent to a serverless API, processed in memory, and returned. Nothing is stored.

This is a meaningful differentiator for the target audience. A vCISO assessing client risk exposure does not want that data sitting in a third-party SaaS database. An SMB executive wary of sharing financial details (revenue, record counts) with yet another vendor is more likely to use a tool that provably retains nothing.

### 5.4 Methodology Transparency

CybRisk shows its work. The results dashboard includes:
- Distributional output (histogram of simulated losses, loss exceedance curve)
- Input assumptions traced to named data sources
- FAIR taxonomy mapping visible in the methodology section

This matters because the output of a risk quantification tool is only useful if the audience trusts it. A board member who sees "estimated annual loss: $2.4M" will ask "where does that number come from?" CybRisk answers that question by design.

---

## 6. Competitive Risks and Honest Gaps

### 6.1 Where Competitors Are Genuinely Better

| Gap | Who does it better | Mitigation |
|-----|--------------------|------------|
| **Continuous monitoring** | Safe Security, SecurityScorecard | CybRisk is point-in-time by design; continuous monitoring is out of scope (Phase 3 API could enable periodic re-assessment) |
| **Deep scenario modeling** | RiskLens | CybRisk produces a single-scenario baseline; scenario comparison is Phase 2 |
| **Integration with security stack** | Safe Security, Balbix | CybRisk intentionally requires no integrations; this is a feature for the target user but a limitation for mature security programs |
| **Regulatory-grade audit trail** | RiskLens, Axio360 | CybRisk outputs are informational, not compliance artifacts; the kill list explicitly excludes "compliance tool" |
| **Real-time threat intelligence** | Safe Security, Recorded Future | Out of scope; CybRisk uses published annual data, not real-time feeds |
| **Calibrated historical data** | RiskLens (proprietary loss database) | CybRisk uses publicly available data sources; less granular but more transparent |

### 6.2 Competitive Threats

1. **RiskLens launches a free tier**. If RiskLens released a self-service version, their brand credibility and data depth would be formidable. However, enterprise vendors rarely cannibalize their own revenue with free tools. Their incentive structure points away from this move.

2. **FAIR Institute improves FAIR-U**. FAIR-U could add Monte Carlo simulation and built-in data. The FAIR Institute is a standards body, not a product company, so rapid product iteration is unlikely -- but not impossible.

3. **AI-native CRQ startup**. A well-funded startup could combine LLM-based questionnaire simplification with FAIR methodology and actuarial data. This is the most likely competitive threat in the 12-18 month timeframe. CybRisk's advantage is being first and free.

4. **Cyber insurance carriers build their own tools**. Carriers like Coalition already offer risk assessment as part of the policy lifecycle. If carriers build self-service CRQ tools for brokers and applicants, they would have distribution advantages CybRisk cannot match.

### 6.3 Defensibility Assessment

CybRisk's competitive moat is thin by design -- it is a free, open-source hackathon project. Long-term defensibility depends on:

- **Speed of iteration**: Shipping features (scenario comparison, PDF export, saved assessments) faster than incumbents can move downmarket
- **Community adoption**: If vCISOs and brokers start sharing CybRisk results, network effects create switching costs
- **Data quality**: Continuously updating actuarial tables as new IBM/DBIR/NetDiligence reports publish
- **Trust**: Albert Hui's 20+ years of cyber security advisory credibility lends practitioner legitimacy that a generic SaaS startup cannot replicate overnight

---

## 7. Market Opportunity

### 7.1 Addressable Market Segments

| Segment | Size Estimate | CybRisk Fit |
|---------|---------------|-------------|
| **vCISOs / Fractional CISOs** | ~15,000 practitioners in US (growing 30%+ YoY) | Primary -- CybRisk saves 2+ hours per client engagement |
| **SMB executives (< 500 employees)** | ~6 million businesses in US | Secondary -- most do not quantify cyber risk today; CybRisk is the easiest on-ramp |
| **Cyber insurance brokers** | ~3,000 agencies in US | High fit -- pre-qualification tool for client triage |
| **Cyber insurance carriers** | ~60 carriers writing cyber policies in US | Phase 3 -- API integration for underwriting workflows |
| **MSPs / MSSPs** | ~40,000 in US | Medium fit -- could use CybRisk as a client engagement tool |

### 7.2 Timing

The window is open now for three reasons:

1. **SEC rules are biting**: 2025-2026 is the first full cycle of 10-K filings under the new cyber disclosure rules. Demand for financial cyber risk language is spiking.

2. **vCISO market is underserved**: The fractional security model has grown faster than the tooling ecosystem. vCISOs are stitching together Excel, PowerPoint, and gut instinct. A purpose-built free tool has no competition.

3. **FAIR awareness is peaking**: The FAIR model has crossed from academic niche into practitioner awareness, but affordable tooling has not kept pace. CybRisk rides this awareness wave without the enterprise price tag.

---

## 8. Strategic Positioning Summary

### CybRisk Is

- A free, self-service cyber risk calculator
- FAIR-based Monte Carlo simulation with real actuarial data
- A 5-minute path to dollar-denominated risk exposure
- A decision-support tool for vCISOs, SMB executives, and insurance buyers
- Board-ready output with transparent methodology

### CybRisk Is Not

- A compliance tool or audit framework
- An enterprise security platform
- A replacement for professional risk assessment
- A real-time threat intelligence system
- A continuous monitoring solution

### The One-Sentence Positioning

**CybRisk is the only free, self-service tool that combines FAIR methodology, Monte Carlo simulation, and published actuarial data to translate cyber security posture into dollar-denominated financial exposure in under five minutes.**

No other product occupies this position. Enterprise tools are too slow and expensive. Free tools lack financial rigor. CybRisk sits alone in the high-speed, high-rigor quadrant -- and for the target audience of vCISOs and SMB executives, that quadrant is the only one that matters.
