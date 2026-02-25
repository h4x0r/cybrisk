'use client';

import React, { useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Grid resolution for stable-fluid solver
// ---------------------------------------------------------------------------
const N = 128;
const SIZE = (N + 2) * (N + 2);

// ---------------------------------------------------------------------------
// Helper: 2D → 1D index
// ---------------------------------------------------------------------------
function ix(i: number, j: number): number {
  return i + (N + 2) * j;
}

// ---------------------------------------------------------------------------
// Add source: x += dt * s
// ---------------------------------------------------------------------------
function addSource(x: Float32Array, s: Float32Array, dt: number): void {
  for (let i = 0; i < SIZE; i++) x[i] += dt * s[i];
}

// ---------------------------------------------------------------------------
// Boundary conditions: reflect at edges
// ---------------------------------------------------------------------------
function setBoundary(b: number, x: Float32Array): void {
  for (let i = 1; i <= N; i++) {
    x[ix(0, i)] = b === 1 ? -x[ix(1, i)] : x[ix(1, i)];
    x[ix(N + 1, i)] = b === 1 ? -x[ix(N, i)] : x[ix(N, i)];
    x[ix(i, 0)] = b === 2 ? -x[ix(i, 1)] : x[ix(i, 1)];
    x[ix(i, N + 1)] = b === 2 ? -x[ix(i, N)] : x[ix(i, N)];
  }
  x[ix(0, 0)] = 0.5 * (x[ix(1, 0)] + x[ix(0, 1)]);
  x[ix(0, N + 1)] = 0.5 * (x[ix(1, N + 1)] + x[ix(0, N)]);
  x[ix(N + 1, 0)] = 0.5 * (x[ix(N, 0)] + x[ix(N + 1, 1)]);
  x[ix(N + 1, N + 1)] = 0.5 * (x[ix(N, N + 1)] + x[ix(N + 1, N)]);
}

// ---------------------------------------------------------------------------
// Gauss-Seidel diffusion
// ---------------------------------------------------------------------------
function diffuse(
  b: number,
  x: Float32Array,
  x0: Float32Array,
  diff: number,
  dt: number,
): void {
  const a = dt * diff * N * N;
  const denom = 1 + 4 * a;
  for (let k = 0; k < 20; k++) {
    for (let i = 1; i <= N; i++) {
      for (let j = 1; j <= N; j++) {
        x[ix(i, j)] =
          (x0[ix(i, j)] +
            a *
              (x[ix(i - 1, j)] +
                x[ix(i + 1, j)] +
                x[ix(i, j - 1)] +
                x[ix(i, j + 1)])) /
          denom;
      }
    }
    setBoundary(b, x);
  }
}

// ---------------------------------------------------------------------------
// Semi-Lagrangian advection
// ---------------------------------------------------------------------------
function advect(
  b: number,
  d: Float32Array,
  d0: Float32Array,
  u: Float32Array,
  v: Float32Array,
  dt: number,
): void {
  const dt0 = dt * N;
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      let x = i - dt0 * u[ix(i, j)];
      let y = j - dt0 * v[ix(i, j)];
      x = Math.max(0.5, Math.min(N + 0.5, x));
      y = Math.max(0.5, Math.min(N + 0.5, y));
      const i0 = Math.floor(x);
      const i1 = i0 + 1;
      const j0 = Math.floor(y);
      const j1 = j0 + 1;
      const s1 = x - i0;
      const s0 = 1 - s1;
      const t1 = y - j0;
      const t0 = 1 - t1;
      d[ix(i, j)] =
        s0 * (t0 * d0[ix(i0, j0)] + t1 * d0[ix(i0, j1)]) +
        s1 * (t0 * d0[ix(i1, j0)] + t1 * d0[ix(i1, j1)]);
    }
  }
  setBoundary(b, d);
}

// ---------------------------------------------------------------------------
// Helmholtz-Hodge projection (enforce incompressibility)
// ---------------------------------------------------------------------------
function project(
  u: Float32Array,
  v: Float32Array,
  p: Float32Array,
  div: Float32Array,
): void {
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      div[ix(i, j)] =
        (-0.5 *
          (u[ix(i + 1, j)] -
            u[ix(i - 1, j)] +
            v[ix(i, j + 1)] -
            v[ix(i, j - 1)])) /
        N;
      p[ix(i, j)] = 0;
    }
  }
  setBoundary(0, div);
  setBoundary(0, p);
  for (let k = 0; k < 20; k++) {
    for (let i = 1; i <= N; i++) {
      for (let j = 1; j <= N; j++) {
        p[ix(i, j)] =
          (div[ix(i, j)] +
            p[ix(i - 1, j)] +
            p[ix(i + 1, j)] +
            p[ix(i, j - 1)] +
            p[ix(i, j + 1)]) /
          4;
      }
    }
    setBoundary(0, p);
  }
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      u[ix(i, j)] -= 0.5 * N * (p[ix(i + 1, j)] - p[ix(i - 1, j)]);
      v[ix(i, j)] -= 0.5 * N * (p[ix(i, j + 1)] - p[ix(i, j - 1)]);
    }
  }
  setBoundary(1, u);
  setBoundary(2, v);
}

// ---------------------------------------------------------------------------
// Velocity step: diffuse → project → advect → project
// ---------------------------------------------------------------------------
function velocityStep(
  u: Float32Array,
  v: Float32Array,
  u0: Float32Array,
  v0: Float32Array,
  visc: number,
  dt: number,
): void {
  addSource(u, u0, dt);
  addSource(v, v0, dt);

  // swap u <-> u0 for diffuse
  [u0.set(u), u.fill(0)];
  diffuse(1, u, u0, visc, dt);

  [v0.set(v), v.fill(0)];
  diffuse(2, v, v0, visc, dt);

  project(u, v, u0, v0);

  u0.set(u);
  v0.set(v);

  advect(1, u, u0, u0, v0, dt);
  advect(2, v, v0, u0, v0, dt);

  project(u, v, u0, v0);
}

// ---------------------------------------------------------------------------
// Density step: diffuse → advect
// ---------------------------------------------------------------------------
function densityStep(
  dens: Float32Array,
  dens0: Float32Array,
  u: Float32Array,
  v: Float32Array,
  diff: number,
  dt: number,
): void {
  addSource(dens, dens0, dt);

  // swap dens <-> dens0 for diffuse
  dens0.set(dens);
  dens.fill(0);
  diffuse(0, dens, dens0, diff, dt);

  dens0.set(dens);
  advect(0, dens, dens0, u, v, dt);
}

// ---------------------------------------------------------------------------
// Color interpolation helpers
// ---------------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

// Color phase definitions
const PHASE_COLORS: Array<{
  low: [number, number, number];
  high: [number, number, number];
}> = [
  { low: hexToRgb('#001838'), high: hexToRgb('#0088ff') }, // cool blues
  { low: hexToRgb('#003060'), high: hexToRgb('#00ffcc') }, // cyan transition
  { low: hexToRgb('#402000'), high: hexToRgb('#ef4444') }, // warm crimson
];

function getPhaseColors(
  progress: number,
): { low: [number, number, number]; high: [number, number, number] } {
  // progress 0-1 maps across 3 phases
  const t = Math.max(0, Math.min(1, progress));

  if (t < 0.33) {
    const localT = t / 0.33;
    return {
      low: lerpColor(PHASE_COLORS[0].low, PHASE_COLORS[1].low, localT),
      high: lerpColor(PHASE_COLORS[0].high, PHASE_COLORS[1].high, localT),
    };
  } else if (t < 0.66) {
    const localT = (t - 0.33) / 0.33;
    return {
      low: lerpColor(PHASE_COLORS[1].low, PHASE_COLORS[2].low, localT),
      high: lerpColor(PHASE_COLORS[1].high, PHASE_COLORS[2].high, localT),
    };
  } else {
    // Hold warm colors in final phase
    const localT = (t - 0.66) / 0.34;
    const finalLow = lerpColor(PHASE_COLORS[2].low, hexToRgb('#301000'), localT);
    const finalHigh = lerpColor(PHASE_COLORS[2].high, hexToRgb('#ff6030'), localT);
    return { low: finalLow, high: finalHigh };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function FluidCanvas({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const progressRef = useRef(progress);

  // Keep progress ref in sync
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const initAndRun = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Allocate fields ---
    const u = new Float32Array(SIZE);
    const v = new Float32Array(SIZE);
    const u0 = new Float32Array(SIZE);
    const v0 = new Float32Array(SIZE);
    const dens = new Float32Array(SIZE);
    const dens0 = new Float32Array(SIZE);

    const visc = 0.00001;
    const diff = 0.00002;
    const dt = 0.1;

    // Time tracking
    let elapsed = 0;

    // --- Resize handler ---
    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    // --- Emitter configuration ---
    // 3 emitter points with circular vortex pattern
    const emitters = [
      { cx: 0.35, cy: 0.45, radius: 8, strength: 12 },
      { cx: 0.65, cy: 0.55, radius: 8, strength: 10 },
      { cx: 0.50, cy: 0.35, radius: 6, strength: 8 },
    ];

    // --- Animation loop ---
    function step() {
      elapsed += dt;

      // Clear source arrays
      u0.fill(0);
      v0.fill(0);
      dens0.fill(0);

      // Inject dye and velocity at emitter points
      for (const em of emitters) {
        const ci = Math.round(em.cx * N);
        const cj = Math.round(em.cy * N);
        const r = em.radius;

        // Rotating angle based on elapsed time for swirling effect
        const angle = elapsed * 0.7 + em.cx * 10;
        const vx = Math.cos(angle) * em.strength;
        const vy = Math.sin(angle) * em.strength;

        for (let di = -r; di <= r; di++) {
          for (let dj = -r; dj <= r; dj++) {
            const dist = Math.sqrt(di * di + dj * dj);
            if (dist > r) continue;
            const fi = ci + di;
            const fj = cj + dj;
            if (fi < 1 || fi > N || fj < 1 || fj > N) continue;

            const falloff = 1 - dist / r;
            const idx = ix(fi, fj);

            // Inject dye density
            dens0[idx] += 80 * falloff;

            // Inject circular vortex velocity
            u0[idx] += vx * falloff;
            v0[idx] += vy * falloff;

            // Add radial curl for turbulence
            const curlScale = 3.0;
            u0[idx] += (-dj / (dist + 0.1)) * curlScale * falloff;
            v0[idx] += (di / (dist + 0.1)) * curlScale * falloff;
          }
        }
      }

      // Step the simulation
      velocityStep(u, v, u0, v0, visc, dt);
      densityStep(dens, dens0, u, v, diff, dt);

      // Decay density slightly to prevent saturation
      for (let i = 0; i < SIZE; i++) {
        dens[i] *= 0.995;
      }

      // --- Render ---
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cellW = w / N;
      const cellH = h / N;

      // Background
      ctx!.fillStyle = '#060a18';
      ctx!.fillRect(0, 0, w, h);

      // Get color phase from progress
      const { low, high } = getPhaseColors(progressRef.current);

      // Render density field
      for (let i = 1; i <= N; i++) {
        for (let j = 1; j <= N; j++) {
          const d = Math.min(dens[ix(i, j)], 1.0);
          if (d < 0.005) continue; // skip near-zero cells for performance

          const r = Math.round(low[0] + (high[0] - low[0]) * d);
          const g = Math.round(low[1] + (high[1] - low[1]) * d);
          const b = Math.round(low[2] + (high[2] - low[2]) * d);
          const alpha = Math.min(d * 1.5, 0.9);

          ctx!.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx!.fillRect((i - 1) * cellW, (j - 1) * cellH, cellW + 0.5, cellH + 0.5);
        }
      }

      animRef.current = requestAnimationFrame(step);
    }

    animRef.current = requestAnimationFrame(step);

    // Cleanup
    return () => {
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const cleanup = initAndRun();
    return cleanup;
  }, [initAndRun]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
