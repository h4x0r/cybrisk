/**
 * CybRisk — FAIR Monte Carlo Simulation Engine
 *
 * Implements the Open FAIR (Factor Analysis of Information Risk) model
 * using Monte Carlo simulation with PERT, log-normal, and beta distributions.
 *
 * All sampling functions accept an optional RNG parameter for testability
 * (defaults to Math.random).
 */

import type {
  AssessmentInputs,
  SimulationResults,
  DistributionBucket,
  ExceedancePoint,
  KeyDriver,
  RiskRating,
  DataType,
} from '@/lib/types';

import {
  PER_RECORD_COST,
  INDUSTRY_AVG_COST,
  COST_MODIFIERS,
  REGULATORY_EXPOSURE,
  TEF_BY_INDUSTRY,
  BASE_VULNERABILITY,
  REVENUE_MIDPOINTS,
  EMPLOYEE_MULTIPLIERS,
} from '@/lib/lookup-tables';

import { optimalSpend } from '@/lib/gordon-loeb';

// ---------------------------------------------------------------------------
// Type: Random Number Generator
// ---------------------------------------------------------------------------
type RNG = () => number; // Returns [0, 1)

// ---------------------------------------------------------------------------
// 1. Box-Muller Transform — generate standard normal samples
// ---------------------------------------------------------------------------
export function boxMuller(rng: RNG = Math.random): number {
  let u1 = rng();
  let u2 = rng();

  // Avoid log(0) — resample if we get exactly 0
  while (u1 === 0) u1 = rng();
  while (u2 === 0) u2 = rng();

  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// ---------------------------------------------------------------------------
// 2. Log-Normal Sampling
// ---------------------------------------------------------------------------
export function sampleLogNormal(
  mu: number,
  sigma: number,
  rng: RNG = Math.random,
): number {
  const z = boxMuller(rng);
  return Math.exp(mu + sigma * z);
}

// ---------------------------------------------------------------------------
// 3. Beta Distribution Sampling (Joehnk's method)
// ---------------------------------------------------------------------------
export function sampleBeta(
  alpha: number,
  beta: number,
  rng: RNG = Math.random,
): number {
  // For alpha >= 1 and beta >= 1, use the standard gamma-based approach
  // For general case, use Joehnk's method for small alpha/beta
  // We implement a gamma-based approach that works for all positive params
  const ga = sampleGamma(alpha, rng);
  const gb = sampleGamma(beta, rng);
  return ga / (ga + gb);
}

/**
 * Sample from a Gamma distribution using Marsaglia and Tsang's method.
 * For shape >= 1, use direct method. For shape < 1, use Ahrens-Dieter boost.
 */
function sampleGamma(shape: number, rng: RNG): number {
  if (shape < 1) {
    // Boost: Gamma(shape) = Gamma(shape+1) * U^(1/shape)
    const u = rng() || 1e-10; // avoid 0
    return sampleGamma(shape + 1, rng) * Math.pow(u, 1 / shape);
  }

  // Marsaglia and Tsang's method for shape >= 1
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  for (;;) {
    let x: number;
    let v: number;

    do {
      x = boxMuller(rng);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = rng() || 1e-10;

    // Squeeze test
    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

// ---------------------------------------------------------------------------
// 4. PERT Distribution Sampling via Beta
// ---------------------------------------------------------------------------
export function samplePERT(
  min: number,
  mode: number,
  max: number,
  rng: RNG = Math.random,
): number {
  if (max === min) return min;

  const lambda = 4; // Standard PERT shape parameter
  const mu = (min + lambda * mode + max) / (lambda + 2);
  const alpha = ((mu - min) * (2 * mode - min - max)) / ((mode - mu) * (max - min));

  // Guard against degenerate cases
  if (alpha <= 0 || !isFinite(alpha)) {
    return min + (max - min) * rng();
  }

  const beta_param = (alpha * (max - mu)) / (mu - min);

  if (beta_param <= 0 || !isFinite(beta_param)) {
    return min + (max - min) * rng();
  }

  const x = sampleBeta(alpha, beta_param, rng);
  return min + (max - min) * x;
}

// ---------------------------------------------------------------------------
// 5. Sample Threat Event Frequency
// ---------------------------------------------------------------------------
export function sampleTEF(
  inputs: AssessmentInputs,
  rng: RNG = Math.random,
): number {
  const tef = TEF_BY_INDUSTRY[inputs.company.industry];
  const baseTEF = samplePERT(tef.min, tef.mode, tef.max, rng);
  const multiplier = EMPLOYEE_MULTIPLIERS[inputs.company.employees];
  return baseTEF * multiplier;
}

// ---------------------------------------------------------------------------
// 6. Sample Vulnerability — base rate adjusted by security controls
// ---------------------------------------------------------------------------
export function sampleVulnerability(
  inputs: AssessmentInputs,
  rng: RNG = Math.random,
): number {
  let adjusted = BASE_VULNERABILITY;

  // Apply security control modifiers
  if (inputs.controls.irPlan) {
    adjusted *= 1 + COST_MODIFIERS.ir_plan; // 1 - 0.23 = 0.77
  }
  if (inputs.controls.aiAutomation) {
    adjusted *= 1 + COST_MODIFIERS.ai_automation; // 1 - 0.30 = 0.70
  }
  if (inputs.controls.securityTeam) {
    adjusted *= 1 + COST_MODIFIERS.security_team; // 1 - 0.20 = 0.80
  }
  if (inputs.controls.mfa) {
    adjusted *= 1 + COST_MODIFIERS.mfa; // 1 - 0.15 = 0.85
  }
  if (inputs.controls.pentest) {
    adjusted *= 1 + COST_MODIFIERS.pentest; // 1 - 0.10 = 0.90
  }

  // Clamp to [0.01, 0.99]
  adjusted = Math.max(0.01, Math.min(0.99, adjusted));

  // Sample from PERT around the adjusted rate
  const pertMin = adjusted * 0.5;
  const pertMax = Math.min(adjusted * 2, 0.99);
  return samplePERT(pertMin, adjusted, pertMax, rng);
}

// ---------------------------------------------------------------------------
// 7. Sample Primary Loss — per-record costs x sampled records
// ---------------------------------------------------------------------------
export function samplePrimaryLoss(
  inputs: AssessmentInputs,
  rng: RNG = Math.random,
): number {
  const { dataTypes, recordCount } = inputs.data;

  // Weighted average of per-record costs for selected data types
  if (dataTypes.length === 0) {
    return 0;
  }

  const avgCost =
    dataTypes.reduce(
      (sum, dt) => sum + PER_RECORD_COST[dt as DataType],
      0,
    ) / dataTypes.length;

  // Sample records compromised: logNormal with mu=ln(recordCount*0.1), sigma=1.0
  const muRecords = Math.log(recordCount * 0.1);
  let sampledRecords = sampleLogNormal(muRecords, 1.0, rng);

  // Cap at recordCount
  sampledRecords = Math.min(sampledRecords, recordCount);

  // Primary loss = per_record_cost x sampled_records
  let primaryLoss = avgCost * sampledRecords;

  // Cap at 10% of revenue
  const revenue = REVENUE_MIDPOINTS[inputs.company.revenueBand];
  primaryLoss = Math.min(primaryLoss, revenue * 0.1);

  return primaryLoss;
}

// ---------------------------------------------------------------------------
// 8. Sample Secondary Loss — regulatory + litigation + reputation + notification
// ---------------------------------------------------------------------------
export function sampleSecondaryLoss(
  inputs: AssessmentInputs,
  primaryLoss: number,
  rng: RNG = Math.random,
): number {
  const revenue = REVENUE_MIDPOINTS[inputs.company.revenueBand];

  // Regulatory: REGULATORY_EXPOSURE[geography].maxPctRevenue x revenue x PERT(0.01, 0.1, 0.5)
  const regExposure = REGULATORY_EXPOSURE[inputs.company.geography];
  const regulatory =
    regExposure.maxPctRevenue * revenue * samplePERT(0.01, 0.1, 0.5, rng);

  // Litigation: primaryLoss x PERT(0.15, 0.22, 0.30)
  const litigation = primaryLoss * samplePERT(0.15, 0.22, 0.3, rng);

  // Reputation: primaryLoss x PERT(0.20, 0.30, 0.40)
  const reputation = primaryLoss * samplePERT(0.2, 0.3, 0.4, rng);

  // Notification: inputs.data.recordCount x PERT(2, 3.5, 5) (per-record notification cost)
  const notification =
    inputs.data.recordCount * samplePERT(2, 3.5, 5, rng);

  let totalSecondary = regulatory + litigation + reputation + notification;

  // If cyber insurance: cap secondary at 50% of total secondary
  if (inputs.controls.cyberInsurance) {
    totalSecondary *= 0.5;
  }

  return totalSecondary;
}

// ---------------------------------------------------------------------------
// 9. Risk Rating from ALE relative to revenue
// ---------------------------------------------------------------------------
export function computeRiskRating(ale: number, revenue: number): RiskRating {
  const pct = ale / revenue;

  if (pct < 0.01) return 'LOW';
  if (pct < 0.03) return 'MODERATE';
  if (pct < 0.07) return 'HIGH';
  return 'CRITICAL';
}

// ---------------------------------------------------------------------------
// 10. Build histogram buckets from sorted losses
// ---------------------------------------------------------------------------
export function buildDistributionBuckets(
  losses: number[],
): DistributionBucket[] {
  if (losses.length === 0) return [];

  const sorted = [...losses].sort((a, b) => a - b);
  const minLoss = sorted[0];
  const maxLoss = sorted[sorted.length - 1];

  const numBuckets = 10;
  const bucketWidth = (maxLoss - minLoss) / numBuckets;

  if (bucketWidth === 0) {
    // All losses are the same
    return [
      {
        rangeLabel: formatCurrency(minLoss),
        minValue: minLoss,
        maxValue: maxLoss,
        probability: 1.0,
      },
    ];
  }

  const buckets: DistributionBucket[] = [];

  for (let i = 0; i < numBuckets; i++) {
    const bucketMin = minLoss + i * bucketWidth;
    const bucketMax = minLoss + (i + 1) * bucketWidth;
    const count = sorted.filter(
      (l) => l >= bucketMin && (i === numBuckets - 1 ? l <= bucketMax : l < bucketMax),
    ).length;

    buckets.push({
      rangeLabel: `${formatCurrency(bucketMin)}-${formatCurrency(bucketMax)}`,
      minValue: bucketMin,
      maxValue: bucketMax,
      probability: count / sorted.length,
    });
  }

  return buckets;
}

/**
 * Format a number as a compact currency string for bucket labels.
 */
function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// 11. Build exceedance curve
// ---------------------------------------------------------------------------
export function buildExceedanceCurve(
  losses: number[],
): ExceedancePoint[] {
  if (losses.length === 0) return [];

  const sorted = [...losses].sort((a, b) => a - b);
  const minLoss = sorted[0];
  const maxLoss = sorted[sorted.length - 1];
  const numPoints = 50;
  const points: ExceedancePoint[] = [];

  for (let i = 0; i < numPoints; i++) {
    const threshold = minLoss + (i / (numPoints - 1)) * (maxLoss - minLoss);
    const exceedCount = sorted.filter((l) => l > threshold).length;

    points.push({
      loss: threshold,
      probability: exceedCount / sorted.length,
    });
  }

  return points;
}

// ---------------------------------------------------------------------------
// 12. Identify key risk drivers
// ---------------------------------------------------------------------------
export function identifyKeyDrivers(inputs: AssessmentInputs): KeyDriver[] {
  const drivers: KeyDriver[] = [];

  // Industry risk
  const industryCost = INDUSTRY_AVG_COST[inputs.company.industry];
  if (industryCost > 6) {
    drivers.push({
      factor: 'Industry Risk',
      impact: 'HIGH',
      description: `${capitalize(inputs.company.industry)} sector has an average breach cost of $${industryCost.toFixed(1)}M — among the highest across industries.`,
    });
  } else if (industryCost > 4) {
    drivers.push({
      factor: 'Industry Risk',
      impact: 'MEDIUM',
      description: `${capitalize(inputs.company.industry)} sector has an above-average breach cost of $${industryCost.toFixed(1)}M.`,
    });
  } else {
    drivers.push({
      factor: 'Industry Risk',
      impact: 'LOW',
      description: `${capitalize(inputs.company.industry)} sector has a below-average breach cost of $${industryCost.toFixed(1)}M.`,
    });
  }

  // Record count
  if (inputs.data.recordCount > 1_000_000) {
    drivers.push({
      factor: 'Data Volume',
      impact: 'HIGH',
      description: `${(inputs.data.recordCount / 1_000_000).toFixed(1)}M records at risk significantly increases potential loss magnitude.`,
    });
  } else if (inputs.data.recordCount > 100_000) {
    drivers.push({
      factor: 'Data Volume',
      impact: 'MEDIUM',
      description: `${(inputs.data.recordCount / 1_000).toFixed(0)}K records at risk contributes to moderate loss potential.`,
    });
  }

  // Sensitive data types
  const sensitiveTypes: DataType[] = ['health_records', 'payment_card', 'financial'];
  const hasSensitive = inputs.data.dataTypes.some((dt) =>
    sensitiveTypes.includes(dt as DataType),
  );
  if (hasSensitive) {
    drivers.push({
      factor: 'Data Sensitivity',
      impact: 'HIGH',
      description: 'Regulated data types (health, payment, financial) increase per-record breach costs and regulatory exposure.',
    });
  }

  // Missing controls
  const missingControls: string[] = [];
  if (!inputs.controls.irPlan) missingControls.push('incident response plan');
  if (!inputs.controls.aiAutomation) missingControls.push('AI/automation');
  if (!inputs.controls.securityTeam) missingControls.push('dedicated security team');
  if (!inputs.controls.mfa) missingControls.push('MFA');
  if (!inputs.controls.pentest) missingControls.push('penetration testing');

  if (missingControls.length >= 3) {
    drivers.push({
      factor: 'Security Controls Gap',
      impact: 'HIGH',
      description: `Missing key controls: ${missingControls.join(', ')}. This significantly increases vulnerability.`,
    });
  } else if (missingControls.length >= 1) {
    drivers.push({
      factor: 'Security Controls Gap',
      impact: 'MEDIUM',
      description: `Missing controls: ${missingControls.join(', ')}. Addressing these would reduce exposure.`,
    });
  }

  // Regulatory geography
  const regExposure = REGULATORY_EXPOSURE[inputs.company.geography];
  if (regExposure.maxPctRevenue >= 0.04) {
    drivers.push({
      factor: 'Regulatory Exposure',
      impact: 'HIGH',
      description: `${regExposure.framework} carries fines up to ${(regExposure.maxPctRevenue * 100).toFixed(0)}% of revenue.`,
    });
  }

  // Employee count / attack surface
  const empMultiplier = EMPLOYEE_MULTIPLIERS[inputs.company.employees];
  if (empMultiplier >= 1.6) {
    drivers.push({
      factor: 'Attack Surface',
      impact: 'HIGH',
      description: `Large employee count (${inputs.company.employees.replace('_', '-')}) expands the attack surface with a ${empMultiplier}x threat frequency multiplier.`,
    });
  }

  // Threat concerns
  if (inputs.threats.topConcerns.includes('ransomware')) {
    drivers.push({
      factor: 'Ransomware Risk',
      impact: 'HIGH',
      description: 'Ransomware is the top concern and accounts for 39% of confirmed breaches (DBIR 2025).',
    });
  }

  // Previous incidents
  if (
    inputs.threats.previousIncidents === '2_5' ||
    inputs.threats.previousIncidents === '5_plus'
  ) {
    drivers.push({
      factor: 'Incident History',
      impact: 'HIGH',
      description: 'Prior incidents indicate elevated risk — organisations with breach history are statistically more likely to be breached again.',
    });
  }

  return drivers;
}

// ---------------------------------------------------------------------------
// 13. Generate recommendations
// ---------------------------------------------------------------------------
export function generateRecommendations(
  inputs: AssessmentInputs,
  ale: number,
  gordonLoeb: number,
): string[] {
  const recs: string[] = [];

  if (!inputs.controls.irPlan) {
    recs.push(
      `Implement a formal Incident Response plan — IBM data shows this reduces breach costs by ~23% ($${formatCurrency(ale * 0.23)} potential savings).`,
    );
  }

  if (!inputs.controls.aiAutomation) {
    recs.push(
      `Deploy AI-powered security automation — organisations using AI/ML detect breaches 30% faster and save ~$1.88M on average.`,
    );
  }

  if (!inputs.controls.securityTeam) {
    recs.push(
      `Establish a dedicated security team or vCISO — this reduces breach probability by ~20% and signals governance maturity to regulators.`,
    );
  }

  if (!inputs.controls.mfa) {
    recs.push(
      `Enable MFA on all critical systems — phishing and credential theft account for 25%+ of breaches (DBIR 2025). MFA reduces this vector by ~15%.`,
    );
  }

  if (!inputs.controls.pentest) {
    recs.push(
      `Conduct regular penetration testing — proactive vulnerability discovery reduces exploit probability by ~10%.`,
    );
  }

  if (!inputs.controls.cyberInsurance) {
    recs.push(
      `Consider cyber insurance — your estimated ALE of ${formatCurrency(ale)} suggests coverage would provide meaningful risk transfer, capping secondary losses.`,
    );
  }

  // Gordon-Loeb spend recommendation
  recs.push(
    `Optimal security investment: ${formatCurrency(gordonLoeb)}/year (Gordon-Loeb model). Spending beyond this point yields diminishing returns.`,
  );

  // Data-specific recommendations
  if (inputs.data.dataTypes.includes('payment_card')) {
    recs.push(
      'Ensure PCI DSS compliance for payment card data — tokenisation and network segmentation are critical controls.',
    );
  }

  if (inputs.data.dataTypes.includes('health_records')) {
    recs.push(
      'Health records carry the highest per-record cost ($200+). Prioritise encryption at rest and in transit, and conduct regular HIPAA risk assessments.',
    );
  }

  if (inputs.data.recordCount > 1_000_000) {
    recs.push(
      `With ${(inputs.data.recordCount / 1_000_000).toFixed(1)}M records, data minimisation should be a priority — reduce what you store to reduce what can be breached.`,
    );
  }

  return recs;
}

// ---------------------------------------------------------------------------
// 14. Main simulation entry point
// ---------------------------------------------------------------------------
export function simulate(
  inputs: AssessmentInputs,
  iterations: number = 10_000,
  rng: RNG = Math.random,
): SimulationResults {
  const losses: number[] = [];
  let vulnSum = 0;

  for (let i = 0; i < iterations; i++) {
    const tef = sampleTEF(inputs, rng);
    const vuln = sampleVulnerability(inputs, rng);
    const lef = tef * vuln; // Loss Event Frequency

    const pl = samplePrimaryLoss(inputs, rng);
    const sl = sampleSecondaryLoss(inputs, pl, rng);

    const annualLoss = lef * (pl + sl);
    losses.push(annualLoss);
    vulnSum += vuln;
  }

  // Sort losses for percentile calculations
  losses.sort((a, b) => a - b);

  // Compute statistics
  const mean = losses.reduce((a, b) => a + b, 0) / losses.length;
  const median = percentile(losses, 0.5);
  const p10 = percentile(losses, 0.1);
  const p90 = percentile(losses, 0.9);
  const p95 = percentile(losses, 0.95);
  const avgVuln = vulnSum / iterations;

  // Revenue for downstream calculations
  const revenue = REVENUE_MIDPOINTS[inputs.company.revenueBand];

  // Gordon-Loeb optimal spend
  const gordonLoebSpend = optimalSpend(avgVuln, mean, revenue);

  // Risk rating
  const riskRating = computeRiskRating(mean, revenue);

  // Industry benchmark
  const industryMedianCost =
    INDUSTRY_AVG_COST[inputs.company.industry] * 1_000_000; // Convert from millions
  const percentileRank = computePercentileRank(mean, industryMedianCost);

  // Distribution buckets and exceedance curve
  const distributionBuckets = buildDistributionBuckets(losses);
  const exceedanceCurve = buildExceedanceCurve(losses);

  // Key drivers and recommendations
  const keyDrivers = identifyKeyDrivers(inputs);
  const recommendations = generateRecommendations(
    inputs,
    mean,
    gordonLoebSpend,
  );

  return {
    ale: {
      mean,
      median,
      p10,
      p90,
      p95,
    },
    gordonLoebSpend,
    riskRating,
    industryBenchmark: {
      yourAle: mean,
      industryMedian: industryMedianCost,
      percentileRank,
    },
    distributionBuckets,
    exceedanceCurve,
    keyDrivers,
    recommendations,
    rawLosses: losses,
  };
}

// ---------------------------------------------------------------------------
// Utility: compute percentile from sorted array
// ---------------------------------------------------------------------------
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = p * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const fraction = idx - lower;
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

// ---------------------------------------------------------------------------
// Utility: compute where a value falls relative to industry median (0-100 scale)
// ---------------------------------------------------------------------------
function computePercentileRank(
  ale: number,
  industryMedian: number,
): number {
  // Simple heuristic: if ALE equals industry median, rank = 50
  // Scale linearly: ALE = 0 → rank 0, ALE = 2x median → rank 100
  if (industryMedian === 0) return 50;
  const ratio = ale / industryMedian;
  const rank = Math.min(100, Math.max(0, ratio * 50));
  return Math.round(rank);
}

// ---------------------------------------------------------------------------
// Utility: capitalize first letter
// ---------------------------------------------------------------------------
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
