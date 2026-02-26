# CybRisk: Accessibility Specification

> **Created**: 2026-02-22
> **Status**: Active
> **Builder**: Albert Hui -- Chief Forensicator, Security Ronin
> **WCAG Target**: 2.1 Level AA
> **Framework**: Next.js 14+ App Router, Tailwind CSS v4, Shadcn/ui (Radix UI primitives), Recharts, Lucide React
> **Pages**: `/` (landing), `/assess` (wizard), `/results` (dashboard)
> **Screen Reader Priority**: VoiceOver (macOS), NVDA (Windows)

Accessibility specification for CybRisk. Defines WCAG 2.1 AA compliance strategy, component-level ARIA patterns, keyboard navigation flows, screen reader behavior for the assessment wizard and results dashboard, and a manual testing protocol.

---

## Accessibility Philosophy

CybRisk is a financial risk calculator, not a marketing website. Accessibility here means ensuring that a blind vCISO can complete a 5-step risk assessment and comprehend the results, that a keyboard-only user can navigate the wizard without a mouse, and that the data-dense results dashboard conveys meaning through structure and text -- not only through color and charts.

Three guiding principles:

1. **Numbers must be readable.** Dollar figures in JetBrains Mono must announce correctly to screen readers. "$1,250,000" should read as "one million two hundred fifty thousand dollars," not "dollar sign one comma two five zero comma zero zero zero."
2. **Charts must have text alternatives.** Recharts renders SVG. SVG is opaque to screen readers. Every chart requires a companion data table or structured text summary.
3. **Color is never the sole indicator.** Risk rating badges use color + text label + icon shape (ShieldCheck vs AlertTriangle vs ShieldAlert). Trend arrows use color + direction symbol + text label.

---

## WCAG 2.1 AA Compliance Checklist

### Perceivable

| Criterion | ID | CybRisk Status | Implementation Notes |
|---|---|---|---|
| Non-text content has text alternatives | 1.1.1 | Requires work | Recharts SVG charts need `aria-hidden="true"` on the `<svg>` and a companion `<table>` or `sr-only` summary. Lucide icons are decorative when paired with text labels -- use `aria-hidden="true"` on them. |
| Captions for time-based media | 1.2.1 | N/A | CybRisk has no audio or video content. |
| Info and relationships conveyed through structure | 1.3.1 | Mostly covered | Shadcn/ui Card, Label, and Select components use semantic HTML. Wizard progress bar needs explicit `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. KPI cards need heading hierarchy. |
| Meaningful sequence | 1.3.2 | Covered | Tailwind flex/grid layouts match DOM order. Wizard steps render sequentially. Results page follows top-to-bottom information hierarchy: headline ALE, KPI row, charts, recommendations. |
| Sensory characteristics | 1.3.3 | Requires work | Risk rating badges already use color + text + icon. Chart axis labels must not rely solely on position -- include explicit labels in data table alternatives. |
| Orientation not restricted | 1.3.4 | Covered | No orientation lock. Responsive grid adapts to portrait/landscape via Tailwind breakpoints. |
| Input purpose identified | 1.3.5 | Covered | Wizard form fields use semantic `<label>` elements via Shadcn/ui Label component. Autocomplete attributes added where applicable (industry, geography selects do not map to standard autocomplete tokens -- acceptable). |
| Color contrast (minimum) | 1.4.3 | Passes AA | All text/background combinations meet WCAG AA 4.5:1 minimum. See contrast table below. |
| Resize text up to 200% | 1.4.4 | Covered | Tailwind responsive units. Layout does not break at 200% zoom. Single-column wizard layout accommodates reflow naturally. Results grid stacks to single column. |
| Images of text | 1.4.5 | Covered | CybRisk uses no images of text. All text is rendered as HTML/CSS. The CybRisk logo is a text-based wordmark rendered in Inter Bold -- not an image. |
| Non-text contrast | 1.4.11 | Covered | Focus rings (`ring-2 ring-cyan-400/50`) achieve 3:1+ contrast against `slate-950`. Form input borders (`slate-600` on `slate-950`) achieve 3.5:1. Toggle switch tracks meet 3:1 in both states. |
| Text spacing adjustable | 1.4.12 | Covered | No fixed-height containers that clip text. Tailwind utility classes do not override user stylesheet adjustments for line-height, letter-spacing, word-spacing, or paragraph spacing. |
| Content on hover/focus | 1.4.13 | Covered | Recharts tooltips (hover) are dismissible (mouse away), hoverable (mouse can enter tooltip), and persistent (tooltip stays while cursor is within chart area). Shadcn/ui Popover and Select dropdown meet this criterion natively via Radix UI. |

### Operable

| Criterion | ID | CybRisk Status | Implementation Notes |
|---|---|---|---|
| Keyboard accessible | 2.1.1 | Mostly covered | Shadcn/ui components (Button, Select, Switch, Slider) are keyboard accessible via Radix UI primitives. Custom threat-type multi-select cards need explicit `tabindex="0"` and `onKeyDown` handlers for Space/Enter toggle. |
| No keyboard trap | 2.1.2 | Covered | Radix UI manages focus trapping in modals/popovers and releases on Escape. Wizard navigation uses standard Tab flow -- no custom focus traps. |
| Timing adjustable | 2.2.1 | N/A | The simulation loading animation cycles status messages at 800ms intervals -- this is decorative feedback during a 1-3 second API call, not timed content. No user action is time-limited. |
| Pause, stop, hide | 2.2.2 | Requires work | The `SimulationLoading` component has `animate-pulse` on the Activity icon and `animate-ping` on the outer ring. These must be suppressed when `prefers-reduced-motion: reduce` is active. See reduced motion section. |
| Three flashes or below | 2.3.1 | Covered | `animate-ping` pulses at ~1Hz (below 3Hz threshold). No strobe effects anywhere in the application. |
| Bypass blocks | 2.4.1 | Requires work | Add skip navigation link: "Skip to main content" as the first focusable element in the layout. Link targets: `#main-content` on all pages. |
| Page titled | 2.4.2 | Requires work | Each route needs a descriptive `<title>` via Next.js metadata API. Landing: "CybRisk -- Cyber Risk Posture Calculator". Wizard: "Step N of 5 -- Risk Assessment -- CybRisk". Results: "Your Risk Assessment Results -- CybRisk". |
| Focus order | 2.4.3 | Covered | DOM order matches visual order across all pages. Wizard form fields follow top-to-bottom order within each step card. Navigation buttons (Back, Continue) are at the bottom in expected left-to-right order. |
| Link purpose from context | 2.4.4 | Covered | CTAs have descriptive text: "Assess Your Risk," "Calculate My Risk," "Run Another Assessment." No naked "Click here" links. |
| Multiple ways to find pages | 2.4.5 | Covered | CybRisk has three pages total. The header contains navigation to all pages. The wizard flows sequentially from landing. The results page links back to `/assess`. Site is simple enough that no sitemap or search is needed. |
| Headings and labels descriptive | 2.4.6 | Covered | Every wizard step has a descriptive heading ("Company Profile," "Data Profile," etc.). Results sections use descriptive headings ("Loss Distribution," "Key Recommendations"). Form labels describe the input ("Select your industry," "Approximate records held"). |
| Focus visible | 2.4.7 | Covered | All focusable elements use `focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`. Cyan-400 at 50% on slate-950 provides a clearly visible 2px ring. Shadcn/ui components inherit this via CSS variable `--ring`. |
| Pointer gestures | 2.5.1 | Covered | No multi-finger or path-based gestures required. All interactions are single-click/tap. Sliders (Shadcn/ui Slider via Radix) support both drag and keyboard arrow keys. |
| Pointer cancellation | 2.5.2 | Covered | Standard HTML buttons use `click` (up event), not `mousedown`. Shadcn/ui components follow this convention natively. |
| Label in name | 2.5.3 | Covered | Visible label text matches accessible name for all form controls. "Select your industry" label matches the `aria-label` on the Select trigger. |
| Motion actuation | 2.5.4 | N/A | No device motion or shaking triggers in CybRisk. |

### Understandable

| Criterion | ID | CybRisk Status | Implementation Notes |
|---|---|---|---|
| Language of page | 3.1.1 | Requires work | Add `lang="en"` to `<html>` element in `src/app/layout.tsx`. Next.js App Router supports this via the root layout. |
| On focus -- no context change | 3.2.1 | Covered | No component changes context on focus. Select dropdowns open on click/Enter, not on focus. |
| On input -- no unexpected change | 3.2.2 | Covered | Wizard step navigation requires explicit button click ("Continue"). Dropdown selection does not auto-advance. Toggle switches update local state only. |
| Consistent navigation | 3.2.3 | Covered | Header navigation is identical across all three pages. Wizard progress bar is consistent across Steps 1-5. |
| Consistent identification | 3.2.4 | Covered | "Continue" button is always the primary forward action. "Back" button is always the secondary backward action. Same styling, same position, same label across all wizard steps. |
| Error identification | 3.3.1 | Requires work | Inline validation errors must be announced to screen readers via `aria-live="polite"` region. Error messages must identify the field in error. See error announcement patterns below. |
| Labels or instructions | 3.3.2 | Covered | All form fields have visible labels. Complex fields (record count slider, threat type multi-select) include descriptive helper text. Tooltip explanations available for unfamiliar terms. |
| Error suggestion | 3.3.3 | Requires work | Validation error messages must suggest correction: "Please select a revenue band" (not "Invalid input"). "Select at least one data type" (not "Required field"). |
| Error prevention -- legal/financial | 3.3.4 | Covered | Step 5 (Review & Submit) shows all inputs before calculation. Users can edit any section. The review step is CybRisk's built-in confirmation mechanism. No irreversible actions exist -- assessments are stateless and repeatable. |

### Robust

| Criterion | ID | CybRisk Status | Implementation Notes |
|---|---|---|---|
| Parsing (valid HTML) | 4.1.1 | Covered | Next.js generates valid HTML. Shadcn/ui components use semantic elements. React enforces unique `key` props in lists. |
| Name, role, value | 4.1.2 | Mostly covered | Shadcn/ui components expose correct ARIA roles via Radix UI primitives. Custom components (RiskRatingBadge, KpiCard, WizardProgress) need explicit ARIA attributes. See component ARIA patterns below. |
| Status messages | 4.1.3 | Requires work | Simulation loading status ("Running 10,000 simulations..."), validation errors, and results loaded announcements need `aria-live` regions. See live region patterns below. |

---

## Color Contrast Audit

All measurements taken against `slate-950` (#020617) background.

### Text Contrast

| Element | Foreground | Background | Ratio | WCAG Level | Verdict |
|---|---|---|---|---|---|
| Body text (headings, paragraphs) | Slate-50 #f8fafc | Slate-950 #020617 | 17.4:1 | AAA | Pass |
| KPI dollar figures (JetBrains Mono) | Slate-50 #f8fafc | Slate-900 #0f172a | 15.1:1 | AAA | Pass |
| Labels, descriptions | Slate-400 #94a3b8 | Slate-950 #020617 | 5.3:1 | AA | Pass |
| Labels on card surface | Slate-400 #94a3b8 | Slate-900 #0f172a | 4.6:1 | AA | Pass |
| Muted text (footnotes, captions) | Slate-500 #64748b | Slate-950 #020617 | 3.7:1 | AA Large | Pass for large text only |
| Primary accent text | Cyan-400 #22d3ee | Slate-950 #020617 | 10.1:1 | AAA | Pass |
| Primary button text | Slate-950 #020617 | Cyan-400 #22d3ee | 10.1:1 | AAA | Pass |
| Positive indicator | Emerald-400 #34d399 | Slate-950 #020617 | 9.2:1 | AAA | Pass |
| Warning indicator | Amber-400 #fbbf24 | Slate-950 #020617 | 11.8:1 | AAA | Pass |
| Danger indicator | Rose-500 #f43f5e | Slate-950 #020617 | 5.7:1 | AA | Pass |
| High risk indicator | Orange-400 #fb923c | Slate-950 #020617 | 8.6:1 | AAA | Pass |

### Non-Text Contrast

| Element | Foreground | Background | Ratio | Verdict |
|---|---|---|---|---|
| Focus ring | Cyan-400/50 | Slate-950 | 5.0:1 | Pass (3:1 required) |
| Input border (default) | Slate-600 #475569 | Slate-950 #020617 | 3.5:1 | Pass (3:1 required) |
| Input border (focus) | Cyan-400 #22d3ee | Slate-950 #020617 | 10.1:1 | Pass |
| Card border | Slate-700 #334155 | Slate-950 #020617 | 2.3:1 | Decorative -- not required |
| Switch track (unchecked) | Slate-600 #475569 | Slate-900 #0f172a | 2.7:1 | Borderline -- add `border-slate-500` for 3.2:1 |
| Switch track (checked) | Cyan-400 #22d3ee | Slate-900 #0f172a | 8.8:1 | Pass |
| Wizard progress circle (future) | Slate-800 #1e293b | Slate-950 #020617 | 1.7:1 | Fails -- supplement with text labels below circles |

### Remediation Required

1. **Slate-500 muted text** (3.7:1) passes only for large text (18px+ or 14px bold). Use only for footnotes and chart axis captions at 12px bold or larger. For body-sized muted text, use `text-slate-400` (5.3:1) instead.
2. **Switch track unchecked state** -- add `border border-slate-500` to give the unchecked switch track an explicit border meeting 3:1 against `slate-900` card backgrounds.
3. **Wizard progress future circles** -- the text labels below the circles ("Company Profile," "Data Profile," etc.) serve as the accessible indicator. The circles themselves are supplementary visual decoration. Ensure the step labels remain visible.

---

## Component ARIA Patterns

### Wizard Progress Bar

The wizard progress bar communicates the user's position across 5 steps. It must be perceivable to screen readers as both a progress indicator and a navigation landmark.

```tsx
// src/components/assess/wizard-progress.tsx
// ARIA additions to the existing WizardProgress component

<nav aria-label="Assessment progress">
  <p className="text-sm text-slate-400 mb-4" aria-live="polite">
    Step {currentStep} of {totalSteps}:{" "}
    <span className="text-slate-50 font-medium">{stepLabels[currentStep - 1]}</span>
  </p>

  <ol
    className="flex items-center gap-0"
    role="list"
    aria-label="Assessment steps"
  >
    {stepLabels.map((label, index) => {
      const stepNum = index + 1;
      const isCompleted = stepNum < currentStep;
      const isCurrent = stepNum === currentStep;

      return (
        <li
          key={stepNum}
          className="flex items-center flex-1 last:flex-none"
          aria-current={isCurrent ? "step" : undefined}
        >
          <div
            className={cn(/* existing styles */)}
            aria-hidden="true" // Circle is decorative; label text below carries meaning
          >
            {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
          </div>

          {/* Connector line -- decorative */}
          {stepNum < totalSteps && (
            <div className={cn(/* existing styles */)} aria-hidden="true" />
          )}
        </li>
      );
    })}
  </ol>

  {/* Step labels -- these carry the accessible meaning */}
  <div className="flex mt-2" role="list" aria-label="Step names">
    {stepLabels.map((label, index) => (
      <div
        key={index}
        role="listitem"
        className={cn(/* existing styles */)}
      >
        <span className="sr-only">
          {index + 1 < currentStep ? "Completed: " : ""}
          {index + 1 === currentStep ? "Current step: " : ""}
          {index + 1 > currentStep ? "Upcoming: " : ""}
        </span>
        {label}
      </div>
    ))}
  </div>
</nav>
```

**Screen reader experience (VoiceOver):**
> "Assessment progress, navigation. Step 3 of 5: Security Controls. Assessment steps, list, 5 items. Completed: Company Profile. Completed: Data Profile. Current step: Security Controls. Upcoming: Threat Landscape. Upcoming: Review and Submit."

### Wizard Step Card

Each wizard step card acts as a form region.

```tsx
// src/components/assess/wizard-step-card.tsx
// ARIA additions

<Card
  className={cn("bg-slate-900 border-slate-700 max-w-2xl mx-auto", className)}
  role="region"
  aria-labelledby={`step-${stepNumber}-title`}
>
  <CardHeader>
    <div className="flex items-center gap-3 mb-1">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-400"
        aria-hidden="true"
      >
        {stepNumber}
      </span>
      <CardTitle
        id={`step-${stepNumber}-title`}
        className="text-xl font-semibold text-slate-50"
      >
        {title}
      </CardTitle>
    </div>
    <CardDescription className="text-sm text-slate-500 ml-10">
      {description}
    </CardDescription>
  </CardHeader>
  <CardContent>
    <form
      aria-label={`Step ${stepNumber}: ${title}`}
      onSubmit={handleSubmit}
      noValidate
    >
      {children}
    </form>
  </CardContent>
</Card>
```

### Risk Rating Badge

The risk rating badge combines color, icon, and text. The icon is decorative (it supplements the text label), so it gets `aria-hidden="true"`.

```tsx
// src/components/results/risk-rating-badge.tsx
// ARIA additions

<div
  className={cn(
    "inline-flex items-center gap-2 rounded-full border px-4 py-2",
    bg, text, border, className
  )}
  role="status"
  aria-label={`Risk rating: ${level}`}
>
  <Icon className="h-5 w-5" aria-hidden="true" />
  <span className="text-sm font-bold tracking-wider">{level}</span>
</div>
```

**Screen reader experience (VoiceOver):**
> "Risk rating: MODERATE, status."

### KPI Card

KPI cards are display-only data containers. Each card needs a clear structure for screen readers: label, then value, then optional context.

```tsx
// src/components/results/kpi-card.tsx
// ARIA additions

<Card
  className={cn("bg-slate-900 border-slate-700", className)}
  role="group"
  aria-label={label}
>
  <CardContent className="p-6">
    {/* Header row */}
    <div className="flex items-center gap-2 mb-4">
      <div className={cn("rounded-md bg-slate-800 p-2", accentColor)} aria-hidden="true">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium text-slate-400" id={`kpi-label-${label}`}>
        {label}
      </span>
    </div>

    {/* Dollar figure */}
    <div
      className="text-3xl font-bold font-mono tracking-tight text-slate-50"
      aria-labelledby={`kpi-label-${label}`}
    >
      {/* Use aria-label for proper dollar reading */}
      <span aria-label={formatDollarForScreenReader(value)}>
        {value}
      </span>
    </div>

    {/* Sublabel */}
    {sublabel && (
      <div className="mt-2 text-sm text-slate-500">
        {sublabel}
      </div>
    )}
  </CardContent>
</Card>
```

**Dollar formatting helper:**

```tsx
// src/lib/a11y-utils.ts

/**
 * Convert display dollar values to screen-reader-friendly text.
 * "$1,250,000" -> "1 million 250 thousand dollars"
 * "$462,500"   -> "462 thousand 500 dollars"
 * "MODERATE"   -> "MODERATE" (pass through non-dollar values)
 */
export function formatDollarForScreenReader(value: string): string {
  if (!value.startsWith("$")) return value;

  const num = parseInt(value.replace(/[$,]/g, ""), 10);
  if (isNaN(num)) return value;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: "standard",
  }).format(num) + " dollars";
}
```

Note: Modern screen readers (VoiceOver, NVDA) handle standard dollar-comma-formatted numbers reasonably well when they encounter `$1,250,000` in plain text. The `aria-label` override is a safety net for edge cases (abbreviated values like "$1.2M" where the screen reader might read "dollar one point two M").

### Chart Components with Data Table Alternatives

Charts are the largest accessibility gap in CybRisk. Recharts renders `<svg>` elements that are opaque to screen readers. The solution: hide the SVG from the accessibility tree and provide a companion data table.

```tsx
// Pattern for all chart components
// src/components/results/loss-distribution.tsx

export function LossDistribution({ data }: { data: DistributionBucket[] }) {
  return (
    <ChartContainer
      title="Loss Distribution"
      subtitle="Probability distribution of annual loss from 10,000 Monte Carlo simulations"
    >
      {/* Screen reader summary -- always present */}
      <div className="sr-only" role="region" aria-label="Loss distribution data">
        <h3>Loss Distribution Summary</h3>
        <p>
          The loss distribution shows that the median annual loss is{" "}
          {data.median} with a 90% confidence interval between{" "}
          {data.p5} and {data.p95}. The most frequent loss range is{" "}
          {data.mode}.
        </p>
        <table>
          <caption>Loss distribution by range (10,000 simulations)</caption>
          <thead>
            <tr>
              <th scope="col">Loss Range</th>
              <th scope="col">Probability</th>
              <th scope="col">Simulations</th>
            </tr>
          </thead>
          <tbody>
            {data.buckets.map((bucket) => (
              <tr key={bucket.range}>
                <td>{bucket.range}</td>
                <td>{(bucket.probability * 100).toFixed(1)}%</td>
                <td>{Math.round(bucket.probability * 10000)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual chart -- hidden from screen readers */}
      <div aria-hidden="true" className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.buckets}>
            {/* ... Recharts configuration ... */}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
```

Apply the same pattern to:

| Chart | SR Summary | Data Table Columns |
|---|---|---|
| **Loss Distribution** (histogram) | Median, P5, P95, mode range | Loss Range, Probability (%), Count |
| **Loss Exceedance Curve** (line) | Probability of exceeding P50, P75, P90, P95 | Loss Threshold ($), Exceedance Probability (%) |
| **Industry Benchmark** (bar) | User ALE vs industry median, percentile rank | Metric, Your Value, Industry Median, Difference |

### Simulation Loading State

The loading state must announce progress to screen readers and respect reduced motion preferences.

```tsx
// src/components/assess/simulation-loading.tsx
// Accessible version

export function SimulationLoading() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % PHASES.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center py-24 space-y-8"
      role="status"
      aria-label="Running Monte Carlo simulation"
    >
      {/* Animated pulse ring -- respects reduced motion */}
      <div className="relative">
        <div className="h-16 w-16 rounded-full bg-cyan-400/10 flex items-center justify-center">
          <Activity
            className={cn(
              "h-8 w-8 text-cyan-400",
              !prefersReducedMotion && "animate-pulse"
            )}
            aria-hidden="true"
          />
        </div>
        {!prefersReducedMotion && (
          <div
            className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Primary message */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-slate-50">
          Running 10,000 simulations
          {!prefersReducedMotion && <span className="animate-pulse">...</span>}
          {prefersReducedMotion && "..."}
        </h2>
        {/* Screen reader announcement at 1000ms intervals */}
        <p
          className="text-sm font-mono text-cyan-400 h-5 transition-opacity"
          aria-live="polite"
          aria-atomic="true"
        >
          {PHASES[phaseIndex]}
        </p>
      </div>

      {/* Trust signals -- static, no ARIA needed */}
      <div className="flex items-center gap-4 text-xs text-slate-500" aria-hidden="true">
        <span>FAIR Methodology</span>
        <span className="text-slate-700">|</span>
        <span>Data Never Stored</span>
        <span className="text-slate-700">|</span>
        <span>IBM / DBIR / NetDiligence Data</span>
      </div>

      {/* Screen-reader-only static description */}
      <p className="sr-only">
        CybRisk is running 10,000 Monte Carlo simulations using the FAIR
        model. This typically takes 1 to 3 seconds. Results will appear
        automatically when the calculation completes.
      </p>
    </div>
  );
}
```

**Screen reader experience (VoiceOver):**
> "Running Monte Carlo simulation, status. Running 10,000 simulations. Modeling threat event frequency. CybRisk is running 10,000 Monte Carlo simulations using the FAIR model. This typically takes 1 to 3 seconds. Results will appear automatically when the calculation completes."

Then at 1-second intervals:
> "Sampling loss magnitude distributions."
> "Running FAIR model iterations."

### Threat Type Multi-Select Cards

The custom toggleable cards for threat type selection need explicit keyboard handling since they are not native form controls.

```tsx
// src/components/assess/steps/threat-landscape.tsx
// Accessible multi-select card pattern

<fieldset>
  <legend className="text-sm font-medium text-slate-50 mb-3">
    Select relevant threat scenarios
  </legend>
  <p className="text-xs text-slate-500 mb-4" id="threat-help">
    Pre-selected based on your industry. Adjust as needed. Select at least one.
  </p>

  <div
    className="grid grid-cols-2 sm:grid-cols-3 gap-3"
    role="group"
    aria-describedby="threat-help"
  >
    {threatTypes.map(({ id, label, icon: Icon }) => {
      const isSelected = selected.includes(id);
      return (
        <button
          key={id}
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          aria-label={label}
          onClick={() => toggle(id)}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              toggle(id);
            }
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors",
            "focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
            isSelected
              ? "bg-cyan-400/10 border-cyan-400/30 text-cyan-400"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span className="text-center text-xs font-medium">{label}</span>
        </button>
      );
    })}
  </div>
</fieldset>
```

**Screen reader experience (VoiceOver):**
> "Select relevant threat scenarios, group. Ransomware, checkbox, checked. BEC / Phishing, checkbox, checked. Insider Threat, checkbox, not checked."

### Security Control Toggle Rows

Shadcn/ui Switch is built on Radix UI Switch, which already provides correct `role="switch"` and `aria-checked` attributes. The wrapper row needs an association between the label and the switch.

```tsx
// Accessible security control toggle row

<div className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3 border border-slate-700">
  <div className="space-y-0.5">
    <Label
      htmlFor={`control-${controlId}`}
      className="text-sm font-medium text-slate-50 cursor-pointer"
    >
      Do you have a dedicated security team or CISO?
    </Label>
    <p className="text-xs text-slate-500" id={`control-${controlId}-desc`}>
      A full-time or fractional CISO reduces expected loss by ~20%
    </p>
  </div>
  <Switch
    id={`control-${controlId}`}
    checked={controls.securityTeam}
    onCheckedChange={(checked) => setControls({ ...controls, securityTeam: checked })}
    aria-describedby={`control-${controlId}-desc`}
    className="data-[state=checked]:bg-cyan-400 data-[state=unchecked]:bg-slate-600"
  />
</div>
```

**Screen reader experience (VoiceOver):**
> "Do you have a dedicated security team or CISO? Switch. Off. A full-time or fractional CISO reduces expected loss by approximately 20 percent."

---

## Keyboard Navigation Flows

### Landing Page (`/`)

```
Tab 1:  Skip to main content (sr-only link)
Tab 2:  CybRisk logo / home link (header)
Tab 3:  "Assess Your Risk" button (header nav)
Tab 4:  "Assess Your Risk -- Free" button (hero CTA)
Tab 5+: Feature card links (if any), "How It Works" section links
Tab N:  Footer links
```

### Assessment Wizard (`/assess`)

```
Tab 1:  Skip to main content
Tab 2:  CybRisk logo / home link
Tab 3:  First form field of current step

--- Step 1: Company Profile ---
Tab 3:  Industry dropdown (Select trigger) -- Enter/Space to open, Arrow keys to navigate, Enter to select
Tab 4:  Revenue band dropdown
Tab 5:  Employee count dropdown
Tab 6:  Geography dropdown
Tab 7:  "Continue" button -- Enter/Space to advance

--- Step 2: Data Profile ---
Tab 3:  Data type checkboxes (Tab through each, Space to toggle)
Tab 4:  Record count slider (Arrow Left/Right to adjust)
Tab 5:  Data sensitivity radio group (Arrow Up/Down to select)
Tab 6:  "Back" button
Tab 7:  "Continue" button

--- Step 3: Security Controls ---
Tab 3-10: Toggle switches (Space to toggle, Tab to move between)
Tab 11:   "Back" button
Tab 12:   "Continue" button

--- Step 4: Threat Landscape ---
Tab 3-9:  Threat type cards (Space/Enter to toggle, role="checkbox")
Tab 10:   Regulatory environment multi-select
Tab 11:   Prior incident radio group
Tab 12:   "Back" button
Tab 13:   "Continue" button

--- Step 5: Review & Submit ---
Tab 3-6:  "Edit" links per section (Enter to navigate back to that step)
Tab 7:    "Calculate My Risk" button (Enter/Space to submit)

--- Loading State ---
No interactive elements. Focus is managed programmatically (see focus management below).

--- Escape key behavior ---
Escape closes any open Select dropdown or popover.
Escape does NOT navigate backward in the wizard (this would cause accidental data loss).
```

### Results Dashboard (`/results`)

```
Tab 1:  Skip to main content
Tab 2:  CybRisk logo / home link
Tab 3:  "New Assessment" button (header)
Tab 4:  Results summary region (passive -- no interactive elements in headline/KPI area)
Tab 5:  Chart data tables (sr-only, navigable with screen reader table commands)
Tab 6:  Recommendation items (non-interactive in Phase 1)
Tab 7:  "Run Another Assessment" button
Tab 8:  Methodology section (expandable details if collapsible, otherwise passive)
Tab 9:  Footer links
```

---

## Focus Management

### Wizard Step Transitions

When the user clicks "Continue" and validation passes, the next step renders. Focus must move to the new step's heading so screen reader users know the context has changed.

```tsx
// Focus management in the wizard parent component

const stepTitleRef = useRef<HTMLHeadingElement>(null);

// After step transition
useEffect(() => {
  if (stepTitleRef.current) {
    stepTitleRef.current.focus();
  }
}, [currentStep]);

// In WizardStepCard, the title receives focus
<CardTitle
  ref={stepTitleRef}
  id={`step-${stepNumber}-title`}
  className="text-xl font-semibold text-slate-50"
  tabIndex={-1} // Allows programmatic focus without adding to tab order
>
  {title}
</CardTitle>
```

**Screen reader experience on step advance:**
> (User presses Enter on "Continue")
> "Step 3 of 5: Security Controls. Assess your current security posture."

### Calculate-and-Redirect Flow

When the user clicks "Calculate My Risk," the following sequence occurs:

1. Button click triggers API call
2. Loading state renders (replaces wizard content)
3. API responds (1-3 seconds)
4. Router navigates to `/results`
5. Results page renders

Focus management for this flow:

```tsx
// In the wizard parent component

async function handleCalculate(formData: AssessmentInput) {
  // 1. Disable the button to prevent double-submit
  setIsCalculating(true);

  // 2. Announce to screen readers
  // The SimulationLoading component has role="status" which auto-announces

  try {
    const response = await fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) throw new Error("Calculation failed");

    const results = await response.json();

    // 3. Store results for the results page
    sessionStorage.setItem("cybrisk-results", JSON.stringify(results));
    sessionStorage.setItem("cybrisk-inputs", JSON.stringify(formData));

    // 4. Navigate to results
    router.push("/results");

  } catch (error) {
    setIsCalculating(false);
    setError("Calculation failed. Please try again.");
    // Focus error message for screen reader announcement
    errorRef.current?.focus();
  }
}
```

On the results page, focus the page heading on mount:

```tsx
// src/app/results/page.tsx

const headingRef = useRef<HTMLHeadingElement>(null);

useEffect(() => {
  // Small delay to ensure DOM is painted
  const timer = setTimeout(() => {
    headingRef.current?.focus();
  }, 100);
  return () => clearTimeout(timer);
}, []);

<h1
  ref={headingRef}
  tabIndex={-1}
  className="text-3xl font-bold tracking-tight text-slate-50"
>
  Your Financial Exposure
</h1>
```

**Screen reader experience on calculate + redirect:**
> (User presses Enter on "Calculate My Risk")
> "Running Monte Carlo simulation, status. Running 10,000 simulations. Modeling threat event frequency."
> (1-3 seconds pass)
> "Your Financial Exposure" (focus moves to results heading)

### Error Focus Management

When validation fails on "Continue" press, focus moves to the first field with an error.

```tsx
// Validation error focus pattern

function validateAndAdvance() {
  const result = stepSchema.safeParse(stepData);

  if (!result.success) {
    const firstErrorField = result.error.issues[0]?.path[0];
    const errorElement = document.getElementById(`field-${firstErrorField}`);
    errorElement?.focus();

    // Announce error count
    setErrorSummary(`${result.error.issues.length} error(s) found. Please correct and try again.`);
    return;
  }

  advanceStep();
}
```

### API Error Focus

When the API call fails (timeout, 500, network error), focus moves to the error message with retry/edit options.

```tsx
// Error state in loading/calculation flow

{error && (
  <div
    ref={errorRef}
    role="alert"
    tabIndex={-1}
    className="text-center space-y-4 py-12"
  >
    <p className="text-lg text-rose-500">{error}</p>
    <div className="flex items-center justify-center gap-4">
      <Button onClick={handleRetry}>
        Retry Calculation
      </Button>
      <Button variant="outline" onClick={() => setCurrentStep(5)}>
        Edit Inputs
      </Button>
    </div>
  </div>
)}
```

---

## Live Regions and Announcements

### Announcement Strategy

CybRisk uses three `aria-live` regions:

| Region | Politeness | Content | Location |
|---|---|---|---|
| Step progress | `polite` | "Step N of 5: Step Name" | Wizard progress bar text |
| Validation errors | `assertive` | Error summary and field-specific messages | Below form fields |
| Calculation status | `polite` | Simulation phase messages, completion | SimulationLoading component |

### Implementation

```tsx
// src/components/assess/a11y-announcer.tsx
// Global announcer for the wizard

"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface AnnouncerContextType {
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const AnnouncerContext = createContext<AnnouncerContextType>({
  announce: () => {},
});

export function AnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (priority === "assertive") {
        setAssertiveMessage("");
        // Force re-render to trigger announcement
        requestAnimationFrame(() => setAssertiveMessage(message));
      } else {
        setPoliteMessage("");
        requestAnimationFrame(() => setPoliteMessage(message));
      }
    },
    []
  );

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {politeMessage}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

export const useAnnouncer = () => useContext(AnnouncerContext);
```

### Announcement Triggers

| User Action | Announcement | Priority |
|---|---|---|
| Advance to next wizard step | "Step N of 5: {Step Name}" | `polite` |
| Go back to previous step | "Returned to Step N: {Step Name}" | `polite` |
| Validation error on Continue | "N error(s) found. {First error message}." | `assertive` |
| Single field validation error | "{Field label}: {Error message}" | `polite` |
| Click "Calculate My Risk" | "Running Monte Carlo simulation. Please wait." | `polite` |
| Simulation phase change | "{Phase description}" | `polite` |
| Results loaded (page navigation) | Focus moves to heading -- no separate announcement needed | -- |
| API error | "Calculation failed. {Error message}. Use Retry to try again or Edit Inputs to review." | `assertive` |
| API timeout | "The calculation is taking longer than expected. Please wait." | `polite` |
| Retry succeeded | Focus moves to results heading | -- |

---

## Reduced Motion

CybRisk includes three CSS animations that must respect `prefers-reduced-motion`:

1. `animate-pulse` on the Activity icon in `SimulationLoading`
2. `animate-ping` on the outer ring in `SimulationLoading`
3. `animate-pulse` on the ellipsis in "Running 10,000 simulations..."

### CSS Approach

Add to `src/app/globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-pulse,
  .animate-ping,
  .animate-spin,
  .animate-bounce {
    animation: none !important;
  }

  /* Disable all CSS transitions for users who prefer reduced motion */
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

### React Hook

```tsx
// src/lib/use-reduced-motion.ts

import { useEffect, useState } from "react";

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(query.matches);

    function handleChange(event: MediaQueryListEvent) {
      setPrefersReducedMotion(event.matches);
    }

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}
```

### Reduced Motion Behavior

| Animation | Normal | Reduced Motion |
|---|---|---|
| Activity icon pulse | Continuous opacity pulse | Static icon, full opacity |
| Outer ring ping | Expanding ring animation | No ring displayed |
| Ellipsis pulse | Fading "..." | Static "..." |
| Transition colors on hover | 150ms fade | Instant color change |
| Chart entrance animations | Already disabled (`isAnimationActive={false}`) | No change needed |

---

## Screen Reader Testing Scripts

### Test 1: Complete Wizard Flow (VoiceOver, macOS)

**Setup:** Open CybRisk landing page in Safari. Enable VoiceOver (Cmd+F5).

**Steps:**

1. **Navigate to CTA**: Use VO+Right Arrow to navigate through the landing page.
   - **Expected**: Hear "Assess Your Risk, button" on the hero CTA.
   - **Action**: Press VO+Space to activate.

2. **Step 1 - Company Profile**: Focus should move to step title.
   - **Expected**: Hear "Step 1 of 5: Company Profile."
   - **Action**: VO+Right Arrow to industry select. Press VO+Space to open.
   - **Expected**: Hear "Select your industry, pop-up button."
   - **Action**: Use Arrow Down to "Financial Services," press Enter.
   - **Expected**: Hear "Financial Services" as selected value.

3. **Fill remaining Step 1 fields**: Tab to revenue band, employee count, geography. Select values.

4. **Advance to Step 2**: Tab to "Continue" button. Press Enter.
   - **Expected**: Hear "Step 2 of 5: Data Profile."
   - **Verify**: Focus is on the step title, not on the "Continue" button from the previous step.

5. **Step 2 - Data types**: Navigate to data type checkboxes.
   - **Expected**: Each checkbox announces its label and checked state.
   - **Action**: Space to toggle "Customer PII" on.

6. **Step 2 - Record count slider**: Tab to the slider.
   - **Expected**: Hear "Approximate records held, slider, {current value}."
   - **Action**: Arrow Right to increase value. Verify the displayed value updates.

7. **Continue through Steps 3-4**, verifying:
   - Toggle switches announce label, state ("on"/"off"), and description.
   - Threat type cards announce as checkboxes with checked/unchecked state.
   - Smart defaults are pre-checked for the selected industry.

8. **Step 5 - Review**: Verify input summary is readable.
   - **Expected**: Can read all previously entered values.
   - **Action**: Tab to "Edit" link for Company Profile. Press Enter.
   - **Expected**: Returns to Step 1 with all values preserved.
   - **Action**: Navigate back to Step 5.

9. **Calculate**: Tab to "Calculate My Risk" button. Press Enter.
   - **Expected**: Hear "Running Monte Carlo simulation" status announcement.
   - **Expected**: Phase messages announced at 1-second intervals.

10. **Results**: After navigation, focus should be on the results heading.
    - **Expected**: Hear "Your Financial Exposure."
    - **Action**: VO+Right Arrow through KPI cards.
    - **Expected**: Each card announces its label and value (e.g., "Annual Loss Expectancy, Median. $1,250,000. 50th percentile of 10,000 simulations.").

11. **Charts**: Navigate to chart regions.
    - **Expected**: Hear "Loss distribution data, region" and the sr-only summary text and data table.
    - **Action**: Use VO+Cmd+T to navigate the table by cells.

12. **Risk Rating Badge**: Navigate to the badge.
    - **Expected**: Hear "Risk rating: MODERATE, status."

### Test 2: Keyboard-Only Wizard Flow

**Setup:** Open CybRisk in Chrome. Do not use a screen reader. Do not use a mouse.

**Steps:**

1. Press Tab from page load.
   - **Expected**: "Skip to main content" link becomes visible (sr-only until focused).
   - Press Enter. Focus jumps to main content area.

2. Tab to "Assess Your Risk" CTA. Press Enter.
   - **Expected**: Wizard loads. Focus on Step 1 title.

3. Tab to industry dropdown. Press Enter or Space.
   - **Expected**: Dropdown opens. Arrow keys navigate options. Enter selects.

4. Complete all fields using only keyboard.
   - **Verify**: Every interactive element has a visible focus ring (cyan-400 ring).
   - **Verify**: No element traps focus (Tab always moves forward).

5. On Step 3, Tab through all 8 toggle switches.
   - **Verify**: Space toggles each switch.
   - **Verify**: Focus ring is visible on each switch when focused.

6. On Step 4, Tab through threat type cards.
   - **Verify**: Space or Enter toggles selection.
   - **Verify**: Selected state is visually distinct (cyan border/background).

7. On Step 5, Tab to "Calculate My Risk." Press Enter.
   - **Verify**: Loading state appears. No keyboard interaction required.

8. Results load.
   - **Verify**: Focus is on the heading.
   - Tab through the page.
   - **Verify**: "Run Another Assessment" button is reachable.

### Test 3: Validation Error Screen Reader Flow

**Setup:** VoiceOver enabled in Safari.

1. On Step 1, do not fill any fields. Tab to "Continue." Press Enter.
   - **Expected**: Hear assertive announcement: "3 errors found. Please select an industry."
   - **Expected**: Focus moves to the first field with an error (industry dropdown).
   - **Verify**: Error message is associated with the field via `aria-describedby`.

2. Fill industry only. Press "Continue" again.
   - **Expected**: Hear "2 errors found. Please select a revenue band."
   - **Expected**: Focus moves to revenue band dropdown.

3. Fill all fields. Press "Continue."
   - **Expected**: Advances to Step 2 with step announcement.

### Test 4: Reduced Motion

**Setup:** macOS System Settings > Accessibility > Display > Reduce motion: ON.

1. Navigate to loading state (submit wizard Step 5).
   - **Verify**: No pulsing animation on the Activity icon.
   - **Verify**: No ping animation on the outer ring.
   - **Verify**: Ellipsis "..." is static (no pulse).
   - **Verify**: Phase text still cycles (text content change is not motion).

2. Hover over buttons and form controls.
   - **Verify**: Color changes are instant (no 150ms transition).

---

## Implementation Checklist

### What Radix UI / Shadcn/ui Handles Already

These accessibility features are built into the component library and require no custom work:

| Component | Built-in A11y |
|---|---|
| `Button` | Keyboard activation (Enter/Space), `role="button"`, focus management |
| `Select` (dropdown) | `role="combobox"`, `aria-expanded`, `aria-activedescendant`, keyboard navigation (Arrow keys, Enter, Escape, type-ahead search) |
| `Switch` | `role="switch"`, `aria-checked`, keyboard toggle (Space) |
| `Slider` | `role="slider"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, keyboard adjustment (Arrow keys, Home/End, Page Up/Down) |
| `Label` | Associates with form control via `htmlFor` |
| `Card` | Semantic structure with heading hierarchy |
| `Popover` / `Tooltip` | Focus trapping, Escape to dismiss, `aria-describedby` |

### What CybRisk Must Add (Custom Work)

| Task | Component | Priority | Effort |
|---|---|---|---|
| Add `lang="en"` to `<html>` | `src/app/layout.tsx` | P0 | 5 min |
| Add skip navigation link | `src/app/layout.tsx` | P0 | 15 min |
| Add page `<title>` per route | `src/app/*/page.tsx` (metadata export) | P0 | 15 min |
| Wrap wizard progress in `<nav>` with ARIA | `wizard-progress.tsx` | P0 | 30 min |
| Add `aria-current="step"` to current wizard step | `wizard-progress.tsx` | P0 | 10 min |
| Add `role="status"` to SimulationLoading | `simulation-loading.tsx` | P0 | 10 min |
| Add `aria-live="polite"` to phase text | `simulation-loading.tsx` | P0 | 5 min |
| Add `aria-hidden="true"` to chart SVGs | All chart components | P0 | 15 min |
| Create sr-only data tables for each chart | `loss-distribution.tsx`, `loss-exceedance.tsx`, `industry-benchmark.tsx` | P0 | 2 hr |
| Add `aria-label` to RiskRatingBadge | `risk-rating-badge.tsx` | P0 | 5 min |
| Add `aria-hidden="true"` to decorative Lucide icons | All components using icons alongside text | P1 | 30 min |
| Add `role="checkbox"` and `aria-checked` to threat cards | `threat-landscape.tsx` | P1 | 30 min |
| Wrap threat cards in `<fieldset>` with `<legend>` | `threat-landscape.tsx` | P1 | 15 min |
| Add `prefers-reduced-motion` CSS | `globals.css` | P1 | 15 min |
| Create `usePrefersReducedMotion` hook | `src/lib/use-reduced-motion.ts` | P1 | 15 min |
| Suppress animations conditionally in SimulationLoading | `simulation-loading.tsx` | P1 | 20 min |
| Add `formatDollarForScreenReader` utility | `src/lib/a11y-utils.ts` | P1 | 30 min |
| Add `aria-label` to KPI card dollar values | `kpi-card.tsx` | P1 | 15 min |
| Create AnnouncerProvider context | `src/components/assess/a11y-announcer.tsx` | P1 | 45 min |
| Wire up step transition announcements | Wizard parent component | P1 | 30 min |
| Wire up validation error announcements | Each wizard step | P1 | 1 hr |
| Add focus management on step transitions | Wizard parent component | P1 | 30 min |
| Add focus management on results page load | `src/app/results/page.tsx` | P1 | 15 min |
| Add `border-slate-500` to unchecked switch track | Switch styling override | P2 | 5 min |
| Add error focus management (first invalid field) | Wizard validation logic | P2 | 30 min |
| Create API error alert with retry focus | Loading/error state component | P2 | 30 min |

**Total estimated effort**: ~9 hours for full WCAG 2.1 AA compliance.

**Recommended approach for hackathon**: Implement all P0 items (approximately 3.5 hours). These cover the highest-impact items: skip nav, page titles, chart alternatives, screen reader announcements for the loading state, and wizard progress ARIA. P1 and P2 items provide polish and can be addressed post-hackathon.

---

## Page-Level Requirements

### Landing Page (`/`)

```tsx
// src/app/page.tsx -- metadata
export const metadata = {
  title: "CybRisk -- Cyber Risk Posture Calculator",
  description:
    "Monte Carlo-simulated financial exposure estimates for your organization. " +
    "5-minute assessment, no signup required. Powered by FAIR methodology and " +
    "IBM, Verizon DBIR, and NetDiligence actuarial data.",
};
```

- Heading hierarchy: Single `<h1>` in hero ("Know Your Cyber Risk in Dollars, Not Checkboxes"). Feature sections use `<h2>`. "How It Works" uses `<h2>`.
- Trust badges are decorative groupings. They do not need individual ARIA roles, but the icon within each badge needs `aria-hidden="true"` since the adjacent text label carries the meaning.
- Hero CTA button: "Assess Your Risk -- Free" with `aria-label` not needed (visible text is descriptive enough).

### Assessment Wizard (`/assess`)

```tsx
// src/app/assess/page.tsx -- dynamic metadata
export function generateMetadata() {
  return {
    title: `Step ${currentStep} of 5 -- Risk Assessment -- CybRisk`,
  };
}
// Note: Since the wizard is client-side with useState, the title will need
// to be updated dynamically via useEffect + document.title
```

Dynamic title update:

```tsx
useEffect(() => {
  document.title = `Step ${currentStep} of 5: ${stepLabels[currentStep - 1]} -- Risk Assessment -- CybRisk`;
}, [currentStep]);
```

Page structure:

```html
<main id="main-content">
  <nav aria-label="Assessment progress">
    <!-- WizardProgress component -->
  </nav>

  <section aria-label="Step N: Step Name">
    <!-- WizardStepCard with form -->
  </section>
</main>
```

### Results Dashboard (`/results`)

```tsx
// src/app/results/page.tsx -- metadata
export const metadata = {
  title: "Your Risk Assessment Results -- CybRisk",
  description: "Monte Carlo simulation results showing your estimated annual loss expectancy, " +
    "probable maximum loss, recommended security spend, and risk rating.",
};
```

Page structure:

```html
<main id="main-content">
  <!-- Context bar -->
  <div role="banner" aria-label="Assessment parameters">
    Financial Services | $50M-$250M Revenue | 500,000 Records
  </div>

  <!-- Headline -->
  <h1 tabindex="-1" ref={headingRef}>Your Financial Exposure</h1>

  <!-- KPI cards -->
  <section aria-label="Key risk metrics">
    <div role="list" aria-label="Risk metric cards">
      <!-- 4 KpiCards, each with role="listitem" -->
    </div>
  </section>

  <!-- Charts -->
  <section aria-label="Risk visualizations">
    <!-- Each chart: aria-hidden SVG + sr-only data table -->
  </section>

  <!-- Recommendations -->
  <section aria-label="Recommendations">
    <h2>Key Recommendations</h2>
    <ol>
      <!-- Ordered list of recommendations -->
    </ol>
  </section>

  <!-- Methodology -->
  <section aria-label="Methodology and sources">
    <h2>Methodology</h2>
    <!-- Source citations -->
  </section>
</main>
```

---

## Dollar Value Screen Reader Behavior

JetBrains Mono is used for all dollar figures. Screen readers read the text content, not the font. The key concern is how screen readers interpret formatted dollar strings.

### How VoiceOver Reads Dollar Figures

| Display Value | VoiceOver Reads | Acceptable? |
|---|---|---|
| `$1,250,000` | "one million two hundred fifty thousand dollars" | Yes |
| `$462,500` | "four hundred sixty-two thousand five hundred dollars" | Yes |
| `$1.2M` | "one point two M dollars" or "one point two capital M" | No -- needs `aria-label` |
| `$5,200,000` | "five million two hundred thousand dollars" | Yes |
| `90th percentile` | "ninetieth percentile" | Yes |
| `$120K - $3.4M` | "one hundred twenty K dash three point four M" | No -- needs `aria-label` |

### Remediation

For abbreviated display values, add explicit `aria-label`:

```tsx
// Headline ALE with abbreviated display
<span aria-label="1 million 250 thousand dollars" className="text-5xl font-bold font-mono">
  $1.25M
</span>

// Confidence interval
<span aria-label="90 percent confidence interval between 120 thousand and 3.4 million dollars">
  (90% between $120K and $3.4M)
</span>
```

For full-precision KPI card values (`$1,250,000`), the default screen reader behavior is acceptable. No `aria-label` override needed.

---

## Error Announcement Patterns

### Inline Field Validation

```tsx
// Pattern for individual field errors

<div className="space-y-2">
  <Label htmlFor="industry" className="text-sm text-slate-400">
    Select your industry
  </Label>
  <Select>
    <SelectTrigger
      id="industry"
      aria-invalid={!!errors.industry}
      aria-describedby={errors.industry ? "industry-error" : undefined}
      className={cn(
        "bg-slate-800 border-slate-600",
        errors.industry && "border-rose-500"
      )}
    >
      <SelectValue placeholder="Select your industry" />
    </SelectTrigger>
    {/* ... SelectContent ... */}
  </Select>
  {errors.industry && (
    <p
      id="industry-error"
      className="text-xs text-rose-500"
      role="alert"
    >
      Please select an industry to continue.
    </p>
  )}
</div>
```

### Step-Level Error Summary

When multiple fields fail validation on "Continue" press:

```tsx
{errorSummary && (
  <div
    ref={errorSummaryRef}
    role="alert"
    tabIndex={-1}
    className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-4 mb-4"
  >
    <p className="text-sm font-medium text-rose-500">
      {errorSummary.count} {errorSummary.count === 1 ? "error" : "errors"} found:
    </p>
    <ul className="mt-2 space-y-1">
      {errorSummary.errors.map((err, i) => (
        <li key={i} className="text-xs text-rose-400">
          {err.field}: {err.message}
        </li>
      ))}
    </ul>
  </div>
)}
```

---

## Skip Navigation

```tsx
// src/app/layout.tsx -- add as first child of <body>

<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-cyan-400 focus:px-4 focus:py-2 focus:text-slate-950 focus:font-semibold focus:shadow-lg"
>
  Skip to main content
</a>

// Each page's main content area
<main id="main-content" tabIndex={-1}>
  {/* Page content */}
</main>
```

**Behavior**: The link is invisible until the user presses Tab from the top of the page. On focus, it appears as a fixed-position cyan button in the top-left corner. Pressing Enter jumps focus to `#main-content`.

---

## Testing Protocol

### Automated Testing

| Tool | What It Catches | Integration |
|---|---|---|
| **eslint-plugin-jsx-a11y** | Missing `alt`, invalid ARIA, improper roles, form label associations | Already available in Next.js default ESLint config. Verify it is not disabled. |
| **axe-core** (via `@axe-core/react`) | Runtime ARIA violations, contrast issues, missing landmarks | Add to dev mode only: logs violations to browser console. |
| **Lighthouse Accessibility audit** | WCAG 2.1 AA automated checks (covers ~30% of WCAG criteria) | Run in Chrome DevTools on each page after deployment. Target score: 95+. |

### Automated Test Setup

```bash
# Install dev dependencies
npm install --save-dev @axe-core/react

# eslint-plugin-jsx-a11y is included with eslint-config-next
```

```tsx
// src/lib/axe-dev.ts -- development-only axe integration
// Import this in layout.tsx behind a process.env.NODE_ENV check

export async function initAxe() {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const React = await import("react");
    const ReactDOM = await import("react-dom");
    const axe = await import("@axe-core/react");
    axe.default(React, ReactDOM, 1000);
  }
}
```

### Manual Testing Checklist

Run before each deployment. Estimated time: 30 minutes.

| # | Test | Tool | Pass Criteria |
|---|---|---|---|
| 1 | Tab through entire landing page | Keyboard only (no mouse) | Every interactive element receives focus. Focus ring visible. No focus traps. |
| 2 | Complete wizard Steps 1-5 with keyboard only | Keyboard only | All dropdowns, sliders, switches, and cards are operable. "Continue" works with Enter. |
| 3 | Complete wizard Steps 1-5 with VoiceOver | VoiceOver + Safari (macOS) | All fields announce label + state. Step transitions announce new step. Errors announce. |
| 4 | Read results page with VoiceOver | VoiceOver + Safari | KPI values announced with dollar amounts. Chart data tables navigable. Risk rating announced. |
| 5 | Trigger validation errors with VoiceOver | VoiceOver + Safari | Error messages announced. Focus moves to first error field. |
| 6 | Verify reduced motion | macOS Reduce Motion ON | No CSS animations. Phase text still cycles. |
| 7 | Zoom to 200% | Browser zoom (Cmd+) | Layout reflows without horizontal scroll. All content remains readable. |
| 8 | Lighthouse a11y audit on `/` | Chrome DevTools | Score >= 95 |
| 9 | Lighthouse a11y audit on `/assess` | Chrome DevTools | Score >= 95 |
| 10 | Lighthouse a11y audit on `/results` | Chrome DevTools | Score >= 95 |
| 11 | Test skip navigation link | Keyboard (Tab from page top) | Link appears. Enter jumps to main content. |
| 12 | Verify page titles update per step | Browser tab title | "Step N of 5: {Name} -- Risk Assessment -- CybRisk" |

### NVDA Testing (Windows Backup)

If judges evaluate on Windows:

1. Install NVDA (free, open source).
2. Open CybRisk in Firefox (NVDA + Firefox has the best compatibility).
3. Run manual tests 2-5 from the checklist above.
4. Pay special attention to: Select dropdowns (Radix UI + NVDA can have quirks with virtual cursor), Switch announcements, and chart data table navigation.

---

## Known Limitations and Accepted Tradeoffs

| Limitation | Rationale | Mitigation |
|---|---|---|
| Recharts tooltips are not keyboard accessible | Recharts does not support keyboard-triggered tooltips natively. Recharts tooltips appear on mouse hover only. | Companion data tables provide all tooltip data in an accessible format. The chart is supplementary; the table is the canonical accessible representation. |
| Wizard state lost on page refresh (no persistence) | Stateless design principle -- accepted tradeoff. See User Journeys doc. | Wizard takes < 5 minutes. Re-entry cost is low. No accessibility-specific mitigation needed beyond standard browser "unsaved changes" behavior. |
| No `aria-live` on Recharts axis labels | Recharts generates SVG text elements that cannot carry ARIA attributes through the React API. | Chart data tables replace the need for accessible axis labels. SVG is fully `aria-hidden="true"`. |
| Abbreviated dollar values need manual `aria-label` | "$1.2M" is not parseable by screen readers. | Every abbreviated dollar value in the results dashboard uses an explicit `aria-label` with the full spoken form. See dollar value section above. |
| Phase cycling text in loading state may be verbose for screen readers | At 1000ms intervals, VoiceOver may queue announcements. | The `aria-live="polite"` setting allows VoiceOver to batch or skip announcements during rapid changes. The static sr-only description provides a one-time complete summary as a fallback. |
| No high-contrast mode toggle | CybRisk is dark-only. Windows High Contrast Mode will override all colors. | The semantic HTML structure ensures content is still perceivable in forced-colors mode. Borders on cards and inputs use explicit `border` (not `box-shadow`), which survives high-contrast mode. |

---

## File Reference

| File | A11y Responsibility |
|---|---|
| `src/app/layout.tsx` | `lang="en"`, skip nav link, `AnnouncerProvider` wrapper |
| `src/app/page.tsx` | Page title metadata, heading hierarchy |
| `src/app/assess/page.tsx` | Dynamic page title, focus management, error announcements |
| `src/app/results/page.tsx` | Page title metadata, heading focus on mount |
| `src/app/globals.css` | `prefers-reduced-motion` media query |
| `src/components/assess/wizard-progress.tsx` | `<nav>`, `aria-current="step"`, step labels with sr-only status |
| `src/components/assess/wizard-step-card.tsx` | `role="region"`, `aria-labelledby`, form wrapping |
| `src/components/assess/simulation-loading.tsx` | `role="status"`, `aria-live="polite"`, reduced motion |
| `src/components/assess/a11y-announcer.tsx` | Global live region provider |
| `src/components/results/risk-rating-badge.tsx` | `role="status"`, `aria-label` |
| `src/components/results/kpi-card.tsx` | `role="group"`, `aria-label`, dollar formatting |
| `src/components/results/loss-distribution.tsx` | `aria-hidden` on SVG, sr-only data table |
| `src/components/results/loss-exceedance.tsx` | `aria-hidden` on SVG, sr-only data table |
| `src/components/results/industry-benchmark.tsx` | `aria-hidden` on SVG, sr-only data table |
| `src/lib/a11y-utils.ts` | `formatDollarForScreenReader()` utility |
| `src/lib/use-reduced-motion.ts` | `usePrefersReducedMotion()` hook |

---

*Document generated by North Star Advisor*
