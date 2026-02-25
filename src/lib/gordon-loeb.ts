/**
 * Gordon-Loeb Model — Optimal Security Investment Calculator
 *
 * Based on: Gordon, L.A. & Loeb, M.P. (2002) "The Economics of Information
 * Security Investment" — ACM Transactions on Information and System Security.
 *
 * Key insight: A firm's optimal security investment never exceeds (1/e) × v × L
 * where v = vulnerability probability [0,1] and L = expected annual loss (ALE).
 *
 * 1/e ≈ 0.3679 — we use 0.37 as the standard rounded coefficient.
 *
 * Practical cap: 5% of annual revenue (common board-level budget ceiling for
 * cyber security spend, per Deloitte/IANS benchmarks).
 */

/** The Gordon-Loeb coefficient: 1/e ≈ 0.3679, rounded to 0.37 */
const GL_COEFFICIENT = 0.37;

/** Practical upper bound: 5% of annual revenue */
const REVENUE_CAP_PCT = 0.05;

/**
 * Calculates the optimal cyber security investment using the Gordon-Loeb model.
 *
 * @param vulnerability - Probability that a threat exploits the vulnerability [0, 1]
 * @param ale           - Annualised Loss Expectancy in dollars (FAIR output)
 * @param revenue       - Organisation's annual revenue in dollars
 * @returns Optimal security spend in dollars: min(0.37 × v × ALE, 5% × revenue)
 */
export function optimalSpend(
  vulnerability: number,
  ale: number,
  revenue: number,
): number {
  const glSpend = GL_COEFFICIENT * vulnerability * ale;
  const revenueCap = REVENUE_CAP_PCT * revenue;
  return Math.min(glSpend, revenueCap);
}
