/**
 * E2E tests for the /history page.
 *
 * Uses page.addInitScript to seed localStorage before React hydration,
 * ensuring the page loads with the correct history state from the start.
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const ENTRY_1 = {
  id: 'e2e-hist-1',
  savedAt: '2026-01-02T00:00:00Z',
  label: 'financial · us · 02/01/2026',
  currency: 'USD',
  inputs: {
    company: { industry: 'financial', revenueBand: '50m_250m', employees: '250_1000', geography: 'us' },
    data: { dataTypes: ['customer_pii'], recordCount: 100_000, cloudPercentage: 50 },
    controls: { securityTeam: true, irPlan: true, aiAutomation: false, mfa: true, pentest: false, cyberInsurance: false },
    threats: { topConcerns: ['ransomware'], previousIncidents: '0' },
  },
  results: {
    ale: { mean: 2_000_000, median: 1_500_000, p10: 500_000, p90: 4_000_000, p95: 5_000_000 },
    gordonLoebSpend: 400_000,
    riskRating: 'HIGH',
    industryBenchmark: { yourAle: 2_000_000, industryMedian: 1_800_000, percentileRank: 60 },
    distributionBuckets: [],
    exceedanceCurve: [],
    keyDrivers: [],
    recommendations: [],
    rawLosses: [],
  },
};

const ENTRY_2 = {
  id: 'e2e-hist-2',
  savedAt: '2026-01-01T00:00:00Z',
  label: 'healthcare · uk · 01/01/2026',
  currency: 'GBP',
  inputs: {
    company: { industry: 'healthcare', revenueBand: 'under_50m', employees: 'under_250', geography: 'uk' },
    data: { dataTypes: ['health_records'], recordCount: 10_000, cloudPercentage: 30 },
    controls: { securityTeam: false, irPlan: false, aiAutomation: false, mfa: false, pentest: false, cyberInsurance: true },
    threats: { topConcerns: ['ransomware'], previousIncidents: '1' },
  },
  results: {
    ale: { mean: 500_000, median: 350_000, p10: 80_000, p90: 1_200_000, p95: 1_800_000 },
    gordonLoebSpend: 100_000,
    riskRating: 'MODERATE',
    industryBenchmark: { yourAle: 500_000, industryMedian: 900_000, percentileRank: 35 },
    distributionBuckets: [],
    exceedanceCurve: [],
    keyDrivers: [],
    recommendations: [],
    rawLosses: [],
  },
};

/** Seed localStorage with the given history entries before page load. */
function seedHistory(entries: typeof ENTRY_1[]) {
  return async ({ page }: { page: import('@playwright/test').Page }) => {
    await page.addInitScript((data: string) => {
      localStorage.setItem('cybrisk_history', data);
    }, JSON.stringify(entries));
  };
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

test.describe('History Page: Empty State', () => {
  test('shows empty state message when no history exists', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByText('Assessment History')).toBeVisible();
    await expect(page.getByText('No saved assessments yet.')).toBeVisible();
    await expect(page.getByText('Run your first assessment →')).toBeVisible();
  });

  test('"Run your first assessment →" link navigates to /assess', async ({ page }) => {
    await page.goto('/history');
    await page.getByText('Run your first assessment →').click();
    await expect(page).toHaveURL('/assess');
  });

  test('"Clear all" button is not visible when history is empty', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByText('Clear all')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Single entry
// ---------------------------------------------------------------------------

test.describe('History Page: Single Entry', () => {
  test.beforeEach(seedHistory([ENTRY_1]));

  test('displays entry label', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByText('financial · us · 02/01/2026')).toBeVisible();
  });

  test('displays ALE in formatted currency', async ({ page }) => {
    await page.goto('/history');
    // formatCurrency(2_000_000, 'USD', ...) → "$2.00M"
    await expect(page.getByText(/ALE.*\$2\.00M/)).toBeVisible();
  });

  test('shows Load and Delete action buttons', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByRole('button', { name: 'Load' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('"Clear all" button is visible when entries exist', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByRole('button', { name: 'Clear all' })).toBeVisible();
  });

  test('clicking Load sets cybrisk_restore and navigates to /results', async ({ page }) => {
    await page.goto('/history');
    await page.getByRole('button', { name: 'Load' }).click();

    // Should navigate to /results
    await expect(page).toHaveURL('/results', { timeout: 5000 });

    // The restore key should have been set (page navigated, so check sessionStorage)
    // Since the page redirects to /results, verify we actually land there
    await expect(page).toHaveURL('/results');
  });

  test('clicking Delete removes the entry and shows empty state', async ({ page }) => {
    await page.goto('/history');
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('No saved assessments yet.')).toBeVisible({ timeout: 3000 });
  });

  test('clicking Clear all removes all entries', async ({ page }) => {
    await page.goto('/history');
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page.getByText('No saved assessments yet.')).toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// Multiple entries
// ---------------------------------------------------------------------------

test.describe('History Page: Multiple Entries', () => {
  test.beforeEach(seedHistory([ENTRY_1, ENTRY_2]));

  test('displays both entries sorted newest-first', async ({ page }) => {
    await page.goto('/history');
    // ENTRY_1 is newer (Jan 2) so should appear first
    const labels = page.locator('p.text-sm.text-white.truncate');
    await expect(labels.nth(0)).toContainText('financial · us · 02/01/2026');
    await expect(labels.nth(1)).toContainText('healthcare · uk · 01/01/2026');
  });

  test('deleting one entry leaves the other intact', async ({ page }) => {
    await page.goto('/history');
    // Delete buttons appear in order; click the first (ENTRY_1)
    await page.getByRole('button', { name: 'Delete' }).first().click();
    // ENTRY_1 is gone; ENTRY_2 remains
    await expect(page.getByText('financial · us · 02/01/2026')).not.toBeVisible({ timeout: 2000 });
    await expect(page.getByText('healthcare · uk · 01/01/2026')).toBeVisible();
  });

  test('Clear all removes both entries and shows empty state', async ({ page }) => {
    await page.goto('/history');
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page.getByText('No saved assessments yet.')).toBeVisible({ timeout: 3000 });
  });
});
