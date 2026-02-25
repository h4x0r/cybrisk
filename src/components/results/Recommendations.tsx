'use client';
import React from 'react';

interface RecommendationsProps {
  recommendations: string[];
  gordonLoeb: number;
}

function fmtUSD(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

/** Highlight dollar amounts within text as cyan */
function highlightDollars(text: string): React.ReactNode {
  const parts = text.split(/(\$[\d,]+(?:\.\d{1,2})?(?:\s?[KMBkmb])?)/g);
  return parts.map((part, i) =>
    part.startsWith('$') ? (
      <span
        key={i}
        style={{ color: '#00d4ff', fontFamily: 'var(--font-geist-mono)' }}
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function Recommendations({
  recommendations,
  gordonLoeb,
}: RecommendationsProps) {
  return (
    <div className="animate-fade-up">
      <div
        className="text-[11px] tracking-[0.15em] uppercase mb-4"
        style={{
          fontFamily: 'var(--font-geist-mono)',
          color: '#8899bb',
        }}
      >
        RECOMMENDATIONS
      </div>

      <ol className="space-y-3">
        {recommendations.map((rec, i) => (
          <li key={i} className="flex gap-3">
            <span
              className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold"
              style={{
                fontFamily: 'var(--font-geist-mono)',
                background: 'rgba(0,180,255,0.08)',
                border: '1px solid rgba(0,180,255,0.15)',
                color: '#00d4ff',
              }}
            >
              {i + 1}
            </span>
            <span
              className="text-sm leading-relaxed"
              style={{
                color: '#c0cce0',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              {highlightDollars(rec)}
            </span>
          </li>
        ))}
      </ol>

      {/* Gordon-Loeb callout */}
      <div
        className="mt-6 p-4 rounded-lg"
        style={{
          background: 'rgba(34,197,94,0.06)',
          border: '1px solid rgba(34,197,94,0.25)',
        }}
      >
        <div
          className="text-[11px] tracking-wider uppercase mb-1"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            color: '#22c55e',
          }}
        >
          Optimal Security Investment
        </div>
        <div
          className="text-2xl font-bold"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            color: '#22c55e',
            textShadow: '0 0 20px rgba(34,197,94,0.3)',
          }}
        >
          {fmtUSD(gordonLoeb)}
        </div>
        <div
          className="text-xs mt-1"
          style={{
            color: '#6888aa',
            fontFamily: 'var(--font-geist-mono)',
          }}
        >
          Gordon-Loeb model: z* &le; (1/e) &middot; v &middot; S
        </div>
      </div>
    </div>
  );
}
