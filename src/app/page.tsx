'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import HeroChart from '@/components/landing/HeroChart';
import dynamic from 'next/dynamic';

const ScientistBg = dynamic(() => import('@/components/landing/ScientistBg'), {
  ssr: false,
});

const TRUST_STATS = [
  { val: '100,000', label: 'Monte Carlo Trials', color: '#00d4ff' },
  { val: 'IBM 2024', label: 'Avg Breach Cost', color: '#a0d0ff' },
  { val: 'Verizon DBIR', label: 'Threat Frequencies', color: '#a0d0ff' },
  { val: 'NetDiligence', label: 'Cyber Claims Data', color: '#a0d0ff' },
  { val: 'Gordon-Loeb', label: 'Optimal Spend Model', color: '#ffd060' },
  { val: 'FAIR\u2122', label: 'Risk Framework', color: '#80ffb0' },
];

const PAIN_POINTS = [
  {
    stat: '$4.88M',
    statLabel: 'avg breach cost',
    claim: 'Know your exact dollar exposure',
    body: "IBM says the average breach costs $4.88M. But that's an average \u2014 your number depends on your industry, data volume, and controls. We calculate yours.",
    color: '#ef4444',
  },
  {
    stat: '100,000',
    statLabel: 'simulations',
    claim: 'Actuarial proof, not opinions',
    body: 'Every estimate is backed by 100,000 Monte Carlo trials using IBM, Verizon DBIR, and NetDiligence cyber claims data. Real actuarial math, not guesswork.',
    color: '#00d4ff',
  },
  {
    stat: '37%',
    statLabel: 'optimal spend cap',
    claim: 'Mathematically optimal security budget',
    body: 'The Gordon-Loeb model proves when spending more on security stops making financial sense. We show your exact point of diminishing returns.',
    color: '#22c55e',
  },
];

const SURFACE_LEGEND = [
  { label: 'ALE — Annualized Loss Expectancy', color: '#06b6d4' },
  { label: 'PML — Probable Maximum Loss (95th)', color: '#ef4444' },
  { label: 'GL z* — Gordon-Loeb Optimal Spend', color: '#22c55e' },
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
              FAIR™ · Monte Carlo · N=100,000 · IBM + DBIR + NetDiligence
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

          {/* CTA */}
          <div
            className="animate-fade-up mb-6"
            style={{ animationDelay: '400ms' }}
          >
            <Link
              href="/assess"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-[1.03] active:scale-[0.98] animate-glow-pulse"
              style={{
                background: 'linear-gradient(135deg, #0060d0 0%, #00b0f0 100%)',
                color: '#fff',
              }}
            >
              Calculate Financial Exposure
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p
              className="mt-4 text-xs"
              style={{
                fontFamily: 'var(--font-geist-mono)',
                color: '#4a6080',
              }}
            >
              Free &middot; No login &middot; Results in 30 seconds
            </p>
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
            className="animate-fade-up max-w-5xl mx-auto"
            style={{ animationDelay: '900ms' }}
          >
            <div
              className="rounded-2xl p-6 md:p-8 relative animate-border-glow"
              style={{
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
                  95% CI: $820K – $2.1M · Based on 100K trials
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

            <div className="h-[420px] w-full">
              <HeroChart />
            </div>

            {/* Percentile legend */}
            <div className="flex flex-wrap justify-center gap-6 mt-6 pt-4 border-t border-[rgba(0,180,255,0.08)]">
              {SURFACE_LEGEND.map((l) => (
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
                Red-amber-green tells the board nothing. Dollars do.
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
                    className="text-sm leading-relaxed"
                    style={{ color: '#6888aa' }}
                  >
                    {card.body}
                  </p>
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
              CybRisk · Security Ronin · Albert Hui · (ISC)&sup2; Information Security Leadership Achievements Honouree
            </div>
            <div>DataExpert Vibe Coding Challenge · Feb 2026</div>
          </div>
        </footer>
      </main>
    </div>
  );
}
