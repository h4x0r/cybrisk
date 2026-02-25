import { test, expect } from '@playwright/test';

test.describe('Assessment Wizard', () => {
  test('shows step 1 (Company Profile) on load', async ({ page }) => {
    await page.goto('/assess');
    // Progress indicator shows step 1/5
    await expect(page.getByText('1/5')).toBeVisible();
    // Progress bar label (exact match to avoid matching the heading too)
    await expect(page.getByText('COMPANY PROFILE', { exact: true })).toBeVisible();
    // Step heading
    await expect(page.getByRole('heading', { name: 'Company Profile' })).toBeVisible();
  });

  test('shows all four select dropdowns on step 1', async ({ page }) => {
    await page.goto('/assess');
    // Use label elements to avoid matching select placeholder text
    await expect(page.locator('label', { hasText: 'Industry' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Annual Revenue' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Employee Count' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Primary Geography' })).toBeVisible();
  });

  test('validates required fields on step 1 before advancing', async ({ page }) => {
    await page.goto('/assess');
    // Try to click Next without filling anything
    // Use exact: true to avoid matching Next.js Dev Tools button
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    // Should show validation error (includes period)
    await expect(page.getByText('Please select an industry.')).toBeVisible();
    // Should still be on step 1
    await expect(page.getByText('1/5')).toBeVisible();
  });

  test('can select industry from dropdown', async ({ page }) => {
    await page.goto('/assess');
    // Click the industry select trigger (first combobox)
    await page.getByRole('combobox').first().click();
    // Select Financial
    await page.getByRole('option', { name: 'Financial' }).click();
    // Verify it was selected
    await expect(page.getByRole('combobox').first()).toContainText('Financial');
  });

  test('Back button is disabled on step 1', async ({ page }) => {
    await page.goto('/assess');
    const backBtn = page.getByRole('button', { name: /back/i });
    await expect(backBtn).toBeDisabled();
  });

  test('can navigate to step 2 after filling step 1', async ({ page }) => {
    await page.goto('/assess');

    // Fill all four dropdowns
    const selects = page.getByRole('combobox');

    // Industry
    await selects.nth(0).click();
    await page.getByRole('option', { name: 'Financial' }).click();

    // Revenue
    await selects.nth(1).click();
    await page.getByRole('option').first().click();

    // Employees
    await selects.nth(2).click();
    await page.getByRole('option').first().click();

    // Geography
    await selects.nth(3).click();
    await page.getByRole('option').first().click();

    // Click Next (exact match to avoid Next.js Dev Tools button)
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Should be on step 2
    await expect(page.getByText('2/5')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('DATA PROFILE', { exact: true })).toBeVisible();
  });
});
