'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import type { Industry } from '@/lib/types';
import { simulate } from '@/lib/monte-carlo';
import { TEF_BY_INDUSTRY, COST_MODIFIERS } from '@/lib/lookup-tables';

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

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------
function fmtNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtDollar(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

// ---------------------------------------------------------------------------
// Non-linear progress curve: fast start, slow middle, fast finish
// Maps elapsed time fraction [0,1] to display percentage [0,100]
// ---------------------------------------------------------------------------
function progressCurve(t: number): number {
  // Piecewise cubic: fast 0-30%, slow 30-70%, fast 70-100%
  if (t < 0.3) {
    // 0→30% in first 30% of time (linear)
    return (t / 0.3) * 30;
  } else if (t < 0.75) {
    // 30→70% in middle 45% of time (slow grind)
    const localT = (t - 0.3) / 0.45;
    return 30 + localT * 40;
  } else {
    // 70→100% in final 25% of time (fast finish)
    const localT = (t - 0.75) / 0.25;
    return 70 + localT * 30;
  }
}

// ---------------------------------------------------------------------------
// Stochastic stutter: apply random jitter to progress, occasionally regress
// ---------------------------------------------------------------------------
function applyStutter(
  basePct: number,
  prevPct: number,
  rng: () => number,
): number {
  // Small random jitter: +-1.5%
  const jitter = (rng() - 0.5) * 3;
  let pct = basePct + jitter;

  // Deliberate regression zone around 52-58%: sometimes drop back
  if (basePct >= 52 && basePct <= 56 && rng() < 0.3) {
    pct = prevPct - (0.5 + rng() * 2.5); // drop 0.5-3%
  }

  // Never go below previous minimum floor or above 99
  pct = Math.max(prevPct - 3, Math.min(99, pct));

  // Always advance at least slightly on average (prevent permanent stall)
  if (pct <= prevPct && basePct > prevPct + 1) {
    pct = prevPct + 0.1;
  }

  return Math.round(pct);
}

// ---------------------------------------------------------------------------
// Progress bar renderer
// ---------------------------------------------------------------------------
function renderProgressBar(pct: number): string {
  const totalBlocks = 32;
  const filled = Math.round((pct / 100) * totalBlocks);
  const empty = totalBlocks - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty) + ` ${pct}%`;
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
// SimConsole component — theatrical pacing for credibility
// ---------------------------------------------------------------------------
export default function SimConsole({
  inputs,
  onComplete,
  onProgress,
}: SimConsoleProps) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleLines, progressPct]);

  const runSequence = useCallback(async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const industry = INDUSTRY_NAMES[inputs.company.industry];
    const tef = TEF_BY_INDUSTRY[inputs.company.industry];

    // Build active controls description
    const controls: string[] = [];
    if (inputs.controls.irPlan)
      controls.push(`IR Plan (${Math.round(COST_MODIFIERS.ir_plan * 100)}%)`);
    if (inputs.controls.mfa)
      controls.push(`MFA (${Math.round(COST_MODIFIERS.mfa * 100)}%)`);
    if (inputs.controls.securityTeam)
      controls.push(`CISO (${Math.round(COST_MODIFIERS.security_team * 100)}%)`);
    if (inputs.controls.pentest)
      controls.push(`Pentest (${Math.round(COST_MODIFIERS.pentest * 100)}%)`);
    if (inputs.controls.aiAutomation)
      controls.push(`AI/ML (${Math.round(COST_MODIFIERS.ai_automation * 100)}%)`);

    const dataTypeCount = inputs.data.dataTypes.length;

    // Helper: delay with random variance
    function delay(base: number, variance: number = 0): Promise<void> {
      const ms = base + (variance > 0 ? Math.random() * variance : 0);
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function addLine(text: string) {
      setVisibleLines((prev) => [...prev, text]);
    }

    // Simple seeded RNG for stutter consistency
    let seed = 42;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 0xffffffff;
    };

    // =====================================================================
    // PHASE 1: Parameter Loading (0-15%, ~2.5s)
    // =====================================================================
    onProgress?.(0.02);

    addLine('\u25b8 Initialising FAIR risk quantification engine...');
    await delay(500, 200);

    addLine(`\u25b8 Loading actuarial parameters for ${industry}...`);
    await delay(400, 150);

    addLine(`\u25b8 Industry baseline: TEF \u03BB=${tef.mode.toFixed(2)}/yr [${tef.min.toFixed(2)}, ${tef.max.toFixed(1)}]`);
    await delay(350, 100);

    if (controls.length > 0) {
      addLine(`\u25b8 Adjusting vulnerability: ${controls.join(', ')}`);
    } else {
      addLine('\u25b8 No security controls detected \u2014 using base vulnerability rate 0.30');
    }
    await delay(350, 100);

    addLine(
      `\u25b8 Data profile: ${fmtNumber(inputs.data.recordCount)} records, ${dataTypeCount} type${dataTypeCount !== 1 ? 's' : ''}, ${inputs.data.cloudPercentage}% cloud`,
    );
    await delay(300, 100);

    addLine('\u25b8 Calibrating PERT distributions against DBIR 2025 baseline...');
    await delay(450, 200);

    onProgress?.(0.15);

    // =====================================================================
    // PHASE 2: Monte Carlo Execution (15-82%, ~6s with stuttering)
    // =====================================================================
    addLine('\u25b8 Running Monte Carlo simulation (N=10,000)...');
    await delay(300, 100);

    // Start actual simulation in background
    const simPromise = new Promise<SimulationResults>((resolve) => {
      setTimeout(() => resolve(simulate(inputs)), 50);
    });

    // Animate progress bar over ~6 seconds with non-linear curve + stutter
    const SIM_DURATION_MS = 6000;
    const FRAME_INTERVAL = 80; // ~12.5fps
    const totalFrames = Math.floor(SIM_DURATION_MS / FRAME_INTERVAL);
    let displayPct = 0;
    let prevDisplayPct = 0;

    // Milestone log lines at specific percentages
    const milestones: Record<number, string> = {
      20: `\u25b8 Iteration 2,500 / 10,000 \u2014 sampling TEF\u00D7Vuln matrix...`,
      38: `\u25b8 Iteration 4,000 / 10,000 \u2014 convergence check: \u03B4=0.${Math.round(20 + Math.random() * 15)}`,
      52: `\u25b8 Recalibrating tail distribution \u2014 heavy-tailed scenario detected`,
      65: `\u25b8 Iteration 7,500 / 10,000 \u2014 bootstrap resampling 95th bound...`,
      78: `\u25b8 Iteration 10,000 / 10,000 \u2014 finalising loss distribution`,
    };
    const emittedMilestones = new Set<number>();

    for (let frame = 0; frame <= totalFrames; frame++) {
      const t = frame / totalFrames; // 0 → 1
      const basePct = progressCurve(t);
      displayPct = applyStutter(basePct, prevDisplayPct, rng);

      // Clamp: progress should generally advance
      if (displayPct < prevDisplayPct - 3) displayPct = prevDisplayPct - 3;
      displayPct = Math.max(0, Math.min(99, displayPct));

      setProgressPct(displayPct);
      onProgress?.(0.15 + (displayPct / 100) * 0.67);

      // Check milestones
      for (const [threshold, line] of Object.entries(milestones)) {
        const t = Number(threshold);
        if (displayPct >= t && !emittedMilestones.has(t)) {
          emittedMilestones.add(t);
          addLine(line);
        }
      }

      prevDisplayPct = displayPct;

      // Random stall: occasionally pause longer
      if (rng() < 0.05 && displayPct > 15 && displayPct < 85) {
        await delay(FRAME_INTERVAL + 200, 300); // stall 280-580ms
      } else {
        await delay(FRAME_INTERVAL, 20);
      }
    }

    // Wait for actual simulation to complete (should be done by now)
    const results = await simPromise;

    // Snap to 100%
    setProgressPct(100);
    onProgress?.(0.82);
    await delay(400);
    setProgressPct(null);

    // =====================================================================
    // PHASE 3: Post-Processing (82-100%, ~2.5s)
    // =====================================================================
    addLine('\u25b8 Computing loss exceedance curve (50-point interpolation)...');
    await delay(500, 200);

    addLine('\u25b8 Fitting Gordon-Loeb optimal spend model (1/e coefficient)...');
    await delay(450, 200);

    addLine('\u25b8 Validating results against industry benchmarks...');
    await delay(400, 150);

    addLine('\u25b8 Generating risk drivers and recommendations...');
    await delay(350, 100);

    onProgress?.(1);

    // =====================================================================
    // COMPLETE
    // =====================================================================
    addLine(`\u2713 SIMULATION COMPLETE`);
    await delay(250);

    // Summary line with actual results
    addLine(
      `  ALE: ${fmtDollar(results.ale.mean)} | PML\u2089\u2085: ${fmtDollar(results.ale.p95)} | Risk: ${results.riskRating}`,
    );

    setIsComplete(true);

    // Wait then navigate
    await delay(1800);
    onComplete(results);
  }, [inputs, onComplete, onProgress]);

  useEffect(() => {
    runSequence();
  }, [runSequence]);

  return (
    <div
      className="animate-fade-up w-full max-w-[660px] rounded-xl overflow-hidden"
      style={{
        background: 'rgba(4,8,28,0.94)',
        border: '1px solid rgba(0,180,255,0.2)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 0 60px -12px rgba(0,180,255,0.15)',
      }}
    >
      {/* Terminal title bar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{
          borderBottom: '1px solid rgba(0,180,255,0.1)',
          background: 'rgba(0,10,30,0.6)',
        }}
      >
        <div className="flex gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: '#ff5f57' }}
          />
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: '#febc2e' }}
          />
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: '#28c840' }}
          />
        </div>
        <span
          className="ml-3 text-[11px] tracking-wider uppercase font-mono"
          style={{ color: '#4a6080' }}
        >
          cybrisk \u2014 fair monte carlo engine v2.1
        </span>
      </div>

      {/* Terminal body */}
      <div
        ref={containerRef}
        className="p-5 font-mono text-sm leading-relaxed overflow-y-auto"
        style={{ maxHeight: '480px', minHeight: '320px' }}
      >
        {visibleLines.map((line, i) => {
          const isCompleteLine = line.startsWith('\u2713');
          const isSummaryLine =
            i === visibleLines.length - 1 && isComplete && line.startsWith('  ');
          const isRecalibrate = line.includes('Recalibrating') || line.includes('heavy-tailed');
          const isConvergence = line.includes('convergence') || line.includes('\u03B4=');

          return (
            <div
              key={i}
              className="animate-fade-in"
              style={{
                animationDuration: '0.2s',
                color: isCompleteLine
                  ? '#22c55e'
                  : isSummaryLine
                    ? '#00d4ff'
                    : isRecalibrate
                      ? '#f97316'
                      : isConvergence
                        ? '#eab308'
                        : '#8899bb',
                fontWeight: isCompleteLine || isSummaryLine ? 600 : 400,
                marginBottom: isCompleteLine ? '2px' : '6px',
              }}
            >
              {line}
            </div>
          );
        })}

        {/* Progress bar */}
        {progressPct !== null && (
          <div
            className="font-mono"
            style={{ color: '#00d4ff', marginBottom: '6px' }}
          >
            {'  '}
            {renderProgressBar(progressPct)}
          </div>
        )}

        {/* Blinking cursor when not complete */}
        {!isComplete && (
          <span
            className="inline-block w-2 h-4 animate-pulse"
            style={{ background: '#00d4ff', opacity: 0.7 }}
          />
        )}
      </div>
    </div>
  );
}
