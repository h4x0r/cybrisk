# CybRisk — Product Specification

## 1. Problem Statement

Existing cyber risk assessment tools output compliance checklists. Boards and executives don't read compliance checklists — they read financial exposure reports. There is no self-service SaaS that translates a company's security posture into a **dollar figure** of probable financial loss.

CybRisk fills this gap: a 5-minute questionnaire that outputs a Monte Carlo-simulated financial exposure estimate with confidence intervals, loss exceedance curves, and a board-ready executive summary.

## 2. Target Users

- **SMB executives / founders** who need to understand cyber risk in financial terms
- **vCISOs / fractional security advisors** who need a quick client-facing risk quantification tool
- **Cyber insurance buyers** who want to understand their exposure before shopping for coverage
- **Board members / audit committees** who need a one-page risk summary

## 3. User Flow

```
Landing Page → "Assess Your Risk" CTA → Wizard (5-6 steps) → Calculate → Results Dashboard
```

### Step 1: Company Profile
- Industry vertical (dropdown: 17 industries from IBM report)
- Annual revenue band (dropdown: <$50M, $50-250M, $250M-1B, $1B-5B, $5B+)
- Number of employees (dropdown: <250, 250-1000, 1000-5000, 5000-25000, 25000+)
- Primary geography (dropdown: US, UK, EU, APAC-HK, APAC-SG, Other)

### Step 2: Data Profile
- Types of data held (multi-select): Customer PII, Employee PII, Payment Card (PCI), Health Records (PHI), Intellectual Property, Financial Records
- Approximate records held (slider/input): 1K → 100M+
- Cloud vs on-premise ratio (slider): 0-100%

### Step 3: Security Controls
- Do you have a dedicated security team or CISO? (Y/N)
- Do you have an incident response plan? (Y/N)
- Do you use security AI/automation tools? (Y/N)
- Do you have MFA on all critical systems? (Y/N)
- Do you perform regular penetration testing? (Y/N)
- Do you have cyber insurance? (Y/N)

### Step 4: Threat Landscape (optional advanced)
- Primary concern (select top 3): Ransomware, BEC/Phishing, Insider Threat, Third-Party/Supply Chain, Web Application Attack, System Intrusion, Lost/Stolen Assets
- Previous incidents in last 3 years? (0, 1, 2-5, 5+)

### Step 5: Review & Calculate
- Summary of inputs
- "Calculate My Risk" button → API call → results

## 4. Calculation Engine

### 4.1 FAIR Monte Carlo Simulation

Implements the Open FAIR (Factor Analysis of Information Risk) model:

```
Risk = Loss Event Frequency (LEF) × Loss Magnitude (LM)

Where:
  LEF = Threat Event Frequency (TEF) × Vulnerability (Vuln)
  LM  = Primary Loss (PL) + Secondary Loss (SL)
```

**Simulation**: 10,000 Monte Carlo iterations using PERT distributions for each input variable. Output: distribution of annual loss with percentile confidence intervals.

### 4.2 Input Variable Distributions

Each variable is modeled as a PERT distribution (min, most likely, max):

**Threat Event Frequency (TEF)** — based on industry and company size:
- Calibrated from Verizon DBIR 2025 incident rates by industry
- Adjusted by employee count (attack surface proxy)

**Vulnerability (Vuln)** — probability that a threat event becomes a loss event:
- Base rate from DBIR (% of incidents → confirmed breaches)
- Modified by security controls questionnaire:
  - IR plan: -23% (IBM 2025: saves $1.49M avg → ~23% reduction)
  - AI/automation: -30% (IBM 2025: saves $1.88M → ~30% reduction)
  - MFA: -15% (estimated from BEC prevention data)
  - Pentest: -10%
  - Security team/CISO: -20%
  - Cyber insurance: no vulnerability reduction but caps secondary loss

**Primary Loss (PL)** — direct costs:
- Per-record cost × records compromised (sampled from distribution)
- Per-record costs by data type (from IBM 2025):
  - Customer PII: $175/record
  - Employee PII: $189/record
  - IP: $178/record
  - Payment card: $172/record
  - PHI: not in 2025 report but historically ~$200+/record
  - Financial: ~$180/record (estimated)
- Capped by: min(10% of annual revenue, actual loss) for plausibility

**Secondary Loss (SL)** — indirect/consequential:
- Regulatory fines: based on geography (GDPR up to 4% revenue, PDPO HK max HK$1M, etc.)
- Litigation: estimated at 15-30% of primary loss (from NetDiligence claims)
- Reputation/business loss: estimated at 20-40% of primary loss
- Notification costs: $2-5 per record

### 4.3 Output Metrics

| Metric | Formula/Source |
|--------|---------------|
| **ALE (Annual Loss Expectancy)** | Mean of Monte Carlo distribution |
| **ALE 10th percentile** | Optimistic scenario |
| **ALE 50th percentile (median)** | Most likely scenario |
| **ALE 90th percentile** | Pessimistic scenario |
| **PML (Probable Maximum Loss)** | 95th percentile (Value at Risk) |
| **Gordon-Loeb Recommended Spend** | min(ALE × 0.37, revenue × 0.05) |
| **Loss Exceedance Curve** | P(Loss > X) for X from $0 to PML |
| **Industry Benchmark** | Compare ALE to industry median from NetDiligence/IBM |

### 4.4 Gordon-Loeb Model

```
Optimal security investment ≤ (1/e) × v × L ≈ 0.37 × v × L

Where:
  v = vulnerability probability (from controls assessment)
  L = potential loss (ALE from Monte Carlo)
```

Output: "Based on your risk profile, optimal security spend is $X — investing more yields diminishing returns."

## 5. Hardcoded Data Sources (Lookup Tables)

### 5.1 IBM Cost of a Data Breach 2025

Source: https://www.ibm.com/reports/data-breach

```typescript
// Cost per record by data type
const PER_RECORD_COST = {
  customer_pii: 175,
  employee_pii: 189,
  ip: 178,
  payment_card: 172,
  health_records: 200,
  financial: 180,
};

// Average total cost by industry (USD millions)
const INDUSTRY_AVG_COST = {
  healthcare: 10.93,
  financial: 6.08,
  pharmaceuticals: 5.10,
  technology: 5.45,
  energy: 4.56,
  industrial: 5.56,
  services: 4.55,
  retail: 3.48,
  education: 3.50,
  entertainment: 3.46,
  communications: 3.44,
  consumer: 3.40,
  media: 3.39,
  research: 3.28,
  transportation: 4.30,
  hospitality: 3.22,
  public_sector: 2.60,
};

// Cost amplifiers/reducers
const COST_MODIFIERS = {
  ir_plan: -0.23,         // saves ~$1.49M → ~23%
  ai_automation: -0.30,   // saves ~$1.88M → ~30%
  security_team: -0.20,   // dedicated team reduces cost ~20%
  mfa: -0.15,            // estimated BEC prevention
  pentest: -0.10,        // regular testing
  shadow_ai: +0.15,      // adds ~$670K
  multi_cloud: +0.10,    // adds complexity
  no_ir_plan: +0.25,     // increases cost ~25%
};
```

### 5.2 Verizon DBIR 2025

Source: https://www.verizon.com/business/resources/reports/dbir/

```typescript
// Breach frequency by attack pattern (% of confirmed breaches)
const ATTACK_PATTERN_FREQ = {
  ransomware: 0.39,
  bec_phishing: 0.25,
  web_app_attack: 0.15,
  system_intrusion: 0.30,
  insider_threat: 0.10,
  third_party: 0.30,
  lost_stolen: 0.05,
};

// SMB-specific: ransomware in 88% of malware incidents
const SMB_RANSOMWARE_RATE = 0.88;

// Vulnerability exploitation as initial vector: 20%
const VULN_EXPLOITATION_RATE = 0.20;
```

### 5.3 NetDiligence Cyber Claims Study 2025

Source: https://netdiligence.com/cyber-claims-study-2025-report/

```typescript
// Average incident cost by revenue band (USD)
const INCIDENT_COST_BY_REVENUE = {
  under_50m: 246_000,      // SME 5-year average
  '50m_250m': 850_000,     // mid-market estimate
  '250m_1b': 2_500_000,    // mid-large estimate
  '1b_5b': 5_000_000,      // large company
  over_5b: 10_300_000,     // large company 5-year average
};

// Claim severity distribution (for PERT parameterization)
const CLAIM_SEVERITY = {
  min: 1_000,
  mode: 246_000,
  max: 500_000_000,
  p95: 20_180_000,         // from actuarial research
};
```

### 5.4 Regulatory Fine Exposure by Geography

```typescript
const REGULATORY_EXPOSURE = {
  eu: { max_pct_revenue: 0.04, framework: 'GDPR' },           // 4% global turnover
  uk: { max_pct_revenue: 0.04, framework: 'UK GDPR' },        // £17.5M or 4%
  us: { varies: true, framework: 'State breach notification' }, // per-state, SEC for public
  hk: { max_fine_hkd: 1_000_000, framework: 'PDPO' },         // HK$1M max
  sg: { max_fine_sgd: 1_000_000, framework: 'PDPA' },         // SGD$1M max (10% revenue proposal)
};
```

### 5.5 Loss Distribution Parameters (from Actuarial Research)

Source: arXiv:2202.10189, NAAJ extreme breach losses paper

```typescript
// Severity: log-normal distribution
const SEVERITY_DISTRIBUTION = {
  type: 'lognormal',
  mu: 11.6,     // ln($246K) ≈ 12.4, but using median calibration
  sigma: 2.5,   // heavy-tailed
};

// Frequency: negative binomial
const FREQUENCY_DISTRIBUTION = {
  type: 'negative_binomial',
  // Parameters vary by industry and company size
  // Base: ~0.3 incidents/year for mid-size company
};
```

## 6. UI Design

### 6.1 Landing Page
- Dark theme (cyber/fintech aesthetic)
- Hero: "Know Your Cyber Risk in Dollars, Not Checkboxes"
- Sub: "Monte Carlo-simulated financial exposure estimates powered by real insurance claims data"
- CTA: "Assess Your Risk — Free" button
- Trust signals: "Powered by FAIR methodology • IBM/Verizon/NetDiligence data • 10,000 simulations"
- 3 feature cards: Financial Exposure, Board-Ready Reports, Industry Benchmarks
- How it works: 3 steps (Answer → Simulate → Report)

### 6.2 Assessment Wizard
- Multi-step form with progress indicator
- Clean, professional — not gamified
- Each step on its own card with clear labels
- "Back" and "Next" navigation
- Final step shows summary before calculation

### 6.3 Results Dashboard
- Header: Company name + industry + date
- Top row: 4 KPI cards (ALE median, PML 95th, Recommended Spend, Risk Rating)
- Left column: Loss distribution histogram (Recharts)
- Right column: Loss exceedance curve
- Bottom: Industry comparison bar chart
- Export: "Download Board Summary" button (generates PDF or markdown)
- CTA: "Get a detailed assessment from Security Ronin" (optional lead gen)

### 6.4 Color Palette
- Background: slate-950 (#020617)
- Cards: slate-900 with subtle border
- Accent: cyan-500 (#06b6d4) for primary actions
- Warning: amber-500 for risk indicators
- Danger: red-500 for high-risk
- Success: emerald-500 for good posture
- Text: slate-50 primary, slate-400 secondary

## 7. Monte Carlo Implementation (TypeScript)

Since this deploys on Vercel (no Python), implement the Monte Carlo engine in TypeScript:

```typescript
// PERT distribution sampling
function samplePERT(min: number, mode: number, max: number): number {
  const alpha = 1 + 4 * (mode - min) / (max - min);
  const beta = 1 + 4 * (max - mode) / (max - min);
  return min + betaSample(alpha, beta) * (max - min);
}

// Log-normal sampling for severity
function sampleLogNormal(mu: number, sigma: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.exp(mu + sigma * z);
}

// Main simulation
function simulate(inputs: AssessmentInputs, iterations: number = 10000): SimulationResults {
  const losses: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const tef = sampleTEF(inputs);
    const vuln = sampleVulnerability(inputs);
    const lef = tef * vuln;
    const pl = samplePrimaryLoss(inputs);
    const sl = sampleSecondaryLoss(inputs, pl);
    const annualLoss = lef * (pl + sl);
    losses.push(annualLoss);
  }
  losses.sort((a, b) => a - b);
  return {
    mean: mean(losses),
    median: percentile(losses, 50),
    p10: percentile(losses, 10),
    p90: percentile(losses, 90),
    p95: percentile(losses, 95),
    distribution: losses,
    gordonLoebSpend: gordonLoeb(inputs, mean(losses)),
  };
}
```

## 8. API Design

### POST /api/calculate

**Request body:**
```json
{
  "company": {
    "industry": "financial",
    "revenue_band": "50m_250m",
    "employees": "250_1000",
    "geography": "hk"
  },
  "data": {
    "types": ["customer_pii", "payment_card"],
    "record_count": 500000,
    "cloud_percentage": 70
  },
  "controls": {
    "security_team": true,
    "ir_plan": true,
    "ai_automation": false,
    "mfa": true,
    "pentest": true,
    "cyber_insurance": false
  },
  "threats": {
    "top_concerns": ["ransomware", "bec_phishing", "third_party"],
    "previous_incidents": 0
  }
}
```

**Response body:**
```json
{
  "ale": {
    "mean": 1_250_000,
    "median": 890_000,
    "p10": 120_000,
    "p90": 3_400_000,
    "p95": 5_200_000
  },
  "gordon_loeb_spend": 462_500,
  "risk_rating": "MODERATE",
  "industry_benchmark": {
    "your_ale": 1_250_000,
    "industry_median": 2_100_000,
    "percentile_rank": 38
  },
  "distribution_buckets": [
    { "range": "$0-100K", "probability": 0.15 },
    { "range": "$100K-500K", "probability": 0.30 },
    { "range": "$500K-1M", "probability": 0.25 }
  ],
  "exceedance_curve": [
    { "loss": 0, "probability": 1.0 },
    { "loss": 500000, "probability": 0.55 },
    { "loss": 1000000, "probability": 0.35 }
  ],
  "key_drivers": [
    { "factor": "500K customer PII records", "impact": "high" },
    { "factor": "No AI/automation", "impact": "medium" },
    { "factor": "No cyber insurance", "impact": "medium" }
  ],
  "recommendations": [
    "Implement AI/automation tools — could reduce expected loss by ~30% ($375K/year)",
    "Obtain cyber insurance — caps catastrophic secondary losses",
    "Gordon-Loeb optimal spend: invest up to $462K in security controls"
  ]
}
```

## 9. Stretch Goals (if time permits)

1. **AI-generated board summary** — use Claude/OpenAI API to generate a 1-page executive summary from the results
2. **PDF export** — generate a downloadable PDF report
3. **Comparison mode** — "What if we added these controls?" before/after comparison
4. **Real-time VCDB integration** — pull recent incidents from VERIS database
5. **Supabase auth** — save assessments, track history over time

## 10. Data Source References

- IBM Cost of a Data Breach 2025: https://www.ibm.com/reports/data-breach
- Verizon DBIR 2025: https://www.verizon.com/business/resources/reports/dbir/
- NetDiligence Cyber Claims Study 2025: https://netdiligence.com/cyber-claims-study-2025-report/
- VERIS Community Database: https://github.com/vz-risk/VCDB
- pyfair (reference implementation): https://pypi.org/project/pyfair/
- FAIR Institute: https://www.fairinstitute.org/what-is-fair
- Gordon-Loeb Model: https://en.wikipedia.org/wiki/Gordon%E2%80%93Loeb_model
- Actuarial cyber loss distributions: https://arxiv.org/pdf/2202.10189
- Extreme breach losses (NAAJ): https://www.tandfonline.com/doi/full/10.1080/10920277.2021.1919145
- HHS OCR Breach Portal: https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf
- ICO Enforcement: https://ico.org.uk/action-weve-taken/enforcement/
- GDPR Enforcement Tracker: https://www.enforcementtracker.com/
- HKCERT Statistics: https://www.hkcert.org/statistic
- HK Police Cybercrime 2024: https://www.police.gov.hk/ppp_en/04_crime_matters/tcd/cybersecurityreport2024.html
- CSA Singapore Cyber Landscape 2024/2025: https://www.csa.gov.sg/resources/publications/singapore-cyber-landscape-2024-2025/
- Advisen methodology (reference): https://www.advisenltd.com/wp-content/uploads/2017/01/cyber-risk-data-methodology.pdf
