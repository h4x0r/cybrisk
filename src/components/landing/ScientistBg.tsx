'use client';
import React, { useEffect, useRef } from 'react';

export default function ScientistBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const GRID = 40;

    const draw = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, W, H);

      // Radial gradient background
      const bg = ctx.createRadialGradient(
        W * 0.4, H * 0.35, 0,
        W * 0.5, H * 0.5, Math.max(W, H) * 0.9
      );
      bg.addColorStop(0, '#0a0f24');
      bg.addColorStop(0.5, '#060a18');
      bg.addColorStop(1, '#030508');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Breathing dot grid
      for (let x = GRID; x < W; x += GRID) {
        for (let y = GRID; y < H; y += GRID) {
          const dist = Math.hypot(x - W * 0.4, y - H * 0.35);
          const maxDist = Math.max(W, H) * 0.8;
          const fade = 1 - Math.min(dist / maxDist, 1);
          const breath = 0.03 + 0.03 * Math.sin(t * 0.5 + x * 0.008 + y * 0.006);
          const alpha = breath * fade;
          if (alpha < 0.005) continue;
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(100,160,255,${alpha.toFixed(3)})`;
          ctx.fill();
        }
      }

      // Faint horizontal scan line
      const sy = ((t * 30) % (H + 60)) - 30;
      const sg = ctx.createLinearGradient(0, sy - 15, 0, sy + 15);
      sg.addColorStop(0, 'transparent');
      sg.addColorStop(0.5, 'rgba(0,150,255,0.025)');
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(0, sy - 15, W, 30);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
}
