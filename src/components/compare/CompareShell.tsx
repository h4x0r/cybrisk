'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AssessmentInputs } from '@/lib/types';
import { compareScenarios, type ScenarioComparison } from '@/lib/scenario-compare';
import { applyCloudOverride } from '@/lib/compare-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDollar(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function DeltaBadge({ value }: { value: number }) {
  const improved = value < 0;
  const label = improved
    ? `▼ ${fmtDollar(Math.abs(value))}`
    : `▲ ${fmtDollar(Math.abs(value))}`;
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded"
      style={{
        fontFamily: 'var(--font-geist-mono)',
        background: improved ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${improved ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        color: improved ? '#22c55e' : '#ef4444',
      }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Control toggle labels
// ---------------------------------------------------------------------------
const CONTROLS: Array<{ key: keyof AssessmentInputs['controls']; label: string; savingPct: string }> = [
  { key: 'irPlan', label: 'Incident Response Plan', savingPct: '−23% ALE' },
  { key: 'aiAutomation', label: 'AI/ML Security Automation', savingPct: '−30% Vuln' },
  { key: 'securityTeam', label: 'Dedicated Security Team', savingPct: '−20% Vuln' },
  { key: 'mfa', label: 'Multi-Factor Authentication', savingPct: '−15% Vuln' },
  { key: 'pentest', label: 'Penetration Testing', savingPct: '−10% Vuln' },
  { key: 'cyberInsurance', label: 'Cyber Insurance', savingPct: '−50% SL' },
];

const glassmorphism: React.CSSProperties = {
  background: 'rgba(4, 8, 28, 0.92)',
  border: '1px solid rgba(0, 180, 255, 0.12)',
  borderRadius: 12,
  backdropFilter: 'blur(12px)',
  padding: 24,
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function CompareShell() {
  const router = useRouter();
  const [base, setBase] = useState<AssessmentInputs | null>(null);
  const [controls, setControls] = useState<AssessmentInputs['controls'] | null>(null);
  const [cloudPct, setCloudPct] = useState<number | null>(null);
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('assessment');
      if (!stored) { router.replace('/assess'); return; }
      const parsed = JSON.parse(stored) as AssessmentInputs;
      setBase(parsed);
      setControls({ ...parsed.controls });
    } catch {
      router.replace('/assess');
    }
  }, [router]);

  const toggle = (key: keyof AssessmentInputs['controls']) => {
    setControls((prev) => prev ? { ...prev, [key]: !prev[key] } : prev);
    setComparison(null);
  };

  const runComparison = useCallback(() => {
    if (!base || !controls) return;
    setRunning(true);
    const modifiedInputs: AssessmentInputs = { ...base, controls };
    const modifiedWithCloud = cloudPct !== null
      ? applyCloudOverride(modifiedInputs, cloudPct)
      : modifiedInputs;
    setTimeout(() => {
      const result = compareScenarios(base, modifiedWithCloud, 100_000);
      setComparison(result);
      setRunning(false);
    }, 50);
  }, [base, controls, cloudPct]);

  if (!base || !controls) return null;

  const cloudChanged = cloudPct !== null && cloudPct !== base.data.cloudPercentage;
  const noChanges = JSON.stringify(controls) === JSON.stringify(base.controls) && !cloudChanged;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div
          className="text-[10px] tracking-[0.2em] uppercase mb-2"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          Scenario Comparison
        </div>
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-playfair)', color: '#f0f4ff' }}
        >
          What If?
        </h1>
        <p style={{ color: '#6888aa', fontSize: 14 }}>
          Toggle security controls to see how your financial exposure changes.
          Your current controls are pre-filled.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls panel */}
        <div style={glassmorphism}>
          <div
            className="text-[10px] tracking-[0.15em] uppercase mb-5"
            style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
          >
            Modified Controls
          </div>
          <div className="space-y-3">
            {CONTROLS.map(({ key, label, savingPct }) => {
              const isEnabled = controls[key];
              const wasEnabled = base.controls[key];
              const changed = isEnabled !== wasEnabled;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: changed
                      ? isEnabled
                        ? 'rgba(34,197,94,0.06)'
                        : 'rgba(239,68,68,0.06)'
                      : 'rgba(0,180,255,0.03)',
                    border: `1px solid ${changed
                      ? isEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
                      : 'rgba(0,180,255,0.06)'}`,
                  }}
                  onClick={() => toggle(key)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-5 rounded-full flex items-center transition-all"
                      style={{
                        background: isEnabled ? 'rgba(34,197,94,0.3)' : 'rgba(100,100,120,0.3)',
                        border: `1px solid ${isEnabled ? 'rgba(34,197,94,0.5)' : 'rgba(100,100,120,0.3)'}`,
                        padding: '2px',
                      }}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full transition-all"
                        style={{
                          background: isEnabled ? '#22c55e' : '#4a5568',
                          marginLeft: isEnabled ? 'auto' : '0',
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-sm" style={{ color: '#c8d8f0' }}>{label}</div>
                      {changed && (
                        <div
                          className="text-[10px]"
                          style={{
                            fontFamily: 'var(--font-geist-mono)',
                            color: isEnabled ? '#22c55e' : '#ef4444',
                          }}
                        >
                          {isEnabled ? '+ ADDED' : '− REMOVED'}
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    className="text-[10px] shrink-0"
                    style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
                  >
                    {savingPct}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Cloud % Slider */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,180,255,0.08)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ fontFamily: 'var(--font-geist-mono)', color: '#6888aa' }}>
                CLOUD EXPOSURE
              </span>
              <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-geist-mono)', color: '#00d4ff' }}>
                {cloudPct ?? base.data.cloudPercentage}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={cloudPct ?? base.data.cloudPercentage}
              onChange={(e) => { setCloudPct(Number(e.target.value)); setComparison(null); }}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: '#4a6080' }}>
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <button
            onClick={runComparison}
            disabled={running || noChanges}
            className="mt-6 w-full py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              fontFamily: 'var(--font-geist-mono)',
              background: noChanges ? 'rgba(100,100,120,0.1)' : 'linear-gradient(135deg,#0060d0,#00b0f0)',
              color: noChanges ? '#4a6080' : '#fff',
            }}
          >
            {running ? 'Running 100K simulations...' : noChanges ? 'Toggle a control to compare' : 'Run Comparison'}
          </button>
        </div>

        {/* Results panel */}
        <div style={glassmorphism}>
          <div
            className="text-[10px] tracking-[0.15em] uppercase mb-5"
            style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
          >
            Impact Analysis
          </div>

          {!comparison && (
            <div
              className="flex items-center justify-center h-48 text-sm"
              style={{ color: '#2a4060', fontFamily: 'var(--font-geist-mono)' }}
            >
              {running ? 'COMPUTING...' : 'AWAITING COMPARISON RUN'}
            </div>
          )}

          {comparison && (
            <div className="space-y-6">
              {[
                {
                  label: 'Annualized Loss Expectancy',
                  base: comparison.base.ale.mean,
                  modified: comparison.modified.ale.mean,
                  delta: comparison.delta.aleMean,
                },
                {
                  label: 'Probable Max Loss (P95)',
                  base: comparison.base.ale.p95,
                  modified: comparison.modified.ale.p95,
                  delta: comparison.delta.alePml95,
                },
                {
                  label: 'Gordon-Loeb Optimal Spend',
                  base: comparison.base.gordonLoebSpend,
                  modified: comparison.modified.gordonLoebSpend,
                  delta: comparison.delta.gordonLoeb,
                },
              ].map(({ label, base: b, modified: m, delta }) => (
                <div key={label}>
                  <div
                    className="text-[10px] uppercase tracking-wider mb-2"
                    style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
                  >
                    {label}
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <div
                        className="text-xs mb-0.5"
                        style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
                      >
                        BEFORE
                      </div>
                      <div
                        className="text-lg font-bold"
                        style={{ fontFamily: 'var(--font-geist-mono)', color: '#8899bb' }}
                      >
                        {fmtDollar(b)}
                      </div>
                    </div>
                    <span style={{ color: '#2a4060' }}>→</span>
                    <div>
                      <div
                        className="text-xs mb-0.5"
                        style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
                      >
                        AFTER
                      </div>
                      <div
                        className="text-lg font-bold"
                        style={{ fontFamily: 'var(--font-geist-mono)', color: '#f0f4ff' }}
                      >
                        {fmtDollar(m)}
                      </div>
                    </div>
                    <DeltaBadge value={delta} />
                  </div>
                </div>
              ))}

              {/* Risk rating */}
              <div>
                <div
                  className="text-[10px] uppercase tracking-wider mb-2"
                  style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
                >
                  Risk Rating
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-sm font-bold px-2 py-0.5 rounded"
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#ef4444',
                    }}
                  >
                    {comparison.base.riskRating}
                  </span>
                  <span style={{ color: '#2a4060' }}>→</span>
                  <span
                    className="text-sm font-bold px-2 py-0.5 rounded"
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      background: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      color: '#22c55e',
                    }}
                  >
                    {comparison.modified.riskRating}
                  </span>
                  {comparison.delta.riskRatingChanged && (
                    <span
                      className="text-[10px]"
                      style={{ fontFamily: 'var(--font-geist-mono)', color: '#22c55e' }}
                    >
                      TIER CHANGE
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 mt-8">
        <a
          href="/results"
          className="px-6 py-3 rounded-full text-sm font-medium transition-all hover:scale-105"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            background: 'rgba(0,180,255,0.08)',
            border: '1px solid rgba(0,180,255,0.3)',
            color: '#00d4ff',
          }}
        >
          ← Back to Results
        </a>
        <a
          href="/assess"
          className="px-6 py-3 rounded-full text-sm font-medium transition-all hover:scale-105"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            background: 'rgba(0,180,255,0.04)',
            border: '1px solid rgba(0,180,255,0.15)',
            color: '#8899bb',
          }}
        >
          New Assessment
        </a>
      </div>
    </div>
  );
}
