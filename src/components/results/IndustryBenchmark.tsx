/**
 * @deprecated Replaced by IndustryTower in the results page layout.
 * Kept for reference. Do not import from new code.
 */
'use client';
import React from 'react';

interface IndustryBenchmarkProps {
  yourAle: number;
  industryMedian: number;
  percentileRank: number;
}

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

export default function IndustryBenchmark({
  yourAle,
  industryMedian,
  percentileRank,
}: IndustryBenchmarkProps) {
  const maxVal = Math.max(yourAle, industryMedian) * 1.5;
  const yourPct = (yourAle / maxVal) * 100;
  const medianPct = (industryMedian / maxVal) * 100;
  const below = yourAle < industryMedian;

  return (
    <div className="animate-fade-up">
      <div
        className="text-[11px] tracking-[0.15em] uppercase mb-4"
        style={{
          fontFamily: 'var(--font-geist-mono)',
          color: '#8899bb',
        }}
      >
        INDUSTRY BENCHMARK
      </div>

      {/* Bar */}
      <div className="relative w-full h-10 rounded-lg overflow-hidden mb-4"
        style={{ background: 'rgba(0,20,50,0.6)' }}
      >
        {/* Scale gradient */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'linear-gradient(90deg, rgba(0,180,255,0.1), rgba(239,68,68,0.2))',
          }}
        />

        {/* Your ALE marker */}
        <div
          className="absolute top-0 h-full w-0.5"
          style={{
            left: `${yourPct}%`,
            background: '#00d4ff',
            boxShadow: '0 0 12px rgba(0,212,255,0.5)',
          }}
        >
          <div
            className="absolute -top-6 -translate-x-1/2 left-1/2 whitespace-nowrap text-[11px] font-bold"
            style={{
              fontFamily: 'var(--font-geist-mono)',
              color: '#00d4ff',
            }}
          >
            You: {fmtUSD(yourAle)}
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-3 h-3 rounded-full"
            style={{
              background: '#00d4ff',
              boxShadow: '0 0 8px rgba(0,212,255,0.6)',
            }}
          />
        </div>

        {/* Industry median marker */}
        <div
          className="absolute top-0 h-full w-0.5"
          style={{
            left: `${medianPct}%`,
            background: 'rgba(200,210,230,0.5)',
          }}
        >
          <div
            className="absolute -bottom-6 -translate-x-1/2 left-1/2 whitespace-nowrap text-[11px] font-bold"
            style={{
              fontFamily: 'var(--font-geist-mono)',
              color: '#8899bb',
            }}
          >
            Median: {fmtUSD(industryMedian)}
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-3 h-3 rounded-full"
            style={{
              background: '#8899bb',
            }}
          />
        </div>

        {/* Scale labels */}
        <div
          className="absolute bottom-1 left-2 text-[10px]"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          $0
        </div>
        <div
          className="absolute bottom-1 right-2 text-[10px]"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          {fmtUSD(maxVal)}
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-8">
        <div
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            background: below
              ? 'rgba(34,197,94,0.08)'
              : 'rgba(239,68,68,0.08)',
            border: `1px solid ${below ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            color: below ? '#22c55e' : '#ef4444',
          }}
        >
          {below ? 'Below industry average' : 'Above industry average'}
        </div>
        <div
          className="text-sm"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            color: '#8899bb',
          }}
        >
          You rank at the{' '}
          <span style={{ color: '#d0e4ff', fontWeight: 700 }}>
            {Math.round(percentileRank)}th
          </span>{' '}
          percentile
        </div>
      </div>
    </div>
  );
}
