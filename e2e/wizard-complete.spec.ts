import { test, expect } from '@playwright/test';

test.describe('Wizard Complete Flow', () => {
  test('fills all 5 steps and submits to simulation', async ({ page }) => {
    await page.goto('/assess');

    // -- Step 1: Company Profile --
    await expect(page.getByText('1/5')).toBeVisible();
    const selects = page.getByRole('combobox');

    // Industry - select Financial
    await selects.nth(0).click();
    await page.getByRole('option', { name: 'Financial' }).click();

    // Revenue - select $50-250M
    await selects.nth(1).click();
    await page.getByRole('option', { name: '$50-250M' }).click();

    // Employees - select 250-1,000
    await selects.nth(2).click();
    await page.getByRole('option', { name: '250-1,000' }).click();

    // Geography - select Hong Kong
    await selects.nth(3).click();
    await page.getByRole('option', { name: 'Hong Kong' }).click();

    // Click Next (exact match to avoid Next.js Dev Tools button)
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // -- Step 2: Data Profile --
    await expect(page.getByText('2/5')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('DATA PROFILE', { exact: true })).toBeVisible();

    // Click "Customer PII" data type button
    await page.getByText('Customer PII').click();
    // Click "Payment Card (PCI)" data type button
    await page.getByText('Payment Card (PCI)').click();

    // Click Next
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // -- Step 3: Security Controls --
    await expect(page.getByText('3/5')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('SECURITY CONTROLS', { exact: true })).toBeVisible();

    // Toggle some controls on by clicking their row buttons
    await page.getByText('Do you have a dedicated security team or CISO?').click();
    await page.getByText('Do you have an incident response plan?').click();
    await page.getByText('Do you have MFA on all critical systems?').click();

    // Verify the score updated
    await expect(page.getByText('3/6')).toBeVisible();

    // Click Next
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // -- Step 4: Threat Landscape --
    await expect(page.getByText('4/5')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('THREAT LANDSCAPE', { exact: true })).toBeVisible();

    // Select threats (max 3)
    await page.getByText('Ransomware', { exact: true }).click();
    await page.getByText('BEC / Phishing').click();
    await page.getByText('Third-Party / Supply Chain').click();

    // Verify 3/3 selected
    await expect(page.getByText('3/3 selected')).toBeVisible();

    // Click Next
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // -- Step 5: Review & Calculate --
    await expect(page.getByText('5/5')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('REVIEW & CALCULATE', { exact: true })).toBeVisible();

    // Verify review shows our selections
    await expect(page.getByText('Financial')).toBeVisible();
    await expect(page.getByText('Customer PII')).toBeVisible();
    await expect(page.getByText('Ready to run 100,000 Monte Carlo simulations')).toBeVisible();

    // Click RUN SIMULATION
    await page.getByRole('button', { name: /RUN SIMULATION/i }).click();

    // Should navigate to /simulate
    await page.waitForURL('/simulate', { timeout: 5000 });
    await expect(page).toHaveURL('/simulate');
  });

  test('can go back to previous steps', async ({ page }) => {
    await page.goto('/assess');

    // Fill step 1 minimally
    const selects = page.getByRole('combobox');
    await selects.nth(0).click();
    await page.getByRole('option', { name: 'Technology' }).click();
    await selects.nth(1).click();
    await page.getByRole('option').first().click();
    await selects.nth(2).click();
    await page.getByRole('option').first().click();
    await selects.nth(3).click();
    await page.getByRole('option').first().click();

    // Go to step 2
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('2/5')).toBeVisible({ timeout: 3000 });

    // Select a data type to pass validation later
    await page.getByText('Intellectual Property').click();

    // Go back to step 1
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByText('1/5')).toBeVisible({ timeout: 3000 });
    // Should still have Technology selected
    await expect(page.getByRole('combobox').first()).toContainText('Technology');
  });

  test('step 2 validates at least one data type is selected', async ({ page }) => {
    await page.goto('/assess');

    // Fill step 1
    const selects = page.getByRole('combobox');
    await selects.nth(0).click();
    await page.getByRole('option', { name: 'Retail' }).click();
    await selects.nth(1).click();
    await page.getByRole('option').first().click();
    await selects.nth(2).click();
    await page.getByRole('option').first().click();
    await selects.nth(3).click();
    await page.getByRole('option').first().click();

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('2/5')).toBeVisible({ timeout: 3000 });

    // Try to advance without selecting any data type
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    // Should show validation error
    await expect(page.getByText('Please select at least one data type')).toBeVisible();
    // Still on step 2
    await expect(page.getByText('2/5')).toBeVisible();
  });

  test('step 4 validates at least one threat is selected', async ({ page }) => {
    await page.goto('/assess');

    // Fill step 1
    const selects = page.getByRole('combobox');
    await selects.nth(0).click();
    await page.getByRole('option', { name: 'Healthcare' }).click();
    await selects.nth(1).click();
    await page.getByRole('option').first().click();
    await selects.nth(2).click();
    await page.getByRole('option').first().click();
    await selects.nth(3).click();
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 2 - select a data type
    await expect(page.getByText('2/5')).toBeVisible({ timeout: 3000 });
    await page.getByText('Health Records (PHI)').click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 3 - controls (no validation, just advance)
    await expect(page.getByText('3/5')).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 4 - try to advance without selecting threats
    await expect(page.getByText('4/5')).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Should show validation error
    await expect(page.getByText('Please select at least one threat concern')).toBeVisible();
    // Still on step 4
    await expect(page.getByText('4/5')).toBeVisible();
  });
});
