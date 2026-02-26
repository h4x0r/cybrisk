/**
 * Scenario Comparison — runs two FAIR simulations and returns structured delta metrics.
 *
 * Uses the same simulate() engine with a shared RNG so results are deterministic
 * when a seeded RNG is provided (useful for testing and shareable comparisons).
 */

import { simulate } from '@/lib/monte-carlo';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';

type RNG = () => number;

export interface ScenarioComparison {
  base: SimulationResults;
  modified: SimulationResults;
  /** delta = modified - base  (negative = improvement) */
  delta: {
    aleMean: number;
    alePml95: number;
    gordonLoeb: number;
    riskRatingChanged: boolean;
  };
  /** savings = base - modified  (positive = improvement) */
  savings: {
    aleMean: number;
    alePml95: number;
    gordonLoeb: number;
  };
}

export function compareScenarios(
  base: AssessmentInputs,
  modified: AssessmentInputs,
  iterations: number = 100_000,
  rng: RNG = Math.random,
): ScenarioComparison {
  const baseResults = simulate(base, iterations, rng);
  const modifiedResults = simulate(modified, iterations, rng);

  const aleMeanDelta = modifiedResults.ale.mean - baseResults.ale.mean;
  const alePml95Delta = modifiedResults.ale.p95 - baseResults.ale.p95;
  const gordonLoebDelta = modifiedResults.gordonLoebSpend - baseResults.gordonLoebSpend;

  return {
    base: baseResults,
    modified: modifiedResults,
    delta: {
      aleMean: aleMeanDelta,
      alePml95: alePml95Delta,
      gordonLoeb: gordonLoebDelta,
      riskRatingChanged: baseResults.riskRating !== modifiedResults.riskRating,
    },
    savings: {
      aleMean: -aleMeanDelta,
      alePml95: -alePml95Delta,
      gordonLoeb: -gordonLoebDelta,
    },
  };
}
