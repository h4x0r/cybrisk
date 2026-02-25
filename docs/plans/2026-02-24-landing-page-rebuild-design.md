# Landing Page Rebuild — Design Document

**Date**: 2026-02-24
**Author**: Claude (brainstorming session with Albert)

## Aesthetic Direction: "The Quantitative Firm"

Dark, premium landing page that feels like the lobby of a quant hedge fund's research division. The science isn't decoration — it IS the product. Every formula, every data citation, every number earns its place on screen.

**Vibe**: Economist magazine meets Bloomberg Terminal.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Background layer | Atmospheric canvas only | One subtle animated element; formulas move to foreground content |
| Typography | Editorial Serif + Mono | Playfair Display headlines, Geist Sans body, Geist Mono formulas |
| Pain points section | Option A: stat-led columns | Numbers as icons, sharper and more scannable |

## Page Sections

### 1. Background — Atmospheric Canvas

Single subtle canvas animation: slow-breathing dot grid or faint particle field. Very low opacity (5-8%), slow movement. Faint gradient mesh: deep navy `#060a18` with barely-perceptible radial blue glow near center.

**Removed**: 3D surface plot, 8 floating formula cards, hex streams, scrolling binary text.

### 2. Navigation

Logo + wordmark left. Single "Assess Risk" CTA right. No burger menu, no links.

### 3. Hero

Top to bottom:
1. **Authority badge** — mono pill: `FAIR™ · Monte Carlo · N=10,000 · IBM + DBIR + NetDiligence`
2. **Headline** — large Playfair Display serif: "Your Board Doesn't Care About Firewalls. **They Care About This Number.**" Second line gets subtle cyan-to-blue gradient.
3. **Sub-headline** — Geist Sans ~18px, muted: "Translate security posture into a hard, defensible dollar figure — using actuarial science, not opinions."
4. **Formula strip** — 3-4 key formulas, horizontal mono row, faint separators
5. **CTA** — "Calculate Financial Exposure →" with glow + secondary trust line in faint mono

### 4. Trust Strip

6 stat badges in Bloomberg-ticker style: monospace, tightly kerned, understated. `10,000` MC Sims | `IBM 2024` | `DBIR` | `NetDiligence` | `Gordon-Loeb` | `FAIR™`

### 5. Hero Chart Card

Glassmorphism card with subtle blue border glow:
- Left: ALE `$1,245,000` + CI
- Right: Gordon-Loeb `$460,650` + ROSI
- Below: Recharts area chart (keep existing)
- Bottom: percentile legend

### 6. Pain Points — Stat-Led Columns

Three columns, each: bold number/stat top → sharp one-line claim → 1-sentence explanation → formula footnote. No icons. Numbers ARE the icons.

### 7. Footer

Single-line monospace: company, credentials, data sources, hackathon.

## Typography Stack

| Role | Font | Weight |
|------|------|--------|
| Headlines | Playfair Display | 700, 900 |
| Body | Geist Sans | 400, 500, 600 |
| Formulas/Data | Geist Mono | 400, 500 |

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| bg-deep | `#060a18` | Page background |
| card-bg | `rgba(4,8,28,0.92)` | Card backgrounds |
| accent-cyan | `#00d4ff` | Primary accent |
| accent-blue | `#0070e0` | CTA gradient start |
| text-primary | `#f0f4ff` | Headlines |
| text-secondary | `#8899bb` | Body |
| text-muted | `#4a5568` | Labels |
| border-glow | `rgba(0,180,255,0.18)` | Card borders |
| danger | `#ef4444` | PML/risk |
| success | `#22c55e` | Gordon-Loeb |
| gold | `#ffd060` | Highlights |

## Animation Sequence

| Element | Animation | Trigger | Delay |
|---------|-----------|---------|-------|
| Background grid | Breathing pulse | Constant, CSS | 0ms |
| Hero headline | Fade-up stagger | Load | 0ms |
| Sub-headline | Fade-up | Load | 200ms |
| Formula strip | Fade-in L→R | Load | 400ms |
| CTA | Fade-up + glow | Load | 500ms |
| Trust stats | Counter tick-up | Load | 700ms |
| Chart card | Fade-up + border glow | Load | 900ms |
| Pain point cols | Fade-up stagger | Scroll | - |

All CSS-only where possible.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/app/page.tsx` | Full rewrite |
| `src/components/landing/ScientistBg.tsx` | Rewrite — subtle atmospheric canvas only |
| `src/components/landing/HeroChart.tsx` | Keep, minor style tweaks |
| `src/app/globals.css` | Update animations |
| `src/app/layout.tsx` | Add Playfair Display font |
