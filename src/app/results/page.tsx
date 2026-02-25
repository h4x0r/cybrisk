'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SimulationResults } from '@/lib/types';
import LorenzCanvas from '@/components/results/LorenzCanvas';
import TickerBar from '@/components/results/TickerBar';
import LossDistribution from '@/components/results/LossDistribution';
import ExceedanceCurve from '@/components/results/ExceedanceCurve';
import KeyDrivers from '@/components/results/KeyDrivers';
import Recommendations from '@/components/results/Recommendations';
import IndustryBenchmark from '@/components/results/IndustryBenchmark';

const glassmorphism: React.CSSProperties = {
  background: 'rgba(4, 8, 28, 0.92)',
  border: '1px solid rgba(0, 180, 255, 0.12)',
  borderRadius: 12,
  backdropFilter: 'blur(12px)',
  padding: 24,
};

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<SimulationResults | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cybrisk-results');
      if (!raw) {
        router.replace('/assess');
        return;
      }
      const parsed: SimulationResults = JSON.parse(raw);
      setResults(parsed);
    } catch {
      router.replace('/assess');
    }
  }, [router]);

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

        {/* Benchmark - full width */}
        <div style={glassmorphism} className="mt-6">
          <IndustryBenchmark
            yourAle={results.industryBenchmark.yourAle}
            industryMedian={results.industryBenchmark.industryMedian}
            percentileRank={results.industryBenchmark.percentileRank}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 mt-8 mb-12">
          <a
            href="/assess"
            className="px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
            style={{
              fontFamily: 'var(--font-geist-mono)',
              background: 'rgba(0,180,255,0.08)',
              border: '1px solid rgba(0,180,255,0.3)',
              color: '#00d4ff',
            }}
          >
            &larr; New Assessment
          </a>
          <a
            href="/"
            className="px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
            style={{
              fontFamily: 'var(--font-geist-mono)',
              background: 'rgba(0,180,255,0.04)',
              border: '1px solid rgba(0,180,255,0.15)',
              color: '#8899bb',
            }}
          >
            Home
          </a>
        </div>
      </div>
    </main>
  );
}
