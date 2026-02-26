# CybRisk: Screen Wireframes

> **Created**: 2026-02-22
> **Status**: Active
> **Builder**: Albert Hui -- Chief Forensicator, Security Ronin
> **Platform**: Next.js 14+ App Router, desktop-first (1280px minimum)
> **Design System**: Dark theme (slate-950), cyan-400 accent, Inter + JetBrains Mono
> **Screens**: 8 total across 3 routes (`/`, `/assess`, `/results`)

Detailed ASCII wireframes for every screen in CybRisk, with component specifications, accessibility requirements, and brand voice validation. These wireframes are the canonical reference for implementation -- every element shown here maps to a component in the UI Design System.

---

## Screen 1: Landing Page (`/`)

### Wireframe

```
+============================================================================+
|                                                                            |
|  CybRisk                                        [Assess Your Risk]  btn   |
|  --------                                        (cyan-400, ghost)        |
|  (Inter Bold, "R" in cyan-400)                                            |
|                                                                            |
+============================================================================+
|                                                                            |
|                         py-24, max-w-6xl, centered                         |
|                                                                            |
|            Know Your Cyber Risk                                            |
|            in Dollars, Not Checkboxes                                      |
|            (text-4xl font-bold tracking-tight text-slate-50)               |
|                                                                            |
|            Monte Carlo-simulated financial exposure estimates               |
|            powered by real insurance claims data.                           |
|            No signup. No sales pitch. Results in 5 minutes.                |
|            (text-lg text-slate-400, max-w-2xl)                             |
|                                                                            |
|                   +-----------------------------+                          |
|                   |    Assess Your Risk          |                          |
|                   |    (h-12 px-8 text-lg)       |                          |
|                   |    bg-cyan-400 text-slate-950 |                          |
|                   |    hover:bg-cyan-300          |                          |
|                   +-----------------------------+                          |
|                                                                            |
|       +-------------------+  +-------------------+  +-------------------+  |
|       | [Shield] FAIR     |  | [Database] Data   |  | [BarChart3] 10K  |  |
|       |  Methodology      |  |  Never Stored     |  |  Simulations     |  |
|       +-------------------+  +-------------------+  +-------------------+  |
|       (trust-badge: bg-slate-800 border-slate-700 rounded-full            |
|        icon: cyan-400, text: slate-400, text-xs, px-3 py-1.5)            |
|                                                                            |
+----------------------------------------------------------------------------+
|                                                                            |
|                         py-16, max-w-6xl                                   |
|                                                                            |
|   +-----------------------------+  +-----------------------------+         |
|   |                             |  |                             |         |
|   |  [DollarSign]               |  |  [Activity]                |         |
|   |  h-6 w-6, cyan-400         |  |  h-6 w-6, cyan-400         |         |
|   |                             |  |                             |         |
|   |  Financial Quantification   |  |  Monte Carlo Simulation    |         |
|   |  (text-lg font-semibold     |  |  (text-lg font-semibold    |         |
|   |   text-slate-50)            |  |   text-slate-50)           |         |
|   |                             |  |                             |         |
|   |  Translate your security    |  |  10,000 iterations model   |         |
|   |  posture into estimated     |  |  the full range of breach  |         |
|   |  annual dollar exposure     |  |  outcomes -- from minor     |         |
|   |  using the FAIR model.      |  |  incidents to catastrophic |         |
|   |  (text-sm text-slate-400)   |  |  tail events.              |         |
|   |                             |  |  (text-sm text-slate-400)  |         |
|   +-----------------------------+  +-----------------------------+         |
|                                                                            |
|   +-----------------------------+                                          |
|   |                             |                                          |
|   |  [FileText]                 |                                          |
|   |  h-6 w-6, cyan-400         |                                          |
|   |                             |                                          |
|   |  Board-Ready Output        |                                          |
|   |  (text-lg font-semibold    |                                          |
|   |   text-slate-50)           |                                          |
|   |                             |                                          |
|   |  KPI cards, loss curves,   |                                          |
|   |  and dollar-denominated    |                                          |
|   |  recommendations your CFO  |                                          |
|   |  can present tomorrow.     |                                          |
|   |  (text-sm text-slate-400)  |                                          |
|   +-----------------------------+                                          |
|                                                                            |
|   (grid grid-cols-1 md:grid-cols-3 gap-6)                                 |
|   (each card: bg-slate-900 border-slate-700 rounded-lg p-6)               |
|                                                                            |
+----------------------------------------------------------------------------+
|                                                                            |
|                         py-16, max-w-6xl                                   |
|                                                                            |
|            How It Works                                                    |
|            (text-3xl font-bold text-slate-50)                              |
|                                                                            |
|   +-------------------+     +-------------------+     +-------------------+|
|   |                   |     |                   |     |                   ||
|   |  (1)              | --> |  (2)              | --> |  (3)              ||
|   |  bg-cyan-400/10   |     |  bg-cyan-400/10   |     |  bg-cyan-400/10   ||
|   |  text-cyan-400    |     |  text-cyan-400    |     |  text-cyan-400    ||
|   |                   |     |                   |     |                   ||
|   |  Answer           |     |  We Simulate      |     |  Get Results      ||
|   |  5 Questions      |     |  10,000 Scenarios  |     |  in Dollars       ||
|   |                   |     |                   |     |                   ||
|   |  Describe your    |     |  FAIR model with  |     |  Loss             ||
|   |  business, data,  |     |  IBM, DBIR, and   |     |  distribution,    ||
|   |  and controls in  |     |  NetDiligence     |     |  KPI cards, and   ||
|   |  under 5 minutes. |     |  actuarial data.  |     |  recommendations. ||
|   |                   |     |                   |     |                   ||
|   +-------------------+     +-------------------+     +-------------------+|
|                                                                            |
|   (grid grid-cols-1 md:grid-cols-3 gap-8)                                  |
|   (arrows: text-slate-700, hidden on mobile)                               |
|                                                                            |
+----------------------------------------------------------------------------+
|                                                                            |
|                         py-12, max-w-6xl                                   |
|                                                                            |
|   +------------------------------------------------------------------------+
|   |  Built by Albert Hui -- 20+ years in DFIR, incident response,         |
|   |  and risk advisory. Expert witness. vCISO. IoD Cyber Security Advisor. |
|   |  (text-sm text-slate-500)                                              |
|   +------------------------------------------------------------------------+
|                                                                            |
|   +-------------------+  +-------------------+  +-------------------+      |
|   | [ShieldCheck]     |  | [BookOpen]        |  | [Lock]            |      |
|   |  FAIR Methodology |  |  Open Methodology |  |  No Data Stored   |      |
|   +-------------------+  +-------------------+  +-------------------+      |
|   (trust-badge row, same styling as hero badges)                           |
|                                                                            |
+----------------------------------------------------------------------------+
|                                                                            |
|   CybRisk | MIT License | FAIR Methodology | IBM / DBIR / NetDiligence    |
|                                                                            |
|   Your data is processed in-memory and never stored.                       |
|   Built for the DataExpert Vibe Coding Challenge 2026.                     |
|   (text-xs text-slate-500, border-t border-slate-800, py-8)               |
|                                                                            |
+============================================================================+
```

### Component Specifications

| Element | Component | Tailwind Classes | Notes |
|---------|-----------|-----------------|-------|
| Nav bar | Custom `<header>` | `flex items-center justify-between px-6 py-4 border-b border-slate-800` | Sticky not required (single-page sections) |
| Logo | `CybRiskLogo` | `text-xl font-bold text-slate-50` with cyan-400 on "R" | Text wordmark, no image |
| Hero headline | `<h1>` | `text-4xl md:text-5xl font-bold tracking-tight text-slate-50` | Single `<h1>` on the page |
| Hero subtitle | `<p>` | `text-lg text-slate-400 max-w-2xl` | Three short sentences |
| Primary CTA | `Button` (large) | `h-12 px-8 text-lg bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold rounded-md` | Links to `/assess` |
| Trust badges | `TrustBadge` x3 | `bg-slate-800 border-slate-700 rounded-full px-3 py-1.5 text-xs` | Icon: `h-3.5 w-3.5 text-cyan-400` |
| Feature cards | `Card` x3 | `bg-slate-900 border-slate-700 rounded-lg p-6` | Icon top, title, description |
| How It Works | Custom section | `grid grid-cols-1 md:grid-cols-3 gap-8` | Numbered steps with arrow connectors |
| Builder credit | `<p>` | `text-sm text-slate-500` | Credibility anchor, not a bio |
| Footer | Custom `<footer>` | `border-t border-slate-800 py-8 text-xs text-slate-500` | Privacy statement, credits, methodology link |

### Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Skip navigation | `<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to main content</a>` as first child of `<body>` |
| Page title | `<title>CybRisk -- Cyber Risk Posture Calculator</title>` via Next.js metadata export |
| Heading hierarchy | Single `<h1>` in hero. Feature section: `<h2>`. How It Works: `<h2>`. |
| CTA button | Visible text "Assess Your Risk" is descriptive -- no `aria-label` override needed |
| Trust badge icons | `aria-hidden="true"` on Lucide icons (adjacent text label carries meaning) |
| Feature card icons | `aria-hidden="true"` (decorative when paired with heading text) |
| Landmark regions | `<header>` for nav, `<main id="main-content">` for content, `<footer>` for footer |
| Color contrast | Cyan-400 on slate-950: 10.1:1 (AAA). Slate-50 on slate-950: 17.4:1 (AAA). Slate-400 on slate-950: 5.3:1 (AA). |

### Brand Voice Validation

| Check | Status | Evidence |
|-------|--------|----------|
| Leads with dollars, not scores | Pass | "in Dollars, Not Checkboxes" is the headline |
| Uses "estimated" or "simulated", never "predicted" | Pass | "Monte Carlo-simulated financial exposure estimates" |
| No FUD, no fear tactics | Pass | No scare language; factual description of capability |
| Attributes data sources | Pass | "IBM / DBIR / NetDiligence" in trust badges and footer |
| No login gates or email capture | Pass | "No signup. No sales pitch." explicitly stated |
| No "AI-powered" badges | Pass | "Monte Carlo Simulation" and "FAIR Methodology" used instead |
| No stock photography | Pass | Zero images; data and text only |
| No compliance checklists | Pass | "Checkboxes" is what we are contrasting against |

---

## Screen 2: Wizard Step 1 -- Company Profile (`/assess`)

### Wireframe

```
+============================================================================+
|                                                                            |
|  CybRisk                                        Step 1 of 5               |
|                                                  (text-sm text-slate-400)  |
|                                                                            |
+============================================================================+
|                                                                            |
|                         py-8, max-w-2xl, centered                          |
|                                                                            |
|   Step 1 of 5: Company Profile                                            |
|   (text-sm text-slate-400, "Company Profile" in text-slate-50 font-medium)|
|                                                                            |
|   (1)----------(2)----------(3)----------(4)----------(5)                  |
|   [active]     [pending]    [pending]    [pending]    [pending]            |
|    Company      Data        Security     Threat       Review               |
|    Profile      Profile     Controls     Landscape    & Submit             |
|                                                                            |
|   (1) = ring-2 ring-cyan-400 bg-cyan-400/20 text-cyan-400                 |
|   (2-5) = bg-slate-800 text-slate-500                                      |
|   connector lines: bg-slate-700                                            |
|   active label: text-cyan-400 text-xs font-medium                          |
|   future labels: text-slate-500 text-xs                                    |
|                                                                            |
|   +--------------------------------------------------------------------+  |
|   |                                                                    |  |
|   |  (1)  Company Profile                                              |  |
|   |  [circle bg-cyan-400/10 text-cyan-400]                            |  |
|   |       (text-xl font-semibold text-slate-50)                        |  |
|   |                                                                    |  |
|   |       Tell us about your organization so we can calibrate          |  |
|   |       industry-specific risk parameters.                           |  |
|   |       (text-sm text-slate-500, ml-10)                              |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  Industry Sector                                             |  |  |
|   |  |  (Label: text-sm text-slate-400)                             |  |  |
|   |  |                                                              |  |  |
|   |  |  +--------------------------------------------------+       |  |  |
|   |  |  |  Select your industry                    [v]     |       |  |  |
|   |  |  |  (SelectTrigger: bg-slate-800                    |       |  |  |
|   |  |  |   border-slate-600 text-slate-50 h-11)           |       |  |  |
|   |  |  +--------------------------------------------------+       |  |  |
|   |  |                                                              |  |  |
|   |  |  Options: Healthcare, Financial Services, Technology,        |  |  |
|   |  |  Energy, Industrial, Retail, Education, Transportation,      |  |  |
|   |  |  Pharmaceuticals, Services, Entertainment, Communications,   |  |  |
|   |  |  Consumer, Media, Research, Hospitality, Public Sector       |  |  |
|   |  |  (17 industries from IBM report)                             |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  Annual Revenue (USD)                                        |  |  |
|   |  |  (Label: text-sm text-slate-400)                             |  |  |
|   |  |                                                              |  |  |
|   |  |  +--------------------------------------------------+       |  |  |
|   |  |  |  Select revenue band                     [v]     |       |  |  |
|   |  |  +--------------------------------------------------+       |  |  |
|   |  |                                                              |  |  |
|   |  |  Options: Under $50M, $50M-$250M, $250M-$1B,                |  |  |
|   |  |  $1B-$5B, Over $5B                                           |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  Number of Employees                                         |  |  |
|   |  |  (Label: text-sm text-slate-400)                             |  |  |
|   |  |                                                              |  |  |
|   |  |  +--------------------------------------------------+       |  |  |
|   |  |  |  Select employee range                   [v]     |       |  |  |
|   |  |  +--------------------------------------------------+       |  |  |
|   |  |                                                              |  |  |
|   |  |  Options: Under 250, 250-1,000, 1,000-5,000,                |  |  |
|   |  |  5,000-25,000, Over 25,000                                   |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  ---------------------------------------------------------------  |  |
|   |  (border-t border-slate-700, pt-6)                               |  |
|   |                                                                    |  |
|   |                                           +------------------+    |  |
|   |                                           |    Continue      |    |  |
|   |                                           |    (primary btn) |    |  |
|   |                                           |    bg-cyan-400   |    |  |
|   |                                           |    text-slate-950|    |  |
|   |                                           +------------------+    |  |
|   |                                           (ml-auto, no Back btn)  |  |
|   |                                                                    |  |
|   +--------------------------------------------------------------------+  |
|   (Card: bg-slate-900 border-slate-700 rounded-lg)                        |
|                                                                            |
|   Your data is processed in-memory and never stored.                       |
|   (text-xs text-slate-500, text-center, mt-4)                             |
|                                                                            |
+============================================================================+
```

### Component Specifications

| Element | Component | Tailwind Classes | Notes |
|---------|-----------|-----------------|-------|
| Progress bar | `WizardProgress` | See UI Design System -- step 1 active, steps 2-5 pending | `<nav aria-label="Assessment progress">` |
| Step card | `WizardStepCard` | `bg-slate-900 border-slate-700 max-w-2xl mx-auto rounded-lg` | `role="region" aria-labelledby="step-1-title"` |
| Step number badge | `<span>` | `h-7 w-7 rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-400` | Decorative (`aria-hidden="true"`) |
| Industry select | Shadcn `Select` | Trigger: `bg-slate-800 border-slate-600 text-slate-50 h-11` | 17 options from IBM report |
| Revenue select | Shadcn `Select` | Same trigger styling | 5 revenue bands |
| Employee select | Shadcn `Select` | Same trigger styling | 5 employee ranges |
| Continue button | Shadcn `Button` | `ml-auto bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold h-10 px-6` | No Back button on Step 1 |
| Privacy note | `<p>` | `text-xs text-slate-500 text-center mt-4` | Reassurance at commitment point |

### Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Dynamic page title | `document.title = "Step 1 of 5: Company Profile -- Risk Assessment -- CybRisk"` |
| Form labels | Each `<Select>` has a visible `<Label>` with `htmlFor` association |
| Progress announcement | `aria-live="polite"` on step text: "Step 1 of 5: Company Profile" |
| Step indicator | `aria-current="step"` on active step in progress bar |
| Keyboard navigation | Tab order: Industry -> Revenue -> Employees -> Continue. Enter/Space opens dropdowns. Arrow keys navigate options. |
| Validation errors | On "Continue" with empty fields: `aria-invalid="true"` on invalid fields, error text with `role="alert"`, focus moves to first invalid field |
| No keyboard trap | Tab flows naturally through form fields to Continue button. Escape closes open dropdowns. |

### Brand Voice Validation

| Check | Status | Evidence |
|-------|--------|----------|
| No FUD in field labels | Pass | Neutral labels: "Select your industry", not "How vulnerable is your industry?" |
| Revenue uses ranges, not exact | Pass | Band ranges reduce anxiety about sharing precise financials |
| No gamification | Pass | No progress percentage, no "you're 20% done" messages |
| Privacy statement present | Pass | "Your data is processed in-memory and never stored" below the card |
| Respectful of time | Pass | Only 3 fields -- under 30 seconds to complete |

---

## Screen 3: Wizard Step 2 -- Data Profile (`/assess`)

### Wireframe

```
+============================================================================+
|  CybRisk                                        Step 2 of 5               |
+============================================================================+
|                                                                            |
|   Step 2 of 5: Data Profile                                               |
|                                                                            |
|   (1)----------(2)----------(3)----------(4)----------(5)                  |
|   [completed]  [active]     [pending]    [pending]    [pending]            |
|    [check]      Data        Security     Threat       Review               |
|    Company      Profile     Controls     Landscape    & Submit             |
|                                                                            |
|   (1) = bg-cyan-400 text-slate-950 (solid, checkmark icon)                |
|   (2) = ring-2 ring-cyan-400 bg-cyan-400/20 text-cyan-400                 |
|   connector 1->2: bg-cyan-400 (completed)                                  |
|   connectors 2->5: bg-slate-700 (pending)                                  |
|                                                                            |
|   +--------------------------------------------------------------------+  |
|   |                                                                    |  |
|   |  (2)  Data Profile                                                 |  |
|   |                                                                    |  |
|   |       What types and volume of data does your organization         |  |
|   |       handle? This drives per-record breach cost estimates.        |  |
|   |                                                                    |  |
|   |  Data Types Held                                                   |  |
|   |  (Label: text-sm font-medium text-slate-50)                        |  |
|   |  Select all that apply.                                            |  |
|   |  (text-xs text-slate-500)                                          |  |
|   |                                                                    |  |
|   |  +------------------+  +------------------+  +------------------+  |  |
|   |  |                  |  |                  |  |                  |  |  |
|   |  |  [User]          |  |  [CreditCard]   |  |  [Heart]         |  |  |
|   |  |  Customer PII    |  |  Financial /     |  |  Health Records |  |  |
|   |  |  (names, emails, |  |  Payment Card   |  |  (PHI)          |  |  |
|   |  |   addresses)     |  |  (PCI)          |  |                  |  |  |
|   |  |                  |  |                  |  |                  |  |  |
|   |  +------------------+  +------------------+  +------------------+  |  |
|   |  +------------------+  +------------------+  +------------------+  |  |
|   |  |                  |  |                  |  |                  |  |  |
|   |  |  [Users]         |  |  [Lightbulb]    |  |  [FileSpreadsheet]| |  |
|   |  |  Employee PII    |  |  Intellectual   |  |  Financial       |  |  |
|   |  |  (HR records,    |  |  Property       |  |  Records         |  |  |
|   |  |   payroll)       |  |  (trade secrets,|  |  (accounting,    |  |  |
|   |  |                  |  |   source code)  |  |   banking)       |  |  |
|   |  +------------------+  +------------------+  +------------------+  |  |
|   |                                                                    |  |
|   |  (grid grid-cols-2 sm:grid-cols-3 gap-3)                          |  |
|   |  unselected: bg-slate-800 border-slate-700 text-slate-400         |  |
|   |  selected:   bg-cyan-400/10 border-cyan-400/30 text-cyan-400      |  |
|   |  role="checkbox" aria-checked on each card                         |  |
|   |                                                                    |  |
|   |  Total Records Held                                                |  |
|   |  (Label: text-sm font-medium text-slate-50)                        |  |
|   |                                                                    |  |
|   |  Approximate Records Held                    500,000               |  |
|   |  (text-sm text-slate-400)            (font-mono text-cyan-400)     |  |
|   |                                                                    |  |
|   |  [=============|==================================]                |  |
|   |  (Slider: track bg-slate-700, range bg-cyan-400,                  |  |
|   |   thumb bg-cyan-400 border-cyan-400)                               |  |
|   |                                                                    |  |
|   |  10K                                                   100M        |  |
|   |  (text-xs text-slate-500 font-mono, flex justify-between)          |  |
|   |                                                                    |  |
|   |  Logarithmic scale. Drag to approximate.                           |  |
|   |  (text-xs text-slate-500)                                          |  |
|   |                                                                    |  |
|   |  Data Sensitivity Level                                            |  |
|   |  (Label: text-sm font-medium text-slate-50)                        |  |
|   |                                                                    |  |
|   |  +--------------------+--------------------+--------------------+  |  |
|   |  |  Standard          |  Sensitive          |  Highly Sensitive  |  |  |
|   |  |  (General business |  (Regulated data,  |  (State secrets,  |  |  |
|   |  |   data, public     |   PCI, basic PII)  |   PHI, classified |  |  |
|   |  |   records)         |                    |   IP)             |  |  |
|   |  +--------------------+--------------------+--------------------+  |  |
|   |  (toggle group: selected bg-cyan-400/10 border-cyan-400/30)       |  |
|   |                                                                    |  |
|   |  ---------------------------------------------------------------  |  |
|   |                                                                    |  |
|   |  +----------+                               +------------------+  |  |
|   |  |   Back   |                               |    Continue      |  |  |
|   |  | (outline)|                               |    (primary)     |  |  |
|   |  +----------+                               +------------------+  |  |
|   |                                                                    |  |
|   +--------------------------------------------------------------------+  |
|                                                                            |
+============================================================================+
```

### Component Specifications

| Element | Component | Tailwind Classes | Notes |
|---------|-----------|-----------------|-------|
| Data type cards | Custom toggleable cards | `grid grid-cols-2 sm:grid-cols-3 gap-3` | 6 data types. Icon + label + description per card. |
| Card unselected | `<button>` | `bg-slate-800 border-slate-700 text-slate-400 rounded-lg p-4 text-sm` | `hover:border-slate-500 hover:text-slate-300` |
| Card selected | `<button>` | `bg-cyan-400/10 border-cyan-400/30 text-cyan-400 rounded-lg p-4 text-sm` | Visual feedback on selection |
| Record slider | Shadcn `Slider` | Track: `bg-slate-700`. Range: `bg-cyan-400`. Thumb: `bg-cyan-400 border-cyan-400` | Logarithmic scale: 10K to 100M |
| Slider value | `<span>` | `text-sm font-mono text-cyan-400` | Live display aligned right of label |
| Sensitivity toggle | Shadcn `ToggleGroup` | Same card styling as data types, single-select | 3 options: Standard, Sensitive, Highly Sensitive |
| Back button | Shadcn `Button` variant="outline" | `border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-50 h-10 px-6` | Returns to Step 1 preserving state |
| Continue button | Shadcn `Button` | Primary styling (cyan-400) | Validates: at least 1 data type selected |

### Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Data type cards | `role="checkbox"` + `aria-checked` on each. Wrapped in `<fieldset>` with `<legend>`: "Data types held. Select all that apply." |
| Card keyboard | `tabindex="0"`, Space/Enter to toggle, Tab to move between cards |
| Slider | Radix `Slider` provides `role="slider"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. Arrow keys adjust value. |
| Slider value announcement | Live value display linked via `aria-describedby` to slider |
| Sensitivity group | `role="radiogroup"` with `role="radio"` on each option. Arrow keys navigate. |
| Focus management | On entry from Step 1, focus moves to step card title ("Data Profile") |

### Brand Voice Validation

| Check | Status | Evidence |
|-------|--------|----------|
| Plain language data types | Pass | "Customer PII (names, emails, addresses)" not just "PII" |
| No jargon-only labels | Pass | Parenthetical explanations on each data type card |
| Ranges instead of exact numbers | Pass | Slider with approximate scale, not a text input requiring precision |
| No judgment language | Pass | "Select all that apply" not "How exposed is your data?" |

---

## Screen 4: Wizard Step 3 -- Security Controls (`/assess`)

### Wireframe

```
+============================================================================+
|  CybRisk                                        Step 3 of 5               |
+============================================================================+
|                                                                            |
|   Step 3 of 5: Security Controls                                          |
|                                                                            |
|   [check]------[check]------(3)----------(4)----------(5)                 |
|   [completed]  [completed]  [active]     [pending]    [pending]           |
|                                                                            |
|   +--------------------------------------------------------------------+  |
|   |                                                                    |  |
|   |  (3)  Security Controls                                            |  |
|   |                                                                    |  |
|   |       Assess your current security posture. Each control           |  |
|   |       modifies your estimated vulnerability to breach.             |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  [ShieldCheck]                                               |  |  |
|   |  |  Multi-factor authentication (MFA)              [=========] |  |  |
|   |  |  MFA on all critical systems reduces credential             |  |  |
|   |  |  compromise risk by ~15%.                                    |  |  |
|   |  |  (bg-slate-800 border-slate-700 rounded-lg px-4 py-3)      |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  [Lock]                                                      |  |  |
|   |  |  Encryption at rest and in transit              [=========] |  |  |
|   |  |  Encryption reduces average breach cost by ~$140K.           |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  [Monitor]                                                   |  |  |
|   |  |  Endpoint detection and response (EDR)          [    =====] |  |  |
|   |  |  EDR reduces breach cost by ~$180K per IBM 2025.            |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  [Activity]                                                  |  |  |
|   |  |  SIEM / security monitoring                     [    =====] |  |  |
|   |  |  Centralized logging and monitoring for threat              |  |  |
|   |  |  detection.                                                  |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  [FileText]                                                  |  |  |
|   |  |  Documented incident response plan              [=========] |  |  |
|   |  |  An IR plan reduces expected loss by ~23% per IBM 2025.     |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  [HardDrive]                                                 |  |  |
|   |  |  Backup and disaster recovery (tested)          [    =====] |  |  |
|   |  |  Tested backups are critical for ransomware resilience.     |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  [GraduationCap]                                             |  |  |
|   |  |  Security awareness training                    [=========] |  |  |
|   |  |  Human element is involved in 68% of breaches (DBIR 2025). |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  [Search]                                                    |  |  |
|   |  |  Regular vulnerability scanning                 [    =====] |  |  |
|   |  |  Vulnerability exploitation is the initial vector in 20%    |  |  |
|   |  |  of breaches.                                                |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  [Network]                                                   |  |  |
|   |  |  Network segmentation                           [    =====] |  |  |
|   |  |  Limits lateral movement during an intrusion.               |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  [Globe]                                                     |  |  |
|   |  |  Web application firewall (WAF)                 [    =====] |  |  |
|   |  |  Protects against web application attacks.                  |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  (space-y-3, each row: flex items-center justify-between)          |  |
|   |                                                                    |  |
|   |  Switch ON:  data-[state=checked]:bg-cyan-400 [=========]         |  |
|   |  Switch OFF: data-[state=unchecked]:bg-slate-600 [    =====]      |  |
|   |  Default: ALL toggles OFF (conservative assumption)                |  |
|   |                                                                    |  |
|   |  Not sure about a control? Leave it off for a conservative         |  |
|   |  estimate. You can always re-run with different settings.          |  |
|   |  (text-xs text-slate-500, italic, mt-4)                            |  |
|   |                                                                    |  |
|   |  ---------------------------------------------------------------  |  |
|   |                                                                    |  |
|   |  +----------+                               +------------------+  |  |
|   |  |   Back   |                               |    Continue      |  |  |
|   |  +----------+                               +------------------+  |  |
|   |                                                                    |  |
|   +--------------------------------------------------------------------+  |
|                                                                            |
+============================================================================+
```

### Component Specifications

| Element | Component | Tailwind Classes | Notes |
|---------|-----------|-----------------|-------|
| Toggle row | Custom layout | `flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3 border border-slate-700` | 10 rows, stacked with `space-y-3` |
| Control label | Shadcn `Label` | `text-sm font-medium text-slate-50 cursor-pointer` | `htmlFor` linked to switch ID |
| Control description | `<p>` | `text-xs text-slate-500` | Cites data source (IBM, DBIR) where applicable |
| Control icon | Lucide icon | `h-4 w-4 text-slate-400` | Left of label, decorative (`aria-hidden="true"`) |
| Switch | Shadcn `Switch` | `data-[state=checked]:bg-cyan-400 data-[state=unchecked]:bg-slate-600` | Radix Switch provides `role="switch"`, `aria-checked` |
| Help text | `<p>` | `text-xs text-slate-500 italic mt-4` | Conservative default guidance |

### Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Switch-label association | Each `<Switch>` has `id={control-${id}}` linked to `<Label htmlFor={control-${id}}>` |
| Switch description | `aria-describedby={control-${id}-desc}` links switch to its description text |
| Keyboard navigation | Tab between switches. Space to toggle each. Tab order follows visual order (top to bottom). |
| Screen reader experience | "Multi-factor authentication. Switch. Off. MFA on all critical systems reduces credential compromise risk by approximately 15 percent." |
| Non-judgmental default | All toggles OFF. No red indicators for "off" state. Description text is informational, not alarming. |
| Switch track contrast | Unchecked: add `border border-slate-500` for 3.2:1 contrast against card background |

### Brand Voice Validation

| Check | Status | Evidence |
|-------|--------|----------|
| No judgment on "No" answers | Pass | OFF state uses neutral `slate-600`, no red/warning colors |
| Cites data sources | Pass | "per IBM 2025", "DBIR 2025" in descriptions |
| Honest about uncertainty | Pass | "Not sure? Leave it off for a conservative estimate." |
| Dollar impact mentioned | Pass | "$140K", "$180K", "~23%" -- quantified impact per control |
| No pass/fail language | Pass | Binary yes/no, no "FAIL" or "at risk" indicators |
| No compliance checklist feel | Pass | Framed as "controls that modify vulnerability", not "requirements to meet" |

---

## Screen 5: Wizard Step 4 -- Threat Landscape (`/assess`)

### Wireframe

```
+============================================================================+
|  CybRisk                                        Step 4 of 5               |
+============================================================================+
|                                                                            |
|   Step 4 of 5: Threat Landscape                                           |
|                                                                            |
|   [check]------[check]------[check]------(4)----------(5)                 |
|   [completed]  [completed]  [completed]  [active]     [pending]           |
|                                                                            |
|   +--------------------------------------------------------------------+  |
|   |                                                                    |  |
|   |  (4)  Threat Landscape                                             |  |
|   |                                                                    |  |
|   |       Which threats are most relevant to your organization?        |  |
|   |       Pre-selected based on your industry (Financial Services).    |  |
|   |                                                                    |  |
|   |  Threat Scenarios                                                  |  |
|   |  (Label: text-sm font-medium text-slate-50)                        |  |
|   |  Pre-selected from DBIR data for Financial Services.               |  |
|   |  Adjust as needed.                                                  |  |
|   |  (text-xs text-slate-500)                                          |  |
|   |                                                                    |  |
|   |  +------------------+  +------------------+  +------------------+  |  |
|   |  |                  |  |                  |  |                  |  |  |
|   |  |  [Lock]          |  |  [Mail]          |  |  [Globe]         |  |  |
|   |  |  Ransomware      |  |  BEC /           |  |  Web App         |  |  |
|   |  |                  |  |  Phishing        |  |  Attack          |  |  |
|   |  |  [SELECTED]      |  |  [SELECTED]      |  |  [SELECTED]      |  |  |
|   |  |  cyan-400/10     |  |  cyan-400/10     |  |  cyan-400/10     |  |  |
|   |  +------------------+  +------------------+  +------------------+  |  |
|   |  +------------------+  +------------------+  +------------------+  |  |
|   |  |                  |  |                  |  |                  |  |  |
|   |  |  [Terminal]      |  |  [UserX]         |  |  [Link]          |  |  |
|   |  |  System          |  |  Insider         |  |  Supply          |  |  |
|   |  |  Intrusion       |  |  Threat          |  |  Chain           |  |  |
|   |  |                  |  |                  |  |                  |  |  |
|   |  |  [unselected]    |  |  [unselected]    |  |  [unselected]    |  |  |
|   |  |  slate-800       |  |  slate-800       |  |  slate-800       |  |  |
|   |  +------------------+  +------------------+  +------------------+  |  |
|   |                                                                    |  |
|   |  (grid grid-cols-2 sm:grid-cols-3 gap-3)                          |  |
|   |  Smart defaults by industry:                                       |  |
|   |    Financial -> Ransomware, BEC/Phishing, Web App Attack           |  |
|   |    Healthcare -> Ransomware, System Intrusion, Insider Threat      |  |
|   |    Retail -> Web App Attack, Ransomware, BEC/Phishing              |  |
|   |                                                                    |  |
|   |  Previous Incidents                                                |  |
|   |  (Label: text-sm font-medium text-slate-50)                        |  |
|   |  How many security incidents in the past 3 years?                  |  |
|   |  (text-xs text-slate-500)                                          |  |
|   |                                                                    |  |
|   |  +---------------------------------------------------+            |  |
|   |  |  0                                         [v]    |            |  |
|   |  |  (NumericInput or Select: bg-slate-800             |            |  |
|   |  |   border-slate-600, default value: 0)              |            |  |
|   |  +---------------------------------------------------+            |  |
|   |                                                                    |  |
|   |  Options: 0 (default), 1, 2-5, 5+                                 |  |
|   |                                                                    |  |
|   |  ---------------------------------------------------------------  |  |
|   |                                                                    |  |
|   |  +----------+                               +------------------+  |  |
|   |  |   Back   |                               |    Continue      |  |  |
|   |  +----------+                               +------------------+  |  |
|   |                                                                    |  |
|   +--------------------------------------------------------------------+  |
|                                                                            |
+============================================================================+
```

### Component Specifications

| Element | Component | Tailwind Classes | Notes |
|---------|-----------|-----------------|-------|
| Threat cards | Custom toggleable cards | Same as data type cards in Step 2 | 6 threat types. Pre-selected based on industry from Step 1. |
| Card selected (default) | `<button>` | `bg-cyan-400/10 border-cyan-400/30 text-cyan-400` | Smart defaults pre-checked on entry |
| Card unselected | `<button>` | `bg-slate-800 border-slate-700 text-slate-400` | User can deselect defaults |
| Previous incidents | Shadcn `Select` | Standard select styling | Options: 0, 1, 2-5, 5+. Default: 0. |
| Smart default note | `<p>` | `text-xs text-slate-500` | "Pre-selected from DBIR data for {industry}. Adjust as needed." |

### Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Threat cards | `<fieldset>` + `<legend>`: "Threat scenarios. Select relevant threats." Each card: `role="checkbox"` + `aria-checked`. |
| Smart defaults announced | When step loads, the pre-selected state is conveyed through `aria-checked="true"` on relevant cards |
| Previous incidents select | Standard Radix Select -- keyboard accessible by default |
| Focus on entry | Focus moves to step title "Threat Landscape" |

### Brand Voice Validation

| Check | Status | Evidence |
|-------|--------|----------|
| Smart defaults reduce burden | Pass | Industry-specific pre-selection from DBIR data |
| Data source attribution | Pass | "Pre-selected from DBIR data for Financial Services" |
| No fear language | Pass | "Threat Scenarios" not "What are you afraid of?" |
| Default to zero incidents | Pass | Conservative but non-alarming default |
| User control preserved | Pass | "Adjust as needed" -- user can override defaults |

---

## Screen 6: Wizard Step 5 -- Review & Calculate (`/assess`)

### Wireframe

```
+============================================================================+
|  CybRisk                                        Step 5 of 5               |
+============================================================================+
|                                                                            |
|   Step 5 of 5: Review & Calculate                                         |
|                                                                            |
|   [check]------[check]------[check]------[check]------(5)                 |
|   [completed]  [completed]  [completed]  [completed]  [active]            |
|                                                                            |
|   +--------------------------------------------------------------------+  |
|   |                                                                    |  |
|   |  (5)  Review & Calculate                                           |  |
|   |                                                                    |  |
|   |       Verify your inputs before we run the simulation.             |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  Company Profile                               [Edit]       |  |  |
|   |  |  (text-sm font-semibold text-slate-50)   (text-cyan-400     |  |  |
|   |  |                                           text-xs, link)    |  |  |
|   |  |                                                              |  |  |
|   |  |  Industry: Financial Services                                |  |  |
|   |  |  Revenue: $50M-$250M                                         |  |  |
|   |  |  Employees: 250-1,000                                        |  |  |
|   |  |  (text-sm text-slate-400, font-mono for values)              |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  (bg-slate-800 border-slate-700 rounded-lg p-4)                    |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  Data Profile                                   [Edit]       |  |  |
|   |  |                                                              |  |  |
|   |  |  Data Types: Customer PII, Financial / Payment Card          |  |  |
|   |  |  Records: ~500,000                                           |  |  |
|   |  |  Sensitivity: Sensitive                                      |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  Security Controls                              [Edit]       |  |  |
|   |  |                                                              |  |  |
|   |  |  6 of 10 controls enabled                                    |  |  |
|   |  |  Enabled: MFA, Encryption, IR Plan, EDR, Training, Scanning |  |  |
|   |  |  Not enabled: SIEM, Backup/DR, Segmentation, WAF            |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  +--------------------------------------------------------------+  |  |
|   |  |  Threat Landscape                               [Edit]       |  |  |
|   |  |                                                              |  |  |
|   |  |  Top Threats: Ransomware, BEC/Phishing, Web App Attack       |  |  |
|   |  |  Previous Incidents: 0                                       |  |  |
|   |  +--------------------------------------------------------------+  |  |
|   |                                                                    |  |
|   |  (space-y-4 for summary cards)                                     |  |
|   |                                                                    |  |
|   |  ---------------------------------------------------------------  |  |
|   |                                                                    |  |
|   |                                                                    |  |
|   |              +------------------------------------------+          |  |
|   |              |                                          |          |  |
|   |              |         Calculate My Risk                |          |  |
|   |              |                                          |          |  |
|   |              |    (h-12 px-8 text-lg font-semibold)     |          |  |
|   |              |    (bg-cyan-400 text-slate-950)           |          |  |
|   |              |    (hover:bg-cyan-300)                    |          |  |
|   |              |    (w-full max-w-sm mx-auto)              |          |  |
|   |              |                                          |          |  |
|   |              +------------------------------------------+          |  |
|   |                                                                    |  |
|   |              Runs 10,000 Monte Carlo simulations using             |  |
|   |              the FAIR model. Your data is not stored.              |  |
|   |              (text-xs text-slate-500, text-center, mt-3)           |  |
|   |                                                                    |  |
|   +--------------------------------------------------------------------+  |
|                                                                            |
+============================================================================+
```

### Component Specifications

| Element | Component | Tailwind Classes | Notes |
|---------|-----------|-----------------|-------|
| Summary card | `<div>` | `bg-slate-800 border-slate-700 rounded-lg p-4` | One card per wizard step (4 total) |
| Card title | `<h3>` | `text-sm font-semibold text-slate-50` | Section name from wizard step |
| Edit link | `<button>` | `text-xs text-cyan-400 hover:text-cyan-300` | Navigates to specific step, preserves all state |
| Summary values | `<span>` | `text-sm text-slate-400` with `font-mono` on data values | Displays user's selections compactly |
| Controls count | `<span>` | `text-sm text-slate-400` | "6 of 10 controls enabled" |
| Calculate CTA | `Button` (large) | `h-12 px-8 text-lg font-semibold bg-cyan-400 text-slate-950 hover:bg-cyan-300 w-full max-w-sm mx-auto rounded-md` | The commitment point |
| Methodology note | `<p>` | `text-xs text-slate-500 text-center mt-3` | Privacy + methodology reassurance |

### Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Summary cards readable | Each card is a `<section>` with `aria-label` matching its heading |
| Edit links | Descriptive: `aria-label="Edit Company Profile"` (not just "Edit") |
| Calculate button | Large target (h-12, full-width up to max-w-sm). Visible text is descriptive. |
| Privacy reassurance | Placed at the commitment point where anxiety peaks |
| Focus management | On entry, focus moves to step title. Tab order: Edit links (4) -> Calculate button. |
| Screen reader | "Review and Calculate. Company Profile. Industry: Financial Services. Revenue: 50 million to 250 million. Employees: 250 to 1000. Edit Company Profile, link." |

### Brand Voice Validation

| Check | Status | Evidence |
|-------|--------|----------|
| No pressure language | Pass | "Verify your inputs" not "Confirm now" or "Don't miss out" |
| Methodology transparency | Pass | "Runs 10,000 Monte Carlo simulations using the FAIR model" |
| Privacy at commitment | Pass | "Your data is not stored" directly below CTA |
| Edit capability | Pass | Every section has an Edit link -- respects user control |
| No gamification | Pass | No score preview, no "your score will be ready" teasers |

---

## Screen 7: Processing State (Overlay on Wizard)

### Wireframe

```
+============================================================================+
|  CybRisk                                                                   |
+============================================================================+
|                                                                            |
|                                                                            |
|                                                                            |
|                                                                            |
|                                                                            |
|                         py-24, centered vertically                         |
|                                                                            |
|                              +--------+                                    |
|                              |        |                                    |
|                              | [    ] |  <-- Activity icon                 |
|                              |        |      h-8 w-8 text-cyan-400         |
|                              +--------+      animate-pulse                 |
|                           (  (  (  )  )  )   <-- animate-ping ring         |
|                              h-16 w-16       border-2 border-cyan-400/30   |
|                              rounded-full                                  |
|                              bg-cyan-400/10                                |
|                                                                            |
|                                                                            |
|                    Running 10,000 simulations...                            |
|                    (text-xl font-semibold text-slate-50)                    |
|                    (ellipsis: animate-pulse)                                |
|                                                                            |
|                    Modeling threat event frequency                          |
|                    (text-sm font-mono text-cyan-400)                        |
|                    (rotates every 800ms, aria-live="polite")               |
|                                                                            |
|                    Phase rotation sequence:                                 |
|                    1. "Modeling threat event frequency"                     |
|                    2. "Sampling loss magnitude distributions"               |
|                    3. "Running FAIR model iterations"                       |
|                    4. "Computing loss exceedance curve"                     |
|                    5. "Calculating Gordon-Loeb optimal spend"              |
|                    6. "Generating risk assessment"                          |
|                                                                            |
|                                                                            |
|              FAIR Methodology  |  Data Never Stored  |  IBM / DBIR /      |
|              NetDiligence Data                                              |
|              (text-xs text-slate-500, flex gap-4)                           |
|              (pipe separators: text-slate-700)                              |
|                                                                            |
|                                                                            |
|   -- If > 5 seconds: --                                                    |
|                                                                            |
|              This is taking a bit longer than usual.                        |
|              Large simulations occasionally need extra time.                |
|              (text-xs text-slate-500, fade in)                              |
|                                                                            |
|   -- If > 10 seconds: --                                                   |
|                                                                            |
|              +-------------------+     +-------------------+               |
|              |   Retry           |     |   Edit Inputs     |               |
|              |   (primary btn)   |     |   (outline btn)   |               |
|              +-------------------+     +-------------------+               |
|                                                                            |
|                                                                            |
|   -- sr-only static description: --                                        |
|   "CybRisk is running 10,000 Monte Carlo simulations using the FAIR       |
|    model. This typically takes 1 to 3 seconds. Results will appear         |
|    automatically when the calculation completes."                           |
|                                                                            |
+============================================================================+
```

### Component Specifications

| Element | Component | Tailwind Classes | Notes |
|---------|-----------|-----------------|-------|
| Container | `SimulationLoading` | `flex flex-col items-center justify-center py-24 space-y-8` | `role="status" aria-label="Running Monte Carlo simulation"` |
| Pulse icon | Lucide `Activity` | `h-8 w-8 text-cyan-400 animate-pulse` | Suppressed with `prefers-reduced-motion` |
| Ping ring | `<div>` | `absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping` | Hidden when reduced motion active |
| Icon container | `<div>` | `h-16 w-16 rounded-full bg-cyan-400/10 flex items-center justify-center` | Relative positioning for ping overlay |
| Headline | `<h2>` | `text-xl font-semibold text-slate-50` | Static text with animated ellipsis |
| Phase text | `<p>` | `text-sm font-mono text-cyan-400 h-5` | `aria-live="polite" aria-atomic="true"`. Cycles every 800ms. |
| Trust signals | `<div>` | `flex items-center gap-4 text-xs text-slate-500` | `aria-hidden="true"` (decorative during loading) |
| Timeout message | `<p>` | `text-xs text-slate-500` | Appears after 5 seconds |
| Retry/Edit buttons | `Button` pair | Primary + Outline variants | Appear after 10 seconds |
| SR description | `<p>` | `sr-only` | One-time static description for screen readers |

### Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Status role | `role="status"` on container announces to screen readers |
| Phase announcements | `aria-live="polite"` on phase text. VoiceOver queues/batches at 800ms intervals. |
| Static fallback | `sr-only` paragraph gives complete context without cycling messages |
| Reduced motion | CSS: `@media (prefers-reduced-motion: reduce)` disables all animations. React: `usePrefersReducedMotion()` hook conditionally renders ping ring. |
| No keyboard traps | No interactive elements during normal processing (1-3s). Retry/Edit buttons appear only on timeout. |
| Error focus | On API error, focus moves to error message `role="alert"` container |

### Brand Voice Validation

| Check | Status | Evidence |
|-------|--------|----------|
| Honest about what's happening | Pass | Phase descriptions match real computation steps |
| Uses "simulations" not "predictions" | Pass | "Running 10,000 simulations" |
| Trust reinforcement during wait | Pass | FAIR Methodology, Data Never Stored, data sources |
| No false precision on timing | Pass | No percentage progress bar (network latency is the real bottleneck) |
| Graceful degradation | Pass | Timeout message is honest: "taking a bit longer than usual" |

---

## Screen 8: Results Dashboard (`/results`)

### Wireframe

```
+============================================================================+
|                                                                            |
|  CybRisk                            [New Assessment]  [Share Results]      |
|                                      (outline btn)    (ghost btn)          |
|                                                                            |
+============================================================================+
|                                                                            |
|                         max-w-7xl, py-8, px-4/6/8                          |
|                                                                            |
|   Financial Services  |  $50M-$250M Revenue  |  500,000 Records  |        |
|   Feb 22, 2026                                                             |
|   (text-sm text-slate-400, pipe separators text-slate-700)                 |
|   (date: font-mono text-slate-500)                                         |
|                                                                            |
+----------------------------------------------------------------------------+
|                                                                            |
|   +----------------------------------------------------------------------+ |
|   |                                                                      | |
|   |  Your Financial Exposure                          +--MODERATE------+ | |
|   |  (text-3xl font-bold tracking-tight text-slate-50)| [AlertTriangle]| | |
|   |                                                   | bg-amber-400/15| | |
|   |  Based on 10,000 Monte Carlo simulations          | text-amber-400 | | |
|   |  using the FAIR model                             | border-amber/30| | |
|   |  (text-slate-400)                                 +----------------+ | |
|   |                                                                      | |
|   +----------------------------------------------------------------------+ |
|                                                                            |
|   +----------------------------------------------------------------------+ |
|   |                                                                      | |
|   |  Estimated Annual Loss Exposure (Mean)                               | |
|   |  (text-sm text-slate-400)                                            | |
|   |                                                                      | |
|   |  $1.25M                   (90% between $120K and $3.4M)             | |
|   |  (text-5xl font-bold      (text-lg font-mono text-slate-500)        | |
|   |   font-mono tracking-                                                | |
|   |   tight text-slate-50)                                               | |
|   |                                                                      | |
|   +----------------------------------------------------------------------+ |
|   (rounded-lg bg-slate-900 border border-slate-700 p-6)                   |
|                                                                            |
+----------------------------------------------------------------------------+
|                                                                            |
|   +---------------+  +---------------+  +---------------+  +-------------+ |
|   |               |  |               |  |               |  |             | |
|   | [DollarSign]  |  | [TrendingUp]  |  | [Target]      |  | [Shield    | |
|   |  Median ALE   |  |  PML (95th)   |  |  Recommended  |  |  Alert]    | |
|   |  (text-sm     |  |  (text-sm     |  |  Spend        |  |  Industry  | |
|   |   text-slate  |  |   text-slate  |  |  (text-sm     |  |  Percentile| |
|   |   -400)       |  |   -400)       |  |   text-slate  |  |  (text-sm  | |
|   |               |  |               |  |   -400)       |  |   text-    | |
|   |  $1,250,000   |  |  $5,200,000   |  |  $462,500     |  |  slate-400)| |
|   |  (text-3xl    |  |  (text-3xl    |  |  (text-3xl    |  |            | |
|   |   font-bold   |  |   font-bold   |  |   font-bold   |  |  38th      | |
|   |   font-mono   |  |   font-mono   |  |   font-mono   |  |  percentile| |
|   |   text-slate  |  |   text-slate  |  |   text-slate  |  |  (text-3xl | |
|   |   -50)        |  |   -50)        |  |   -50)        |  |   font-bold| |
|   |               |  |               |  |               |  |   font-mono| |
|   | 50th          |  | Value at Risk |  | Gordon-Loeb   |  |  text-slate| |
|   | percentile    |  |               |  | optimal       |  |  -50)      | |
|   | of 10,000     |  |               |  | investment    |  |            | |
|   | simulations   |  |               |  |               |  | Below      | |
|   | (text-sm      |  | (text-sm      |  | (text-sm      |  | industry   | |
|   |  text-slate   |  |  text-slate   |  |  text-slate   |  | median     | |
|   |  -500)        |  |  -500)        |  |  -500)        |  | (text-sm   | |
|   |               |  |               |  |               |  |  text-slate| |
|   | accent:       |  | accent:       |  | accent:       |  |  -500)     | |
|   | cyan-400      |  | rose-500      |  | emerald-400   |  |            | |
|   +---------------+  +---------------+  +---------------+  +-------------+ |
|                                                                            |
|   (grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4)                  |
|   (each: KpiCard component, bg-slate-900 border-slate-700 rounded-lg p-6) |
|                                                                            |
+----------------------------------------------------------------------------+
|                                                                            |
|   +----------------------------------+  +----------------------------------+
|   |                                  |  |                                  |
|   |  Loss Distribution               |  |  Loss Exceedance Curve           |
|   |  (text-lg font-semibold          |  |  (text-lg font-semibold          |
|   |   text-slate-50)                 |  |   text-slate-50)                 |
|   |                                  |  |                                  |
|   |  Probability distribution of     |  |  Probability of annual loss      |
|   |  annual loss from 10,000 Monte   |  |  exceeding each threshold        |
|   |  Carlo simulations               |  |  (text-sm text-slate-500)        |
|   |  (text-sm text-slate-500)        |  |                                  |
|   |                                  |  |                                  |
|   |   %                              |  |  100%                            |
|   |  30|     ___                     |  |   |--___                         |
|   |  25|    |   |                    |  |   |     ---__                    |
|   |  20|    |   |___                 |  |   |          ---___              |
|   |  15| ___|   |   |               |  |   |               ----___        |
|   |  10||   |   |   |___            |  |   |                     ----___  |
|   |   5||   |   |   |   |___   _    |  |   |                          ---||
|   |   0+---+---+---+---+---+---+   |  |   +---+---+---+---+---+---+---+ |
|   |    $0  $250K $500K $1M  $2M $5M |  |   $0  $500K $1M  $2M  $3M $5M  |
|   |                                  |  |                                  |
|   |  (BarChart, Recharts)            |  |  (LineChart, Recharts)           |
|   |  bars: fill=cyan-400             |  |  line: stroke=cyan-400           |
|   |  radius=[2,2,0,0]               |  |  dot=false                       |
|   |  grid: strokeDasharray="3 3"     |  |  area fill: cyan-400/5           |
|   |  axis: JetBrains Mono 12px      |  |  axis: JetBrains Mono 12px      |
|   |  isAnimationActive={false}       |  |  isAnimationActive={false}       |
|   |                                  |  |                                  |
|   |  [sr-only data table with        |  |  [sr-only data table with        |
|   |   Loss Range, Probability,       |  |   Loss Threshold, Exceedance     |
|   |   Simulation Count columns]      |  |   Probability columns]           |
|   |                                  |  |                                  |
|   +----------------------------------+  +----------------------------------+
|                                                                            |
|   (grid grid-cols-1 lg:grid-cols-2 gap-6)                                  |
|   (each: ChartContainer, bg-slate-900 border-slate-700 rounded-lg)        |
|   (chart area: h-[300px])                                                  |
|                                                                            |
+----------------------------------------------------------------------------+
|                                                                            |
|   Key Risk Drivers                                                         |
|   (text-lg font-semibold text-slate-50)                                    |
|                                                                            |
|   +----------------------------------------------------------------------+ |
|   |  +------------------------------------------------------------------+| |
|   |  | [1]  500,000 customer PII records               [HIGH impact]   || |
|   |  |      Per-record cost of $175 is the primary loss driver.        || |
|   |  |      (bg-slate-800 border-slate-700 rounded-lg px-4 py-3)      || |
|   |  +------------------------------------------------------------------+| |
|   |  +------------------------------------------------------------------+| |
|   |  | [2]  No backup/DR or network segmentation       [HIGH impact]   || |
|   |  |      Increases vulnerability to ransomware lateral movement.    || |
|   |  +------------------------------------------------------------------+| |
|   |  +------------------------------------------------------------------+| |
|   |  | [3]  No SIEM / security monitoring               [MED impact]   || |
|   |  |      Increases mean time to detect from 194 to 292 days.       || |
|   |  +------------------------------------------------------------------+| |
|   |  +------------------------------------------------------------------+| |
|   |  | [4]  No WAF deployed                             [MED impact]   || |
|   |  |      Web app attacks represent 15% of breaches (DBIR 2025).    || |
|   |  +------------------------------------------------------------------+| |
|   |                                                                      | |
|   |  Impact badges:                                                      | |
|   |    HIGH = bg-rose-500/15 text-rose-500 border-rose-500/30            | |
|   |    MED  = bg-amber-400/15 text-amber-400 border-amber-400/30         | |
|   |    LOW  = bg-emerald-400/15 text-emerald-400 border-emerald-400/30   | |
|   |  (each badge is a pill: rounded-full px-2 py-0.5 text-xs font-bold) | |
|   |  (always paired with text label for color-blind users)               | |
|   +----------------------------------------------------------------------+ |
|   (bg-slate-900 border-slate-700 rounded-lg, Card component)              |
|                                                                            |
+----------------------------------------------------------------------------+
|                                                                            |
|   Key Recommendations                                                      |
|   (text-lg font-semibold text-slate-50)                                    |
|                                                                            |
|   +----------------------------------------------------------------------+ |
|   |  +------------------------------------------------------------------+| |
|   |  | (1)  Implement backup/DR and test recovery procedures            || |
|   |  |      bg-cyan-400/10 rounded-full h-6 w-6 text-xs text-cyan-400  || |
|   |  |                                                                  || |
|   |  |      Estimated savings: ~$290K/year                              || |
|   |  |      (text-xs font-mono text-emerald-400)                        || |
|   |  +------------------------------------------------------------------+| |
|   |  +------------------------------------------------------------------+| |
|   |  | (2)  Deploy network segmentation                                 || |
|   |  |                                                                  || |
|   |  |      Estimated savings: ~$210K/year                              || |
|   |  +------------------------------------------------------------------+| |
|   |  +------------------------------------------------------------------+| |
|   |  | (3)  Implement SIEM or managed detection service                  || |
|   |  |                                                                  || |
|   |  |      Estimated savings: ~$185K/year                              || |
|   |  +------------------------------------------------------------------+| |
|   |  +------------------------------------------------------------------+| |
|   |  | (4)  Deploy a web application firewall                           || |
|   |  |                                                                  || |
|   |  |      Estimated savings: ~$95K/year                               || |
|   |  +------------------------------------------------------------------+| |
|   |  +------------------------------------------------------------------+| |
|   |  | (5)  Gordon-Loeb optimal spend: invest up to $462K in security   || |
|   |  |      controls. Spending beyond this yields diminishing returns.  || |
|   |  +------------------------------------------------------------------+| |
|   |                                                                      | |
|   |  (space-y-3, each: bg-slate-800 border-slate-700 rounded-lg px-4    | |
|   |   py-3, numbered circles in cyan-400/10)                             | |
|   +----------------------------------------------------------------------+ |
|   (bg-slate-900 border-slate-700 rounded-lg, Card component)              |
|                                                                            |
+----------------------------------------------------------------------------+
|                                                                            |
|   +----------------------------------------------------------------------+ |
|   |                                                                      | |
|   |  +-------------------------------+  +-----------------------------+  | |
|   |  |    Recalculate                |  |    Share Results             |  | |
|   |  |    (primary btn, cyan-400)    |  |    (outline btn)            |  | |
|   |  |    Links to /assess           |  |    Copy URL to clipboard    |  | |
|   |  +-------------------------------+  +-----------------------------+  | |
|   |                                                                      | |
|   |  (flex items-center justify-center gap-4, py-6)                      | |
|   +----------------------------------------------------------------------+ |
|                                                                            |
+----------------------------------------------------------------------------+
|                                                                            |
|   Methodology & Sources                                                    |
|   (text-sm font-semibold text-slate-50)                                    |
|                                                                            |
|   Estimates generated using the Open FAIR (Factor Analysis of Information  |
|   Risk) model with 10,000 Monte Carlo iterations. Loss parameters          |
|   calibrated from:                                                         |
|                                                                            |
|   - IBM Cost of a Data Breach Report 2025                                  |
|   - Verizon Data Breach Investigations Report (DBIR) 2025                  |
|   - NetDiligence Cyber Claims Study 2025                                   |
|   - Gordon-Loeb Model for optimal security investment                      |
|                                                                            |
|   These are estimates, not predictions. Actual losses depend on factors     |
|   beyond any model's scope. For engagement-grade risk assessment,          |
|   consult a qualified risk advisor.                                        |
|   (text-xs text-slate-500)                                                 |
|                                                                            |
+----------------------------------------------------------------------------+
|                                                                            |
|   CybRisk | MIT License | Built by Albert Hui -- Security Ronin            |
|   Your data was processed in-memory and is not stored.                     |
|   (text-xs text-slate-500, border-t border-slate-800, py-8)               |
|                                                                            |
+============================================================================+
```

### Component Specifications

| Element | Component | Tailwind Classes | Notes |
|---------|-----------|-----------------|-------|
| Context bar | `<div>` | `flex items-center gap-4 text-sm text-slate-400` | Industry, revenue, records, date |
| Page heading | `<h1>` | `text-3xl font-bold tracking-tight text-slate-50` with `tabIndex={-1}` for focus management | "Your Financial Exposure" |
| Risk badge | `RiskRatingBadge` | See UI Design System. `role="status" aria-label="Risk rating: MODERATE"` | Color-coded: emerald/amber/orange/rose |
| ALE headline | `<div>` | Card: `bg-slate-900 border-slate-700 rounded-lg p-6` | Dollar figure: `text-5xl font-bold font-mono tracking-tight text-slate-50`. Interval: `text-lg font-mono text-slate-500` |
| KPI row | `KpiCard` x4 | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` | Each card: `bg-slate-900 border-slate-700 rounded-lg p-6` |
| KPI: Median ALE | `KpiCard` | Icon: `DollarSign`, accent: `text-cyan-400` | Value: `$1,250,000`. Sublabel: "50th percentile of 10,000 simulations" |
| KPI: PML 95th | `KpiCard` | Icon: `TrendingUp`, accent: `text-rose-500` | Value: `$5,200,000`. Sublabel: "Value at Risk" |
| KPI: Rec. Spend | `KpiCard` | Icon: `Target`, accent: `text-emerald-400` | Value: `$462,500`. Sublabel: "Gordon-Loeb optimal investment" |
| KPI: Percentile | `KpiCard` | Icon: `ShieldAlert`, accent: `text-amber-400` | Value: `38th percentile`. Sublabel: "Below industry median" |
| Loss histogram | `ChartContainer` + Recharts `BarChart` | Container: `bg-slate-900 border-slate-700`. Chart: `h-[300px]` | Bars: `fill=cyan-400 radius=[2,2,0,0]`. `isAnimationActive={false}` |
| Exceedance curve | `ChartContainer` + Recharts `LineChart` | Same container. Line: `stroke=cyan-400` | `dot={false}`. Area fill: `cyan-400` at 5% opacity. |
| Key Drivers | `Card` with list | Each driver: `bg-slate-800 border-slate-700 rounded-lg px-4 py-3` | Impact badges use color + text label (never color alone) |
| Impact badge HIGH | `<span>` | `bg-rose-500/15 text-rose-500 border-rose-500/30 rounded-full px-2 py-0.5 text-xs font-bold` | Always paired with "HIGH" text |
| Impact badge MED | `<span>` | `bg-amber-400/15 text-amber-400 border-amber-400/30 ...` | Always paired with "MED" text |
| Impact badge LOW | `<span>` | `bg-emerald-400/15 text-emerald-400 border-emerald-400/30 ...` | Always paired with "LOW" text |
| Recommendations | `Card` with ordered list | Each item: `bg-slate-800 border-slate-700 rounded-lg px-4 py-3` | Numbered. Dollar savings in `font-mono text-emerald-400`. |
| Footer CTAs | `Button` pair | Primary: Recalculate (cyan-400). Outline: Share Results. | `flex items-center justify-center gap-4 py-6` |
| Methodology | `<section>` | `text-xs text-slate-500` | Cites all 4 data sources. Includes limitations disclaimer. |
| Footer | `<footer>` | `border-t border-slate-800 py-8 text-xs text-slate-500` | Privacy, license, builder credit |

### Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Page title | `<title>Your Risk Assessment Results -- CybRisk</title>` |
| Focus on load | `headingRef.current?.focus()` on mount (100ms delay for paint) |
| Heading hierarchy | `<h1>` "Your Financial Exposure". `<h2>` for each section (Loss Distribution, Key Drivers, etc.) |
| KPI cards | `role="group" aria-label={label}`. Dollar values: `aria-label={formatDollarForScreenReader(value)}` |
| Risk badge | `role="status" aria-label="Risk rating: MODERATE"`. Icon: `aria-hidden="true"` |
| Chart SVGs | `aria-hidden="true"` on all Recharts `<svg>` elements |
| Chart data tables | `sr-only` region per chart with `<table>`, `<caption>`, `<th scope="col">` |
| Loss Distribution table | Columns: Loss Range, Probability (%), Simulation Count. Summary text with median, P5, P95. |
| Exceedance Curve table | Columns: Loss Threshold ($), Exceedance Probability (%). |
| Impact badges | Color + text label + icon shape (never color alone). "HIGH impact" reads correctly to screen readers. |
| Recommendations ordered list | `<ol>` with numbered items. Dollar savings: `aria-label` for abbreviated values. |
| Abbreviated dollar values | "$1.25M" gets `aria-label="1 million 250 thousand dollars"`. "$120K" gets `aria-label="120 thousand dollars"`. |
| Landmark regions | `<section aria-label="Key risk metrics">`, `<section aria-label="Risk visualizations">`, `<section aria-label="Recommendations">`, `<section aria-label="Methodology and sources">` |

### Brand Voice Validation

| Check | Status | Evidence |
|-------|--------|----------|
| Dollars are the hero | Pass | `$1.25M` in text-5xl is the single largest element on the page |
| Distribution shown, not just average | Pass | "90% between $120K and $3.4M" inline with headline. Full histogram. Exceedance curve. |
| Uses "estimated", never "predicted" | Pass | "Estimated Annual Loss Exposure", "Estimated savings" |
| Data sources cited | Pass | Methodology section lists IBM, DBIR, NetDiligence, Gordon-Loeb |
| No letter grades | Pass | Dollar figures + percentile rank, not A/B/C/D/F |
| No gamification | Pass | No points, badges, or scores |
| No "AI-powered" | Pass | "Monte Carlo simulations using the FAIR model" |
| Recommendations lead with dollars | Pass | "Estimated savings: ~$290K/year" on each recommendation |
| Honest about limitations | Pass | "These are estimates, not predictions" in methodology section |
| No FUD | Pass | Recommendations are positive ("Implement X, save $Y") not negative ("You will be breached if you don't X") |
| No stock photography | Pass | Charts and data are the only visuals |
| No signup gates | Pass | Recalculate links directly to /assess. Share copies URL. No email capture. |

---

## Responsive Behavior Summary

All wireframes above show the desktop layout (1280px+). Responsive adaptations follow these rules from the UI Design System.

| Breakpoint | Layout Changes |
|-----------|----------------|
| `lg` (1024px+) | Full desktop layout as wireframed. KPI: 4 columns. Charts: 2 columns. |
| `sm` to `lg` (640-1023px) | KPI: 2x2 grid. Charts: stacked single column. Wizard unchanged (already single-column). |
| Below `sm` (<640px) | KPI: stacked single column. Feature cards: stacked. Data type / threat cards: 2-column grid. |

The wizard (`max-w-2xl`) is inherently responsive -- its single-column layout adapts naturally to all screen widths.

---

## Screen Inventory

| # | Screen | Route | Purpose | Estimated Implementation |
|---|--------|-------|---------|------------------------|
| 1 | Landing Page | `/` | Conversion: visitor to wizard start | 2-3 hours |
| 2 | Wizard Step 1: Company Profile | `/assess` | Collect org context (industry, revenue, size) | 1 hour |
| 3 | Wizard Step 2: Data Profile | `/assess` | Collect data types, volume, sensitivity | 1.5 hours |
| 4 | Wizard Step 3: Security Controls | `/assess` | Collect current security posture (10 toggles) | 1 hour |
| 5 | Wizard Step 4: Threat Landscape | `/assess` | Collect threat scenarios with smart defaults | 1 hour |
| 6 | Wizard Step 5: Review & Calculate | `/assess` | Summary review + CTA commitment point | 1.5 hours |
| 7 | Processing State | `/assess` (overlay) | Loading animation during API call | 1 hour |
| 8 | Results Dashboard | `/results` | Financial exposure output with charts | 3-4 hours |

**Total estimated frontend implementation**: 12-15 hours

---

*Document generated by North Star Advisor*
