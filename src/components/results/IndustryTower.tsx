'use client';
import React from 'react';
import {
  Heart, TrendingUp, Pill, Cpu, Zap, Factory,
  Briefcase, ShoppingCart, GraduationCap, Music,
  Radio, Package, Monitor, FlaskConical, Truck,
  UtensilsCrossed, Landmark,
} from 'lucide-react';
import type { Industry } from '@/lib/types';
import { sortIndustries, scaleBar, isUserIndustry } from '@/lib/industry-tower-utils';

const ICONS: Record<Industry, React.ElementType> = {
  healthcare:      Heart,
  financial:       TrendingUp,
  pharmaceuticals: Pill,
  technology:      Cpu,
  energy:          Zap,
  industrial:      Factory,
  services:        Briefcase,
  retail:          ShoppingCart,
  education:       GraduationCap,
  entertainment:   Music,
  communications:  Radio,
  consumer:        Package,
  media:           Monitor,
  research:        FlaskConical,
  transportation:  Truck,
  hospitality:     UtensilsCrossed,
  public_sector:   Landmark,
};

function fmtM(cost: number): string {
  return `$${cost.toFixed(2)}M`;
}

interface IndustryTowerProps {
  userIndustry: Industry;
  userAle: number; // in USD (raw, not millions)
}

export default function IndustryTower({ userIndustry, userAle }: IndustryTowerProps) {
  const rows = sortIndustries();
  const maxCost = rows[0].cost; // healthcare = 10.93
  const userAleMillion = userAle / 1_000_000;

  return (
    <div className="animate-fade-up">
      <div
        className="text-[11px] tracking-[0.15em] uppercase mb-4"
        style={{ fontFamily: 'var(--font-geist-mono)', color: '#8899bb' }}
      >
        INDUSTRY PEER TOWER
      </div>

      <div className="flex flex-col gap-2">
        {rows.map(({ key, cost }) => {
          const barPct = scaleBar(cost, maxCost);
          const isUser = isUserIndustry(key, userIndustry);
          const Icon = ICONS[key];

          return (
            <div
              key={key}
              className="relative flex items-center gap-2 px-2 py-1 rounded"
              style={{
                background: isUser ? 'rgba(0,180,255,0.06)' : 'transparent',
                borderLeft: isUser ? '2px solid #00d4ff' : '2px solid transparent',
              }}
            >
              {/* Icon */}
              <Icon
                size={12}
                style={{ color: isUser ? '#00d4ff' : '#4a6080', flexShrink: 0 }}
              />

              {/* Label */}
              <span
                className="text-[11px] w-28 shrink-0 truncate"
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  color: isUser ? '#00d4ff' : '#4a6080',
                }}
              >
                {key.replace(/_/g, ' ')}
              </span>

              {/* Bar track */}
              <div
                className="relative flex-1 h-3 rounded overflow-hidden"
                style={{ background: 'rgba(0,20,50,0.6)' }}
              >
                {/* Industry bar */}
                <div
                  className="absolute top-0 left-0 h-full rounded"
                  style={{
                    width: `${barPct}%`,
                    background: isUser
                      ? 'rgba(0,180,255,0.25)'
                      : 'rgba(74,96,128,0.3)',
                  }}
                />

                {/* User ALE overlay line */}
                {(() => {
                  const alePct = scaleBar(userAleMillion, maxCost);
                  if (alePct <= 0 || alePct > 100) return null;
                  return (
                    <div
                      className="absolute top-0 h-full w-px"
                      style={{
                        left: `${alePct}%`,
                        background: '#00d4ff',
                        opacity: 0.6,
                      }}
                    />
                  );
                })()}
              </div>

              {/* Value */}
              <span
                className="text-[11px] w-16 text-right shrink-0"
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  color: isUser ? '#00d4ff' : '#4a6080',
                }}
              >
                {fmtM(cost)}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="mt-3 text-[10px]"
        style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
      >
        Source: IBM Cost of a Data Breach 2025. Cyan line = your estimated ALE.
      </div>
    </div>
  );
}
