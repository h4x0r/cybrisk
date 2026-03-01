import type { AssessmentInputs, SimulationResults } from '@/lib/types';

/** Escape a CSV cell value: wrap in quotes if it contains a comma, quote, or newline. */
function cell(value: string | number | undefined): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Generate a CSV string from assessment inputs and simulation results.
 * Returns a UTF-8 string suitable for download as a .csv file.
 */
export function generateCSV(
  inputs: AssessmentInputs,
  results: SimulationResults,
): string {
  const rows: [string, string | number][] = [
    ['Metric', 'Value'],
  ];

  if (inputs.company.organizationName) {
    rows.push(['Organization', inputs.company.organizationName]);
  }

  rows.push(
    ['Industry', inputs.company.industry],
    ['Geography', inputs.company.geography],
    ['Revenue Band', inputs.company.revenueBand],
    ['Employees', inputs.company.employees],
    ['Cloud %', inputs.data.cloudPercentage],
    ['Record Count', inputs.data.recordCount],
    ['Data Types', inputs.data.dataTypes.join('; ')],
    ['ALE Mean', results.ale.mean],
    ['ALE Median', results.ale.median],
    ['ALE P10', results.ale.p10],
    ['ALE P90', results.ale.p90],
    ['ALE P95 (PML)', results.ale.p95],
    ['Gordon-Loeb Optimal Spend', results.gordonLoebSpend],
    ['Risk Rating', results.riskRating],
    ['Industry Benchmark Rank', results.industryBenchmark.percentileRank],
    ['Industry Median ALE', results.industryBenchmark.industryMedian],
  );

  return rows.map(([k, v]) => `${cell(k)},${cell(v)}`).join('\n');
}
