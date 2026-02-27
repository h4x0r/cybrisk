/**
 * DBIR 2025 — nation-state and criminal threat actor attribution data.
 * Source: Verizon Data Breach Investigations Report 2025.
 *
 * Coordinates are [longitude, latitude] for react-simple-maps.
 */

export interface ThreatActor {
  nation: string;
  iso3: string;
  coordinates: [number, number]; // [lng, lat]
  attributionPct: number;        // DBIR 2025 %
  type: 'state' | 'criminal' | 'insider';
}

export const THREAT_ACTORS: ThreatActor[] = [
  { nation: 'Russia',        iso3: 'RUS', coordinates: [90,   60], attributionPct: 25, type: 'state'    },
  { nation: 'China',         iso3: 'CHN', coordinates: [105,  35], attributionPct: 18, type: 'state'    },
  { nation: 'North Korea',   iso3: 'PRK', coordinates: [127,  40], attributionPct: 10, type: 'state'    },
  { nation: 'Iran',          iso3: 'IRN', coordinates: [53,   32], attributionPct:  7, type: 'state'    },
  { nation: 'Romania',       iso3: 'ROU', coordinates: [25,   46], attributionPct:  5, type: 'criminal' },
  { nation: 'Nigeria',       iso3: 'NGA', coordinates: [8,     9], attributionPct:  4, type: 'criminal' },
  { nation: 'Brazil',        iso3: 'BRA', coordinates: [-47, -15], attributionPct:  3, type: 'criminal' },
  { nation: 'USA (insider)', iso3: 'USA', coordinates: [-98,  40], attributionPct:  3, type: 'insider'  },
];

/**
 * Target coordinates for the user's selected geography.
 * Represents a central point for arc destination rendering.
 */
export const GEO_COORDINATES: Record<string, [number, number]> = {
  us:    [-98,  40],
  uk:    [ -3,  55],
  eu:    [ 10,  51],
  hk:    [114,  22],
  sg:    [104,   1],
  other: [  0,  20],
};
