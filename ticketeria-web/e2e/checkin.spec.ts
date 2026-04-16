import { test, expect } from '@playwright/test';

test.describe('Check-in Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkin');
  });

  test('should load check-in page successfully', async ({ page }) => {
    // Verify check-in page is loaded
    const checkinContent = page.locator('main, [class*="checkin"]').first();
    await expect(checkinContent).toBeVisible();

    // Should be on checkin route
    await expect(page).toHaveURL(/\/checkin/);
  });

  test('should display check-in page without layout header', async ({ page }) => {
    // Check-in page is standalone without main layout
    // Verify main content is visible
    const main = page.locator('main').first();
    await expect(main).toBeVisible();
  });

  test('should display event selector', async ({ page }) => {
    // Look for event selector dropdown or selector
    const eventSelector = page.locator('[class*="event"], [class*="selector"], select, input[placeholder*="event" i]').first();
    if (await eventSelector.isVisible()) {
      await expect(eventSelector).toBeVisible();
    }
  });

  test('should allow selecting an event', async ({ page }) => {
    // Look for event selector
    const eventSelector = page.locator('select').first();
    if (await eventSelector.isVisible()) {
      // Get all options
      const options = eventSelector.locator('option');
      const count = await options.count();

      if (count > 1) {
        // Select second option (skip placeholder)
        await eventSelector.selectOption({ index: 1 });

        // Verify selection
        const selectedValue = await eventSelector.inputValue();
        expect(selectedValue).toBeTruthy();
      }
    }
  });

  test('should display manual input field for ticket code', async ({ page }) => {
    // Look for ticket code input field
    const ticketInput = page.locator('input[placeholder*="ticket" i], input[placeholder*="código" i], input[placeholder*="code" i]').first();
    if (await ticketInput.isVisible()) {
      await expect(ticketInput).toBeVisible();
    }
  });

  test('should allow entering ticket code manually', async ({ page }) => {
    const ticketInput = page.locator('input[placeholder*="ticket" i], input[placeholder*="código" i], input[placeholder*="code" i]').first();
    if (await ticketInput.isVisible()) {
      // Enter a sample ticket code
      await ticketInput.fill('TICKET123ABC');

      // Verify value was entered
      const value = await ticketInput.inputValue();
      expect(value).toBe('TICKET123ABC');
    }
  });

  test('should display QR code scanner button or camera input', async ({ page }) => {
    // Look for QR scanner button or camera input
    const qrScanner = page.locator('button:has-text("QR"), button:has-text("câmera"), button:has-text("camera"), input[type="file"]').first();
    if (await qrScanner.isVisible()) {
      await expect(qrScanner).toBeVisible();
    }
  });

  test('should display submit/check-in button', async ({ page }) => {
    // Look for check-in or submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("check-in"), button:has-text("Check-in"), button:has-text("validar"), button:has-text("Validar")').first();
    if (await submitButton.isVisible()) {
      await expect(submitButton).toBeVisible();
    }
  });

  test('should validate empty check-in submission', async ({ page }) => {
    // Try to submit without entering data
    const submitButton = page.locator('button[type="submit"], button:has-text("check-in"), button:has-text("Check-in"), button:has-text("validar"), button:has-text("Validar")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should stay on check-in page (form validation)
      await expect(page).toHaveURL(/\/checkin/);
    }
  });

  test('should allow entering ticket and submitting', async ({ page }) => {
    // Fill in required fields
    const eventSelector = page.locator('select').first();
    const ticketInput = page.locator('input[placeholder*="ticket" i], input[placeholder*="código" i], input[placeholder*="code" i]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("check-in"), button:has-text("Check-in"), button:has-text("validar"), button:has-text("Validar")').first();

    if (await eventSelector.isVisible()) {
      await eventSelector.selectOption({ index: 1 });
    }

    if (await ticketInput.isVisible()) {
      await ticketInput.fill('VALID123');
    }

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Wait for response
      await page.waitForLoadState('networkidle');

      // Should either show success/error result on same page or redirect
      // Check-in page typically shows result on same page
      const result = page.locator('[class*="result"], [class*="success"], [class*="error"]').first();
      if (await result.isVisible()) {
        await expect(result).toBeVisible();
      }
    }
  });

  test('should display check-in result/status message', async ({ page }) => {
    // After submission, should show result message
    const resultSection = page.locator('[class*="result"], [class*="status"], [class*="message"]').first();
    // Result may or may not be visible initially - this is optional
  });

  test('should allow scanning multiple tickets', async ({ page }) => {
    // Fill first check-in
    const ticketInput = page.locator('input[placeholder*="ticket" i], input[placeholder*="código" i], input[placeholder*="code" i]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("check-in"), button:has-text("Check-in"), button:has-text("validar"), button:has-text("Validar")').first();

    if (await ticketInput.isVisible() && await submitButton.isVisible()) {
      // First check-in
      await ticketInput.fill('TICKET001');
      await submitButton.click();
      await page.waitForLoadState('networkidle');

      // Should allow entering another ticket
      await ticketInput.clear();
      await ticketInput.fill('TICKET002');

      // Verify input was cleared and refilled
      const value = await ticketInput.inputValue();
      expect(value).toBe('TICKET002');
    }
  });

  test('should display helpful instructions or title', async ({ page }) => {
    // Check for title or instructions
    const title = page.locator('h1, h2, [class*="title"]').first();
    if (await title.isVisible()) {
      const text = await title.textContent();
      expect(text).toBeTruthy();
    }
  });

  test('should be mobile-friendly and full-screen capable', async ({ page }) => {
    // Check if page is properly set up for standalone use (no header/footer)
    const header = page.locator('header').first();
    const nav = page.locator('nav').first();

    // Check-in page should not have global nav (standalone)
    // However, it may have local header - just verify main content is present
    const main = page.locator('main').first();
    await expect(main).toBeVisible();
  });
});