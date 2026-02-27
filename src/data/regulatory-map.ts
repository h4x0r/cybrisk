/**
 * Regulatory intensity scores and framework definitions by geography.
 *
 * COUNTRY_INTENSITY: ISO 3166-1 alpha-3 → regulatory intensity 0–100
 * Sources: GDPR, UK GDPR, HIPAA, CCPA, PDPA 2021, APPI 2022, LGPD, PIPA, PDPO, PIPL, DPDP Act 2023
 */

// ISO 3166-1 alpha-3 → regulatory intensity 0–100
export const COUNTRY_INTENSITY: Record<string, number> = {
  // EU member states (GDPR + NIS2) → 92
  DEU: 92, FRA: 92, NLD: 92, BEL: 92, ITA: 92, ESP: 92,
  POL: 92, ROU: 92, NOR: 92, SWE: 92, DNK: 92, FIN: 92,
  AUT: 92, CHE: 92, PRT: 92, GRC: 92, HUN: 92, CZE: 92,
  SVK: 92, BGR: 92, HRV: 92, SVN: 92, EST: 92, LVA: 92,
  LTU: 92, LUX: 92, MLT: 92, CYP: 92, IRL: 92,
  // Other major jurisdictions
  GBR: 85, // UK GDPR
  USA: 78, // HIPAA + CCPA + state patchwork
  CAN: 72, // PIPEDA + provincial
  AUS: 70, // Privacy Act + NDB scheme
  SGP: 68, // PDPA 2021 (turnover cap)
  JPN: 65, // APPI 2022 revision
  BRA: 62, // LGPD
  KOR: 60, // PIPA
  CHN: 55, // PIPL 2021 (state-controlled)
  HKG: 48, // PDPO (reform pending)
  IND: 45, // DPDP Act 2023 (partial commencement)
  ZAF: 55, // POPIA
  MEX: 50, // LFPDPPP
  ARG: 48, // PDPA
  COL: 45, // Law 1581
  // Default for uncoded countries: 20 (applied at render time)
};

export interface GeoFramework {
  code: string;
  name: string;
  maxFine: string;
  notes?: string;
}

export const GEO_FRAMEWORKS: Record<string, GeoFramework[]> = {
  eu: [
    {
      code: 'GDPR',
      name: 'General Data Protection Regulation',
      maxFine: '€20M or 4% global revenue',
    },
    {
      code: 'NIS2',
      name: 'Network & Information Security Directive 2',
      maxFine: '€10M or 2% global revenue',
    },
  ],
  uk: [
    {
      code: 'UK GDPR',
      name: 'UK General Data Protection Regulation',
      maxFine: '£17.5M or 4% global revenue',
    },
    {
      code: 'DPA 2018',
      name: 'Data Protection Act 2018',
      maxFine: 'Same as UK GDPR',
    },
  ],
  us: [
    {
      code: 'HIPAA',
      name: 'Health Insurance Portability & Accountability Act',
      maxFine: '$1.9M per violation category/year',
    },
    {
      code: 'CCPA/CPRA',
      name: 'California Consumer Privacy Act',
      maxFine: '$7,500 per intentional violation',
    },
    {
      code: 'FTC Act §5',
      name: 'Federal Trade Commission Act',
      maxFine: '$51,744 per violation per day',
    },
  ],
  sg: [
    {
      code: 'PDPA',
      name: 'Personal Data Protection Act 2021',
      maxFine: 'SGD 1M or 10% annual turnover',
    },
  ],
  hk: [
    {
      code: 'PDPO',
      name: 'Personal Data (Privacy) Ordinance',
      maxFine: 'HKD 1M + 5 years imprisonment (reform pending)',
    },
  ],
  other: [
    {
      code: 'Varies',
      name: 'Jurisdiction-specific regulations apply',
      maxFine: 'Subject to local law',
    },
  ],
};
