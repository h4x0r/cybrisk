import { test, expect } from '@playwright/test';

test.describe('Full Assessment Flow', () => {
  test('landing page loads and has assess link', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    const cta = page.locator('a[href="/assess"]').first();
    await expect(cta).toBeVisible();
  });

  test('simulate page redirects to /assess if no assessment data', async ({ page }) => {
    await page.goto('/simulate');
    // Should redirect to /assess since no sessionStorage data
    await page.waitForURL('/assess', { timeout: 5000 });
    await expect(page).toHaveURL('/assess');
  });

  test('results page redirects to /assess if no results data', async ({ page }) => {
    await page.goto('/results');
    // Should redirect to /assess since no sessionStorage data
    await page.waitForURL('/assess', { timeout: 5000 });
    await expect(page).toHaveURL('/assess');
  });

  test('results page renders with injected sessionStorage data', async ({ page }) => {
    // Must navigate to the origin first so sessionStorage is on the right domain
    await page.goto('/');

    const mockResults = {
      ale: { mean: 1245000, median: 890000, p10: 120000, p90: 3400000, p95: 5200000 },
      gordonLoebSpend: 462500,
      riskRating: 'MODERATE',
      industryBenchmark: { yourAle: 1245000, industryMedian: 6080000, percentileRank: 20 },
      distributionBuckets: [
        { rangeLabel: '$0-$500K', minValue: 0, maxValue: 500000, probability: 0.30 },
        { rangeLabel: '$500K-$1M', minValue: 500000, maxValue: 1000000, probability: 0.25 },
        { rangeLabel: '$1M-$1.5M', minValue: 1000000, maxValue: 1500000, probability: 0.20 },
        { rangeLabel: '$1.5M-$2M', minValue: 1500000, maxValue: 2000000, probability: 0.10 },
        { rangeLabel: '$2M-$2.5M', minValue: 2000000, maxValue: 2500000, probability: 0.05 },
        { rangeLabel: '$2.5M-$3M', minValue: 2500000, maxValue: 3000000, probability: 0.04 },
        { rangeLabel: '$3M-$3.5M', minValue: 3000000, maxValue: 3500000, probability: 0.03 },
        { rangeLabel: '$3.5M-$4M', minValue: 3500000, maxValue: 4000000, probability: 0.02 },
        { rangeLabel: '$4M-$4.5M', minValue: 4000000, maxValue: 4500000, probability: 0.005 },
        { rangeLabel: '$4.5M-$5M', minValue: 4500000, maxValue: 5000000, probability: 0.005 },
      ],
      exceedanceCurve: Array.from({ length: 50 }, (_, i) => ({
        loss: i * 100000,
        probability: Math.max(0, 1 - i / 50),
      })),
      keyDrivers: [
        { factor: '500K Customer PII Records', impact: 'HIGH', description: 'Large customer PII dataset increases breach impact.' },
        { factor: 'No AI/Automation', impact: 'MEDIUM', description: 'Missing AI security automation.' },
      ],
      recommendations: [
        'Deploy AI-powered security automation -- could reduce breach costs by ~30%.',
        'Optimal security investment: $462,500/year (Gordon-Loeb model).',
      ],
      rawLosses: [],
    };

    await page.evaluate((data) => {
      sessionStorage.setItem('results', JSON.stringify(data));
    }, mockResults);

    await page.goto('/results');

    // Should NOT redirect (has data)
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL('/results');

    // Check TickerBar renders with key values
    // Use exact match for "ALE" to avoid matching recommendation text that contains "ALE"
    await expect(page.getByText('ALE', { exact: true })).toBeVisible();
    await expect(page.getByText('$1,245,000')).toBeVisible();
    await expect(page.getByText('MODERATE')).toBeVisible();

    // Check key drivers section renders
    await expect(page.getByText('KEY RISK DRIVERS')).toBeVisible();
    await expect(page.getByText('500K Customer PII Records')).toBeVisible();

    // Check recommendations section renders
    await expect(page.getByText('RECOMMENDATIONS')).toBeVisible();

    // Check industry benchmark section renders
    await expect(page.getByText('INDUSTRY BENCHMARK')).toBeVisible();

    // Check navigation buttons
    await expect(page.getByText('New Assessment')).toBeVisible();
    await expect(page.getByText('Home')).toBeVisible();
  });

  test('results page "New Assessment" navigates to /assess', async ({ page }) => {
    await page.goto('/');

    // Inject minimal mock results
    const mockResults = {
      ale: { mean: 1000000, median: 800000, p10: 100000, p90: 2000000, p95: 3000000 },
      gordonLoebSpend: 300000,
      riskRating: 'LOW',
      industryBenchmark: { yourAle: 1000000, industryMedian: 5000000, percentileRank: 15 },
      distributionBuckets: [
        { rangeLabel: '$0-$500K', minValue: 0, maxValue: 500000, probability: 0.50 },
      ],
      exceedanceCurve: [{ loss: 0, probability: 1 }, { loss: 1000000, probability: 0.5 }],
      keyDrivers: [{ factor: 'Test', impact: 'LOW', description: 'Test driver' }],
      recommendations: ['Test recommendation.'],
      rawLosses: [],
    };

    await page.evaluate((data) => {
      sessionStorage.setItem('results', JSON.stringify(data));
    }, mockResults);

    await page.goto('/results');
    await page.waitForTimeout(1000);

    // Click "New Assessment"
    await page.getByText('New Assessment').click();
    await expect(page).toHaveURL('/assess');
  });

  test('results page "Home" navigates to /', async ({ page }) => {
    await page.goto('/');

    const mockResults = {
      ale: { mean: 1000000, median: 800000, p10: 100000, p90: 2000000, p95: 3000000 },
      gordonLoebSpend: 300000,
      riskRating: 'LOW',
      industryBenchmark: { yourAle: 1000000, industryMedian: 5000000, percentileRank: 15 },
      distributionBuckets: [
        { rangeLabel: '$0-$500K', minValue: 0, maxValue: 500000, probability: 0.50 },
      ],
      exceedanceCurve: [{ loss: 0, probability: 1 }, { loss: 1000000, probability: 0.5 }],
      keyDrivers: [{ factor: 'Test', impact: 'LOW', description: 'Test driver' }],
      recommendations: ['Test recommendation.'],
      rawLosses: [],
    };

    await page.evaluate((data) => {
      sessionStorage.setItem('results', JSON.stringify(data));
    }, mockResults);

    await page.goto('/results');
    await page.waitForTimeout(1000);

    // Click "Home"
    await page.getByText('Home').click();
    await expect(page).toHaveURL('/');
  });

  test('simulate page runs Monte Carlo with injected assessment', async ({ page }) => {
    await page.goto('/');

    const mockAssessment = {
      company: { industry: 'financial', revenueBand: '50m_250m', employees: '250_1000', geography: 'hk' },
      data: { dataTypes: ['customer_pii', 'payment_card'], recordCount: 500000, cloudPercentage: 70 },
      controls: { securityTeam: true, irPlan: true, aiAutomation: false, mfa: true, pentest: true, cyberInsurance: false },
      threats: { topConcerns: ['ransomware', 'bec_phishing', 'third_party'], previousIncidents: '0' },
    };

    await page.evaluate((data) => {
      sessionStorage.setItem('assessment', JSON.stringify(data));
    }, mockAssessment);

    await page.goto('/simulate');

    // Should show simulation console with terminal-style output
    await expect(page.getByText(/Loading actuarial/i).first()).toBeVisible({ timeout: 5000 });

    // Should show the terminal title bar
    await expect(page.getByText(/monte carlo engine/i)).toBeVisible();

    // Wait for simulation to complete and navigate to results
    await page.waitForURL('/results', { timeout: 20000 });
    await expect(page).toHaveURL('/results');

    // Results should have real calculated data
    await expect(page.getByText('ALE', { exact: true })).toBeVisible();
    await expect(page.getByText('KEY RISK DRIVERS')).toBeVisible();
    await expect(page.getByText('RECOMMENDATIONS')).toBeVisible();
    await expect(page.getByText('INDUSTRY BENCHMARK')).toBeVisible();
  });
});
