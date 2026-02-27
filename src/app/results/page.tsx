'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import LorenzCanvas from '@/components/results/LorenzCanvas';
import TickerBar from '@/components/results/TickerBar';
import LossDistribution from '@/components/results/LossDistribution';
import ExceedanceCurve from '@/components/results/ExceedanceCurve';
import KeyDrivers from '@/components/results/KeyDrivers';
import Recommendations from '@/components/results/Recommendations';
import ResultsSurface from '@/components/results/ResultsSurface';
import { TEF_BY_INDUSTRY } from '@/lib/lookup-tables';
import { encodeInputs, deriveShareSeed } from '@/lib/share-url';
import dynamic from 'next/dynamic';

const ThreatOriginMap = dynamic(
  () => import('@/components/results/ThreatOriginMap'),
  { ssr: false },
);
const IndustryTower = dynamic(
  () => import('@/components/results/IndustryTower'),
  { ssr: false },
);
const RegulatoryMap = dynamic(
  () => import('@/components/results/RegulatoryMap'),
  { ssr: false },
);

const glassmorphism: React.CSSProperties = {
  background: 'rgba(4, 8, 28, 0.92)',
  border: '1px solid rgba(0, 180, 255, 0.12)',
  borderRadius: 12,
  backdropFilter: 'blur(12px)',
  padding: 24,
};

function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [inputs, setInputs] = useState<AssessmentInputs | null>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check for shareable URL params first
    const encoded = searchParams.get('s');
    const seedParam = searchParams.get('seed');

    if (encoded) {
      // Dynamically import to avoid circular deps in server components
      import('@/lib/share-url').then(({ decodeInputs, deriveShareSeed }) => {
        const decoded = decodeInputs(encoded);
        if (!decoded) { router.replace('/assess'); return; }

        import('@/lib/monte-carlo').then(({ simulate }) => {
          const seed = seedParam ? parseInt(seedParam, 10) : deriveShareSeed(decoded);
          let s = seed >>> 0;
          const rng = () => {
            s = (s * 1664525 + 1013904223) & 0xffffffff;
            return (s >>> 0) / 0xffffffff;
          };
          const simResults = simulate(decoded, 100_000, rng);
          setInputs(decoded);
          setResults(simResults);
          sessionStorage.setItem('assessment', JSON.stringify(decoded));
          sessionStorage.setItem('results', JSON.stringify(simResults));
        });
      });
      return;
    }

    try {
      const raw = sessionStorage.getItem('results');
      if (!raw) {
        router.replace('/assess');
        return;
      }
      const parsed: SimulationResults = JSON.parse(raw);
      setResults(parsed);

      const rawInputs = sessionStorage.getItem('assessment');
      if (rawInputs) {
        setInputs(JSON.parse(rawInputs) as AssessmentInputs);
      }
    } catch {
      router.replace('/assess');
    }
  }, [router, searchParams]);

  const handleShare = useCallback(() => {
    if (!inputs) return;
    const encoded = encodeInputs(inputs);
    const seed = deriveShareSeed(inputs);
    const url = `${window.location.origin}/results?s=${encoded}&seed=${seed}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [inputs]);

  const handleExportReport = useCallback(async () => {
    if (!results || !inputs) return;
    setExporting(true);
    try {
      const { downloadReport } = await import('@/lib/docx-report');
      await downloadReport(inputs, results);
    } finally {
      setExporting(false);
    }
  }, [results, inputs]);

  if (!results) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#060a18' }}
      >
        <div
          className="text-sm animate-pulse"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            color: '#4a6080',
          }}
        >
          Loading results...
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: '#060a18' }} className="relative min-h-screen">
      <LorenzCanvas riskRating={results.riskRating} ale={results.ale.mean} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Ticker Bar */}
        <TickerBar results={results} />

        {/* Charts - two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div style={glassmorphism}>
            <LossDistribution
              buckets={results.distributionBuckets}
              aleMean={results.ale.mean}
              pml95={results.ale.p95}
            />
          </div>
          <div style={glassmorphism}>
            <ExceedanceCurve
              curve={results.exceedanceCurve}
              aleMean={results.ale.mean}
              pml95={results.ale.p95}
              gordonLoeb={results.gordonLoebSpend}
            />
          </div>
        </div>

        {/* 3D Surface - full width */}
        {inputs && (
          <div style={glassmorphism} className="mt-6">
            <ResultsSurface
              aleMean={results.ale.mean}
              pml95={results.ale.p95}
              gordonLoeb={results.gordonLoebSpend}
              tefMin={TEF_BY_INDUSTRY[inputs.company.industry].min}
              tefMode={TEF_BY_INDUSTRY[inputs.company.industry].mode}
              tefMax={TEF_BY_INDUSTRY[inputs.company.industry].max}
            />
          </div>
        )}

        {/* Bottom panels - two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div style={glassmorphism}>
            <KeyDrivers drivers={results.keyDrivers} />
          </div>
          <div style={glassmorphism}>
            <Recommendations
              recommendations={results.recommendations}
              gordonLoeb={results.gordonLoebSpend}
            />
          </div>
        </div>

        {/* NEW: Threat Origin Map + Industry Tower — 2 columns */}
        {inputs && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div style={glassmorphism}>
              <ThreatOriginMap userGeography={inputs.company.geography} />
            </div>
            <div style={glassmorphism}>
              <IndustryTower
                userIndustry={inputs.company.industry}
                userAle={results.industryBenchmark.yourAle}
              />
            </div>
          </div>
        )}

        {/* NEW: Regulatory Choropleth — full width */}
        {inputs && (
          <div style={glassmorphism} className="mt-6">
            <RegulatoryMap userGeography={inputs.company.geography} />
          </div>
        )}

        {/* Assumptions & Limitations */}
        <details
          className="mt-6 group"
          style={{
            ...glassmorphism,
            padding: '0',
          }}
        >
          <summary
            className="px-6 py-4 cursor-pointer list-none flex items-center justify-between"
            style={{
              borderBottom: '1px solid rgba(0,180,255,0.08)',
            }}
          >
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
            >
              Model Assumptions &amp; Limitations
            </span>
            <span
              className="text-xs transition-transform group-open:rotate-180"
              style={{ color: '#4a6080' }}
            >
              ▼
            </span>
          </summary>
          <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
            {[
              ['Revenue cap', 'Primary loss is capped at 10% of the revenue band midpoint to prevent outlier inflation.'],
              ['percentileRank', 'Industry benchmark rank uses a linear heuristic: rank = min(100, ALE / industry_median × 50). Not a statistically derived percentile.'],
              ['TEF baseline', 'Threat Event Frequency sampled from PERT distributions fitted to Verizon DBIR 2025 industry breach rates.'],
              ['Per-record cost', 'Per-record breach costs from IBM Cost of a Data Breach 2024 (USD). US-centric; international figures are approximated.'],
              ['Notification cost', '$2–$5 per record (PERT), representative of US/EU breach notification spend.'],
              ['Secondary loss', 'Litigation (15–30% of primary), reputation (20–40%), regulatory fines (PERT 1–50% of max fine), and notification stacked independently.'],
              ['Cyber insurance', 'Insurance modelled as a 50% reduction to secondary losses only. Actual policy terms will differ.'],
              ['Iterations', 'N=100,000 trials. Results are statistically stable but not identical across runs (non-seeded RNG).'],
            ].map(([label, note]) => (
              <div key={label} className="flex gap-3">
                <span
                  className="shrink-0 text-[10px] font-bold tracking-wider mt-0.5"
                  style={{ fontFamily: 'var(--font-geist-mono)', color: '#2a6080', minWidth: 120 }}
                >
                  {label}
                </span>
                <span
                  className="text-xs leading-relaxed"
                  style={{ color: '#4a5a70' }}
                >
                  {note}
                </span>
              </div>
            ))}
          </div>
        </details>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-4 mt-8 mb-12">
          {inputs && (
            <button
              onClick={handleExportReport}
              disabled={exporting}
              className="px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-wait"
              style={{
                fontFamily: 'var(--font-geist-mono)',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.4)',
                color: '#ef4444',
              }}
            >
              {exporting ? 'Generating...' : 'Export Report (.docx)'}
            </button>
          )}
          {inputs && (
            <a
              href="/compare"
              className="px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
              style={{
                fontFamily: 'var(--font-geist-mono)',
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: '#22c55e',
              }}
            >
              What If? →
            </a>
          )}
          {inputs && (
            <button
              onClick={handleShare}
              className="px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
              style={{
                fontFamily: 'var(--font-geist-mono)',
                background: copied ? 'rgba(34,197,94,0.08)' : 'rgba(0,180,255,0.08)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(0,180,255,0.25)'}`,
                color: copied ? '#22c55e' : '#00d4ff',
              }}
            >
              {copied ? '✓ Copied' : 'Share Results'}
            </button>
          )}
          <a
            href="/assess"
            className="px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
            style={{
              fontFamily: 'var(--font-geist-mono)',
              background: 'rgba(0,180,255,0.04)',
              border: '1px solid rgba(0,180,255,0.15)',
              color: '#8899bb',
            }}
          >
            &larr; New Assessment
          </a>
        </div>
      </div>
    </main>
  );
}

// Next.js requires useSearchParams to be inside a Suspense boundary
export default function ResultsPageWrapper() {
  return (
    <React.Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#060a18' }}>
        <div className="text-sm animate-pulse" style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}>
          Loading results...
        </div>
      </main>
    }>
      <ResultsPage />
    </React.Suspense>
  );
}
