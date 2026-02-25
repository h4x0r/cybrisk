'use client';
import React from 'react';
import type { KeyDriver } from '@/lib/types';

interface KeyDriversProps {
  drivers: KeyDriver[];
}

const IMPACT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  HIGH: {
    bg: 'rgba(239,68,68,0.1)',
    text: '#ef4444',
    border: 'rgba(239,68,68,0.25)',
  },
  MEDIUM: {
    bg: 'rgba(255,208,96,0.1)',
    text: '#ffd060',
    border: 'rgba(255,208,96,0.25)',
  },
  LOW: {
    bg: 'rgba(34,197,94,0.1)',
    text: '#22c55e',
    border: 'rgba(34,197,94,0.25)',
  },
};

export default function KeyDrivers({ drivers }: KeyDriversProps) {
  return (
    <div className="animate-fade-up">
      <div
        className="text-[11px] tracking-[0.15em] uppercase mb-4"
        style={{
          fontFamily: 'var(--font-geist-mono)',
          color: '#8899bb',
        }}
      >
        KEY RISK DRIVERS
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: '0 2px' }}>
          <thead>
            <tr style={{ color: '#4a6080' }}>
              <th
                className="text-left py-2 px-3 text-[11px] tracking-wider uppercase"
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                Factor
              </th>
              <th
                className="text-left py-2 px-3 text-[11px] tracking-wider uppercase"
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                Impact
              </th>
              <th
                className="text-left py-2 px-3 text-[11px] tracking-wider uppercase"
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d, i) => {
              const style = IMPACT_STYLES[d.impact] || IMPACT_STYLES.LOW;
              return (
                <tr
                  key={d.factor}
                  style={{
                    background:
                      i % 2 === 0
                        ? 'rgba(0,180,255,0.03)'
                        : 'transparent',
                  }}
                >
                  <td
                    className="py-2.5 px-3 font-medium"
                    style={{
                      color: '#d0ddf0',
                      fontFamily: 'var(--font-geist-sans)',
                    }}
                  >
                    {d.factor}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold"
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        background: style.bg,
                        color: style.text,
                        border: `1px solid ${style.border}`,
                      }}
                    >
                      {d.impact}
                    </span>
                  </td>
                  <td
                    className="py-2.5 px-3"
                    style={{
                      color: '#8899bb',
                      fontFamily: 'var(--font-geist-sans)',
                    }}
                  >
                    {d.description}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
