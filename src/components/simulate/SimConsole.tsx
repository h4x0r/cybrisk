'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import type { Industry } from '@/lib/types';
import { simulate } from '@/lib/monte-carlo';
import { TEF_BY_INDUSTRY, COST_MODIFIERS, EMPLOYEE_MULTIPLIERS, REVENUE_MIDPOINTS } from '@/lib/lookup-tables';

// ---------------------------------------------------------------------------
// Human-readable industry names
// ---------------------------------------------------------------------------
const INDUSTRY_NAMES: Record<Industry, string> = {
  healthcare: 'Healthcare',
  financial: 'Financial Services',
  pharmaceuticals: 'Pharmaceuticals',
  technology: 'Technology',
  energy: 'Energy',
  industrial: 'Industrial',
  services: 'Professional Services',
  retail: 'Retail',
  education: 'Education',
  entertainment: 'Entertainment',
  communications: 'Communications',
  consumer: 'Consumer Products',
  media: 'Media',
  research: 'Research',
  transportation: 'Transportation',
  hospitality: 'Hospitality',
  public_sector: 'Public Sector',
};

const REVENUE_LABELS: Record<string, string> = {
  under_50m: '<$50M',
  '50m_250m': '$50M-$250M',
  '250m_1b': '$250M-$1B',
  '1b_5b': '$1B-$5B',
  over_5b: '$5B+',
};

const GEO_LABELS: Record<string, string> = {
  us: 'US',
  uk: 'UK',
  eu: 'EU',
  hk: 'HK',
  sg: 'SG',
  other: 'INTL',
};

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------
function fmtNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtDollar(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function fmtDollarCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

// ---------------------------------------------------------------------------
// Non-linear progress curve: fast start, slow middle, fast finish
// ---------------------------------------------------------------------------
function progressCurve(t: number): number {
  if (t < 0.3) {
    return (t / 0.3) * 30;
  } else if (t < 0.75) {
    const localT = (t - 0.3) / 0.45;
    return 30 + localT * 40;
  } else {
    const localT = (t - 0.75) / 0.25;
    return 70 + localT * 30;
  }
}

// ---------------------------------------------------------------------------
// Stochastic stutter
// ---------------------------------------------------------------------------
function applyStutter(
  basePct: number,
  prevPct: number,
  rng: () => number,
): number {
  const jitter = (rng() - 0.5) * 3;
  let pct = basePct + jitter;

  if (basePct >= 52 && basePct <= 56 && rng() < 0.3) {
    pct = prevPct - (0.5 + rng() * 2.5);
  }

  pct = Math.max(prevPct - 3, Math.min(99, pct));

  if (pct <= prevPct && basePct > prevPct + 1) {
    pct = prevPct + 0.1;
  }

  return Math.round(pct);
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------
interface SimConsoleProps {
  inputs: AssessmentInputs;
  onComplete: (results: SimulationResults) => void;
  onProgress?: (progress: number) => void;
}

// ---------------------------------------------------------------------------
// Bloomberg-style SimConsole
// ---------------------------------------------------------------------------
export default function SimConsole({
  inputs,
  onComplete,
  onProgress,
}: SimConsoleProps) {
  const [logLines, setLogLines] = useState<string[]>([]);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [phase, setPhase] = useState<'INIT' | 'SIM' | 'POST' | 'DONE'>('INIT');
  const [iterCount, setIterCount] = useState(0);
  const [runTimeMs, setRunTimeMs] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const simStartRef = useRef<number | null>(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines, progressPct]);

  const runSequence = useCallback(async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const industry = INDUSTRY_NAMES[inputs.company.industry];
    const tef = TEF_BY_INDUSTRY[inputs.company.industry];

    const controls: string[] = [];
    if (inputs.controls.irPlan)
      controls.push(`IRP(${Math.round(COST_MODIFIERS.ir_plan * 100)}%)`);
    if (inputs.controls.mfa)
      controls.push(`MFA(${Math.round(COST_MODIFIERS.mfa * 100)}%)`);
    if (inputs.controls.securityTeam)
      controls.push(`CISO(${Math.round(COST_MODIFIERS.security_team * 100)}%)`);
    if (inputs.controls.pentest)
      controls.push(`PNTS(${Math.round(COST_MODIFIERS.pentest * 100)}%)`);
    if (inputs.controls.aiAutomation)
      controls.push(`AI/ML(${Math.round(COST_MODIFIERS.ai_automation * 100)}%)`);

    function delay(base: number, variance: number = 0): Promise<void> {
      const ms = base + (variance > 0 ? Math.random() * variance : 0);
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function addLine(text: string) {
      setLogLines((prev) => [...prev, text]);
    }

    let seed = 42;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 0xffffffff;
    };

    // =====================================================================
    // PHASE 1: Parameter Loading
    // =====================================================================
    setPhase('INIT');
    onProgress?.(0.02);

    addLine('CYBRISK FAIR ENGINE v2.1 INITIALISED');
    await delay(400, 150);

    addLine(`LOADING ${industry.toUpperCase()} ACTUARIAL PARAMS...`);
    await delay(350, 100);

    addLine(`TEF BASELINE: \u03BB=${tef.mode.toFixed(2)}/yr PERT[${tef.min.toFixed(2)},${tef.max.toFixed(1)}]`);
    await delay(300, 80);

    if (controls.length > 0) {
      addLine(`VULN ADJ: ${controls.join(' ')}`);
    } else {
      addLine('VULN ADJ: NONE \u2014 BASE RATE 0.30');
    }
    await delay(300, 80);

    addLine(
      `DATA: ${fmtNumber(inputs.data.recordCount)} RECS ${inputs.data.dataTypes.length} TYPES ${inputs.data.cloudPercentage}% CLOUD`,
    );
    await delay(250, 80);

    addLine('PERT CALIBRATION AGAINST DBIR 2025... OK');
    await delay(350, 150);

    onProgress?.(0.15);

    // =====================================================================
    // PHASE 2: Monte Carlo Execution
    // =====================================================================
    setPhase('SIM');
    addLine('MONTE CARLO N=100,000 BEGIN');
    await delay(250, 80);

    simStartRef.current = performance.now();
    const simPromise = new Promise<SimulationResults>((resolve) => {
      setTimeout(() => resolve(simulate(inputs)), 50);
    });

    const SIM_DURATION_MS = 6000;
    const FRAME_INTERVAL = 80;
    const totalFrames = Math.floor(SIM_DURATION_MS / FRAME_INTERVAL);
    let displayPct = 0;
    let prevDisplayPct = 0;

    const milestones: Record<number, string> = {
      15: `ITER 15,000/100K \u2014 SAMPLING TEF\u00D7VULN MATRIX`,
      30: `ITER 30,000/100K \u2014 CONVERGENCE \u03B4=0.0${Math.round(20 + Math.random() * 15)}`,
      45: `ITER 45,000/100K \u2014 TAIL CALIBRATION`,
      55: `RECALIBRATE SEVERITY DIST \u2014 HEAVY-TAIL DETECTED`,
      70: `ITER 75,000/100K \u2014 BOOTSTRAP P95/P99 BOUND`,
      85: `ITER 100,000/100K \u2014 FINALISING`,
    };
    const emittedMilestones = new Set<number>();

    for (let frame = 0; frame <= totalFrames; frame++) {
      const t = frame / totalFrames;
      const basePct = progressCurve(t);
      displayPct = applyStutter(basePct, prevDisplayPct, rng);

      if (displayPct < prevDisplayPct - 3) displayPct = prevDisplayPct - 3;
      displayPct = Math.max(0, Math.min(99, displayPct));

      setProgressPct(displayPct);
      setIterCount(Math.round((displayPct / 100) * 100000));
      onProgress?.(0.15 + (displayPct / 100) * 0.67);

      for (const [threshold, line] of Object.entries(milestones)) {
        const th = Number(threshold);
        if (displayPct >= th && !emittedMilestones.has(th)) {
          emittedMilestones.add(th);
          addLine(line);
        }
      }

      prevDisplayPct = displayPct;

      if (rng() < 0.05 && displayPct > 15 && displayPct < 85) {
        await delay(FRAME_INTERVAL + 200, 300);
      } else {
        await delay(FRAME_INTERVAL, 20);
      }
    }

    const simResults = await simPromise;
    const elapsed = simStartRef.current !== null
      ? Math.round(performance.now() - simStartRef.current)
      : null;
    if (elapsed !== null) setRunTimeMs(elapsed);

    setProgressPct(100);
    setIterCount(100000);
    onProgress?.(0.82);
    await delay(400);
    setProgressPct(null);

    // =====================================================================
    // PHASE 3: Post-Processing
    // =====================================================================
    setPhase('POST');
    addLine('COMPUTING EXCEEDANCE CURVE (50-PT INTERP)...');
    await delay(450, 150);

    addLine('GORDON-LOEB OPTIMAL z* = (1/e)\u00B7v\u00B7S...');
    await delay(400, 150);

    addLine('BENCHMARK VS INDUSTRY MEDIAN...');
    await delay(350, 100);

    addLine('RISK DRIVERS + RECOMMENDATIONS...');
    await delay(300, 80);

    onProgress?.(1);

    // =====================================================================
    // COMPLETE
    // =====================================================================
    setPhase('DONE');
    addLine(elapsed !== null
      ? `SIMULATION COMPLETE — ${elapsed}ms (N=100,000 trials)`
      : 'SIMULATION COMPLETE');
    setResults(simResults);
    setIsComplete(true);

    await delay(2200);
    onComplete(simResults);
  }, [inputs, onComplete, onProgress]);

  useEffect(() => {
    runSequence();
  }, [runSequence]);

  const industry = INDUSTRY_NAMES[inputs.company.industry];
  const revenue = REVENUE_MIDPOINTS[inputs.company.revenueBand];
  const empMult = EMPLOYEE_MULTIPLIERS[inputs.company.employees];
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  return (
    <div
      className="animate-fade-up w-full max-w-[820px] overflow-hidden"
      style={{
        background: '#1a1a2e',
        border: '1px solid #ff6600',
        fontFamily: '"Lucida Console", "Consolas", "Courier New", monospace',
        boxShadow: '0 0 40px -8px rgba(255,102,0,0.2), inset 0 0 80px -20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Bloomberg-style top bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{
          background: '#000000',
          borderBottom: '2px solid #ff6600',
        }}
      >
        <div className="flex items-center gap-3">
          <span
            style={{
              color: '#ff6600',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            CYBRISK
          </span>
          <span style={{ color: '#333', fontSize: '13px' }}>|</span>
          <span style={{ color: '#ff9933', fontSize: '11px' }}>
            FAIR RISK ENGINE
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span style={{ color: '#666666', fontSize: '10px' }}>
            {timestamp}
          </span>
          <span
            style={{
              color: phase === 'DONE' ? '#00ff00' : phase === 'SIM' ? '#ffcc00' : '#ff6600',
              fontSize: '10px',
              fontWeight: 700,
            }}
          >
            {phase === 'INIT' ? 'LOADING' : phase === 'SIM' ? 'RUNNING' : phase === 'POST' ? 'PROCESSING' : 'COMPLETE'}
          </span>
        </div>
      </div>

      {/* Function key bar */}
      <div
        className="flex items-center gap-1 px-2 py-1"
        style={{
          background: '#0a0a1a',
          borderBottom: '1px solid #333',
          fontSize: '9px',
        }}
      >
        {['1)PARAMS', '2)ENGINE', '3)OUTPUT', '4)EXPORT', '5)BENCH', '6)HELP'].map(
          (label) => (
            <span
              key={label}
              className="px-2 py-0.5"
              style={{
                color: '#888',
                background: '#111',
                border: '1px solid #333',
              }}
            >
              {label}
            </span>
          ),
        )}
      </div>

      {/* Main content area: two columns */}
      <div className="flex" style={{ minHeight: '420px' }}>
        {/* Left panel: parameters + metrics */}
        <div
          className="flex-shrink-0 flex flex-col"
          style={{
            width: '240px',
            borderRight: '1px solid #333',
            background: '#0d0d20',
          }}
        >
          {/* Parameters panel */}
          <div
            className="px-3 py-2"
            style={{ borderBottom: '1px solid #222' }}
          >
            <div
              style={{
                color: '#ff6600',
                fontSize: '10px',
                fontWeight: 700,
                marginBottom: '6px',
                letterSpacing: '1px',
              }}
            >
              ASSESSMENT PARAMS
            </div>
            {[
              ['SECTOR', industry.toUpperCase()],
              ['REGION', GEO_LABELS[inputs.company.geography] ?? 'N/A'],
              ['REVENUE', REVENUE_LABELS[inputs.company.revenueBand] ?? 'N/A'],
              ['RECORDS', fmtNumber(inputs.data.recordCount)],
              ['EMP MULT', `${empMult}x`],
              ['CLOUD', `${inputs.data.cloudPercentage}%`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between"
                style={{
                  fontSize: '11px',
                  marginBottom: '2px',
                }}
              >
                <span style={{ color: '#666' }}>{label}</span>
                <span style={{ color: '#cccccc' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Controls panel */}
          <div
            className="px-3 py-2"
            style={{ borderBottom: '1px solid #222' }}
          >
            <div
              style={{
                color: '#ff6600',
                fontSize: '10px',
                fontWeight: 700,
                marginBottom: '6px',
                letterSpacing: '1px',
              }}
            >
              SECURITY CONTROLS
            </div>
            {[
              ['IR PLAN', inputs.controls.irPlan],
              ['MFA', inputs.controls.mfa],
              ['SEC TEAM', inputs.controls.securityTeam],
              ['PENTEST', inputs.controls.pentest],
              ['AI/AUTOM', inputs.controls.aiAutomation],
              ['INSURANCE', inputs.controls.cyberInsurance],
            ].map(([label, active]) => (
              <div
                key={label as string}
                className="flex justify-between"
                style={{
                  fontSize: '11px',
                  marginBottom: '2px',
                }}
              >
                <span style={{ color: '#666' }}>{label as string}</span>
                <span
                  style={{
                    color: active ? '#00ff00' : '#ff3333',
                    fontWeight: 600,
                  }}
                >
                  {active ? 'ON' : 'OFF'}
                </span>
              </div>
            ))}
          </div>

          {/* Live metrics panel (shows when simulation running or complete) */}
          <div className="px-3 py-2 flex-1">
            <div
              style={{
                color: '#ff6600',
                fontSize: '10px',
                fontWeight: 700,
                marginBottom: '6px',
                letterSpacing: '1px',
              }}
            >
              {isComplete ? 'RESULTS' : 'SIMULATION'}
            </div>
            {progressPct !== null && (
              <>
                <div
                  className="flex justify-between"
                  style={{ fontSize: '11px', marginBottom: '2px' }}
                >
                  <span style={{ color: '#666' }}>ITER</span>
                  <span style={{ color: '#ffcc00' }}>
                    {fmtNumber(iterCount)}/100,000
                  </span>
                </div>
                <div
                  className="flex justify-between"
                  style={{ fontSize: '11px', marginBottom: '4px' }}
                >
                  <span style={{ color: '#666' }}>PROGRESS</span>
                  <span style={{ color: '#ffcc00' }}>{progressPct}%</span>
                </div>
                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: '#111',
                    border: '1px solid #333',
                    marginBottom: '4px',
                  }}
                >
                  <div
                    style={{
                      width: `${progressPct}%`,
                      height: '100%',
                      background:
                        progressPct < 50
                          ? '#ff6600'
                          : progressPct < 80
                            ? '#ffcc00'
                            : '#00ff00',
                      transition: 'width 80ms linear',
                    }}
                  />
                </div>
              </>
            )}
            {results && (
              <>
                {[
                  ['ALE', fmtDollar(results.ale.mean), '#ff6600'],
                  ['PML\u2089\u2085', fmtDollar(results.ale.p95), '#ff3333'],
                  ['MEDIAN', fmtDollar(results.ale.median), '#cccccc'],
                  ['G-L z*', fmtDollar(results.gordonLoebSpend), '#00ccff'],
                  [
                    'RISK',
                    results.riskRating,
                    results.riskRating === 'CRITICAL'
                      ? '#ff0000'
                      : results.riskRating === 'HIGH'
                        ? '#ff6600'
                        : results.riskRating === 'MODERATE'
                          ? '#ffcc00'
                          : '#00ff00',
                  ],
                  [
                    'BENCH',
                    `P${results.industryBenchmark.percentileRank}`,
                    '#ff9933',
                  ],
                ].map(([label, value, color]) => (
                  <div
                    key={label}
                    className="flex justify-between"
                    style={{
                      fontSize: '11px',
                      marginBottom: '2px',
                    }}
                  >
                    <span style={{ color: '#666' }}>{label}</span>
                    <span style={{ color, fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
              </>
            )}
            {!results && progressPct === null && (
              <div style={{ color: '#333', fontSize: '10px' }}>
                AWAITING DATA...
              </div>
            )}
          </div>
        </div>

        {/* Right panel: log output */}
        <div className="flex-1 flex flex-col" style={{ background: '#0a0a1a' }}>
          {/* Log header */}
          <div
            className="px-3 py-1.5 flex items-center justify-between"
            style={{
              borderBottom: '1px solid #222',
              background: '#111',
            }}
          >
            <span
              style={{
                color: '#ff6600',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '1px',
              }}
            >
              ENGINE LOG
            </span>
            <span style={{ color: '#444', fontSize: '9px' }}>
              N=100K | FAIR v2.1 | PERT+LN+BETA
            </span>
          </div>

          {/* Log body */}
          <div
            ref={logRef}
            className="flex-1 px-3 py-2 overflow-y-auto"
            style={{ maxHeight: '380px' }}
          >
            {logLines.map((line, i) => {
              const isComplete = line === 'SIMULATION COMPLETE';
              const isRecalibrate =
                line.includes('RECALIBRATE') || line.includes('HEAVY-TAIL');
              const isConvergence =
                line.includes('CONVERGENCE') || line.includes('\u03B4=');
              const isIter = line.includes('ITER ');
              const isFinal = line.includes('FINALISING');

              let color = '#888888';
              if (isComplete) color = '#00ff00';
              else if (isRecalibrate) color = '#ff3333';
              else if (isConvergence) color = '#ffcc00';
              else if (isIter || isFinal) color = '#ff9933';
              else if (line.includes('OK') || line.includes('BEGIN')) color = '#00ccff';

              return (
                <div
                  key={i}
                  className="animate-fade-in"
                  style={{
                    fontSize: '11px',
                    lineHeight: '18px',
                    color,
                    fontWeight: isComplete ? 700 : 400,
                    letterSpacing: '0.3px',
                  }}
                >
                  <span style={{ color: '#333', marginRight: '6px' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {line}
                </div>
              );
            })}

            {/* Inline progress bar in log area */}
            {progressPct !== null && (
              <div
                style={{
                  fontSize: '11px',
                  lineHeight: '18px',
                  color: '#ff6600',
                  letterSpacing: '0.3px',
                }}
              >
                <span style={{ color: '#333', marginRight: '6px' }}>
                  {String(logLines.length + 1).padStart(2, '0')}
                </span>
                {'['}
                <span style={{ color: progressPct < 80 ? '#ff6600' : '#00ff00' }}>
                  {'\u2588'.repeat(Math.round((progressPct / 100) * 24))}
                </span>
                <span style={{ color: '#222' }}>
                  {'\u2591'.repeat(24 - Math.round((progressPct / 100) * 24))}
                </span>
                {'] '}
                <span style={{ color: '#ffcc00' }}>{progressPct}%</span>
              </div>
            )}

            {/* Blinking cursor */}
            {!isComplete && (
              <span
                className="inline-block animate-pulse"
                style={{
                  width: '7px',
                  height: '14px',
                  background: '#ff6600',
                  opacity: 0.8,
                  marginTop: '2px',
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bloomberg-style bottom status bar */}
      <div
        className="flex items-center justify-between px-3 py-1"
        style={{
          background: '#000000',
          borderTop: '2px solid #ff6600',
          fontSize: '9px',
        }}
      >
        <div className="flex items-center gap-4">
          <span style={{ color: '#ff6600' }}>
            FAIR METHODOLOGY
          </span>
          <span style={{ color: '#444' }}>|</span>
          <span style={{ color: '#666' }}>
            {industry.toUpperCase()} / {GEO_LABELS[inputs.company.geography]}
          </span>
          <span style={{ color: '#444' }}>|</span>
          <span style={{ color: '#666' }}>
            REV {REVENUE_LABELS[inputs.company.revenueBand]}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {results && (
            <>
              <span style={{ color: '#ff6600', fontWeight: 700 }}>
                ALE {fmtDollarCompact(results.ale.mean)}
              </span>
              <span style={{ color: '#ff3333' }}>
                PML {fmtDollarCompact(results.ale.p95)}
              </span>
            </>
          )}
          {runTimeMs !== null && (
            <span style={{ color: '#555' }}>
              {runTimeMs}ms
            </span>
          )}
          <span style={{ color: '#444' }}>
            CYBRISK &copy; 2026
          </span>
        </div>
      </div>
    </div>
  );
}
