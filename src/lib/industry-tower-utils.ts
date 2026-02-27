/**
 * Pure utility functions for the IndustryTower component.
 * Kept separate so they can be unit-tested in a Node environment
 * without importing React or react-simple-maps.
 */

import { INDUSTRY_AVG_COST } from '@/lib/lookup-tables';
import type { Industry } from '@/lib/types';

export interface IndustryRow {
  key: Industry;
  cost: number; // IBM 2025 average breach cost in USD millions
}

/**
 * Returns all 17 industries sorted descending by IBM 2025 average breach cost.
 */
export function sortIndustries(): IndustryRow[] {
  return (Object.entries(INDUSTRY_AVG_COST) as [Industry, number][])
    .map(([key, cost]) => ({ key, cost }))
    .sort((a, b) => b.cost - a.cost);
}

/**
 * Scales an industry's breach cost to a bar width percentage [0, 100].
 * @param cost - The industry's average breach cost (USD millions)
 * @param maxCost - The maximum cost across all industries (used as 100% reference)
 */
export function scaleBar(cost: number, maxCost: number): number {
  if (maxCost === 0) return 0;
  return (cost / maxCost) * 100;
}

/**
 * Returns true if the given industry key matches the user's selected industry.
 */
export function isUserIndustry(industry: string, userIndustry: string): boolean {
  return industry === userIndustry;
}
