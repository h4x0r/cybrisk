# CybRisk: User Journey Maps

> **Created**: 2026-02-22
> **Status**: Active
> **Builder**: Albert Hui -- Chief Forensicator, Security Ronin

User journey maps for CybRisk, defining how each persona moves from first impression to completed risk assessment. CybRisk is stateless and requires no authentication -- every user is a first-time user from the system's perspective.

---

## Stateless Design Principle

CybRisk has no user accounts, no login, no saved state between sessions. This is a deliberate architectural decision, not a missing feature. Every journey begins at the landing page and ends at the results dashboard. There is no "returning user with saved state" flow -- returning users simply start a new assessment.

This changes the journey model fundamentally:

| Traditional SaaS | CybRisk |
|-------------------|---------|
| Signup -> Onboard -> Use -> Retain | Land -> Assess -> Calculate -> Result |
| Returning user resumes where they left off | Returning user starts fresh |
| Value accrues over time (data lock-in) | Value delivered in a single session |
| Conversion = signup | Conversion = completed assessment |
| Churn = stopped logging in | Churn = never finished the wizard |

The entire user journey is a single session. Every second counts.

---

## Journey Overview

### End-to-End Flow

```
+----------+    +----------+    +----------+    +----------+    +----------+
|          |    |  WIZARD   |    |  WIZARD   |    |          |    |          |
| LANDING  |--->|  STEPS    |--->|  REVIEW   |--->| COMPUTE  |--->| RESULTS  |
|  PAGE    |    |  1-4      |    |  STEP 5   |    | (API)    |    | DASHBOARD|
|          |    |           |    |           |    |          |    |          |
+----------+    +----------+    +----------+    +----------+    +----------+
   ~30s           ~3 min           ~30s           ~3s             open-ended

                        Total: < 5 minutes to value
```

### Emotional Arc

```
Trust       |                                                    ****
            |                                              ****
            |                                         ***
Confidence  |                                    ***
            |                               ***
            |                          **
Engagement  |                     ***
            |                **
            |           **
Curiosity   |       **
            |   **
            | *
Skepticism  |*
            +----+-----+-----+-----+-----+-----+-----+-----+----->
              Landing  Step1  Step2  Step3  Step4  Step5  Calc  Results
                                                                 Time
```

**Key emotional transitions**:
- **Skepticism -> Curiosity** (Landing): "A free cyber risk calculator? Let me see what it does."
- **Curiosity -> Engagement** (Steps 1-2): "These questions are relevant and I can answer them quickly."
- **Engagement -> Confidence** (Steps 3-4): "The tool knows what it is asking about. Smart defaults help."
- **Confidence -> Trust** (Step 5 -> Results): "The methodology is transparent, the numbers cite real sources."

---

## Phase 1: Landing Page

### Journey Map

```
+------------------------------------------------------------------+
|  LANDING PAGE                                                     |
|                                                                   |
|  [User arrives]                                                   |
|       |                                                           |
|       v                                                           |
|  +------------------+                                             |
|  | Hero Section     |  "Know your cyber risk in dollars,          |
|  | Value prop +     |   not checkboxes."                          |
|  | CTA button       |                                             |
|  +--------+---------+                                             |
|           |                                                       |
|           v                                                       |
|  +------------------+     +------------------+                    |
|  | Scan trust       |---->| "How It Works"   |                    |
|  | signals          |     | 3-step diagram   |                    |
|  | (credentials,    |     | (Input -> Monte  |                    |
|  |  methodology)    |     |  Carlo -> Report)|                    |
|  +------------------+     +--------+---------+                    |
|                                    |                              |
|                                    v                              |
|                           +------------------+                    |
|                           | Feature cards    |                    |
|                           | (FAIR model,     |                    |
|                           |  Gordon-Loeb,    |                    |
|                           |  10K sims)       |                    |
|                           +--------+---------+                    |
|                                    |                              |
|                                    v                              |
|                           +------------------+                    |
|                           | CTA: "Assess     |                    |
|                           |  Your Risk"      |-----> /assess      |
|                           +------------------+                    |
+------------------------------------------------------------------+
```

### What the User Sees

| Element | Purpose | Copy Tone |
|---------|---------|-----------|
| **Hero headline** | State the value prop in one line | "Know your cyber risk in dollars, not checkboxes." |
| **Sub-headline** | Explain the mechanism | "Monte Carlo simulation with real actuarial data. No signup. No sales pitch. Results in 5 minutes." |
| **CTA button** | Convert to wizard start | "Assess Your Risk" (cyan-400, high contrast) |
| **How It Works** | Reduce anxiety about process | 3 numbered steps: "1. Describe your business. 2. We run 10,000 simulations. 3. See your exposure in dollars." |
| **Feature cards** | Build credibility with specifics | FAIR methodology, IBM/DBIR data, Gordon-Loeb optimal spend, 10K Monte Carlo iterations |
| **Builder credentials** | Authority signal | "Built by Albert Hui -- 20+ years in DFIR, IR, and risk advisory" |
| **Trust signals** | Overcome skepticism | "No account required. No data stored. Open methodology." |

### Persona Reactions

**Sarah Chen (vCISO)**: Scans quickly. Recognizes FAIR methodology, Gordon-Loeb, DBIR. Thinks: "This person knows the domain." Clicks CTA within 15 seconds. She does not need convincing -- she needs confirmation that the tool is technically serious.

**James Okonkwo (CFO)**: Reads more carefully. Pauses at "Monte Carlo simulation" (unfamiliar term) but reassured by "Results in 5 minutes" and "No signup." The "dollars, not checkboxes" headline resonates -- he has been drowning in compliance checklists. Clicks CTA after 30-45 seconds. He needs the plain-English explanation.

**Rachel Torres (Insurance Broker)**: Focuses on speed. "5 minutes" and "No signup" are the hooks. She imagines sending this link to her clients. "Run this before our meeting" would save her hours. Clicks CTA within 20 seconds.

### Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| **Landing-to-Wizard Rate** | % of landing visitors who navigate to /assess | 30% |
| **Time on Landing** | Median seconds before CTA click | 15-45s |
| **Bounce Rate** | % who leave without clicking CTA | < 70% |

### Failure Modes

| Failure | Signal | Recovery |
|---------|--------|----------|
| User does not understand the value prop | Bounce rate > 80% | Rewrite hero copy; test alternatives |
| User skeptical of "free" | Low CTA click-through despite engagement | Add "Why is this free?" section explaining hackathon context |
| Page loads slowly | Time to First Contentful Paint > 2s | Landing is a Server Component -- investigate bundle size |

---

## Phase 2: Assessment Wizard (Steps 1-4)

### Wizard State Machine

```
+--------+    +--------+    +--------+    +--------+    +--------+
|        |    |        |    |        |    |        |    |        |
| Step 1 |--->| Step 2 |--->| Step 3 |--->| Step 4 |--->| Step 5 |
| Company|<---| Data   |<---| Controls|<---| Threats|<---| Review |
| Profile|    | Profile|    |        |    |        |    |        |
+--------+    +--------+    +--------+    +--------+    +--------+
   [1/5]        [2/5]        [3/5]        [4/5]        [5/5]

   Back navigation preserves all state (useState)
   Forward navigation requires step-level Zod validation
   Progress bar shows completion percentage
```

### Step 1: Company Profile

**Purpose**: Establish the organizational context that drives all downstream calculations.

**Duration**: ~30 seconds

**Fields**:

| Field | Type | Required | Source |
|-------|------|----------|--------|
| Industry sector | Dropdown (12 options) | Yes | IBM Cost of a Data Breach industry categories |
| Annual revenue (USD) | Numeric input with ranges | Yes | Used for Gordon-Loeb cap and company size proxy |
| Employee count | Range selector (bands) | Yes | DBIR company size factor for TEF |

**Emotional State**: Oriented. User is committing to the process. These are easy questions -- every user knows their industry, revenue, and headcount. Low cognitive load builds momentum.

**Design Notes**:
- Dropdown options use plain English industry names, not NAICS codes
- Revenue input uses range bands ($1M-$5M, $5M-$25M, etc.) not exact figures -- reduces anxiety about sharing precise financials
- Employee count uses similar bands (1-50, 51-250, 251-1000, 1000+)
- Progress bar at top shows "Step 1 of 5"

**Persona Variations**:

| Persona | Behavior | Accommodation |
|---------|----------|---------------|
| **Sarah** | Fills for her client. Knows exact industry, rough revenue. Fast. | No special accommodation needed. |
| **James** | Knows everything. His own company. Fastest step. | Revenue ranges reduce precision anxiety. |
| **Rachel** | Fills for a client she is quoting. May approximate. | Ranges are forgiving for approximation. |

### Step 2: Data Profile

**Purpose**: Determine the data types and volume at risk, which drive primary loss magnitude.

**Duration**: ~45 seconds

**Fields**:

| Field | Type | Required | Source |
|-------|------|----------|--------|
| Data types handled | Multi-select checkboxes | Yes | IBM per-record cost categories (PII, PHI, PCI, IP, financial) |
| Approximate record count | Range selector (bands) | Yes | Primary loss magnitude driver |
| Data sensitivity level | Radio (Low/Medium/High/Critical) | Yes | Loss magnitude modifier |

**Emotional State**: Engaged. User is thinking about their actual data exposure. For non-technical users (James), this is the first step that requires thought rather than recall.

**Design Notes**:
- Data types use plain language: "Customer personal information (names, emails, addresses)" not "PII"
- Record count uses powers of ten: <1K, 1K-10K, 10K-100K, 100K-1M, 1M+
- Tooltips explain why each question matters: "Per-record costs vary by data type -- healthcare records cost 3x more than retail records to remediate"
- Data sensitivity includes a one-line example per level

**Persona Variations**:

| Persona | Behavior | Accommodation |
|---------|----------|---------------|
| **Sarah** | Asks client beforehand or estimates from industry norms. May not have exact record counts. | Range bands accommodate estimation. |
| **James** | Knows data types (payment cards, customer PII). May not know record counts exactly. | Range bands. Tooltip: "Check with your engineering team or estimate." |
| **Rachel** | Has client-reported data from insurance application. Most accurate inputs. | Checkbox options align with insurance questionnaire categories. |

### Step 3: Security Controls

**Purpose**: Assess the organization's defensive posture to modify vulnerability probability.

**Duration**: ~60 seconds

**Fields**:

| Field | Type | Required | Source |
|-------|------|----------|--------|
| Multi-factor authentication (MFA) | Yes/No toggle | Yes | DBIR: 80%+ of breaches involve credential compromise |
| Endpoint detection and response (EDR) | Yes/No toggle | Yes | IBM: EDR reduces breach cost by ~$180K |
| Security awareness training | Yes/No toggle | Yes | DBIR: human element in 68% of breaches |
| Incident response plan (documented) | Yes/No toggle | Yes | IBM: IR plan + testing reduces cost by $232K |
| Regular vulnerability scanning | Yes/No toggle | Yes | DBIR: exploitation of vulnerabilities rising |
| Data encryption (at rest and in transit) | Yes/No toggle | Yes | IBM: encryption reduces breach cost by ~$140K |
| Backup and recovery tested | Yes/No toggle | Yes | Ransomware readiness indicator |
| Network segmentation | Yes/No toggle | Yes | Lateral movement containment |

**Emotional State**: Evaluating. This step forces honest self-assessment. Users may feel exposed if they answer "No" to many controls. The UI must be non-judgmental -- no red X marks, no "you're at risk" warnings at this stage. Just toggles.

**Design Notes**:
- Yes/No toggles, not sliders or maturity scales. Binary inputs reduce cognitive load and are more honest than "partially implemented"
- Each control has a one-line explanation in plain English
- No scoring or grading shown during input. The user should not feel punished for answering honestly
- Default state: all toggles off (conservative assumption). User opts in to controls they actually have
- Controls are ordered by impact (MFA first -- highest single impact on breach probability)

**Persona Variations**:

| Persona | Behavior | Accommodation |
|---------|----------|---------------|
| **Sarah** | Knows the answers. Fastest step for her. May mentally note gaps for advisory recommendations. | No accommodation needed -- she is the expert. |
| **James** | Uncertain about some controls. "Do we have EDR? I think IT set something up." Likely to Slack his fractional advisor. | Tooltip: "Not sure? Check with your IT team or security advisor. When in doubt, select No for a conservative estimate." |
| **Rachel** | Cross-references with insurance application responses. High accuracy. | Control names align with common insurance questionnaire terminology. |

### Step 4: Threat Landscape

**Purpose**: Identify the most relevant threat scenarios to weight in the Monte Carlo simulation.

**Duration**: ~45 seconds

**Fields**:

| Field | Type | Required | Source |
|-------|------|----------|--------|
| Top threats | Pre-selected checkboxes (industry-smart defaults) | Yes | DBIR top attack patterns by industry |
| Regulatory environment | Multi-select (GDPR, CCPA, HIPAA, PCI DSS, SOX, None) | Yes | Secondary loss magnitude (regulatory fines) |
| Prior incident history | Radio (None / 1-2 minor / Major incident) | No | Loss frequency calibration |

**Emotional State**: Thoughtful. This step asks users to think about what could go wrong. Smart defaults (pre-selected threats based on industry from Step 1) reduce anxiety by showing that CybRisk already knows the baseline. Users adjust rather than build from scratch.

**Design Notes**:
- Threats are pre-selected based on industry choice in Step 1. Healthcare sees ransomware and insider threat. Finance sees web application attacks and privilege misuse. Retail sees POS intrusion and web app attacks
- Users can add or remove threats from the pre-selected list
- Regulatory checkboxes include a note: "Select all that apply to your organization. This affects estimated regulatory exposure."
- Prior incident history is optional. Default is "None" -- the model works without it
- This step uses the most smart defaults of any step, minimizing user effort

**Persona Variations**:

| Persona | Behavior | Accommodation |
|---------|----------|---------------|
| **Sarah** | Reviews smart defaults, adjusts based on client-specific threat intel. Appreciates the DBIR-based defaults. | Allow adding custom threat weighting (stretch goal). |
| **James** | Accepts smart defaults. Does not have strong opinions on threat landscape. Relieved that defaults exist. | Smart defaults are essential for this persona. Without them, James would not know what to select. |
| **Rachel** | Reviews through insurance lens. Interested in whether ransomware is selected (top insurance claim). | Ransomware should always be in the default set regardless of industry. |

---

## Phase 3: Review and Calculate (Step 5)

### Journey Map

```
+------------------------------------------------------------------+
|  STEP 5: REVIEW & CALCULATE                                      |
|                                                                   |
|  +------------------+                                             |
|  | Input Summary    |  All answers from Steps 1-4                 |
|  | (editable links) |  displayed in a compact summary             |
|  +--------+---------+                                             |
|           |                                                       |
|           v                                                       |
|  +------------------+     +------------------+                    |
|  | "Edit" links     |---->| Back to Step N   |                    |
|  | per section      |     | (preserves all   |                    |
|  |                  |     |  other state)    |                    |
|  +------------------+     +------------------+                    |
|           |                                                       |
|           v                                                       |
|  +-------------------------------+                                |
|  |                               |                                |
|  |  [  Calculate My Risk  ]      |  <- Primary CTA               |
|  |                               |                                |
|  |  "Runs 10,000 Monte Carlo     |                                |
|  |   simulations using the       |                                |
|  |   FAIR model"                 |                                |
|  +-------------------------------+                                |
+------------------------------------------------------------------+
```

**Purpose**: Let the user verify their inputs before triggering the calculation. This is the commitment point.

**Duration**: ~30 seconds (scan and click)

**Emotional State**: Committed. The user has invested 3-4 minutes. The summary confirms their inputs are correct. The CTA button is the moment of truth.

**Design Notes**:
- Summary is a compact card layout, one card per wizard step
- Each card has an "Edit" link that navigates back to that specific step (preserving all other state)
- The "Calculate My Risk" button is large, cyan-400, and uses the brand's primary color
- Below the button: "Runs 10,000 Monte Carlo simulations using the FAIR model. Your data is not stored."
- The privacy reassurance ("Your data is not stored") appears at the commitment point where anxiety peaks

**Persona Reactions at the Commitment Point**:

| Persona | Thought | Design Response |
|---------|---------|-----------------|
| **Sarah** | "Looks right. Let me run it." | Fast path: button is immediately visible without scrolling. |
| **James** | "Did I answer the controls section correctly? Maybe I should double-check..." | Edit links per section let him revisit without losing progress. |
| **Rachel** | "I will run this and then run it again with different controls to see the delta." | After results, a "Run Another Assessment" button supports this workflow. |

---

## Phase 4: Calculation Processing

### Journey Map

```
+------------------------------------------------------------------+
|  PROCESSING STATE                                                 |
|                                                                   |
|  +-------------------------------+                                |
|  |                               |                                |
|  |  Running 10,000 simulations   |                                |
|  |                               |                                |
|  |  [=====>                    ] |  <- Animated progress bar      |
|  |                               |                                |
|  |  "Sampling threat frequency   |  <- Rotating status messages   |
|  |   from DBIR data..."         |                                |
|  |                               |                                |
|  +-------------------------------+                                |
|                                                                   |
|  Duration: 1-3 seconds (API round-trip)                           |
|  If > 5 seconds: show "Taking longer than expected..."            |
|  If > 10 seconds: show retry option                               |
+------------------------------------------------------------------+
```

**Purpose**: Bridge the gap between submitting inputs and seeing results. Manage expectations and maintain engagement during the API call.

**Duration**: 1-3 seconds (typical), up to 5 seconds (cold start)

**Emotional State**: Anxious anticipation. The user has committed their inputs and is waiting for the payoff. This is the highest-anxiety moment in the journey. The animated visualization and rotating messages keep the user engaged and build anticipation.

**Rotating Status Messages** (cycle every 800ms):
1. "Sampling threat frequency from DBIR data..."
2. "Modeling breach probability across 10,000 scenarios..."
3. "Calculating per-record costs from IBM data..."
4. "Estimating regulatory and litigation exposure..."
5. "Computing loss distribution and percentiles..."
6. "Determining optimal security spend via Gordon-Loeb..."

**Design Notes**:
- Progress bar is animated but not percentage-accurate (the real bottleneck is network latency, not computation). This is acknowledged in the North Star open questions and accepted as a UX pattern, not a precision claim
- Status messages use real methodology terms (DBIR, IBM, Gordon-Loeb) to reinforce credibility during the wait
- If the API call takes > 5 seconds, the message changes to: "This is taking a bit longer than usual. Large simulations occasionally need extra time."
- If the API call takes > 10 seconds, a "Retry" button appears alongside: "The calculation timed out. This usually resolves on retry."
- On success, auto-navigate to /results with a brief 300ms transition

### Error States

```
Normal Path:
  Submit -> [1-3s processing] -> Results Dashboard

Slow Path:
  Submit -> [1-3s processing] -> [5s still waiting] ->
    "Taking longer than usual..." -> [continues waiting] -> Results

Timeout Path:
  Submit -> [1-3s processing] -> [5s warning] -> [10s timeout] ->
    "Calculation timed out. [Retry]" -> User clicks Retry ->
    [1-3s processing] -> Results

API Error Path:
  Submit -> [processing] -> API returns 4xx/5xx ->
    "Something went wrong. [Retry] [Edit Inputs]" ->
    User retries or edits inputs

Validation Error Path (should not happen -- caught at Step 5):
  Submit -> API returns 400 with field errors ->
    Navigate back to relevant wizard step with error highlighted
```

---

## Phase 5: Results Dashboard

### Journey Map

```
+------------------------------------------------------------------+
|  RESULTS DASHBOARD                                                |
|                                                                   |
|  +-------------------------------+                                |
|  | HEADLINE                      |                                |
|  | "Your Estimated Annual        |                                |
|  |  Exposure: $1.2M"            |                                |
|  | (90% between $120K - $3.4M)   |                                |
|  +-------------------------------+                                |
|                                                                   |
|  +-------+  +-------+  +-------+  +-------+                      |
|  | ALE   |  | PML   |  | Spend |  | Risk  |                      |
|  |Median |  | 95th  |  |Optimal|  |Rating |                      |
|  |$890K  |  |$3.4M  |  |$310K  |  | HIGH  |                      |
|  +-------+  +-------+  +-------+  +-------+                      |
|                                                                   |
|  +-------------------------------+                                |
|  | LOSS DISTRIBUTION             |                                |
|  | (Histogram - Recharts)        |                                |
|  | [====  ========= === == = ]   |                                |
|  +-------------------------------+                                |
|                                                                   |
|  +-------------------------------+                                |
|  | LOSS EXCEEDANCE CURVE         |                                |
|  | (Line Chart - Recharts)       |                                |
|  | [curve descending L to R]     |                                |
|  +-------------------------------+                                |
|                                                                   |
|  +-------------------------------+                                |
|  | KEY DRIVERS & RECOMMENDATIONS |                                |
|  +-------------------------------+                                |
|                                                                   |
|  +-------------------------------+                                |
|  | METHODOLOGY & SOURCES         |                                |
|  +-------------------------------+                                |
|                                                                   |
|  [Run Another Assessment]  [Share Results (Phase 2)]              |
+------------------------------------------------------------------+
```

### Information Hierarchy

The results page uses progressive disclosure. Users absorb information top-to-bottom in order of decreasing urgency.

| Layer | Content | User Action | Time |
|-------|---------|-------------|------|
| **1. Headline** | ALE with 90% confidence interval | Read the number. "Is this a lot?" | 2 seconds |
| **2. KPI Cards** | Median ALE, PML 95th, Optimal Spend, Risk Rating | Compare cards. "What is my worst case? How much should I spend?" | 10 seconds |
| **3. Distribution** | Histogram showing loss distribution | Understand the shape. "Most scenarios are below $1M but tail risk extends to $3M+" | 15 seconds |
| **4. Exceedance Curve** | Probability of exceeding each loss level | Answer specific questions. "What is the chance of a $2M+ loss?" | 15 seconds |
| **5. Drivers** | Top contributors to the risk estimate | Understand what matters. "PCI data and lack of MFA are the biggest factors." | 30 seconds |
| **6. Recommendations** | Prioritized security investments with estimated ALE reduction | Take action. "Adding MFA would reduce ALE by ~$340K." | 30 seconds |
| **7. Methodology** | FAIR model explanation, data sources, limitations | Build trust. "This uses real IBM and DBIR data. The methodology is auditable." | Optional |

### Persona Reactions

**Sarah Chen (vCISO)**:
- Looks at the ALE headline first. Compares it mentally to her manual Excel estimate. "Close enough, but the distribution is the real value."
- Screenshots the KPI cards and histogram for the client presentation.
- Scrolls to methodology section to verify data sources before presenting to a board.
- Clicks "Run Another Assessment" to try a different client profile.
- **Time on results page**: 2-3 minutes (thorough review, screenshot capture)

**James Okonkwo (CFO)**:
- Fixates on the ALE headline. "$2.1M? That is significant."
- Looks at the Gordon-Loeb recommended spend card. "We are spending $180K but the model says $780K. I need to present this gap."
- The risk rating (HIGH) gives him a one-word summary for the board headline.
- Does not scroll past the KPI cards and histogram. The methodology section is for the fractional advisor to review.
- **Time on results page**: 1-2 minutes (headline, KPI cards, screenshot)

**Rachel Torres (Insurance Broker)**:
- Compares PML 95th percentile against the client's current policy limit. "$5.1M PML vs $2M coverage -- they are underinsured."
- Uses the loss exceedance curve to identify the probability of exceeding the policy limit. "18% chance of exceeding $2M in a given year."
- Sends the results page link to the client (Phase 2 feature) or screenshots for the renewal meeting.
- **Time on results page**: 2-3 minutes (focused on PML and exceedance curve)

### Post-Results Actions

```
Results Dashboard
      |
      +---> [Screenshot / Print]     -- All personas (Phase 1)
      |
      +---> [Run Another Assessment] -- Sarah (new client), James (what-if)
      |
      +---> [Share Results URL]      -- Rachel (send to client) -- Phase 2
      |
      +---> [Export PDF]             -- James (board deck attachment) -- Phase 2
      |
      +---> [Compare Scenarios]      -- Sarah (with/without MFA) -- Phase 2
```

---

## Complete Journey: Persona Walk-Throughs

### Sarah Chen: Monday Morning Client Prep

```
TIME    ACTION                                    EMOTIONAL STATE
─────── ───────────────────────────────────────── ─────────────────
0:00    Opens CybRisk (bookmarked from last week)  Focused, task-oriented
0:05    Clicks "Assess Your Risk" immediately      Confident (repeat visitor)
0:10    Step 1: Selects Transportation, $50M,      Quick recall -- knows
        500 employees                              client profile
0:25    Step 2: Customer PII, 200K records,        Estimates from industry
        Medium sensitivity                         experience
0:50    Step 3: Toggles 5 of 8 controls ON         Knows from last client
        (MFA yes, IR plan yes, EDR no...)          meeting notes
1:20    Step 4: Accepts smart defaults for         Appreciates DBIR-based
        Transportation (ransomware, BEC,           defaults; adds supply
        insider threat). Adds GDPR.                chain risk
1:45    Step 5: Scans summary, clicks Calculate    No hesitation
1:48    Processing animation                       Brief anticipation
1:51    Results load                                Scanning mode
2:00    Reads ALE: $1.8M (90%: $180K - $4.2M)     "Higher than I expected
                                                    for this profile"
2:15    Notes Gordon-Loeb: $310K recommended       "Good talking point for
        spend vs current $120K                      the investment ask"
2:30    Screenshots histogram + KPI cards          Task completion
2:45    Clicks "Run Another Assessment"             Next client
3:00    Starts wizard again for Client #2           Repeat cycle

Total time per client: ~3 minutes
Previous method (Excel): 2-3 hours
```

### James Okonkwo: Board Meeting Preparation

```
TIME    ACTION                                    EMOTIONAL STATE
─────── ───────────────────────────────────────── ─────────────────
0:00    Lands on CybRisk from Google search        Hopeful but skeptical
0:15    Reads hero headline: "dollars, not          "Finally, financial
        checkboxes"                                 language"
0:30    Reads "No signup. Results in 5 min."        Relief -- no sales
                                                    funnel
0:45    Clicks "Assess Your Risk"                   Cautious optimism
0:55    Step 1: Financial Services, $35M,           Easy -- his own
        120 employees                               company
1:15    Step 2: Payment card data + Customer        Knows this. Pauses at
        PII, 500K records, High sensitivity         record count -- picks
                                                    range band
1:45    Step 3: Toggles controls. Pauses at         Slacks fractional
        EDR and network segmentation.               advisor: "Do we have
        Unsure. Leaves them OFF.                    EDR?" Gets answer in
                                                    90 seconds.
3:00    (Resumes after Slack exchange)               Now toggling EDR ON,
        Toggles EDR ON, segmentation OFF            segmentation still
                                                    unknown -> OFF
3:15    Step 4: Accepts Financial Services           Relieved that defaults
        smart defaults. Checks PCI DSS and          exist. Adds SOX
        SOX.                                        (board reporting)
3:40    Step 5: Reviews summary. Everything          Moment of truth.
        looks right. Clicks "Calculate My Risk"     "What will the number
                                                    be?"
3:43    Processing: "Modeling breach probability     Leans forward.
        across 10,000 scenarios..."                 Engaged by the
                                                    methodology language
3:46    Results load                                 Eyes go straight to
                                                    the dollar figure
3:50    ALE: $2.1M. PML 95th: $6.8M.               "That is material.
        Recommended spend: $780K.                    The board needs to
        Current spend: $180K.                        see this gap."
4:05    Risk Rating: HIGH                            "One word for the
                                                    headline slide"
4:15    Screenshots the entire results section       Board deck material
4:30    Scrolls to methodology. Sees "IBM            "Credible enough.
        Cost of a Data Breach 2025" citation         I can point to IBM."
5:00    Closes tab. Opens PowerPoint.                Mission accomplished

Total time: ~5 minutes
Previous method: Would have asked consulting firm ($50K, 6 weeks)
or presented nothing
```

### Rachel Torres: Client Renewal Prep

```
TIME    ACTION                                    EMOTIONAL STATE
─────── ───────────────────────────────────────── ─────────────────
0:00    Opens CybRisk link (saved from LinkedIn     Curious -- evaluating
        post about the tool)                        for her workflow
0:10    Scans landing page. Notes "No signup."       "I can send this to
                                                    clients directly"
0:20    Clicks "Assess Your Risk"                    Testing with a real
                                                    client profile
0:30    Step 1: Retail, $80M, 2000 employees         Working from client's
                                                    insurance application
0:45    Step 2: Customer PII + Payment cards,        Insurance app has
        1M+ records, High sensitivity                these exact fields
1:10    Step 3: Toggles based on insurance            Cross-referencing
        application: MFA yes, EDR yes,               from the client's
        IR plan no, encryption yes                   40-question form
1:40    Step 4: Accepts Retail defaults               POS intrusion,
        (POS intrusion, web app attacks).            web attacks
        Selects PCI DSS, CCPA.                       are top for retail
2:00    Step 5: Clicks Calculate                      Quick review
2:03    Results load                                  Goes straight to
                                                    PML
2:10    PML 95th: $5.1M. Client's current            "They are
        policy limit: $2M.                           underinsured."
2:20    Loss exceedance curve: 18% probability        "I have data to
        of exceeding $2M in a given year             recommend a higher
                                                    limit."
2:40    Screenshots exceedance curve                  This is the artifact
                                                    she needs for the
                                                    renewal conversation
3:00    Clicks "Run Another Assessment"               Next client

Total time: ~3 minutes per client
Previous method: Gut feel based on 8 years of experience
```

---

## Error Recovery Map

### Error Taxonomy

```
+------------------------------------------------------------------+
|  ERROR RECOVERY FLOWS                                             |
|                                                                   |
|  CLIENT-SIDE ERRORS (caught before API call)                      |
|  ├── Missing required field                                       |
|  │   └── Inline error on field, prevent step advance              |
|  ├── Invalid value (negative revenue, 0 employees)                |
|  │   └── Inline error with guidance ("Revenue must be > $0")      |
|  ├── No data types selected (Step 2)                              |
|  │   └── Inline error ("Select at least one data type")           |
|  └── No threats selected (Step 4)                                 |
|      └── Inline error ("Select at least one threat scenario")     |
|                                                                   |
|  SERVER-SIDE ERRORS (API response)                                |
|  ├── 400 Bad Request (Zod validation failure)                     |
|  │   └── Navigate back to relevant step with server error         |
|  ├── 500 Internal Server Error (engine crash)                     |
|  │   └── Show: "Calculation error. [Retry] [Edit Inputs]"        |
|  ├── 504 Gateway Timeout (Vercel function timeout)                |
|  │   └── Show: "Timed out. [Retry] [Edit Inputs]"                |
|  └── Network error (offline, DNS failure)                         |
|      └── Show: "Network error. Check connection. [Retry]"         |
|                                                                   |
|  EDGE CASE WARNINGS (non-blocking)                                |
|  ├── Extreme PERT parameters (revenue > $10B)                     |
|  │   └── Warning banner: "Estimates for very large orgs           |
|  │       may be less calibrated. Results are directional."        |
|  ├── All controls OFF (worst case)                                |
|  │   └── Warning: "No controls selected. This represents          |
|  │       maximum exposure."                                       |
|  └── Monte Carlo variance too high (CV > 10%)                     |
|      └── Warning: "Wide distribution. Range estimates              |
|          more informative than median."                            |
+------------------------------------------------------------------+
```

### Error Recovery by Phase

| Phase | Error | User Sees | Recovery Action |
|-------|-------|-----------|-----------------|
| **Landing** | Page fails to load | Browser error | Refresh. If persistent, Vercel is down (backup screenshots available). |
| **Wizard Step 1-4** | Validation failure on "Next" | Red border on invalid field + message below field | Fix the field, click Next again. No data lost. |
| **Wizard Step 1-4** | Browser back button | Previous step loads with preserved state | Continue normally. useState preserves all wizard state. |
| **Wizard Step 1-4** | Accidental page refresh | Wizard resets to Step 1 (no persistence) | User must re-enter. Accepted tradeoff for stateless design. |
| **Step 5 -> API** | API returns 400 | "Some inputs were invalid. [Review Inputs]" | Navigate to the step containing the invalid field. |
| **Step 5 -> API** | API returns 500 | "The calculation engine encountered an error. [Retry] [Edit Inputs]" | Retry with same inputs. If persistent, edit inputs (may be an edge case). |
| **Step 5 -> API** | API timeout (>10s) | "Calculation took longer than expected. [Retry]" | Retry. Cold starts resolve on second attempt. |
| **Step 5 -> API** | Network offline | "Unable to reach the server. Check your connection and try again." | Restore network, retry. |
| **Results** | sessionStorage cleared | Redirect to landing page with message: "Your session expired. Start a new assessment." | Start over. No data to recover (stateless by design). |
| **Results** | Chart rendering failure | KPI cards still visible. Chart area shows: "Chart could not render. Data is shown above." | Numerical data in KPI cards serves as fallback. |

### Accidental Refresh: The Stateless Tradeoff

The most common "error" in a stateless wizard is accidental page refresh during Steps 1-4, which resets all wizard state. This is an accepted tradeoff.

**Why we accept it**:
- The wizard takes < 4 minutes. Re-entry cost is low.
- Persisting wizard state (localStorage, URL params) adds complexity disproportionate to the problem.
- A user who accidentally refreshes can re-enter their inputs from memory in under 2 minutes.
- The only state that persists is results (via sessionStorage), which is the high-value artifact.

**Mitigation**: The wizard uses `useState` in a parent component. Navigation between wizard steps (back/forward) preserves all state. Only a full page refresh or browser close causes data loss.

---

## Funnel Analysis and Drop-Off Mapping

### Conversion Funnel

```
100% ─── Landing Page Visitors
  |
  |  30% click CTA (target)
  v
 30% ─── Wizard Step 1 (Company Profile)
  |
  |  95% complete Step 1
  v
28.5% ── Wizard Step 2 (Data Profile)
  |
  |  92% complete Step 2
  v
26.2% ── Wizard Step 3 (Security Controls)
  |
  |  90% complete Step 3
  v
23.6% ── Wizard Step 4 (Threat Landscape)
  |
  |  95% complete Step 4
  v
22.4% ── Wizard Step 5 (Review & Calculate)
  |
  |  98% click "Calculate My Risk"
  v
22.0% ── API Processing
  |
  |  99.5% calculation success
  v
21.9% ── Results Dashboard Rendered
  |
  |  Of wizard starters: 21.9/30 = 73% (exceeds 70% target)
  v
```

### Step-by-Step Drop-Off Analysis

| Step | Expected Drop-Off | Primary Cause | Mitigation |
|------|-------------------|---------------|------------|
| **Landing -> Step 1** | 70% | Value prop not compelling, or user was just browsing | A/B test hero copy. Reduce bounce with clearer "what you get" preview. |
| **Step 1 -> Step 2** | 5% | User was exploring, not committed. Or: industry not listed. | Ensure all major industries are represented. "Other" option with manual input. |
| **Step 2 -> Step 3** | 8% | Data profile questions too specific. User does not know record counts. | Use broad range bands. Add "I don't know" option that applies industry median. |
| **Step 3 -> Step 4** | 10% | Security controls require knowledge the user may not have. Highest cognitive load step. | "Not sure" tooltip with conservative default. Shorten to top 5 controls if Step 3 drop-off exceeds 15%. |
| **Step 4 -> Step 5** | 5% | Minimal -- smart defaults carry users through. | Already mitigated by pre-selection. |
| **Step 5 -> Results** | 2% | Last-second hesitation. "What if I answered wrong?" | Privacy reassurance: "Your data is not stored." Edit links to review inputs. |
| **API -> Results** | 0.5% | API error or timeout. | Retry mechanism. Cold start mitigation. |

### Drop-Off Intervention Triggers

| Signal | Threshold | Action |
|--------|-----------|--------|
| Step 1 drop-off > 10% | 3 consecutive daily cohorts | Simplify Step 1 to industry + revenue only. Move employee count to Step 2. |
| Step 3 drop-off > 15% | 3 consecutive daily cohorts | Reduce controls from 8 to 5 (top-impact only). Add "I'm not sure" option per toggle. |
| API error rate > 2% | Any rolling 24h period | Emergency: review API logs, identify failing input combinations, add input clamping. |
| Total wizard completion < 60% | 1 weekly cohort | Full funnel audit: instrument every click, identify exact abandonment point. |

---

## Returning User Journeys (Stateless Adaptation)

CybRisk has no saved state between sessions. "Returning users" are users who come back to run another assessment. Their experience differs from first-time users only in familiarity, not in system state.

### Returning Persona: Sarah Chen (Multi-Client Use)

```
Session 1: New client assessment    Session 2: Different client
───────────────────────────         ──────────────────────────
Landing -> Wizard -> Results        Landing -> Wizard -> Results
(full journey, ~3 min)              (faster: ~2 min, knows the flow)
```

**Behavioral differences from first visit**:
- Skips reading landing page entirely (bookmarked /assess or clicks CTA immediately)
- Fills wizard faster (knows the question format)
- May compare results mentally against previous client assessments (no system support for this in Phase 1)

**Phase 2 opportunity**: Scenario comparison mode allows running two assessments side-by-side. URL-shareable results allow bookmarking specific outputs.

### Returning Persona: James Okonkwo (What-If Exploration)

```
Session 1: Initial assessment       Session 2: What-if (same session)
───────────────────────────          ──────────────────────────────
Landing -> Wizard -> Results         Results -> "Run Another" ->
                                     Wizard (same inputs + MFA ON) ->
                                     Results (compare mentally)
```

**Behavioral differences**:
- Returns from results page to wizard using "Run Another Assessment"
- Re-enters same company profile with one control changed (MFA, EDR, etc.)
- Compares new ALE against previous (manual comparison -- no system support in Phase 1)

**Phase 2 opportunity**: "What if" toggle on results page that re-runs calculation with one control flipped, showing ALE delta inline.

### Returning Persona: Rachel Torres (Client Portfolio)

```
Session 1: Client A                 Session 2: Client B
───────────────────────────          ──────────────────────────
Landing -> Wizard -> Results         Landing -> Wizard -> Results
(Retail, $80M, 2K employees)        (Healthcare, $25M, 400 employees)
Screenshots -> Send to Client A      Screenshots -> Send to Client B
```

**Behavioral differences**:
- Treats CybRisk as a repeatable tool, not a one-time calculator
- May run 3-5 assessments in a single sitting (portfolio triage)
- Values speed above all -- each additional second per assessment is multiplied by client count

**Phase 2 opportunity**: Batch mode or API access for portfolio assessment. Shareable result URLs eliminate the screenshot workflow.

---

## Implementation Priorities

### Phase 1 (Hackathon MVP) -- Ordered by Impact on Assessment Completion Rate

| Priority | Component | Rationale | Estimated Effort |
|----------|-----------|-----------|-----------------|
| **P0** | Monte Carlo API endpoint | The engine IS the product. Without valid /api/calculate responses, nothing else matters. | 4-6 hours |
| **P0** | Lookup tables (hardcoded) | Engine requires actuarial data. IBM per-record costs, DBIR frequencies, NetDiligence claims. | 2-3 hours |
| **P0** | Wizard Steps 1-5 with useState | The input mechanism. Must collect all required params for the API. Zod validation per step. | 4-6 hours |
| **P0** | Results dashboard (KPI cards + charts) | The output. Without visible results, completion rate is 0% by definition. | 3-4 hours |
| **P1** | Landing page | Conversion driver, but wizard can be tested via direct /assess URL. | 2-3 hours |
| **P1** | Processing animation | UX polish that reduces perceived wait time. Simple CSS animation + rotating messages. | 1 hour |
| **P1** | Inline validation (per-step) | Prevents bad data from reaching the API. Catches errors early. | 1-2 hours |
| **P1** | Smart defaults (Step 4) | Critical for James (non-technical). Without defaults, Step 4 drop-off will spike. | 1 hour |
| **P2** | Gordon-Loeb card on results | Differentiator, but not blocking for completion rate. | 30 min |
| **P2** | Methodology section on results | Trust builder, but below the fold. | 30 min |
| **P2** | Error recovery (retry on timeout) | Edge case handling. Important for robustness, not for happy path. | 1 hour |
| **P2** | "Run Another Assessment" button | Enables Sarah and Rachel's multi-client workflow. Simple link to /assess. | 10 min |

### Phase 2 (Post-Hackathon) -- Journey Enhancement Priorities

| Priority | Enhancement | Persona Impact | Effort |
|----------|-------------|----------------|--------|
| **P0** | Scenario comparison | Sarah (with/without controls), James (what-if) | 2-3 days |
| **P0** | Shareable result URLs | Rachel (send to clients), all personas (bookmark) | 2-3 days |
| **P1** | PDF export | James (board deck), Sarah (client deliverable) | 3-5 days |
| **P1** | Mobile-responsive results | James (checking on phone before meeting) | 2-3 days |
| **P2** | "I don't know" option for controls | James (uncertain about security posture) | 1 day |
| **P2** | Industry benchmark overlay on charts | All personas (contextualize results) | 1-2 days |

---

## Accessibility Considerations

| Consideration | Implementation |
|---------------|----------------|
| **Keyboard navigation** | All wizard steps navigable via Tab/Shift+Tab. Enter submits current step. |
| **Screen reader** | ARIA labels on all form fields. Progress bar announces "Step N of 5". Results KPI cards use aria-live for dynamic content. |
| **Color contrast** | Cyan-400 on slate-950 meets WCAG AA for large text. Body text (slate-50 on slate-950) exceeds AA ratio. |
| **Focus indicators** | Visible focus rings on all interactive elements (Shadcn/ui default). |
| **Error announcements** | Validation errors announced via aria-live="polite" region. |
| **Chart alternatives** | Histogram and LEC have sr-only text summaries: "Loss distribution ranges from $X to $Y with median at $Z." |

---

## Journey Metrics Summary

### North Star

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Assessment Completion Rate** | 70% | (Users at /results) / (Users at /assess Step 1) |

### Funnel Metrics

| Metric | Target | Diagnostic Signal |
|--------|--------|-------------------|
| Landing-to-Wizard | 30% | Is the value prop compelling? |
| Step 1 completion | 95% | Are industry options comprehensive? |
| Step 2 completion | 92% | Are data questions answerable? |
| Step 3 completion | 90% | Are controls understandable to non-technical users? |
| Step 4 completion | 95% | Do smart defaults work? |
| Step 5-to-Results | 98% | Is the commitment point friction-free? |
| API success rate | 99.5% | Is the engine robust? |

### Quality Metrics

| Metric | Target |
|--------|--------|
| Wizard completion time | < 5 minutes |
| Time to results (from Calculate click) | < 3 seconds |
| API P95 response time | < 2 seconds |

---

*Document generated by North Star Advisor*
