'use client';
import React, { useEffect, useRef } from 'react';

// ─── Loss-Exceedance Surface ────────────────────────────────────
// Wall Street quant-style 3D surface modeled after options pricing:
//   X = Loss Amount ($0 → $5M)
//   Y = Threat Event Frequency λ (0.1 → 3.0 events/yr)
//   Z = P(Annual Loss > x | TEF=λ) — exceedance probability
//
// Uses log-normal severity (μ=ln($200K), σ=1.2) from NetDiligence
// cyber claims data, with compound Poisson frequency model.

const COLS = 50;
const ROWS = 30;
const LOG_MU = Math.log(200_000);
const LOG_SIG = 1.2;
const MAX_LOSS = 5_000_000;
const MIN_TEF = 0.1;
const MAX_TEF = 3.0;

// Reference lines: loss amounts mapped to column-space
const REF_LINES = [
  { col: (460_650 / MAX_LOSS) * (COLS - 1), color: '#22c55e', label: 'GL z*' },
  { col: (1_245_000 / MAX_LOSS) * (COLS - 1), color: '#06b6d4', label: 'ALE' },
  { col: (3_500_000 / MAX_LOSS) * (COLS - 1), color: '#ef4444', label: 'PML' },
];

// ─── Math ────────────────────────────────────────────────────────

function erfc(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const p =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const r = p * Math.exp(-x * x);
  return x >= 0 ? r : 2 - r;
}

function normSF(z: number): number {
  return 0.5 * erfc(z / 1.41421356237);
}

function surfaceZ(col: number, row: number, t: number): number {
  const loss = Math.max(1, (col / (COLS - 1)) * MAX_LOSS);
  const tef = MIN_TEF + (row / (ROWS - 1)) * (MAX_TEF - MIN_TEF);
  const z = (Math.log(loss) - LOG_MU) / LOG_SIG;
  const exc = normSF(z);
  const wave =
    0.02 * Math.sin(col * 0.25 - t * 0.35) * Math.cos(row * 0.2 + t * 0.25);
  return tef * exc + wave;
}

// Color: deep navy → indigo → cyan → teal → amber → crimson
function surfaceColor(z: number): string {
  const r = Math.min(1, z / 2.2);
  if (r < 0.18) {
    const p = r / 0.18;
    return `hsl(${235 - p * 10},${50 + p * 30}%,${8 + p * 10}%)`;
  }
  if (r < 0.35) {
    const p = (r - 0.18) / 0.17;
    return `hsl(${225 - p * 35},${80 + p * 10}%,${18 + p * 14}%)`;
  }
  if (r < 0.55) {
    const p = (r - 0.35) / 0.2;
    return `hsl(${190 - p * 110},88%,${32 + p * 16}%)`;
  }
  if (r < 0.75) {
    const p = (r - 0.55) / 0.2;
    return `hsl(${80 - p * 40},85%,${48 + p * 10}%)`;
  }
  const p = (r - 0.75) / 0.25;
  return `hsl(${40 - p * 35},90%,${58 + p * 6}%)`;
}

// ─── Component ───────────────────────────────────────────────────

export default function HeroChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let W = 0,
      H = 0;

    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      const t = now / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // ── Projection parameters ──
      const cw = Math.max(4, Math.min(W / 80, H / 50));
      const osc = Math.sin(t * 0.12) * 0.012;

      const dxC = cw * (1.0 + osc);
      const dyC = -cw * (0.26 + osc * 1.5);
      const dxR = -cw * 0.38;
      const dyR = cw * 0.72;
      const zSc = cw * 3.2;

      const ox = W * 0.28;
      const oy = H * 0.55;

      const px = (c: number, r: number) => ox + c * dxC + r * dxR;
      const py = (c: number, r: number, z: number) =>
        oy + c * dyC + r * dyR - z * zSc;

      // ── Subtle warm glow behind peak ──
      const glowX = px(2, ROWS * 0.3);
      const glowY = py(2, ROWS * 0.3, 1.5);
      const glow = ctx.createRadialGradient(
        glowX, glowY, 0,
        glowX, glowY, cw * 18,
      );
      glow.addColorStop(0, 'rgba(255,80,40,0.05)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // ── Base plate edges (z=0 floor) ──
      ctx.strokeStyle = 'rgba(0,120,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px(0, ROWS - 1), py(0, ROWS - 1, 0));
      ctx.lineTo(px(COLS - 1, ROWS - 1), py(COLS - 1, ROWS - 1, 0));
      ctx.lineTo(px(COLS - 1, 0), py(COLS - 1, 0, 0));
      ctx.stroke();
      // Back edges
      ctx.beginPath();
      ctx.moveTo(px(0, 0), py(0, 0, 0));
      ctx.lineTo(px(COLS - 1, 0), py(COLS - 1, 0, 0));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px(0, 0), py(0, 0, 0));
      ctx.lineTo(px(0, ROWS - 1), py(0, ROWS - 1, 0));
      ctx.stroke();

      // ── Surface quads (painter's algorithm: back to front) ──
      for (let row = 0; row < ROWS - 1; row++) {
        for (let col = 0; col < COLS - 1; col++) {
          const z00 = surfaceZ(col, row, t);
          const z10 = surfaceZ(col + 1, row, t);
          const z11 = surfaceZ(col + 1, row + 1, t);
          const z01 = surfaceZ(col, row + 1, t);
          const zm = (z00 + z10 + z11 + z01) * 0.25;

          ctx.beginPath();
          ctx.moveTo(px(col, row), py(col, row, z00));
          ctx.lineTo(px(col + 1, row), py(col + 1, row, z10));
          ctx.lineTo(px(col + 1, row + 1), py(col + 1, row + 1, z11));
          ctx.lineTo(px(col, row + 1), py(col, row + 1, z01));
          ctx.closePath();
          ctx.fillStyle = surfaceColor(zm);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.18)';
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }
      }

      // ── Reference lines traced on surface ──
      for (const ref of REF_LINES) {
        ctx.beginPath();
        ctx.strokeStyle = ref.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        for (let row = 0; row < ROWS; row++) {
          const z = surfaceZ(ref.col, row, t);
          const x = px(ref.col, row);
          const y = py(ref.col, row, z);
          if (row === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Label at back edge of line
        const z0 = surfaceZ(ref.col, 0, t);
        const lx = px(ref.col, 0);
        const ly = py(ref.col, 0, z0);
        ctx.font = `bold ${Math.max(9, cw * 1.3)}px monospace`;
        ctx.fillStyle = ref.color;
        ctx.fillText(ref.label, lx - 4, ly - 10);
      }

      // ── Axis labels ──
      const fs = Math.max(8, W * 0.009);
      ctx.font = `${fs}px monospace`;

      // X-axis (Loss Amount)
      ctx.fillStyle = 'rgba(0,180,255,0.4)';
      ctx.fillText(
        'Loss Amount ($) →',
        px(COLS * 0.4, ROWS - 1),
        py(COLS * 0.4, ROWS - 1, 0) + 18,
      );

      // Y-axis (TEF)
      ctx.fillText(
        '← TEF (λ)',
        px(0, ROWS - 1) - 60,
        py(0, ROWS - 1, 0) + 14,
      );

      // Z-axis (exceedance probability)
      ctx.save();
      ctx.translate(ox - (ROWS - 1) * cw * 0.38 - 20, oy - zSc * 1.6);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = 'rgba(0,180,255,0.35)';
      ctx.fillText('P(Loss > x)', -28, 0);
      ctx.restore();

      // X-axis tick labels (front edge)
      ctx.fillStyle = 'rgba(0,150,255,0.3)';
      ctx.font = `${Math.max(7, fs * 0.85)}px monospace`;
      for (const loss of [0, 1e6, 2e6, 3e6, 4e6, 5e6]) {
        const col = (loss / MAX_LOSS) * (COLS - 1);
        const x = px(col, ROWS - 1);
        const y = py(col, ROWS - 1, 0);
        const label = loss === 0 ? '$0' : `$${loss / 1e6}M`;
        ctx.fillText(label, x - 10, y + 13);
      }

      // Y-axis tick labels (right edge)
      for (const tef of [0.5, 1.0, 1.5, 2.0, 2.5, 3.0]) {
        const row = ((tef - MIN_TEF) / (MAX_TEF - MIN_TEF)) * (ROWS - 1);
        const x = px(COLS - 1, row);
        const y = py(COLS - 1, row, 0);
        ctx.fillText(`λ=${tef.toFixed(1)}`, x + 8, y + 4);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
