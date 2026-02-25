'use client';
import React from 'react';
import type { SimulationResults } from '@/lib/types';

interface TickerBarProps {
  results: SimulationResults;
}

function fmtUSD(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

const RATING_COLOR: Record<string, string> = {
  LOW: '#22c55e',
  MODERATE: '#ffd060',
  HIGH: '#ff6b35',
  CRITICAL: '#ef4444',
};

export default function TickerBar({ results }: TickerBarProps) {
  return (
    <div
      className="animate-fade-in w-full rounded-lg px-6 py-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1"
      style={{
        background: 'rgba(4,8,28,0.95)',
        borderBottom: '1px solid rgba(0,180,255,0.12)',
        boxShadow: '0 2px 20px rgba(0,180,255,0.06)',
        fontFamily: 'var(--font-geist-mono)',
        fontSize: '13px',
      }}
    >
      <span style={{ color: '#8899bb' }}>ALE</span>
      <span style={{ color: '#00d4ff', fontWeight: 700 }}>
        {fmtUSD(results.ale.mean)}
      </span>
      <span style={{ color: 'rgba(0,180,255,0.2)' }}>{'\u2502'}</span>

      <span style={{ color: '#8899bb' }}>
        PML<sub>95</sub>
      </span>
      <span style={{ color: '#ef4444', fontWeight: 700 }}>
        {fmtUSD(results.ale.p95)}
      </span>
      <span style={{ color: 'rgba(0,180,255,0.2)' }}>{'\u2502'}</span>

      <span style={{ color: '#8899bb' }}>GORDON-LOEB</span>
      <span style={{ color: '#22c55e', fontWeight: 700 }}>
        {fmtUSD(results.gordonLoebSpend)}
      </span>
      <span style={{ color: 'rgba(0,180,255,0.2)' }}>{'\u2502'}</span>

      <span style={{ color: '#8899bb' }}>RISK:</span>
      <span
        style={{
          color: RATING_COLOR[results.riskRating] || '#8899bb',
          fontWeight: 700,
        }}
      >
        {results.riskRating}
      </span>
    </div>
  );
}
