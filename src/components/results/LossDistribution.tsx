'use client';
import React, { useEffect, useRef } from 'react';
import type { DistributionBucket } from '@/lib/types';

interface LossDistributionProps {
  buckets: DistributionBucket[];
  aleMean: number;
  pml95: number;
}

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function lerpColor(t: number): string {
  // blue #0066ff (0,102,255) -> crimson #ef4444 (239,68,68)
  const r = Math.round(0 + t * 239);
  const g = Math.round(102 - t * 34);
  const b = Math.round(255 - t * 187);
  return `rgb(${r},${g},${b})`;
}

export default function LossDistribution({
  buckets,
  aleMean,
  pml95,
}: LossDistributionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };
    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);

    const dpr = window.devicePixelRatio || 1;
    let W = 0;
    let H = 0;
    let rafId: number | null = null;

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
      if (buckets.length === 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const padL = 60;
      const padR = 20;
      const padT = 40;
      const padB = 50;
      const chartW = W - padL - padR;
      const chartH = H - padT - padB;

      const maxProb = Math.max(...buckets.map((b) => b.probability), 0.01);
      const maxVal = Math.max(...buckets.map((b) => b.maxValue), 1);
      const barW = Math.max(2, chartW / buckets.length - 2);
      const gap = 2;

      // Title
      ctx.font = '11px monospace';
      ctx.fillStyle = '#8899bb';
      ctx.fillText('LOSS DISTRIBUTION', padL, padT - 16);

      // Y-axis ticks
      ctx.font = '11px monospace';
      ctx.fillStyle = '#8899bb';
      const yTicks = 5;
      for (let i = 0; i <= yTicks; i++) {
        const pct = (i / yTicks) * maxProb * 100;
        const y = padT + chartH - (i / yTicks) * chartH;
        ctx.fillText(`${pct.toFixed(0)}%`, 4, y + 4);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,180,255,0.06)';
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + chartW, y);
        ctx.stroke();
      }

      // Bars
      const mouse = mouseRef.current;
      let hoveredIdx = -1;

      for (let i = 0; i < buckets.length; i++) {
        const b = buckets[i];
        const barH = (b.probability / maxProb) * chartH;
        const x = padL + i * (barW + gap);
        const y = padT + chartH - barH;
        const colorT = i / (buckets.length - 1 || 1);
        const color = lerpColor(colorT);

        // Check hover
        if (
          mouse.active &&
          mouse.x >= x &&
          mouse.x <= x + barW &&
          mouse.y >= y &&
          mouse.y <= padT + chartH
        ) {
          hoveredIdx = i;
        }

        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.fillStyle =
          hoveredIdx === i ? color : color.replace('rgb', 'rgba').replace(')', ',0.7)');
        ctx.fillRect(x, y, barW, barH);
        ctx.restore();
      }

      // X-axis labels (every few buckets)
      ctx.font = '11px monospace';
      ctx.fillStyle = '#8899bb';
      const step = Math.max(1, Math.floor(buckets.length / 6));
      for (let i = 0; i < buckets.length; i += step) {
        const x = padL + i * (barW + gap) + barW / 2;
        ctx.save();
        ctx.translate(x, padT + chartH + 14);
        ctx.rotate(-0.4);
        ctx.fillText(fmtUSD(buckets[i].minValue), 0, 0);
        ctx.restore();
      }

      // ALE reference line
      const aleX =
        padL + (aleMean / maxVal) * chartW;
      if (aleX >= padL && aleX <= padL + chartW) {
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1.5;
        ctx.moveTo(aleX, padT);
        ctx.lineTo(aleX, padT + chartH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#00d4ff';
        ctx.fillText('ALE', aleX - 12, padT - 4);
      }

      // PML reference line
      const pmlX =
        padL + (pml95 / maxVal) * chartW;
      if (pmlX >= padL && pmlX <= padL + chartW) {
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.moveTo(pmlX, padT);
        ctx.lineTo(pmlX, padT + chartH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#ef4444';
        ctx.fillText('PML\u2089\u2085', pmlX - 16, padT - 4);
      }

      // Hover tooltip
      if (hoveredIdx >= 0) {
        const b = buckets[hoveredIdx];
        const ttW = 200;
        const ttH = 48;
        let ttX = mouse.x + 16;
        let ttY = mouse.y - 60;
        if (ttX + ttW > W - 10) ttX = mouse.x - ttW - 16;
        if (ttY < 10) ttY = mouse.y + 16;

        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0,120,255,0.2)';
        roundRect(ctx, ttX, ttY, ttW, ttH, 6);
        ctx.fillStyle = 'rgba(4,10,28,0.96)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,180,255,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        ctx.font = '11px monospace';
        ctx.fillStyle = '#8899bb';
        ctx.fillText('Range', ttX + 10, ttY + 18);
        ctx.fillText('Prob', ttX + 10, ttY + 36);

        ctx.fillStyle = '#d0e4ff';
        ctx.textAlign = 'right';
        ctx.fillText(b.rangeLabel, ttX + ttW - 10, ttY + 18);
        ctx.fillStyle = '#00d4ff';
        ctx.fillText(`${(b.probability * 100).toFixed(1)}%`, ttX + ttW - 10, ttY + 36);
        ctx.textAlign = 'left';
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      ro.disconnect();
    };
  }, [buckets, aleMean, pml95]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', minHeight: 300, cursor: 'crosshair' }}
    />
  );
}
