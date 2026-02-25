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
  if (n >= 1_000_000_000) {
    return `$${(n / 1_000_000_000).toFixed(1)}B`;
  }
  if (n >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `$${(n / 1_000).toFixed(0)}K`;
  }
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

// ---------------------------------------------------------------------------
// Build the log line sequence from actual inputs
// ---------------------------------------------------------------------------
function buildLogLines(inputs: AssessmentInputs): Array<{
  text: string;
  type: 'normal' | 'progress' | 'simulate' | 'complete' | 'summary';
}> {
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

  const lines: Array<{
    text: string;
    type: 'normal' | 'progress' | 'simulate' | 'complete' | 'summary';
  }> = [
    { text: 'Loading actuarial parameters...', type: 'normal' },
    {
      text: `Industry: ${industry} \u2014 base TEF \u03BB=${tef.mode.toFixed(2)}/yr`,
      type: 'normal',
    },
  ];

  if (controls.length > 0) {
    lines.push({
      text: `Adjusting vulnerability: ${controls.join(', ')}`,
      type: 'normal',
    });
  } else {
    lines.push({
      text: 'No security controls detected \u2014 using base vulnerability rate',
      type: 'normal',
    });
  }

  lines.push({
    text: `Data profile: ${fmtNumber(inputs.data.recordCount)} records, ${dataTypeCount} data type${dataTypeCount !== 1 ? 's' : ''}`,
    type: 'normal',
  });

  lines.push({
    text: 'Sampling PERT distributions (N=10,000)...',
    type: 'normal',
  });

  lines.push({
    text: 'Running Monte Carlo simulation...',
    type: 'simulate',
  });

  // Progress bar will be injected during rendering
  lines.push({ text: '', type: 'progress' });

  lines.push({
    text: 'Computing loss exceedance curve...',
    type: 'normal',
  });

  lines.push({
    text: 'Fitting Gordon-Loeb optimal spend...',
    type: 'normal',
  });

  lines.push({
    text: 'SIMULATION COMPLETE',
    type: 'complete',
  });

  // Summary line — placeholder, will be replaced with actual results
  lines.push({
    text: '',
    type: 'summary',
  });

  return lines;
}

// ---------------------------------------------------------------------------
// Progress bar renderer with block chars
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
// SimConsole component
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
  const resultsRef = useRef<SimulationResults | null>(null);
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

    const logLines = buildLogLines(inputs);
    const totalSteps = logLines.length;
    let currentLine = 0;

    function addLine(text: string) {
      setVisibleLines((prev) => [...prev, text]);
      currentLine++;
      onProgress?.(Math.min(currentLine / totalSteps, 1));
    }

    // Helper: delay
    function delay(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Line 0: Loading actuarial parameters...
    addLine(`\u25b8 ${logLines[0].text}`);
    await delay(400);

    // Line 1: Industry
    addLine(`\u25b8 ${logLines[1].text}`);
    await delay(350);

    // Line 2: Controls
    addLine(`\u25b8 ${logLines[2].text}`);
    await delay(350);

    // Line 3: Data profile
    addLine(`\u25b8 ${logLines[3].text}`);
    await delay(300);

    // Line 4: Sampling PERT
    addLine(`\u25b8 ${logLines[4].text}`);
    await delay(400);

    // Line 5: Running Monte Carlo
    addLine(`\u25b8 ${logLines[5].text}`);
    await delay(200);

    // Progress bar animation + actual simulation
    // Start the simulation in a microtask so the UI can update
    const simPromise = new Promise<SimulationResults>((resolve) => {
      setTimeout(() => {
        const results = simulate(inputs);
        resolve(results);
      }, 50);
    });

    // Animate progress bar from 0 to ~75%, then wait for sim
    for (let p = 0; p <= 75; p += 3) {
      setProgressPct(p);
      await delay(30);
    }

    // Wait for actual simulation to complete
    const results = await simPromise;
    resultsRef.current = results;

    // Finish progress bar to 100%
    for (let p = 78; p <= 100; p += 2) {
      setProgressPct(p);
      await delay(20);
    }

    await delay(300);
    setProgressPct(null); // Hide progress bar

    // Line 7: Computing loss exceedance curve
    addLine(`\u25b8 ${logLines[7].text}`);
    await delay(400);

    // Line 8: Fitting Gordon-Loeb
    addLine(`\u25b8 ${logLines[8].text}`);
    await delay(500);

    // Line 9: SIMULATION COMPLETE
    addLine(`\u2713 ${logLines[9].text}`);
    onProgress?.(1);
    await delay(200);

    // Summary line with actual results
    const ale = results.ale.mean;
    const pml = results.ale.p95;
    const rating = results.riskRating;
    addLine(
      `  ALE: ${fmtDollar(ale)} | PML\u2089\u2085: ${fmtDollar(pml)} | Risk: ${rating}`,
    );

    setIsComplete(true);

    // Wait 1.5 seconds then navigate
    await delay(1500);
    onComplete(results);
  }, [inputs, onComplete, onProgress]);

  useEffect(() => {
    runSequence();
  }, [runSequence]);

  return (
    <div
      className="animate-fade-up w-full max-w-[620px] rounded-xl overflow-hidden"
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
          cybrisk \u2014 monte carlo engine
        </span>
      </div>

      {/* Terminal body */}
      <div
        ref={containerRef}
        className="p-5 font-mono text-sm leading-relaxed overflow-y-auto"
        style={{ maxHeight: '420px', minHeight: '280px' }}
      >
        {visibleLines.map((line, i) => {
          const isCompleteLine = line.startsWith('\u2713');
          const isSummaryLine =
            i === visibleLines.length - 1 && isComplete && line.startsWith('  ');

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
