'use client';
import React from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import type { Geography as GeographyType } from '@/lib/types';
import { COUNTRY_INTENSITY, GEO_FRAMEWORKS } from '@/data/regulatory-map';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ISO 3166-1 alpha-3 codes that belong to each user geography
const GEO_ISO3: Record<GeographyType, string[]> = {
  eu:    ['DEU', 'FRA', 'NLD', 'BEL', 'ITA', 'ESP', 'POL', 'ROU', 'SWE', 'DNK',
          'FIN', 'AUT', 'PRT', 'GRC', 'HUN', 'CZE', 'SVK', 'BGR', 'HRV', 'SVN',
          'EST', 'LVA', 'LTU', 'LUX', 'MLT', 'CYP', 'IRL'],
  uk:    ['GBR'],
  us:    ['USA'],
  hk:    ['HKG'],
  sg:    ['SGP'],
  other: [],
};

/**
 * Interpolate intensity score (0–100) to a dark-red heat colour.
 * 0   → rgba(4,8,28)       (almost black)
 * 50  → rgba(120,40,10)    (dark red)
 * 92+ → rgba(239,68,68)    (bright red)
 */
function intensityToColor(score: number): string {
  if (score <= 0) return 'rgba(4,8,28,1)';
  if (score >= 92) return 'rgba(239,68,68,0.9)';
  if (score <= 50) {
    const t = score / 50;
    const r = Math.round(4 + t * (120 - 4));
    const g = Math.round(8 + t * (40 - 8));
    const b = Math.round(28 + t * (10 - 28));
    return `rgba(${r},${g},${b},0.85)`;
  }
  const t = (score - 50) / 42;
  const r = Math.round(120 + t * (239 - 120));
  const g = Math.round(40 + t * (68 - 40));
  const b = Math.round(10 + t * (68 - 10));
  return `rgba(${r},${g},${b},0.9)`;
}

interface RegulatoryMapProps {
  userGeography: GeographyType;
}

export default function RegulatoryMap({ userGeography }: RegulatoryMapProps) {
  const userIso3Set = new Set(GEO_ISO3[userGeography] ?? []);
  const frameworks = GEO_FRAMEWORKS[userGeography] ?? GEO_FRAMEWORKS['other'];

  return (
    <div className="animate-fade-up">
      <div
        className="text-[11px] tracking-[0.15em] uppercase mb-4"
        style={{ fontFamily: 'var(--font-geist-mono)', color: '#8899bb' }}
      >
        REGULATORY EXPOSURE MAP
      </div>

      <div
        className="relative w-full"
        style={{ background: 'rgba(4,8,28,0.6)', borderRadius: 8 }}
      >
        <ComposableMap
          projectionConfig={{ scale: 130 }}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const iso3 = (geo.properties?.['ISO_A3'] ?? geo.properties?.['iso_a3'] ?? '') as string;
                const score = COUNTRY_INTENSITY[iso3] ?? 20;
                const isUserGeo = userIso3Set.has(iso3);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={intensityToColor(score)}
                    stroke={isUserGeo ? '#00d4ff' : 'rgba(0,80,160,0.1)'}
                    strokeWidth={isUserGeo ? 2 : 0.5}
                    style={{
                      default: { outline: 'none' },
                      hover:   { outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {/* Callout panel — bottom-right overlay */}
        <div
          className="absolute bottom-3 right-3 p-3 rounded-lg text-[11px] max-w-xs"
          style={{
            background: 'rgba(4,8,28,0.92)',
            border: '1px solid rgba(0,180,255,0.2)',
            fontFamily: 'var(--font-geist-mono)',
          }}
        >
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: '#8899bb' }}>
            Your jurisdiction: {userGeography.toUpperCase()}
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[10px] pb-1" style={{ color: '#4a6080' }}>Framework</th>
                <th className="text-left text-[10px] pb-1" style={{ color: '#4a6080' }}>Max Fine</th>
              </tr>
            </thead>
            <tbody>
              {frameworks.map((fw) => (
                <tr key={fw.code}>
                  <td className="pr-3 py-0.5" style={{ color: '#00d4ff' }}>{fw.code}</td>
                  <td className="py-0.5" style={{ color: '#8899bb' }}>{fw.maxFine}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend: colour scale bar */}
      <div className="mt-3 flex items-center gap-3">
        <span
          className="text-[10px] shrink-0"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          Lower regulatory risk
        </span>
        <div
          className="flex-1 h-2 rounded"
          style={{
            background: 'linear-gradient(to right, rgba(4,8,28,1), rgba(120,40,10,0.85), rgba(239,68,68,0.9))',
          }}
        />
        <span
          className="text-[10px] shrink-0"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          Higher regulatory risk
        </span>
      </div>

      <div
        className="mt-2 text-[10px]"
        style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
      >
        Sources: GDPR, UK GDPR, HIPAA, CCPA, PDPA 2021, PDPO, APPI 2022, LGPD, PIPA, PIPL, DPDP Act 2023
      </div>
    </div>
  );
}
