'use client';
import React from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
} from 'react-simple-maps';
import type { Geography as GeographyType } from '@/lib/types';
import { THREAT_ACTORS, GEO_COORDINATES } from '@/data/threat-actors';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const TYPE_COLORS: Record<string, string> = {
  state:    '#ef4444',
  criminal: '#fbbf24',
  insider:  '#06b6d4',
};

function arcStrokeWidth(pct: number): number {
  // Map attributionPct range [3,25] to stroke [0.5,3]
  return Math.min(3, Math.max(0.5, (pct / 25) * 3));
}

interface ThreatOriginMapProps {
  userGeography: GeographyType;
}

export default function ThreatOriginMap({ userGeography }: ThreatOriginMapProps) {
  const target = GEO_COORDINATES[userGeography] ?? GEO_COORDINATES['other'];

  return (
    <div className="animate-fade-up">
      <div
        className="text-[11px] tracking-[0.15em] uppercase mb-4"
        style={{ fontFamily: 'var(--font-geist-mono)', color: '#8899bb' }}
      >
        THREAT ORIGIN MAP
      </div>

      <div className="relative w-full" style={{ background: 'rgba(4,8,28,0.6)', borderRadius: 8 }}>
        <ComposableMap
          projectionConfig={{ scale: 130 }}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="rgba(4,8,28,0.8)"
                  stroke="rgba(0,80,160,0.15)"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover:   { outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Threat arcs */}
          {THREAT_ACTORS.map((actor) => (
            <Line
              key={actor.iso3}
              from={actor.coordinates}
              to={target}
              stroke={TYPE_COLORS[actor.type]}
              strokeWidth={arcStrokeWidth(actor.attributionPct)}
              strokeLinecap="round"
              strokeOpacity={0.7}
            />
          ))}

          {/* Target: pulsing cyan dot */}
          <Marker coordinates={target}>
            <circle r={5} fill="#00d4ff" opacity={0.9} />
            <circle r={10} fill="none" stroke="#00d4ff" strokeWidth={1.5} opacity={0.4}>
              <animate
                attributeName="r"
                from="8"
                to="18"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                from="0.4"
                to="0"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </Marker>
        </ComposableMap>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-col gap-1.5">
        {(['state', 'criminal', 'insider'] as const).map((type) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-3 h-0.5 rounded"
              style={{ background: TYPE_COLORS[type] }}
            />
            <span
              className="text-[11px] capitalize"
              style={{ fontFamily: 'var(--font-geist-mono)', color: '#8899bb' }}
            >
              {type === 'state' ? 'State-Sponsored' : type === 'criminal' ? 'Criminal' : 'Insider'}
            </span>
          </div>
        ))}
        <span
          className="text-[10px] mt-1"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          Source: Verizon DBIR 2025
        </span>
      </div>
    </div>
  );
}
