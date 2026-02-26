# CybRisk: UI Design System

> **Created**: 2026-02-22
> **Status**: Active
> **Builder**: Albert Hui -- Chief Forensicator, Security Ronin
> **Framework**: Next.js 14+ App Router, Tailwind CSS v4, Shadcn/ui (new-york style), Recharts, Lucide React

The definitive design system for CybRisk. Every color, font, spacing decision, and component specification lives here. "Bloomberg terminal meets modern SaaS" -- dark, data-rich, professional.

---

## Design Philosophy

CybRisk is a financial risk calculator, not a marketing website. The design serves four principles derived from the brand guidelines:

1. **Numbers are the hero.** The largest element on any screen is a dollar figure in JetBrains Mono. Charts support numbers; they do not replace them.
2. **Data-dense, not decoration-heavy.** Every pixel earns its place by conveying information. No hero images, no stock photos, no decorative illustrations.
3. **Dark-first.** Slate-950 backgrounds with high-contrast data. Dark themes reduce eye strain during analysis and make charts pop.
4. **Progressive disclosure.** Lead with the headline metric, then KPI cards, then charts, then methodology details. Users control depth.

---

## Color System

### CSS Custom Properties (Shadcn/ui Variable System)

CybRisk overrides Shadcn/ui's default CSS variables with its own palette. These variables are defined in `src/app/globals.css` and consumed by both Shadcn/ui components and Tailwind utilities.

```css
/* src/app/globals.css -- CybRisk theme overrides */
/* Replace the default :root and .dark blocks with CybRisk-specific values */
/* CybRisk is dark-only, so we set dark values as the default */

:root {
  --radius: 0.5rem;

  /* Core surfaces */
  --background: 222.2 84% 4.9%;        /* slate-950 #020617 */
  --foreground: 210 40% 98%;            /* slate-50 #f8fafc */

  /* Cards and panels */
  --card: 222.2 47.4% 11.2%;            /* slate-900 #0f172a */
  --card-foreground: 210 40% 98%;       /* slate-50 */

  /* Popovers, dropdowns */
  --popover: 217.2 32.6% 17.5%;         /* slate-800 #1e293b */
  --popover-foreground: 210 40% 98%;    /* slate-50 */

  /* Primary action -- cyan-400 */
  --primary: 186 93.5% 53.7%;           /* cyan-400 #22d3ee */
  --primary-foreground: 222.2 84% 4.9%; /* slate-950 (dark text on cyan) */

  /* Secondary -- elevated surface */
  --secondary: 217.2 32.6% 17.5%;       /* slate-800 #1e293b */
  --secondary-foreground: 210 40% 98%;  /* slate-50 */

  /* Muted -- subdued backgrounds */
  --muted: 217.2 32.6% 17.5%;           /* slate-800 */
  --muted-foreground: 215 20.2% 65.1%;  /* slate-400 #94a3b8 */

  /* Accent -- subtle cyan */
  --accent: 186 93.5% 53.7% / 10%;      /* cyan-400 at 10% opacity */
  --accent-foreground: 186 93.5% 53.7%; /* cyan-400 */

  /* Destructive -- rose-500 */
  --destructive: 350 89.2% 60.2%;       /* rose-500 #f43f5e */

  /* Borders */
  --border: 215.3 25% 26.7%;            /* slate-700 #334155 */
  --input: 215.3 19.3% 34.5%;           /* slate-600 #475569 */
  --ring: 186 93.5% 53.7%;              /* cyan-400 (focus rings) */

  /* Chart colors (Recharts integration via Shadcn chart component) */
  --chart-1: 186 93.5% 53.7%;           /* cyan-400 -- primary data */
  --chart-2: 160 84.1% 39.4%;           /* emerald-400 -- positive */
  --chart-3: 43 96.4% 56.3%;            /* amber-400 -- warning */
  --chart-4: 350 89.2% 60.2%;           /* rose-500 -- danger */
  --chart-5: 186 77.8% 67.8%;           /* cyan-300 -- secondary data */
}
```

### Color Palette Reference

| Token | Tailwind Class | Hex | HSL | Usage |
|-------|---------------|-----|-----|-------|
| Background | `bg-slate-950` | #020617 | 222.2 84% 4.9% | Page background, root surface |
| Surface | `bg-slate-900` | #0f172a | 222.2 47.4% 11.2% | Cards, panels, modals, wizard steps |
| Elevated | `bg-slate-800` | #1e293b | 217.2 32.6% 17.5% | Popovers, dropdowns, hover states on cards |
| Primary | `text-cyan-400` / `bg-cyan-400` | #22d3ee | 186 93.5% 53.7% | CTAs, active states, key metrics, focus rings |
| Primary hover | `hover:text-cyan-300` / `hover:bg-cyan-300` | #67e8f9 | 186 77.8% 67.8% | Button hover, link hover |
| Primary subtle | `bg-cyan-400/10` | -- | -- | Tag backgrounds, active step indicators, selected states |
| Positive | `text-emerald-400` | #34d399 | 160 84.1% 39.4% | Low risk badge, savings indicators, positive deltas |
| Warning | `text-amber-400` | #fbbf24 | 43 96.4% 56.3% | Moderate risk badge, caution states |
| Danger | `text-rose-500` | #f43f5e | 350 89.2% 60.2% | Critical risk badge, high exposure, error states |
| High risk | `text-orange-400` | #fb923c | 27 96% 61% | High risk badge (between warning and critical) |
| Text primary | `text-slate-50` | #f8fafc | 210 40% 98% | Headings, body text, dollar figures |
| Text secondary | `text-slate-400` | #94a3b8 | 215 20.2% 65.1% | Labels, descriptions, metadata |
| Text muted | `text-slate-500` | #64748b | 215 16.3% 46.9% | Timestamps, footnotes, disabled text |
| Border | `border-slate-700` | #334155 | 215.3 25% 26.7% | Card borders, dividers, table lines |
| Border strong | `border-slate-600` | #475569 | 215.3 19.3% 34.5% | Input borders, focused card borders |

### Accessibility

| Combination | Contrast Ratio | WCAG Level |
|-------------|---------------|------------|
| Cyan-400 on Slate-950 | 10.1:1 | AAA |
| Slate-50 on Slate-950 | 17.4:1 | AAA |
| Slate-400 on Slate-950 | 5.3:1 | AA |
| Emerald-400 on Slate-950 | 9.2:1 | AAA |
| Amber-400 on Slate-950 | 11.8:1 | AAA |
| Rose-500 on Slate-950 | 5.7:1 | AA |

Risk severity colors (emerald, amber, orange, rose) are never used as the sole indicator. They are always paired with text labels ("LOW", "MODERATE", "HIGH", "CRITICAL") for color-blind users.

---

## Typography

### Font Stack

CybRisk uses two fonts loaded via `next/font/google` in `src/app/layout.tsx`:

```tsx
// src/app/layout.tsx
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});
```

**Tailwind integration** -- add to `globals.css` `@theme inline` block:

```css
@theme inline {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains);
}
```

### Type Scale

| Level | Tailwind Classes | Size | Weight | Font | Usage |
|-------|-----------------|------|--------|------|-------|
| Display | `text-4xl font-bold tracking-tight` | 36px | 700 | Inter | Page titles ("Results Dashboard") |
| H1 | `text-3xl font-bold tracking-tight` | 30px | 700 | Inter | Section headings ("Your Financial Exposure") |
| H2 | `text-2xl font-semibold` | 24px | 600 | Inter | Card titles, wizard step titles |
| H3 | `text-lg font-semibold` | 18px | 600 | Inter | Sub-section headings |
| Body | `text-base text-slate-50` | 16px | 400 | Inter | Paragraphs, descriptions |
| Body small | `text-sm text-slate-400` | 14px | 400 | Inter | Labels, secondary text, metadata |
| Caption | `text-xs text-slate-500` | 12px | 400 | Inter | Footnotes, timestamps, chart axis labels |
| Data XL | `text-4xl font-bold font-mono` | 36px | 700 | JetBrains Mono | Hero dollar figures on KPI cards |
| Data LG | `text-2xl font-semibold font-mono` | 24px | 600 | JetBrains Mono | Secondary dollar figures, percentages |
| Data MD | `text-lg font-mono` | 18px | 400 | JetBrains Mono | Table data, inline metrics |
| Data SM | `text-sm font-mono` | 14px | 400 | JetBrains Mono | Chart labels, axis values, small data |

### Typographic Rules

- Dollar amounts always use JetBrains Mono: `<span className="font-mono">$1,250,000</span>`
- Percentages in data contexts use JetBrains Mono: `<span className="font-mono">90th percentile</span>`
- Use `tabular-nums` for dollar columns in tables: `className="font-mono tabular-nums"`
- Minimum body text size: 14px (accessibility baseline)
- Never use decorative, serif, or handwritten fonts
- Line height: 1.5 for body text, 1.2 for headings, 1.0 for data displays

---

## Spacing System

CybRisk uses Tailwind's default 4px grid. Consistent spacing creates visual rhythm across the dashboard.

| Token | Tailwind | Pixels | Usage |
|-------|----------|--------|-------|
| `space-1` | `p-1` / `gap-1` | 4px | Icon-to-text gap in badges |
| `space-2` | `p-2` / `gap-2` | 8px | Tight internal padding (badge padding) |
| `space-3` | `p-3` / `gap-3` | 12px | Input internal padding |
| `space-4` | `p-4` / `gap-4` | 16px | Card internal padding (compact), grid gaps |
| `space-6` | `p-6` / `gap-6` | 24px | Card internal padding (standard), section spacing |
| `space-8` | `p-8` / `gap-8` | 32px | Major section separation |
| `space-12` | `py-12` | 48px | Page section vertical padding |
| `space-16` | `py-16` | 64px | Landing page section spacing |
| `space-24` | `py-24` | 96px | Hero section vertical padding |

### Layout Grid

- Results dashboard: `grid grid-cols-1 lg:grid-cols-2 gap-6`
- KPI card row: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`
- Wizard form: Single column, `max-w-2xl mx-auto`
- Landing page sections: `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`

---

## Border & Radius

| Element | Border | Radius | Tailwind |
|---------|--------|--------|----------|
| Cards | 1px solid slate-700 | 8px | `border border-slate-700 rounded-lg` |
| Buttons | none (filled) / 1px slate-600 (outline) | 6px | `rounded-md` |
| Inputs | 1px solid slate-600 | 6px | `rounded-md border-slate-600` |
| Badges | none | 9999px (pill) | `rounded-full` |
| Chart containers | 1px solid slate-700 | 8px | `border border-slate-700 rounded-lg` |
| Modals / sheets | 1px solid slate-700 | 12px | `border border-slate-700 rounded-xl` |

Cards use subtle borders (`border-slate-700`), not drop shadows. Buttons are flat with slight hover state transitions. The goal is to disappear the interface so the user sees only their risk data.

---

## Shadows & Elevation

CybRisk is a flat design. No drop shadows on cards or buttons. Elevation is communicated through background color steps:

| Level | Background | Usage |
|-------|-----------|-------|
| Base | `bg-slate-950` | Page background |
| Surface (L1) | `bg-slate-900` | Cards, panels, wizard steps |
| Elevated (L2) | `bg-slate-800` | Popovers, dropdowns, hover states |
| Overlay | `bg-slate-900/80 backdrop-blur-sm` | Modal backdrops, sheet overlays |

The only shadow used is on focus rings: `ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-slate-950`.

---

## Tailwind Configuration

CybRisk uses Tailwind CSS v4 with the `@theme inline` directive in `globals.css`. There is no separate `tailwind.config.ts` file -- Tailwind v4 configures via CSS.

### Theme Extensions in globals.css

```css
/* Add these to the existing @theme inline block in src/app/globals.css */

@theme inline {
  /* Font families */
  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains);

  /* Shadcn/ui variable mappings (existing) */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  /* CybRisk-specific tokens */
  --color-risk-low: #34d399;         /* emerald-400 */
  --color-risk-moderate: #fbbf24;    /* amber-400 */
  --color-risk-high: #fb923c;        /* orange-400 */
  --color-risk-critical: #f43f5e;    /* rose-500 */
  --color-surface-elevated: #1e293b; /* slate-800 */
  --color-border-strong: #475569;    /* slate-600 */

  /* Border radius */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

### Using CybRisk Tokens in Components

```tsx
// Using Shadcn/ui's built-in tokens (works out of the box):
<div className="bg-card text-card-foreground border-border" />

// Using CybRisk-specific tokens:
<div className="bg-[var(--color-surface-elevated)]" />
<span className="text-[var(--color-risk-critical)]" />

// Or simply use Tailwind's built-in Slate/Cyan palette directly:
<div className="bg-slate-800 text-rose-500 border-slate-600" />
```

The recommended approach is to use Tailwind's built-in color classes (`bg-slate-900`, `text-cyan-400`) for CybRisk-specific colors and let Shadcn/ui consume its own CSS variables (`bg-card`, `text-primary`) for component-level theming. This avoids double-mapping and keeps the system simple.

---

## Component Specifications

### 1. Risk Rating Badge

A large pill badge indicating overall risk severity. Always displayed alongside a dollar-denominated ALE figure -- never as the sole risk indicator.

**Variants:**

| Level | Background | Text | Border | Icon |
|-------|-----------|------|--------|------|
| LOW | `bg-emerald-400/15` | `text-emerald-400` | `border-emerald-400/30` | `ShieldCheck` |
| MODERATE | `bg-amber-400/15` | `text-amber-400` | `border-amber-400/30` | `AlertTriangle` |
| HIGH | `bg-orange-400/15` | `text-orange-400` | `border-orange-400/30` | `AlertTriangle` |
| CRITICAL | `bg-rose-500/15` | `text-rose-500` | `border-rose-500/30` | `ShieldAlert` |

**Implementation:**

```tsx
// src/components/results/risk-rating-badge.tsx
"use client";

import { ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

const config: Record<RiskLevel, { bg: string; text: string; border: string; icon: typeof ShieldCheck }> = {
  LOW: {
    bg: "bg-emerald-400/15",
    text: "text-emerald-400",
    border: "border-emerald-400/30",
    icon: ShieldCheck,
  },
  MODERATE: {
    bg: "bg-amber-400/15",
    text: "text-amber-400",
    border: "border-amber-400/30",
    icon: AlertTriangle,
  },
  HIGH: {
    bg: "bg-orange-400/15",
    text: "text-orange-400",
    border: "border-orange-400/30",
    icon: AlertTriangle,
  },
  CRITICAL: {
    bg: "bg-rose-500/15",
    text: "text-rose-500",
    border: "border-rose-500/30",
    icon: ShieldAlert,
  },
};

interface RiskRatingBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskRatingBadge({ level, className }: RiskRatingBadgeProps) {
  const { bg, text, border, icon: Icon } = config[level];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2",
        bg,
        text,
        border,
        className
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-bold tracking-wider">{level}</span>
    </div>
  );
}
```

**Usage:**

```tsx
<RiskRatingBadge level="MODERATE" />
<RiskRatingBadge level="CRITICAL" className="text-lg" />
```

**Design rules:**
- Always pair the badge with the ALE dollar figure. The badge is a visual anchor, not the primary information.
- The badge uses a translucent background (15% opacity) rather than a solid fill to maintain the dark theme's visual consistency.
- The icon provides shape-based differentiation for color-blind users: `ShieldCheck` (checkmark) for LOW, `AlertTriangle` (triangle) for MODERATE/HIGH, `ShieldAlert` (exclamation) for CRITICAL.

---

### 2. KPI Card

A metric card displaying a label, a large dollar figure in JetBrains Mono, and an optional trend indicator or sub-label. Used in the 4-card row at the top of the results dashboard.

**Anatomy:**

```
+------------------------------------------+
|  [icon]  Label text              [badge]  |
|                                           |
|  $1,250,000                               |
|                                           |
|  vs. industry median: $2.1M    [trend]    |
+------------------------------------------+
```

**Implementation:**

```tsx
// src/components/results/kpi-card.tsx
"use client";

import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  sublabel?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accentColor?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  sublabel,
  trend,
  trendLabel,
  accentColor = "text-cyan-400",
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("bg-slate-900 border-slate-700", className)}>
      <CardContent className="p-6">
        {/* Header row: icon + label */}
        <div className="flex items-center gap-2 mb-4">
          <div className={cn("rounded-md bg-slate-800 p-2", accentColor)}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium text-slate-400">{label}</span>
        </div>

        {/* Dollar figure */}
        <div className={cn("text-3xl font-bold font-mono tracking-tight text-slate-50")}>
          {value}
        </div>

        {/* Sublabel / trend */}
        {(sublabel || trendLabel) && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            {trend && (
              <span
                className={cn(
                  "font-mono text-xs font-medium",
                  trend === "down" ? "text-emerald-400" : "",
                  trend === "up" ? "text-rose-500" : "",
                  trend === "neutral" ? "text-slate-400" : ""
                )}
              >
                {trend === "down" ? "\u2193" : trend === "up" ? "\u2191" : "\u2022"}{" "}
                {trendLabel}
              </span>
            )}
            {sublabel && (
              <span className="text-slate-500">{sublabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Usage (results dashboard KPI row):**

```tsx
import { DollarSign, TrendingUp, Target, ShieldAlert } from "lucide-react";

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <KpiCard
    label="Annual Loss Expectancy (Median)"
    value="$1,250,000"
    icon={DollarSign}
    sublabel="50th percentile of 10,000 simulations"
    accentColor="text-cyan-400"
  />
  <KpiCard
    label="Probable Maximum Loss (95th)"
    value="$5,200,000"
    icon={TrendingUp}
    sublabel="Value at Risk"
    accentColor="text-rose-500"
  />
  <KpiCard
    label="Recommended Security Spend"
    value="$462,500"
    icon={Target}
    sublabel="Gordon-Loeb optimal investment"
    accentColor="text-emerald-400"
  />
  <KpiCard
    label="Risk Rating"
    value="MODERATE"
    icon={ShieldAlert}
    sublabel="Based on ALE vs. industry benchmark"
    accentColor="text-amber-400"
  />
</div>
```

**Design rules:**
- The dollar figure is always the largest element (`text-3xl font-bold font-mono`).
- The Risk Rating KPI card displays the text label "MODERATE" (not a number) because it is the only non-numeric card. Its value field still uses JetBrains Mono for visual consistency.
- Icon backgrounds use `bg-slate-800` with the icon in the accent color for that metric.
- For the "Recommended Spend" card, the trend arrow points down and is green (`text-emerald-400`) to indicate "your current spend is lower" -- a directional cue, not a judgment.

---

### 3. Wizard Progress Bar

A horizontal step indicator showing the user's position in the 5-step assessment wizard. Completed steps show checkmarks. The current step is highlighted with cyan. Future steps are muted.

**Anatomy:**

```
  [1]--------[2]--------[3]--------[4]--------[5]
   v           v         (active)   (future)   (future)
Company    Data      Security    Threats     Review
Profile    Profile   Controls   Landscape   & Submit
```

**Implementation:**

```tsx
// src/components/assess/wizard-progress.tsx
"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function WizardProgress({ currentStep, totalSteps, stepLabels }: WizardProgressProps) {
  return (
    <div className="w-full">
      {/* Step label */}
      <p className="text-sm text-slate-400 mb-4">
        Step {currentStep} of {totalSteps}:{" "}
        <span className="text-slate-50 font-medium">{stepLabels[currentStep - 1]}</span>
      </p>

      {/* Progress track */}
      <div className="flex items-center gap-0">
        {stepLabels.map((label, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const isFuture = stepNum > currentStep;

          return (
            <div key={stepNum} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  isCompleted && "bg-cyan-400 text-slate-950",
                  isCurrent && "bg-cyan-400/20 text-cyan-400 ring-2 ring-cyan-400",
                  isFuture && "bg-slate-800 text-slate-500"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
              </div>

              {/* Connector line */}
              {stepNum < totalSteps && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-colors",
                    isCompleted ? "bg-cyan-400" : "bg-slate-700"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step labels below circles */}
      <div className="flex mt-2">
        {stepLabels.map((label, index) => (
          <div
            key={index}
            className={cn(
              "flex-1 text-xs text-center last:flex-none last:text-right first:text-left",
              index + 1 === currentStep ? "text-cyan-400 font-medium" : "text-slate-500"
            )}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Usage:**

```tsx
<WizardProgress
  currentStep={3}
  totalSteps={5}
  stepLabels={[
    "Company Profile",
    "Data Profile",
    "Security Controls",
    "Threat Landscape",
    "Review & Submit",
  ]}
/>
```

**Design rules:**
- Completed steps use solid `bg-cyan-400` with a white checkmark icon. The solid fill provides clear visual feedback that the step is done.
- The current step uses `ring-2 ring-cyan-400` with a translucent cyan background to draw the eye without being as heavy as the completed state.
- Future steps use `bg-slate-800` with `text-slate-500` to remain visible but clearly inactive.
- Connector lines between steps are `bg-cyan-400` for completed segments and `bg-slate-700` for incomplete segments.

---

### 4. Form Controls (Wizard Steps)

All wizard form controls extend Shadcn/ui components with CybRisk's dark theme. The key principle: every control should feel native to the dark terminal aesthetic, not like a light-mode component with inverted colors.

#### Dropdown / Select (Industry, Revenue Band, Geography)

Extends Shadcn/ui `<Select>` with CybRisk styling.

```tsx
// Tailwind class pattern for CybRisk selects
<Select>
  <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-50 hover:border-slate-500 focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-2 focus:ring-offset-slate-950 h-11">
    <SelectValue placeholder="Select your industry" />
  </SelectTrigger>
  <SelectContent className="bg-slate-800 border-slate-600">
    <SelectItem
      value="financial"
      className="text-slate-50 focus:bg-cyan-400/10 focus:text-cyan-400"
    >
      Financial Services
    </SelectItem>
    <SelectItem
      value="healthcare"
      className="text-slate-50 focus:bg-cyan-400/10 focus:text-cyan-400"
    >
      Healthcare
    </SelectItem>
    {/* ... */}
  </SelectContent>
</Select>
```

#### Slider (Record Count, Cloud Percentage)

Extends Shadcn/ui `<Slider>` with cyan track and JetBrains Mono value display.

```tsx
// Slider with live value display
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <Label className="text-sm text-slate-400">Approximate Records Held</Label>
    <span className="text-sm font-mono text-cyan-400">
      {formatNumber(recordCount)}
    </span>
  </div>
  <Slider
    value={[recordCount]}
    onValueChange={([v]) => setRecordCount(v)}
    min={1000}
    max={100_000_000}
    step={1000}
    className="[&_[role=slider]]:bg-cyan-400 [&_[role=slider]]:border-cyan-400
               [&_[data-orientation=horizontal]>.range]:bg-cyan-400
               [&_[data-orientation=horizontal]>.track]:bg-slate-700"
  />
  <div className="flex justify-between text-xs text-slate-500 font-mono">
    <span>1K</span>
    <span>100M+</span>
  </div>
</div>
```

#### Toggle / Switch (Security Controls)

For the yes/no security control questions, use a custom toggle row pattern rather than standalone switches.

```tsx
// Security control toggle row
<div className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3 border border-slate-700">
  <div className="space-y-0.5">
    <Label className="text-sm font-medium text-slate-50">
      Do you have a dedicated security team or CISO?
    </Label>
    <p className="text-xs text-slate-500">
      A full-time or fractional CISO reduces expected loss by ~20%
    </p>
  </div>
  <Switch
    checked={controls.securityTeam}
    onCheckedChange={(checked) => setControls({ ...controls, securityTeam: checked })}
    className="data-[state=checked]:bg-cyan-400 data-[state=unchecked]:bg-slate-600"
  />
</div>
```

Stack 6 toggle rows vertically with `space-y-3` for Step 3.

#### Multi-Select (Threat Types, Data Types)

Since Shadcn/ui does not include a multi-select, use a grid of toggleable cards.

```tsx
// Multi-select as toggleable cards
const threatTypes = [
  { id: "ransomware", label: "Ransomware", icon: Lock },
  { id: "bec_phishing", label: "BEC / Phishing", icon: Mail },
  { id: "insider_threat", label: "Insider Threat", icon: UserX },
  { id: "third_party", label: "Third-Party / Supply Chain", icon: Link },
  { id: "web_app_attack", label: "Web Application Attack", icon: Globe },
  { id: "system_intrusion", label: "System Intrusion", icon: Terminal },
  { id: "lost_stolen", label: "Lost / Stolen Assets", icon: HardDrive },
];

<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
  {threatTypes.map(({ id, label, icon: Icon }) => {
    const isSelected = selected.includes(id);
    return (
      <button
        key={id}
        onClick={() => toggle(id)}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors",
          isSelected
            ? "bg-cyan-400/10 border-cyan-400/30 text-cyan-400"
            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
        )}
      >
        <Icon className="h-5 w-5" />
        <span className="text-center text-xs font-medium">{label}</span>
      </button>
    );
  })}
</div>
```

#### Wizard Navigation Buttons

```tsx
// Bottom of each wizard step
<div className="flex items-center justify-between pt-6 border-t border-slate-700">
  {currentStep > 1 && (
    <Button
      variant="outline"
      onClick={goBack}
      className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-50"
    >
      Back
    </Button>
  )}
  <Button
    onClick={goNext}
    className="ml-auto bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold"
  >
    {currentStep === totalSteps ? "Calculate My Risk" : "Continue"}
  </Button>
</div>
```

**Design rules for all form controls:**
- All inputs use `bg-slate-800` (elevated surface), not `bg-slate-900` (card surface). This creates a visual distinction between the input and its container card.
- Focus state: `ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-slate-950`. The offset uses the page background color to avoid visible gaps.
- All labels are `text-sm text-slate-400`. Help text is `text-xs text-slate-500`.
- Primary action button ("Continue", "Calculate My Risk") uses `bg-cyan-400 text-slate-950` -- dark text on light button for maximum contrast.
- Secondary action button ("Back") uses `variant="outline"` with `border-slate-600`.

---

### 5. Chart Container

A card wrapper for Recharts components that provides consistent padding, titles, and the dark-theme integration needed for Recharts on a slate-950 background.

**Implementation:**

```tsx
// src/components/results/chart-container.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartContainer({ title, subtitle, children, className }: ChartContainerProps) {
  return (
    <Card className={cn("bg-slate-900 border-slate-700", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-50">{title}</CardTitle>
        {subtitle && (
          <p className="text-sm text-slate-500">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Recharts theme constants:**

```tsx
// src/lib/chart-theme.ts
// Shared Recharts configuration for CybRisk dark theme

export const CHART_COLORS = {
  primary: "#22d3ee",      // cyan-400
  primaryLight: "#67e8f9", // cyan-300
  positive: "#34d399",     // emerald-400
  warning: "#fbbf24",      // amber-400
  danger: "#f43f5e",       // rose-500
  muted: "#475569",        // slate-600
  grid: "#1e293b",         // slate-800
  text: "#94a3b8",         // slate-400
  background: "#0f172a",   // slate-900
};

export const AXIS_STYLE = {
  fontSize: 12,
  fontFamily: "var(--font-jetbrains), monospace",
  fill: CHART_COLORS.text,
};

export const GRID_STYLE = {
  strokeDasharray: "3 3",
  stroke: CHART_COLORS.grid,
};

export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: CHART_COLORS.background,
    border: `1px solid ${CHART_COLORS.muted}`,
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "var(--font-jetbrains), monospace",
    color: "#f8fafc",
  },
  cursor: { fill: "rgba(34, 211, 238, 0.05)" },
};
```

**Usage with Recharts:**

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from "@/lib/chart-theme";

<ChartContainer
  title="Loss Distribution"
  subtitle="Probability distribution of annual loss from 10,000 Monte Carlo simulations"
>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={distributionBuckets}>
      <CartesianGrid {...GRID_STYLE} />
      <XAxis
        dataKey="range"
        tick={AXIS_STYLE}
        axisLine={{ stroke: CHART_COLORS.muted }}
        tickLine={{ stroke: CHART_COLORS.muted }}
      />
      <YAxis
        tick={AXIS_STYLE}
        axisLine={{ stroke: CHART_COLORS.muted }}
        tickLine={{ stroke: CHART_COLORS.muted }}
        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
      />
      <Tooltip {...TOOLTIP_STYLE} />
      <Bar
        dataKey="probability"
        fill={CHART_COLORS.primary}
        radius={[2, 2, 0, 0]}
        isAnimationActive={false}
      />
    </BarChart>
  </ResponsiveContainer>
</ChartContainer>
```

**Chart-specific design rules:**
- All charts use `isAnimationActive={false}` for consistent rendering and screenshot reliability.
- Bar charts use `radius={[2, 2, 0, 0]}` for slightly rounded top corners.
- Use `dot={false}` on line charts to reduce visual noise -- the line shape is the information.
- Tooltips use `bg-slate-900` background with `border-slate-600` border and JetBrains Mono for values.
- Grid lines use `strokeDasharray="3 3"` with `stroke-slate-800` -- subtle enough to provide reference without competing with data.
- Chart axis labels use JetBrains Mono at 12px in `text-slate-400`.
- Dollar values on axes should be abbreviated: `$1.2M` not `$1,200,000`.

---

### 6. Loading State (Monte Carlo Animation)

When the user clicks "Calculate My Risk," the app enters a loading state while the POST `/api/calculate` request completes (typically 1-3 seconds). The loading state must communicate that simulation is happening without overpromising speed.

**Anatomy:**

```
+--------------------------------------------------+
|                                                    |
|           [animated pulse ring]                    |
|                                                    |
|       Running 10,000 simulations...                |
|                                                    |
|       Modeling threat event frequency              |
|       Sampling loss distributions                  |
|       Calculating annual exposure                  |
|                                                    |
|       FAIR Methodology  |  Data Never Stored       |
|                                                    |
+--------------------------------------------------+
```

**Implementation:**

```tsx
// src/components/assess/simulation-loading.tsx
"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

const PHASES = [
  "Modeling threat event frequency",
  "Sampling loss magnitude distributions",
  "Running FAIR model iterations",
  "Computing loss exceedance curve",
  "Calculating Gordon-Loeb optimal spend",
  "Generating risk assessment",
];

export function SimulationLoading() {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % PHASES.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-8">
      {/* Animated pulse ring */}
      <div className="relative">
        <div className="h-16 w-16 rounded-full bg-cyan-400/10 flex items-center justify-center">
          <Activity className="h-8 w-8 text-cyan-400 animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" />
      </div>

      {/* Primary message */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-slate-50">
          Running 10,000 simulations<span className="animate-pulse">...</span>
        </h2>
        <p className="text-sm font-mono text-cyan-400 h-5 transition-opacity">
          {PHASES[phaseIndex]}
        </p>
      </div>

      {/* Trust signals */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>FAIR Methodology</span>
        <span className="text-slate-700">|</span>
        <span>Data Never Stored</span>
        <span className="text-slate-700">|</span>
        <span>IBM / DBIR / NetDiligence Data</span>
      </div>
    </div>
  );
}
```

**Design rules:**
- The loading state cycles through simulation phase descriptions at 800ms intervals. This is honest -- the real work is a single API call, but the phase descriptions communicate what the server is doing.
- The animated `Activity` icon uses `animate-pulse` (CSS pulse, not spin) because the simulation is processing data, not loading files.
- The outer ring uses `animate-ping` for a subtle radar-sweep effect that fits the analytical theme.
- Trust signals at the bottom reinforce credibility during the wait.

---

### 7. Trust Signal Badge

Small pill badges displayed on the landing page and results page footer to build credibility. These are not interactive -- they are static trust indicators.

**Implementation:**

```tsx
// src/components/shared/trust-badge.tsx
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadgeProps {
  icon: LucideIcon;
  label: string;
  className?: string;
}

export function TrustBadge({ icon: Icon, label, className }: TrustBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-slate-400",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 text-cyan-400" />
      <span>{label}</span>
    </div>
  );
}
```

**Usage (landing page hero):**

```tsx
import { Shield, Database, BarChart3 } from "lucide-react";

<div className="flex flex-wrap items-center justify-center gap-3">
  <TrustBadge icon={Shield} label="FAIR Methodology" />
  <TrustBadge icon={Database} label="Data Never Stored" />
  <TrustBadge icon={BarChart3} label="10,000 Simulations" />
</div>
```

**Design rules:**
- Trust badges use `bg-slate-800` (one step above card surface) with `border-slate-700` to be visible but not prominent.
- Icons are `text-cyan-400` (primary accent) while text is `text-slate-400` (secondary). This gives the badges enough presence without competing with the CTA.
- Badge height is compact (`py-1.5 px-3`) -- they should feel like metadata, not CTAs.

---

### 8. Wizard Step Card

The wrapper component for each step of the assessment wizard. Provides a consistent card layout with step number, title, description, form fields, and navigation.

**Implementation:**

```tsx
// src/components/assess/wizard-step-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WizardStepCardProps {
  stepNumber: number;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

export function WizardStepCard({
  stepNumber,
  title,
  description,
  children,
  className,
}: WizardStepCardProps) {
  return (
    <Card className={cn("bg-slate-900 border-slate-700 max-w-2xl mx-auto", className)}>
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-400">
            {stepNumber}
          </span>
          <CardTitle className="text-xl font-semibold text-slate-50">
            {title}
          </CardTitle>
        </div>
        <CardDescription className="text-sm text-slate-500 ml-10">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
      </CardContent>
    </Card>
  );
}
```

**Usage:**

```tsx
<WizardStepCard
  stepNumber={1}
  title="Company Profile"
  description="Tell us about your organization so we can calibrate industry-specific risk parameters."
>
  {/* Form fields here */}
</WizardStepCard>
```

---

### 9. Results Summary Header

The header section of the results dashboard displaying company context and the headline ALE figure.

```tsx
// Pattern for the results page header
<div className="space-y-6 mb-8">
  {/* Context bar */}
  <div className="flex items-center gap-4 text-sm text-slate-400">
    <span>Financial Services</span>
    <span className="text-slate-700">|</span>
    <span>$50M-$250M Revenue</span>
    <span className="text-slate-700">|</span>
    <span>500,000 Records</span>
    <span className="text-slate-700">|</span>
    <span className="font-mono text-slate-500">Feb 22, 2026</span>
  </div>

  {/* Headline */}
  <div className="flex items-start justify-between">
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-50">
        Your Financial Exposure
      </h1>
      <p className="mt-1 text-slate-400">
        Based on 10,000 Monte Carlo simulations using the FAIR model
      </p>
    </div>
    <RiskRatingBadge level="MODERATE" />
  </div>

  {/* ALE headline */}
  <div className="rounded-lg bg-slate-900 border border-slate-700 p-6">
    <p className="text-sm text-slate-400 mb-1">Annual Loss Expectancy (Mean)</p>
    <div className="flex items-baseline gap-3">
      <span className="text-5xl font-bold font-mono tracking-tight text-slate-50">
        $1.25M
      </span>
      <span className="text-lg font-mono text-slate-500">
        (90% between $120K and $3.4M)
      </span>
    </div>
  </div>
</div>
```

**Design rules:**
- The headline ALE figure uses `text-5xl font-bold font-mono` -- the single largest text element on the results page.
- The confidence interval is displayed inline in `text-slate-500` parenthetical to fulfill the "Show the distribution, not just the average" brand belief.
- Abbreviate large dollar figures: `$1.25M` not `$1,250,000` for the headline. Full precision appears in the KPI cards and tooltips.

---

### 10. Recommendations List

Actionable recommendations displayed below the charts on the results dashboard.

```tsx
// Pattern for recommendations section
<Card className="bg-slate-900 border-slate-700">
  <CardHeader>
    <CardTitle className="text-lg font-semibold text-slate-50">
      Key Recommendations
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {recommendations.map((rec, i) => (
      <div
        key={i}
        className="flex items-start gap-3 rounded-lg bg-slate-800 px-4 py-3 border border-slate-700"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 mt-0.5">
          <span className="text-xs font-bold text-cyan-400">{i + 1}</span>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-slate-50">{rec.text}</p>
          {rec.impact && (
            <p className="text-xs font-mono text-emerald-400">
              Estimated savings: {rec.impact}
            </p>
          )}
        </div>
      </div>
    ))}
  </CardContent>
</Card>
```

---

## Page Layouts

### Landing Page Layout

```
+----------------------------------------------------------+
|  [CybRisk logo]                    [Assess Your Risk CTA] |  <- Nav
+----------------------------------------------------------+
|                                                            |
|    Know Your Cyber Risk                                    |
|    in Dollars, Not Checkboxes                              |  <- Hero
|                                                            |
|    Monte Carlo-simulated financial exposure                |
|    estimates powered by real insurance claims data          |
|                                                            |
|    [Assess Your Risk -- Free]                              |
|                                                            |
|    [FAIR] [Data Never Stored] [10,000 Simulations]        |  <- Trust badges
|                                                            |
+----------------------------------------------------------+
|  +----------------+ +----------------+ +----------------+ |
|  | Dollar Sign    | | BarChart       | | Building       | |
|  | Financial      | | Board-Ready    | | Industry       | |  <- Feature cards
|  | Exposure       | | Reports        | | Benchmarks     | |
|  +----------------+ +----------------+ +----------------+ |
+----------------------------------------------------------+
|                                                            |
|    How It Works                                            |
|                                                            |
|    1. Answer     ->    2. Simulate   ->    3. Report      |  <- 3-step flow
|    5 questions         10K iterations      Dashboard       |
|                                                            |
+----------------------------------------------------------+
|    Built by Albert Hui | Security Ronin | MIT License      |  <- Footer
+----------------------------------------------------------+
```

**Key layout classes:**

```tsx
// Landing page section pattern
<section className="py-24 px-4 sm:px-6 lg:px-8">
  <div className="max-w-6xl mx-auto">
    {/* Content */}
  </div>
</section>
```

### Assessment Wizard Layout

```
+----------------------------------------------------------+
|  [CybRisk logo]                            Step 3 of 5    |  <- Nav
+----------------------------------------------------------+
|                                                            |
|  [1]----[2]----[3]----[4]----[5]                          |  <- Progress
|                                                            |
|  +--------------------------------------------------+    |
|  | 3  Security Controls                              |    |
|  |    Assess your current security posture           |    |
|  |                                                    |    |
|  |  +----------------------------------------------+ |    |
|  |  | Security team or CISO?           [toggle]     | |    |
|  |  +----------------------------------------------+ |    |  <- Step card
|  |  +----------------------------------------------+ |    |
|  |  | Incident response plan?          [toggle]     | |    |
|  |  +----------------------------------------------+ |    |
|  |  | ... more controls ...                          | |    |
|  |                                                    |    |
|  |  [Back]                              [Continue]    |    |
|  +--------------------------------------------------+    |
|                                                            |
+----------------------------------------------------------+
```

**Key layout classes:**

```tsx
// Wizard page layout
<div className="min-h-screen bg-slate-950 py-8 px-4">
  <div className="max-w-2xl mx-auto space-y-8">
    <WizardProgress currentStep={step} totalSteps={5} stepLabels={labels} />
    <WizardStepCard stepNumber={step} title={title} description={desc}>
      {/* Step form fields */}
    </WizardStepCard>
  </div>
</div>
```

### Results Dashboard Layout

```
+----------------------------------------------------------+
|  [CybRisk logo]                  [New Assessment] [Share] |  <- Nav
+----------------------------------------------------------+
|  Financial Services | $50M-$250M | 500K records | date    |  <- Context
|  Your Financial Exposure                    [MODERATE]     |  <- Header
|  Annual Loss Expectancy: $1.25M (90% between $120K-$3.4M)|  <- ALE headline
+----------------------------------------------------------+
|  +------------+ +------------+ +------------+ +----------+|
|  | ALE Median | | PML 95th   | | Rec. Spend | | Rating   ||  <- KPI row
|  | $1,250,000 | | $5,200,000 | | $462,500   | | MODERATE ||
|  +------------+ +------------+ +------------+ +----------+|
+----------------------------------------------------------+
|  +-------------------------+ +---------------------------+|
|  | Loss Distribution       | | Loss Exceedance Curve     ||
|  | [histogram chart]       | | [line chart]              ||  <- Charts
|  +-------------------------+ +---------------------------+|
+----------------------------------------------------------+
|  +-------------------------+ +---------------------------+|
|  | Industry Benchmark      | | Key Recommendations       ||
|  | [bar chart]             | | 1. Implement AI/auto...   ||  <- Bottom row
|  |                         | | 2. Obtain cyber ins...    ||
|  +-------------------------+ +---------------------------+|
+----------------------------------------------------------+
|  Sources: IBM 2025 | DBIR 2025 | NetDiligence 2025       |  <- Footer
+----------------------------------------------------------+
```

**Key layout classes:**

```tsx
// Results page layout
<div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
  <div className="max-w-7xl mx-auto space-y-6">
    {/* Context bar + Header + ALE headline */}
    {/* KPI row */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 4 KPI cards */}
    </div>
    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Loss distribution histogram */}
      {/* Loss exceedance curve */}
    </div>
    {/* Bottom row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Industry benchmark */}
      {/* Recommendations */}
    </div>
  </div>
</div>
```

---

## Button System

CybRisk uses three button variants, all built on Shadcn/ui's `<Button>` component.

| Variant | Tailwind Classes | Usage |
|---------|-----------------|-------|
| Primary | `bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold` | "Assess Your Risk", "Calculate My Risk", "Continue" |
| Secondary | `bg-slate-800 text-slate-50 hover:bg-slate-700 border border-slate-600` | "Back", "New Assessment" |
| Ghost | `text-slate-400 hover:text-slate-50 hover:bg-slate-800` | Navigation links, icon buttons |

**Primary button states:**

| State | Appearance |
|-------|-----------|
| Default | `bg-cyan-400 text-slate-950` |
| Hover | `bg-cyan-300 text-slate-950` |
| Focus | `ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-slate-950` |
| Disabled | `bg-cyan-400/50 text-slate-950/50 cursor-not-allowed` |
| Loading | Spinner icon replacing text, `bg-cyan-400/80` |

**Sizing:**

| Size | Tailwind | Usage |
|------|----------|-------|
| Default | `h-10 px-6` | Standard form buttons |
| Large | `h-12 px-8 text-lg` | Hero CTA, "Calculate My Risk" |
| Small | `h-8 px-4 text-sm` | Inline actions, toolbar buttons |
| Icon | `h-10 w-10 p-0` | Icon-only buttons |

---

## Icon Guidelines

CybRisk uses Lucide React exclusively. No custom SVGs, no other icon libraries.

**Common icon mappings:**

| Concept | Icon | Usage |
|---------|------|-------|
| Dollar / money | `DollarSign` | KPI cards, financial metrics |
| Risk / exposure | `TrendingUp` | PML, trending metrics |
| Security spend | `Target` | Gordon-Loeb recommendation |
| Risk rating | `ShieldAlert` | Risk level indicator |
| Success / low risk | `ShieldCheck` | LOW risk badge |
| Warning | `AlertTriangle` | MODERATE/HIGH risk badge |
| Simulation | `Activity` | Loading state |
| Calculate | `Calculator` | Submit button icon |
| Industry | `Building2` | Company profile |
| Data | `Database` | Data profile step |
| Lock / security | `Lock` | Security controls step |
| Threat | `Crosshair` | Threat landscape step |
| Review | `ClipboardCheck` | Review step |
| Chart | `BarChart3` | Chart reference |
| Share | `Share2` | Share results |
| Download | `Download` | Export PDF |
| External link | `ExternalLink` | Source citations |
| Info | `Info` | Methodology tooltips |
| Arrow right | `ArrowRight` | CTA buttons, "How it works" flow |

**Icon sizing:**

| Context | Size | Tailwind |
|---------|------|----------|
| Inline with text | 16px | `h-4 w-4` |
| In buttons | 16px | `h-4 w-4 mr-2` |
| KPI card accent | 16px | `h-4 w-4` |
| Feature cards | 24px | `h-6 w-6` |
| Loading state | 32px | `h-8 w-8` |
| Empty state | 48px | `h-12 w-12` |

---

## Interaction States

### Transitions

All interactive elements use `transition-colors duration-150` for color changes. No motion transitions on layout shifts (no `transition-all`). Cards do not scale on hover. The design is intentionally calm -- data dashboards should not bounce or wiggle.

### Focus Management

All focusable elements must have visible focus indicators. CybRisk uses ring-based focus styles rather than outline:

```
focus-visible:ring-2 focus-visible:ring-cyan-400/50
focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
```

Tab order follows visual order (left-to-right, top-to-bottom). The wizard enforces sequential focus: users cannot tab into future step content.

### Error States

Form validation errors use rose-500 for the error message and border:

```tsx
// Input error state
<div className="space-y-2">
  <Label className="text-sm text-slate-400">Annual Revenue</Label>
  <Select>
    <SelectTrigger className="bg-slate-800 border-rose-500 text-slate-50">
      <SelectValue placeholder="Select revenue band" />
    </SelectTrigger>
  </Select>
  <p className="text-xs text-rose-500">Please select a revenue band</p>
</div>
```

---

## Responsive Breakpoints

CybRisk is optimized for desktop. Mobile support is Phase 2.

| Breakpoint | Tailwind | Target |
|-----------|----------|--------|
| Default | (none) | Mobile-first base (stacked layouts) |
| `sm` | `640px` | KPI cards: 2 columns |
| `md` | `768px` | Wizard: wider card padding |
| `lg` | `1024px` | Dashboard: 2-column chart grid, 4-column KPI row |
| `xl` | `1280px` | Max content width constrains |

Landing page minimum screenshot width: 1280px (hackathon submission requirement).

---

## Dark Theme Implementation

CybRisk is dark-only. There is no light mode toggle. The `dark` class is not used because the dark palette IS the default.

To implement this with Shadcn/ui (which defaults to a light/dark toggle pattern), override the `:root` CSS variables directly with dark values instead of placing them inside `.dark`. This avoids needing to add `className="dark"` to the `<html>` element or manage theme state.

```css
/* In globals.css, set dark values as root defaults */
:root {
  --background: 222.2 84% 4.9%;      /* slate-950 */
  --foreground: 210 40% 98%;          /* slate-50 */
  --card: 222.2 47.4% 11.2%;         /* slate-900 */
  /* ... all other CybRisk values ... */
}

/* The .dark block can be removed entirely, or kept empty as a no-op */
```

---

## File Organization

```
src/
  components/
    ui/                          # Shadcn/ui primitives (auto-generated)
      badge.tsx
      button.tsx
      card.tsx
      chart.tsx
      input.tsx
      label.tsx
      progress.tsx
      select.tsx
      separator.tsx
      slider.tsx
      tabs.tsx
    shared/                      # Cross-page components
      trust-badge.tsx
      cybrisk-logo.tsx
      footer.tsx
    landing/                     # Landing page sections
      hero.tsx
      features.tsx
      how-it-works.tsx
      cta.tsx
    assess/                      # Wizard components
      wizard-progress.tsx
      wizard-step-card.tsx
      simulation-loading.tsx
      steps/
        company-profile.tsx      # Step 1
        data-profile.tsx         # Step 2
        security-controls.tsx    # Step 3
        threat-landscape.tsx     # Step 4
        review-submit.tsx        # Step 5
    results/                     # Dashboard components
      kpi-card.tsx
      risk-rating-badge.tsx
      chart-container.tsx
      loss-distribution.tsx      # Histogram (Recharts)
      loss-exceedance.tsx        # LEC line chart (Recharts)
      industry-benchmark.tsx     # Comparison bar chart (Recharts)
      recommendations.tsx
      key-drivers.tsx
  lib/
    utils.ts                     # Shadcn/ui cn() utility
    chart-theme.ts               # Recharts color/style constants
```

---

## Anti-Patterns

Design decisions we explicitly avoid:

| Anti-Pattern | Why We Avoid It |
|--------------|-----------------|
| **Drop shadows on cards** | Shadows imply depth and physicality. CybRisk is flat and data-driven. Use border color steps for elevation. |
| **Gradient backgrounds** | Gradients signal marketing polish. CybRisk is a calculator. Solid slate backgrounds are honest. |
| **Animated page transitions** | Transitions add perceived latency. The wizard should feel instant, not cinematic. |
| **Hover scale effects on cards** | Scaling cards suggests they are clickable navigation elements. KPI cards are display-only. |
| **Color-only status indicators** | Always pair color with text labels for accessibility. Never use just green/red to indicate good/bad. |
| **Stock photos or illustrations** | The data IS the visual. Loss distributions and exceedance curves are more compelling than any stock image. |
| **Custom scrollbars** | Use browser-native scrollbars. Custom scrollbars break accessibility and platform conventions. |
| **Toast notifications** | The wizard is linear and synchronous. No async operations require toast notifications in Phase 1. |
| **Dark mode toggle** | CybRisk is dark-only. A toggle implies we support light mode. We do not. |

---

## Shadcn/ui Component Overrides

To apply CybRisk's theme to all Shadcn/ui components globally, update the CSS variables in `globals.css` as specified in the Color System section. This ensures that `<Button>`, `<Card>`, `<Select>`, and all other Shadcn/ui primitives automatically inherit CybRisk's palette.

For components that need CybRisk-specific overrides beyond the CSS variable defaults:

| Component | Override | Reason |
|-----------|----------|--------|
| `Button` (default variant) | `bg-cyan-400 text-slate-950 hover:bg-cyan-300` | Shadcn default primary is too generic |
| `Card` | `bg-slate-900 border-slate-700` | Ensure consistent surface color |
| `Select` trigger | `bg-slate-800 border-slate-600` | Inputs must be elevated above card surface |
| `Slider` track | `bg-slate-700` with `bg-cyan-400` range fill | Match CybRisk accent color |
| `Badge` | Use custom `RiskRatingBadge` instead | Shadcn Badge is too simple for risk levels |
| `Progress` | `bg-slate-700` track with `bg-cyan-400` fill | Match wizard progress theme |

---

## Recharts Integration Checklist

When adding any new chart to CybRisk:

1. Wrap in `<ChartContainer>` with a `title` and `subtitle`
2. Use `<ResponsiveContainer width="100%" height="100%">` inside the container
3. Import colors and styles from `@/lib/chart-theme`
4. Set `isAnimationActive={false}` on all data components
5. Use JetBrains Mono for axis tick labels via `AXIS_STYLE`
6. Abbreviate dollar values on axes (`$1.2M` not `$1,200,000`)
7. Apply `GRID_STYLE` to `<CartesianGrid>` for consistent dashed lines
8. Apply `TOOLTIP_STYLE` to `<Tooltip>` for dark-themed tooltips
9. Use `CHART_COLORS.primary` (#22d3ee) for the main data series
10. Use `dot={false}` on `<Line>` components

---

*Document generated by North Star Advisor*
