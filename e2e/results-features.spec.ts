/**
 * E2E tests for results-page features added in the enhanced plan:
 *   - CurrencySelector (switching currencies)
 *   - NarrativePanel (loading / error / streaming states)
 *   - EmailModal (open, close via backdrop, email input)
 *   - Share Results button (clipboard copy feedback)
 *   - "What If? →" link (navigates to /compare)
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const MOCK_RESULTS = {
  ale: { mean: 1_245_000, median: 890_000, p10: 120_000, p90: 3_400_000, p95: 5_200_000 },
  gordonLoebSpend: 462_500,
  riskRating: 'MODERATE',
  industryBenchmark: { yourAle: 1_245_000, industryMedian: 6_080_000, percentileRank: 20 },
  distributionBuckets: [
    { rangeLabel: '$0-$500K', minValue: 0, maxValue: 500_000, probability: 0.30 },
    { rangeLabel: '$500K-$1M', minValue: 500_000, maxValue: 1_000_000, probability: 0.25 },
  ],
  exceedanceCurve: [
    { loss: 0, probability: 1 },
    { loss: 1_000_000, probability: 0.5 },
    { loss: 5_000_000, probability: 0.05 },
  ],
  keyDrivers: [
    { factor: '500K Customer PII Records', impact: 'HIGH', description: 'Large dataset.' },
  ],
  recommendations: ['Deploy AI-powered security automation.'],
  rawLosses: [],
};

const MOCK_INPUTS = {
  company: {
    industry: 'financial',
    revenueBand: '50m_250m',
    employees: '250_1000',
    geography: 'us',
  },
  data: { dataTypes: ['customer_pii'], recordCount: 100_000, cloudPercentage: 50 },
  controls: {
    securityTeam: true, irPlan: true, aiAutomation: false,
    mfa: true, pentest: false, cyberInsurance: false,
  },
  threats: { topConcerns: ['ransomware'], previousIncidents: '0' },
};

/**
 * Inject mock data into sessionStorage and navigate to /results.
 * Routes /api/narrative to the provided handler (default: 500 error for fast tests).
 */
async function setupResults(
  page: import('@playwright/test').Page,
  narrativeBody = '',
  narrativeStatus = 500,
) {
  // Route narrative BEFORE navigating so the mock is in place
  await page.route('/api/narrative', route => {
    if (narrativeStatus === 200) {
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: narrativeBody,
      });
    } else {
      route.fulfill({ status: narrativeStatus });
    }
  });

  // Also silence the FX rates call to avoid flaky network hits
  await page.route('/api/fx-rates', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ USD: 1, GBP: 0.79, EUR: 0.92, HKD: 7.78, SGD: 1.34 }),
    }),
  );

  // Navigate to origin first so sessionStorage is on the right domain
  await page.goto('/');
  await page.evaluate(
    ({ results, inputs }) => {
      sessionStorage.setItem('results', JSON.stringify(results));
      sessionStorage.setItem('assessment', JSON.stringify(inputs));
    },
    { results: MOCK_RESULTS, inputs: MOCK_INPUTS },
  );

  await page.goto('/results');
  // Wait for React to hydrate and render the page content
  await expect(page.getByText('ALE', { exact: true })).toBeVisible({ timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Currency Selector
// ---------------------------------------------------------------------------

test.describe('Results: Currency Selector', () => {
  test('renders all 5 currency buttons', async ({ page }) => {
    await setupResults(page);
    for (const c of ['USD', 'GBP', 'EUR', 'HKD', 'SGD']) {
      await expect(page.getByRole('button', { name: c, exact: true })).toBeVisible();
    }
  });

  test('USD is active by default', async ({ page }) => {
    await setupResults(page);
    const usdBtn = page.getByRole('button', { name: 'USD', exact: true });
    // Active button has font-bold class applied
    await expect(usdBtn).toHaveClass(/font-bold/);
  });

  test('clicking GBP activates it and deactivates USD', async ({ page }) => {
    await setupResults(page);
    await page.getByRole('button', { name: 'GBP', exact: true }).click();
    await expect(page.getByRole('button', { name: 'GBP', exact: true })).toHaveClass(/font-bold/);
    // USD should no longer be bold
    const usdClasses = await page.getByRole('button', { name: 'USD', exact: true }).getAttribute('class');
    expect(usdClasses).not.toMatch(/font-bold/);
  });

  test('currency selection persists to localStorage', async ({ page }) => {
    await setupResults(page);
    await page.getByRole('button', { name: 'SGD', exact: true }).click();
    const stored = await page.evaluate(() => localStorage.getItem('cybrisk_currency'));
    expect(stored).toBe('SGD');
  });
});

// ---------------------------------------------------------------------------
// Narrative Panel
// ---------------------------------------------------------------------------

test.describe('Results: Narrative Panel', () => {
  test('shows error state when narrative API returns 500', async ({ page }) => {
    await setupResults(page, '', 500);
    await expect(
      page.getByText('Executive summary unavailable.'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('shows streaming text when narrative API returns 200', async ({ page }) => {
    const narrativeText = 'Board-level executive summary: financial exposure is moderate.';
    await setupResults(page, narrativeText, 200);
    await expect(page.getByText(narrativeText)).toBeVisible({ timeout: 5000 });
  });

  test('shows attribution footer when narrative is available', async ({ page }) => {
    await setupResults(page, 'Executive summary content.', 200);
    await expect(
      page.getByText(/Perplexity sonar-pro/),
    ).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Email Modal
// ---------------------------------------------------------------------------

test.describe('Results: Email Modal', () => {
  test('Email Report button is visible when inputs are loaded', async ({ page }) => {
    await setupResults(page);
    await expect(page.getByRole('button', { name: 'Email Report' })).toBeVisible();
  });

  test('clicking Email Report opens the modal with email input', async ({ page }) => {
    await setupResults(page);
    await page.getByRole('button', { name: 'Email Report' }).click();
    // Modal renders an h2 title and an email input
    await expect(page.locator('h2', { hasText: 'Email Report' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Send Report button is disabled when email field is empty', async ({ page }) => {
    await setupResults(page);
    await page.getByRole('button', { name: 'Email Report' }).click();
    const sendBtn = page.getByRole('button', { name: 'Send Report' });
    await expect(sendBtn).toBeDisabled();
  });

  test('Send Report button enables when email is typed', async ({ page }) => {
    await setupResults(page);
    await page.getByRole('button', { name: 'Email Report' }).click();
    await page.locator('input[type="email"]').fill('test@example.com');
    const sendBtn = page.getByRole('button', { name: 'Send Report' });
    await expect(sendBtn).toBeEnabled();
  });

  test('clicking backdrop (outside modal) closes the modal', async ({ page }) => {
    await setupResults(page);
    await page.getByRole('button', { name: 'Email Report' }).click();
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Click the backdrop at the top-left corner (safely outside the centered modal dialog)
    await page.mouse.click(5, 5);
    await expect(page.locator('input[type="email"]')).not.toBeVisible({ timeout: 2000 });
  });
});

// ---------------------------------------------------------------------------
// Share Results
// ---------------------------------------------------------------------------

test.describe('Results: Share Results', () => {
  test('Share Results button is visible', async ({ page }) => {
    await setupResults(page);
    await expect(page.getByText('Share Results')).toBeVisible();
  });

  test('clicking Share Results changes button text to ✓ Copied', async ({ page }) => {
    await setupResults(page);
    // Grant clipboard write permission so navigator.clipboard.writeText succeeds
    await page.context().grantPermissions(['clipboard-write']);
    await page.getByText('Share Results').click();
    await expect(page.getByText('✓ Copied')).toBeVisible({ timeout: 3000 });
  });

  test('Share Results button returns to original text after 2.5s', async ({ page }) => {
    await setupResults(page);
    await page.context().grantPermissions(['clipboard-write']);
    await page.getByText('Share Results').click();
    await expect(page.getByText('✓ Copied')).toBeVisible({ timeout: 3000 });
    // After ~2.5s the text resets
    await expect(page.getByText('Share Results')).toBeVisible({ timeout: 4000 });
  });
});

// ---------------------------------------------------------------------------
// What If? navigation
// ---------------------------------------------------------------------------

test.describe('Results: What If? navigation', () => {
  test('"What If? →" link navigates to /compare', async ({ page }) => {
    await setupResults(page);
    await page.getByText('What If? →').click();
    await expect(page).toHaveURL('/compare');
  });
});
