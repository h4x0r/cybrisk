# Landing Page Rebuild — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the CybRisk landing page from "busy scientist wallpaper" to "The Quantitative Firm" — a dark, premium, Bloomberg-meets-Economist editorial page with atmospheric canvas background, Playfair Display serif headlines, and razor-sharp foreground content.

**Architecture:** Single-page Next.js App Router page (`src/app/page.tsx`) as a client component with a lightweight atmospheric canvas background (`ScientistBg.tsx`), the existing `HeroChart.tsx` Recharts component, and CSS-only staggered load animations. No new dependencies except the Playfair Display Google Font.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4, Recharts, Playfair Display (Google Fonts via `next/font`), Geist Sans + Geist Mono (already installed), CSS keyframe animations.

**Design doc:** `docs/plans/2026-02-24-landing-page-rebuild-design.md`

---

### Task 1: Add Playfair Display Font to Layout

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Add the Playfair Display import and CSS variable**

In `src/app/layout.tsx`, add the Playfair Display font import from `next/font/google` alongside the existing Geist fonts, and add its CSS variable to the `<body>` className.

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "CybRisk — Cyber Risk in Dollars, Not Checkboxes",
  description:
    "Monte Carlo-simulated financial exposure estimates powered by FAIR methodology and real actuarial data. Know your cyber risk in dollars.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

**Step 2: Verify the dev server starts**

Run: `npm run dev`
Expected: Server starts without errors. Visit `http://localhost:3000` — page loads (existing page, no visual changes yet).

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add Playfair Display font and update metadata"
```

---

### Task 2: Rewrite Atmospheric Canvas Background

**Files:**
- Rewrite: `src/components/landing/ScientistBg.tsx`

**Step 1: Replace ScientistBg with subtle atmospheric canvas**

Replace the entire file. The new version draws:
- A deep navy radial gradient background
- A faint dot grid (opacity ~6%) that breathes with a slow sine wave
- A subtle scan line

No 3D surface plot, no formula cards, no hex streams, no particles.

```tsx
'use client';
import React, { useEffect, useRef } from 'react';

export default function ScientistBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const GRID = 40;

    const draw = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, W, H);

      // Radial gradient background
      const bg = ctx.createRadialGradient(
        W * 0.4, H * 0.35, 0,
        W * 0.5, H * 0.5, Math.max(W, H) * 0.9
      );
      bg.addColorStop(0, '#0a0f24');
      bg.addColorStop(0.5, '#060a18');
      bg.addColorStop(1, '#030508');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Breathing dot grid
      for (let x = GRID; x < W; x += GRID) {
        for (let y = GRID; y < H; y += GRID) {
          const dist = Math.hypot(x - W * 0.4, y - H * 0.35);
          const maxDist = Math.max(W, H) * 0.8;
          const fade = 1 - Math.min(dist / maxDist, 1);
          const breath = 0.03 + 0.03 * Math.sin(t * 0.5 + x * 0.008 + y * 0.006);
          const alpha = breath * fade;
          if (alpha < 0.005) continue;
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(100,160,255,${alpha.toFixed(3)})`;
          ctx.fill();
        }
      }

      // Faint horizontal scan line
      const sy = ((t * 30) % (H + 60)) - 30;
      const sg = ctx.createLinearGradient(0, sy - 15, 0, sy + 15);
      sg.addColorStop(0, 'transparent');
      sg.addColorStop(0.5, 'rgba(0,150,255,0.025)');
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(0, sy - 15, W, 30);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
}
```

**Step 2: Verify visually**

Run: `npm run dev`
Expected: Background shows a very subtle breathing dot grid on deep navy. No formula cards, no 3D surface, no hex streams. Clean and atmospheric.

**Step 3: Commit**

```bash
git add src/components/landing/ScientistBg.tsx
git commit -m "feat: rewrite ScientistBg to subtle atmospheric dot grid"
```

---

### Task 3: Update Global CSS Animations

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Replace the CybRisk-specific animation block**

Keep all the Tailwind/Shadcn/theme CSS at the top. Replace the `/* ─── CybRisk Scientist Landing ───` section at the bottom with new animations for the staggered page load:

```css
/* ─── CybRisk Landing Animations ─────────────────────── */
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 30px -8px rgba(0,180,255,0.4); }
  50% { box-shadow: 0 0 50px -4px rgba(0,180,255,0.6); }
}

@keyframes border-glow {
  0%, 100% { border-color: rgba(0,180,255,0.18); }
  50% { border-color: rgba(0,180,255,0.35); }
}

.animate-fade-up {
  opacity: 0;
  animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-fade-in {
  opacity: 0;
  animation: fade-in 0.6s ease-out forwards;
}

.animate-glow-pulse {
  animation: glow-pulse 3s ease-in-out infinite;
}

.animate-border-glow {
  animation: border-glow 4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-fade-up,
  .animate-fade-in {
    animation-duration: 0.01s;
  }
  .animate-glow-pulse,
  .animate-border-glow {
    animation: none;
  }
}
```

**Step 2: Build check**

Run: `npm run build`
Expected: Build completes without errors.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: replace landing animations with staggered fade-up system"
```

---

### Task 4: Rewrite the Landing Page

This is the main task. Full rewrite of `src/app/page.tsx`.

**Files:**
- Rewrite: `src/app/page.tsx`

**Step 1: Write the complete new landing page**

The new page has these sections in order:
1. ScientistBg (atmospheric canvas, loaded dynamically with `ssr: false`)
2. Nav — logo left, CTA right
3. Hero — authority badge, Playfair headline, sub-headline, formula strip, CTA
4. Trust strip — 6 Bloomberg-style stat badges
5. Chart card — glassmorphism card with ALE/Gordon-Loeb numbers + HeroChart
6. Pain points — 3 stat-led columns
7. Footer — single-line mono

Key implementation notes:
- `'use client'` needed for dynamic import of ScientistBg
- Playfair Display via CSS variable `font-[family-name:var(--font-playfair)]`
- Animation delays via inline `style={{ animationDelay: 'Xms' }}`
- All colors use the palette from the design doc
- Formula strip uses `font-mono` (maps to Geist Mono)
- No icons from lucide — numbers and typography carry the design

```tsx
'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import HeroChart from '@/components/landing/HeroChart';
import dynamic from 'next/dynamic';

const ScientistBg = dynamic(() => import('@/components/landing/ScientistBg'), {
  ssr: false,
});

const FORMULAS = [
  'Risk = LEF × E[LM]',
  'ALE = (1/N)Σ LMᵢ',
  'VaR₀.₉₅ = PML',
  'z* ≤ S/e',
];

const TRUST_STATS = [
  { val: '10,000', label: 'MC Simulations', color: '#00d4ff' },
  { val: 'IBM 2024', label: '$4.88M μ_breach', color: '#a0d0ff' },
  { val: 'Verizon DBIR', label: 'Threat Frequencies', color: '#a0d0ff' },
  { val: 'NetDiligence', label: 'Cyber Claims Data', color: '#a0d0ff' },
  { val: 'Gordon-Loeb', label: 'Optimal Spend Model', color: '#ffd060' },
  { val: 'FAIR™', label: 'Risk Framework', color: '#80ffb0' },
];

const PAIN_POINTS = [
  {
    stat: '$4.88M',
    statLabel: 'avg breach cost',
    claim: 'Know your exact dollar exposure',
    body: 'IBM says the average breach costs $4.88M. But that\'s an average — your number depends on your industry, data volume, and controls. We calculate yours.',
    formula: 'ΔRisk/Δz = marginal ROSI',
    color: '#ef4444',
  },
  {
    stat: '10,000',
    statLabel: 'simulations',
    claim: 'Actuarial proof, not opinions',
    body: 'Every estimate is backed by 10,000 Monte Carlo trials using IBM, Verizon DBIR, and NetDiligence cyber claims data. Poisson frequencies. Log-normal severities. Real math.',
    formula: 'σ²_ALE = Σ σ²_LM · λ',
    color: '#00d4ff',
  },
  {
    stat: '37%',
    statLabel: 'optimal spend cap',
    claim: 'Mathematically optimal security budget',
    body: 'The Gordon-Loeb model proves when spending more on security stops making financial sense. We show your point of diminishing returns — with a derivable formula.',
    formula: 'z* ≤ (1/e) · v · S',
    color: '#22c55e',
  },
];

const PERCENTILE_LEGEND = [
  { label: 'P50 — ALE Median', color: '#06b6d4' },
  { label: 'P95 — Probable Maximum Loss', color: '#ef4444' },
  { label: 'Optimal Security Spend (Gordon-Loeb)', color: '#22c55e' },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-[#f0f4ff] overflow-x-hidden"
      style={{ background: '#060a18', fontFamily: 'var(--font-geist-sans)' }}
    >
      <ScientistBg />

      <main className="relative z-10">
        {/* ─── Nav ─────────────────────────────────────────── */}
        <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center font-mono text-xs font-bold"
              style={{
                background: 'rgba(0,180,255,0.12)',
                border: '1px solid rgba(0,180,255,0.3)',
                color: '#00d4ff',
              }}
            >
              CR
            </div>
            <span className="text-lg font-semibold tracking-tight text-[#f0f4ff]">
              CybRisk
            </span>
          </div>
          <Link
            href="/assess"
            className="text-sm font-medium px-5 py-2 rounded-full transition-all duration-300 hover:scale-105"
            style={{
              background: 'rgba(0,180,255,0.08)',
              border: '1px solid rgba(0,180,255,0.3)',
              color: '#00d4ff',
            }}
          >
            Assess Risk
          </Link>
        </nav>

        {/* ─── Hero ────────────────────────────────────────── */}
        <section className="container mx-auto px-6 pt-20 pb-12 text-center">
          {/* Authority badge */}
          <div
            className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-10"
            style={{
              animationDelay: '0ms',
              background: 'rgba(2,8,32,0.9)',
              border: '1px solid rgba(0,180,255,0.25)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
            <span
              className="text-[#6899cc] text-[11px] tracking-[0.15em] uppercase"
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              FAIR™ · Monte Carlo · N=10,000 · IBM + DBIR + NetDiligence
            </span>
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-up max-w-4xl mx-auto text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.1] tracking-tight mb-6"
            style={{
              animationDelay: '100ms',
              fontFamily: 'var(--font-playfair)',
              fontWeight: 700,
            }}
          >
            Your Board Doesn&rsquo;t Care About Firewalls.
            <br className="hidden md:block" />
            <span
              className="font-black"
              style={{
                fontWeight: 900,
                backgroundImage: 'linear-gradient(135deg, #b0d8ff 0%, #00d4ff 40%, #4080ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              They Care About This Number.
            </span>
          </h1>

          {/* Sub-headline */}
          <p
            className="animate-fade-up max-w-2xl mx-auto text-lg md:text-xl leading-relaxed mb-10"
            style={{
              animationDelay: '200ms',
              color: '#8899bb',
            }}
          >
            Translate security posture into a{' '}
            <strong className="text-[#c8d8f0]">
              hard, defensible dollar figure
            </strong>{' '}
            — using actuarial science, not opinions.
          </p>

          {/* Formula strip */}
          <div
            className="animate-fade-in flex flex-wrap items-center justify-center gap-x-1 mb-10"
            style={{ animationDelay: '400ms' }}
          >
            {FORMULAS.map((f, i) => (
              <span key={f} className="flex items-center">
                <span
                  className="text-xs md:text-sm px-3 py-1"
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    color: 'rgba(0,200,255,0.55)',
                  }}
                >
                  {f}
                </span>
                {i < FORMULAS.length - 1 && (
                  <span
                    className="text-[10px]"
                    style={{ color: 'rgba(0,180,255,0.2)' }}
                  >
                    ·
                  </span>
                )}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div
            className="animate-fade-up flex flex-col sm:flex-row items-center justify-center gap-6 mb-6"
            style={{ animationDelay: '500ms' }}
          >
            <Link
              href="/assess"
              className="group flex items-center gap-2 px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-[1.03] active:scale-[0.98] animate-glow-pulse"
              style={{
                background: 'linear-gradient(135deg, #0060d0 0%, #00b0f0 100%)',
                color: '#fff',
              }}
            >
              Calculate Financial Exposure
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <div
              className="text-left text-[11px] border-l pl-4 py-1 space-y-0.5"
              style={{
                fontFamily: 'var(--font-geist-mono)',
                borderColor: 'rgba(0,180,255,0.15)',
              }}
            >
              <div style={{ color: '#6888aa' }}>LEF ~ Poisson(λ)</div>
              <div style={{ color: '#4a6080' }}>LM ~ LogNormal(μ, σ)</div>
              <div style={{ color: '#4a6080' }}>V ~ Beta-PERT(min, mode, max)</div>
            </div>
          </div>
        </section>

        {/* ─── Trust Strip ─────────────────────────────────── */}
        <section
          className="animate-fade-in border-y py-5"
          style={{
            animationDelay: '700ms',
            borderColor: 'rgba(0,180,255,0.08)',
            background: 'rgba(2,5,18,0.6)',
          }}
        >
          <div className="container mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {TRUST_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div
                  className="text-sm font-bold"
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    color: s.color,
                  }}
                >
                  {s.val}
                </div>
                <div
                  className="text-[10px] tracking-wider uppercase mt-0.5"
                  style={{ color: '#4a5568' }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Chart Card ──────────────────────────────────── */}
        <section className="container mx-auto px-6 py-20">
          <div
            className="animate-fade-up max-w-5xl mx-auto rounded-2xl p-6 md:p-8 relative animate-border-glow"
            style={{
              animationDelay: '900ms',
              background: 'rgba(4, 8, 28, 0.92)',
              border: '1px solid rgba(0,180,255,0.18)',
              backdropFilter: 'blur(18px)',
            }}
          >
            {/* Top gradient wash */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,140,255,0.04) 0%, transparent 35%)',
              }}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 px-2 relative z-10">
              <div className="text-left mb-4 md:mb-0">
                <div
                  className="text-[10px] tracking-[0.15em] uppercase mb-1.5"
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    color: '#4a6080',
                  }}
                >
                  Annualized Loss Expectancy · ALE = E[LEF] × E[LM]
                </div>
                <div
                  className="text-4xl md:text-5xl font-bold tracking-tight"
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    color: '#f0f4ff',
                    textShadow: '0 0 30px rgba(0,180,255,0.2)',
                  }}
                >
                  $1,245,000
                </div>
                <div
                  className="text-[11px] mt-1"
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    color: '#4a6080',
                  }}
                >
                  95% CI: $820K – $2.1M · SE = σ_ALE / √10,000
                </div>
              </div>
              <div className="text-left md:text-right">
                <div
                  className="text-[10px] tracking-[0.15em] uppercase mb-1.5"
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    color: '#4a6080',
                  }}
                >
                  Gordon-Loeb Optimal Spend · z* ≤ S/e
                </div>
                <div
                  className="text-3xl md:text-4xl font-bold tracking-tight"
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    color: '#00d4ff',
                    textShadow: '0 0 20px rgba(0,210,255,0.3)',
                  }}
                >
                  $460,650
                </div>
                <div
                  className="text-[11px] mt-1"
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    color: '#4a6080',
                  }}
                >
                  Max ROSI = 37% of expected loss
                </div>
              </div>
            </div>

            <div className="h-[380px] w-full">
              <HeroChart />
            </div>

            {/* Percentile legend */}
            <div className="flex flex-wrap justify-center gap-6 mt-6 pt-4 border-t border-[rgba(0,180,255,0.08)]">
              {PERCENTILE_LEGEND.map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <div
                    className="w-5 h-0.5 rounded"
                    style={{
                      background: l.color,
                      boxShadow: `0 0 6px ${l.color}`,
                    }}
                  />
                  <span
                    className="text-[11px]"
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      color: '#4a6080',
                    }}
                  >
                    {l.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pain Points — Stat-Led Columns ──────────────── */}
        <section
          className="border-y py-24"
          style={{
            borderColor: 'rgba(0,180,255,0.08)',
            background: 'rgba(2,5,18,0.5)',
          }}
        >
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <p
                className="inline-block px-3 py-1 rounded text-xs mb-6"
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  background: 'rgba(200,30,30,0.08)',
                  border: '1px solid rgba(200,30,30,0.15)',
                  color: 'rgba(239,68,68,0.7)',
                }}
              >
                H₀: heatmaps convey financial risk → REJECTED (p &lt; 0.001)
              </p>
              <h2
                className="text-3xl md:text-4xl mb-4"
                style={{
                  fontFamily: 'var(--font-playfair)',
                  fontWeight: 700,
                  color: '#f0f4ff',
                }}
              >
                Heatmaps are lying to your board.
              </h2>
              <p className="text-lg" style={{ color: '#8899bb' }}>
                When the CFO asks{' '}
                <em className="text-[#c8d8f0]">
                  &ldquo;What happens to the bottom line if we do nothing?&rdquo;
                </em>{' '}
                — answer in dollars, with a confidence interval.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {PAIN_POINTS.map((card, i) => (
                <div
                  key={card.claim}
                  className="animate-fade-up p-8 rounded-xl"
                  style={{
                    animationDelay: `${1100 + i * 150}ms`,
                    background: 'rgba(4,8,28,0.8)',
                    border: '1px solid rgba(0,120,255,0.1)',
                  }}
                >
                  <div
                    className="text-4xl font-bold mb-1"
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      color: card.color,
                    }}
                  >
                    {card.stat}
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-wider mb-5"
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      color: '#4a6080',
                    }}
                  >
                    {card.statLabel}
                  </div>
                  <h3
                    className="text-lg font-semibold mb-3"
                    style={{ color: '#d0ddf0' }}
                  >
                    {card.claim}
                  </h3>
                  <p
                    className="text-sm leading-relaxed mb-4"
                    style={{ color: '#6888aa' }}
                  >
                    {card.body}
                  </p>
                  <div
                    className="text-xs px-3 py-1.5 rounded inline-block"
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      background: 'rgba(0,80,200,0.1)',
                      border: '1px solid rgba(0,160,255,0.12)',
                      color: 'rgba(0,200,255,0.5)',
                    }}
                  >
                    {card.formula}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Footer ──────────────────────────────────────── */}
        <footer className="container mx-auto px-6 py-12 text-center">
          <div
            className="text-[11px] space-y-1"
            style={{
              fontFamily: 'var(--font-geist-mono)',
              color: '#3a4560',
            }}
          >
            <div>
              CybRisk · Security Ronin · Albert Hui CISSP CISM CISA GCFA
            </div>
            <div>DataExpert Vibe Coding Challenge · Feb 2026</div>
            <div className="mt-2" style={{ color: '#2a3548' }}>
              IBM Cost of a Breach 2024 · Verizon DBIR 2024 · NetDiligence
              Cyber Claims Study 2023
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
```

**Step 2: Verify visual output**

Run: `npm run dev`
Expected:
- Subtle breathing dot grid background (no 3D surface, no formula cards)
- Playfair Display serif headlines
- Staggered fade-up animations on page load
- Clean formula strip (mono text, not pill badges)
- Glassmorphism chart card with border glow
- Stat-led pain point columns (numbers as primary visual)
- Sharp, minimal footer

**Step 3: Build check**

Run: `npm run build`
Expected: Build completes without errors.

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: rebuild landing page — The Quantitative Firm design"
```

---

### Task 5: Final Polish and HeroChart Style Tweaks

**Files:**
- Modify: `src/components/landing/HeroChart.tsx`

**Step 1: Minor style updates to HeroChart**

Update tooltip and grid styles to match new design palette:

- Change CartesianGrid stroke from `#1e293b` to `rgba(0,120,255,0.06)`
- Change XAxis stroke/tick fill from `#475569` to `#4a6080`
- Update tooltip contentStyle backgroundColor from `#0f172a` to `rgba(4,8,28,0.95)`
- Update tooltip contentStyle borderColor from `#1e293b` to `rgba(0,180,255,0.15)`

**Step 2: Verify chart renders correctly**

Run: `npm run dev`
Expected: Chart looks crisper within the new card design, grid lines are more subtle, tooltip matches the new palette.

**Step 3: Production build**

Run: `npm run build`
Expected: Build passes with no errors.

**Step 4: Commit**

```bash
git add src/components/landing/HeroChart.tsx
git commit -m "style: update HeroChart palette to match new landing design"
```

---

### Task 6: Clean Up Unused Dependencies (Optional)

**Files:**
- Modify: `package.json`

**Step 1: Check if three.js is used elsewhere**

Search for imports of `three`, `@react-three/fiber`, `@react-three/drei` across the codebase (outside of `ScientistBg.tsx`). If the old ScientistBg was the only consumer, these can be removed.

**Step 2: Remove if unused**

```bash
npm uninstall three @react-three/fiber @react-three/drei @types/three
```

**Step 3: Build check**

Run: `npm run build`
Expected: Build passes. The three.js packages are no longer imported.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused three.js dependencies"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Add Playfair Display font, update metadata |
| `src/components/landing/ScientistBg.tsx` | Full rewrite → subtle atmospheric dot grid |
| `src/app/globals.css` | Replace animations → fade-up/glow system |
| `src/app/page.tsx` | Full rewrite → The Quantitative Firm design |
| `src/components/landing/HeroChart.tsx` | Minor palette tweaks |
| `package.json` | Remove three.js (if unused elsewhere) |
