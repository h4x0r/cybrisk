'use client';
import React, { useEffect, useRef } from 'react';
import type { ExceedancePoint } from '@/lib/types';

interface ExceedanceCurveProps {
  curve: ExceedancePoint[];
  aleMean: number;
  pml95: number;
  gordonLoeb: number;
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

export default function ExceedanceCurve({
  curve,
  aleMean,
  pml95,
  gordonLoeb,
}: ExceedanceCurveProps) {
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
      if (curve.length === 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const padL = 55;
      const padR = 20;
      const padT = 40;
      const padB = 50;
      const chartW = W - padL - padR;
      const chartH = H - padT - padB;

      const maxLoss = Math.max(...curve.map((p) => p.loss), 1);

      const toX = (loss: number) => padL + (loss / maxLoss) * chartW;
      const toY = (prob: number) => padT + (1 - prob) * chartH;

      // Title
      ctx.font = '11px monospace';
      ctx.fillStyle = '#8899bb';
      ctx.fillText('LOSS EXCEEDANCE CURVE', padL, padT - 16);

      // Grid lines
      ctx.strokeStyle = 'rgba(0,180,255,0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padT + (i / 5) * chartH;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + chartW, y);
        ctx.stroke();
      }

      // Y-axis labels
      ctx.font = '11px monospace';
      ctx.fillStyle = '#8899bb';
      for (let i = 0; i <= 5; i++) {
        const prob = 1 - i / 5;
        const y = padT + (i / 5) * chartH;
        ctx.fillText(`${(prob * 100).toFixed(0)}%`, 4, y + 4);
      }

      // X-axis labels
      const xTicks = 6;
      for (let i = 0; i <= xTicks; i++) {
        const loss = (i / xTicks) * maxLoss;
        const x = toX(loss);
        ctx.save();
        ctx.translate(x, padT + chartH + 14);
        ctx.rotate(-0.4);
        ctx.fillText(fmtUSD(loss), 0, 0);
        ctx.restore();
      }

      // Fill area under curve
      ctx.beginPath();
      ctx.moveTo(toX(curve[0].loss), toY(curve[0].probability));
      for (let i = 1; i < curve.length; i++) {
        ctx.lineTo(toX(curve[i].loss), toY(curve[i].probability));
      }
      ctx.lineTo(toX(curve[curve.length - 1].loss), toY(0));
      ctx.lineTo(toX(curve[0].loss), toY(0));
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
      grad.addColorStop(0, 'rgba(0,212,255,0.12)');
      grad.addColorStop(1, 'rgba(0,212,255,0.0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Main curve
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00d4ff';
      ctx.beginPath();
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < curve.length; i++) {
        const x = toX(curve[i].loss);
        const y = toY(curve[i].probability);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // Reference lines helper
      const drawRefLine = (
        val: number,
        color: string,
        label: string,
      ) => {
        const x = toX(val);
        if (x < padL || x > padL + chartW) return;
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + chartH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = color;
        ctx.fillText(label, x - 12, padT - 4);
      };

      drawRefLine(aleMean, '#00d4ff', 'ALE');
      drawRefLine(pml95, '#ef4444', 'PML\u2089\u2085');
      drawRefLine(gordonLoeb, '#22c55e', 'G-L');

      // Interactive hover crosshair + tooltip
      const mouse = mouseRef.current;
      if (mouse.active && mouse.x >= padL && mouse.x <= padL + chartW) {
        // Find closest point
        const mouseLoss = ((mouse.x - padL) / chartW) * maxLoss;
        let closest = curve[0];
        let closestDist = Math.abs(curve[0].loss - mouseLoss);
        for (let i = 1; i < curve.length; i++) {
          const d = Math.abs(curve[i].loss - mouseLoss);
          if (d < closestDist) {
            closestDist = d;
            closest = curve[i];
          }
        }

        const cx = toX(closest.loss);
        const cy = toY(closest.probability);

        // Crosshair
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0,210,255,0.5)';
        ctx.strokeStyle = 'rgba(180,230,255,0.4)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(cx, padT);
        ctx.lineTo(cx, padT + chartH);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(padL, cy);
        ctx.lineTo(padL + chartW, cy);
        ctx.stroke();
        ctx.restore();

        // Dot
        const dotGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
        dotGlow.addColorStop(0, 'rgba(255,255,255,0.9)');
        dotGlow.addColorStop(0.25, 'rgba(0,210,255,0.5)');
        dotGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = dotGlow;
        ctx.fillRect(cx - 14, cy - 14, 28, 28);
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Tooltip
        const ttW = 210;
        const ttH = 48;
        let ttX = cx + 18;
        let ttY = cy - 60;
        if (ttX + ttW > W - 10) ttX = cx - ttW - 18;
        if (ttY < 10) ttY = cy + 18;

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
        ctx.fillText('Loss', ttX + 10, ttY + 18);
        ctx.fillText('P(L>x)', ttX + 10, ttY + 36);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#d0e4ff';
        ctx.fillText(fmtUSD(closest.loss), ttX + ttW - 10, ttY + 18);

        const pct = closest.probability * 100;
        const excColor =
          pct > 50 ? '#ef4444' : pct > 20 ? '#ffd060' : '#00d4ff';
        ctx.fillStyle = excColor;
        ctx.fillText(`${pct.toFixed(1)}%`, ttX + ttW - 10, ttY + 36);
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
  }, [curve, aleMean, pml95, gordonLoeb]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', minHeight: 300, cursor: 'crosshair' }}
    />
  );
}
