/**
 * CybRisk — Hardcoded Actuarial Lookup Tables
 *
 * Data sources:
 * - IBM Cost of a Data Breach Report 2025
 * - Verizon Data Breach Investigations Report (DBIR) 2025
 * - NetDiligence Cyber Claims Study 2025
 * - Regulatory frameworks (GDPR, UK GDPR, PDPO, PDPA, US state laws)
 * - Actuarial research (arXiv:2202.10189, NAAJ extreme breach losses)
 */

import type {
  Industry,
  DataType,
  RevenueBand,
  Geography,
  ThreatType,
  EmployeeCount,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// IBM Cost of a Data Breach 2025 — per-record cost by data type (USD)
// ---------------------------------------------------------------------------
export const PER_RECORD_COST: Record<DataType, number> = {
  customer_pii: 175,
  employee_pii: 189,
  ip: 178,
  payment_card: 172,
  health_records: 200,
  financial: 180,
};

// ---------------------------------------------------------------------------
// IBM 2025 — average total breach cost by industry (USD millions)
// ---------------------------------------------------------------------------
export const INDUSTRY_AVG_COST: Record<Industry, number> = {
  healthcare: 10.93,
  financial: 6.08,
  pharmaceuticals: 5.1,
  technology: 5.45,
  energy: 4.56,
  industrial: 5.56,
  services: 4.55,
  retail: 3.48,
  education: 3.5,
  entertainment: 3.46,
  communications: 3.44,
  consumer: 3.4,
  media: 3.39,
  research: 3.28,
  transportation: 4.3,
  hospitality: 3.22,
  public_sector: 2.6,
};

// ---------------------------------------------------------------------------
// Security control cost modifiers (multiplicative adjustments)
// Negative values reduce breach probability/cost; positive values increase it.
// ---------------------------------------------------------------------------
export const COST_MODIFIERS = {
  ir_plan: -0.23,
  ai_automation: -0.3,
  security_team: -0.2,
  mfa: -0.15,
  pentest: -0.1,
  shadow_ai: +0.15,
  multi_cloud: +0.1,
  no_ir_plan: +0.25,
} as const;

// ---------------------------------------------------------------------------
// DBIR 2025 — breach frequency by attack pattern
// Values represent proportion of confirmed breaches involving each pattern.
// ---------------------------------------------------------------------------
export const ATTACK_PATTERN_FREQ: Record<ThreatType, number> = {
  ransomware: 0.39,
  bec_phishing: 0.25,
  web_app_attack: 0.15,
  system_intrusion: 0.3,
  insider_threat: 0.1,
  third_party: 0.3,
  lost_stolen: 0.05,
};

// ---------------------------------------------------------------------------
// NetDiligence — average incident cost by revenue band (USD)
// ---------------------------------------------------------------------------
export const INCIDENT_COST_BY_REVENUE: Record<RevenueBand, number> = {
  under_50m: 246_000,
  '50m_250m': 850_000,
  '250m_1b': 2_500_000,
  '1b_5b': 5_000_000,
  over_5b: 10_300_000,
};

// ---------------------------------------------------------------------------
// NetDiligence — claim severity PERT parameters (USD)
// ---------------------------------------------------------------------------
export const CLAIM_SEVERITY = {
  min: 1_000,
  mode: 246_000,
  max: 500_000_000,
  p95: 20_180_000,
} as const;

// ---------------------------------------------------------------------------
// Regulatory fine exposure by geography
// ---------------------------------------------------------------------------
export const REGULATORY_EXPOSURE: Record<
  Geography,
  { maxPctRevenue: number; framework: string }
> = {
  eu: { maxPctRevenue: 0.04, framework: 'GDPR' },
  uk: { maxPctRevenue: 0.04, framework: 'UK GDPR' },
  us: { maxPctRevenue: 0.01, framework: 'State breach notification' },
  hk: { maxPctRevenue: 0.005, framework: 'PDPO' },
  sg: { maxPctRevenue: 0.01, framework: 'PDPA' },
  other: { maxPctRevenue: 0.01, framework: 'Various' },
};

// ---------------------------------------------------------------------------
// Threat Event Frequency by industry — PERT parameters (events/year)
// Calibrated from DBIR incident rates.
// ---------------------------------------------------------------------------
export const TEF_BY_INDUSTRY: Record<
  Industry,
  { min: number; mode: number; max: number }
> = {
  healthcare: { min: 0.1, mode: 0.5, max: 3.0 },
  financial: { min: 0.15, mode: 0.6, max: 4.0 },
  pharmaceuticals: { min: 0.05, mode: 0.3, max: 2.0 },
  technology: { min: 0.2, mode: 0.7, max: 5.0 },
  energy: { min: 0.1, mode: 0.4, max: 3.0 },
  industrial: { min: 0.1, mode: 0.4, max: 2.5 },
  services: { min: 0.1, mode: 0.35, max: 2.0 },
  retail: { min: 0.15, mode: 0.5, max: 3.5 },
  education: { min: 0.1, mode: 0.4, max: 2.5 },
  entertainment: { min: 0.05, mode: 0.3, max: 2.0 },
  communications: { min: 0.1, mode: 0.35, max: 2.0 },
  consumer: { min: 0.05, mode: 0.25, max: 1.5 },
  media: { min: 0.05, mode: 0.25, max: 1.5 },
  research: { min: 0.05, mode: 0.2, max: 1.5 },
  transportation: { min: 0.1, mode: 0.4, max: 2.5 },
  hospitality: { min: 0.1, mode: 0.35, max: 2.5 },
  public_sector: { min: 0.15, mode: 0.5, max: 3.0 },
};

// ---------------------------------------------------------------------------
// Base vulnerability rate (from DBIR: % of threat events that become breaches)
// ---------------------------------------------------------------------------
export const BASE_VULNERABILITY = 0.3;

// ---------------------------------------------------------------------------
// Revenue midpoints for Gordon-Loeb cap calculation (USD)
// ---------------------------------------------------------------------------
export const REVENUE_MIDPOINTS: Record<RevenueBand, number> = {
  under_50m: 25_000_000,
  '50m_250m': 150_000_000,
  '250m_1b': 625_000_000,
  '1b_5b': 3_000_000_000,
  over_5b: 10_000_000_000,
};

// ---------------------------------------------------------------------------
// Employee count attack surface multiplier
// ---------------------------------------------------------------------------
export const EMPLOYEE_MULTIPLIERS: Record<EmployeeCount, number> = {
  under_250: 0.7,
  '250_1000': 1.0,
  '1000_5000': 1.3,
  '5000_25000': 1.6,
  over_25000: 2.0,
};
