import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('renders headline and CTA', async ({ page }) => {
    await page.goto('/');
    // Check for the main headline text
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText('They Care About This Number');
    // Check for "Calculate Financial Exposure" CTA button
    const cta = page.locator('a[href="/assess"]', { hasText: 'Calculate Financial Exposure' });
    await expect(cta).toBeVisible();
  });

  test('CTA navigates to /assess', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator('a[href="/assess"]', { hasText: 'Calculate Financial Exposure' });
    await cta.click();
    await expect(page).toHaveURL('/assess');
  });

  test('nav "Assess Risk" link navigates to /assess', async ({ page }) => {
    await page.goto('/');
    const navLink = page.locator('nav a[href="/assess"]', { hasText: 'Assess Risk' });
    await expect(navLink).toBeVisible();
    await navLink.click();
    await expect(page).toHaveURL('/assess');
  });

  test('has trust strip with methodology badges', async ({ page }) => {
    await page.goto('/');
    // Trust strip TRUST_STATS values (updated after landing page refactor)
    await expect(page.getByText('Monte Carlo Trials', { exact: true })).toBeVisible();
    await expect(page.getByText('IBM 2024', { exact: true })).toBeVisible();
    await expect(page.getByText('Verizon DBIR', { exact: true })).toBeVisible();
    await expect(page.getByText('NetDiligence', { exact: true })).toBeVisible();
  });

  test('renders the hero chart card with ALE figure', async ({ page }) => {
    await page.goto('/');
    // The chart card shows the ALE and Gordon-Loeb figures
    await expect(page.getByText('$1,245,000')).toBeVisible();
    await expect(page.getByText('$460,650')).toBeVisible();
  });

  test('renders pain point cards', async ({ page }) => {
    await page.goto('/');
    // Three pain point cards with their claim headings
    await expect(page.getByText('Know your exact dollar exposure')).toBeVisible();
    await expect(page.getByText('Actuarial proof, not opinions')).toBeVisible();
    await expect(page.getByText('Mathematically optimal security budget')).toBeVisible();
  });

  test('renders footer with attribution', async ({ page }) => {
    await page.goto('/');
    // Footer text is combined - use a more specific locator
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('footer')).toContainText('CybRisk');
    await expect(page.locator('footer')).toContainText('Albert Hui');
    await expect(page.locator('footer')).toContainText('DataExpert Vibe Coding Challenge');
  });
});
