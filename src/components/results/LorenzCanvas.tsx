'use client';
import React, { useEffect, useRef } from 'react';

interface LorenzCanvasProps {
  riskRating: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  ale: number;
}

const RISK_FACTOR: Record<string, number> = {
  LOW: 0,
  MODERATE: 0.33,
  HIGH: 0.66,
  CRITICAL: 1,
};

const TRAIL_LEN = 8000;
const STEPS_PER_FRAME = 200;
const DT = 0.005;
const SIGMA = 10;
const BETA = 8 / 3;

export default function LorenzCanvas({ riskRating }: LorenzCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rho = 24 + RISK_FACTOR[riskRating] * 6;

    // State
    let x = 1;
    let y = 1;
    let z = 1;
    let theta = 0;

    const trail: { x: number; y: number; z: number }[] = [];

    const dpr = window.devicePixelRatio || 1;
    let W = 0;
    let H = 0;

    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      // Integrate
      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        const dx = SIGMA * (y - x) * DT;
        const dy = (x * (rho - z) - y) * DT;
        const dz = (x * y - BETA * z) * DT;
        x += dx;
        y += dy;
        z += dz;
        trail.push({ x, y, z });
      }
      while (trail.length > TRAIL_LEN) trail.shift();

      // Slowly rotate
      theta += 0.001;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const scale = Math.min(W, H) / 80;

      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        const projX = p.x * cosT - p.y * sinT;
        const projY = p.z;

        const sx = cx + projX * scale;
        const sy = cy - (projY - 25) * scale;

        // Age factor: 0 (old) to 1 (new)
        const age = i / trail.length;

        // Color: cyan for recent, deep blue for old
        const r = Math.round(0 + age * 0);
        const g = Math.round(20 + age * 192);
        const b = Math.round(64 + age * 191);
        const a = 0.03 + age * 0.03; // 3% to 6% opacity

        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [riskRating]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
