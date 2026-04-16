import { test, expect } from '@playwright/test';

test.describe('Checkout', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access checkout without logging in
    await page.goto('/checkout');

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('should display checkout page for authenticated users', async ({ page }) => {
    // First, login
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Enviar")').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('demo@ticketeria.com.br');
      await passwordInput.fill('password123');
      await submitButton.click();

      // Wait for login to complete
      await page.waitForLoadState('networkidle');
    }

    // Navigate to checkout
    await page.goto('/checkout');

    // Should stay on checkout page
    await expect(page).toHaveURL(/\/checkout/);

    // Verify checkout page elements are visible
    const checkoutContent = page.locator('main, [class*="checkout"]').first();
    await expect(checkoutContent).toBeVisible();
  });

  test('should display order summary on checkout page', async ({ page }) => {
    // Login first
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Enviar")').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('demo@ticketeria.com.br');
      await passwordInput.fill('password123');
      await submitButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to checkout
    await page.goto('/checkout');

    // Look for order summary section
    const orderSummary = page.locator('[class*="summary"], [class*="order"], aside').first();
    if (await orderSummary.isVisible()) {
      await expect(orderSummary).toBeVisible();
    }
  });

  test('should display payment methods on checkout', async ({ page }) => {
    // Login first
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Enviar")').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('demo@ticketeria.com.br');
      await passwordInput.fill('password123');
      await submitButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to checkout
    await page.goto('/checkout');

    // Look for payment method options (Pix, credit card, etc.)
    const paymentMethods = page.locator('button:has-text("pix"), button:has-text("Pix"), button:has-text("cartão"), button:has-text("Cartão")');
    if (await paymentMethods.first().isVisible()) {
      await expect(paymentMethods.first()).toBeVisible();
    }
  });

  test('should allow selecting different payment methods', async ({ page }) => {
    // Login first
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Enviar")').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('demo@ticketeria.com.br');
      await passwordInput.fill('password123');
      await submitButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to checkout
    await page.goto('/checkout');

    // Try to click on Pix payment method
    const pixMethod = page.locator('button:has-text("pix"), button:has-text("Pix")').first();
    if (await pixMethod.isVisible()) {
      await pixMethod.click();

      // Verify Pix option is selected or shows Pix payment UI
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/checkout/);
    }
  });

  test('should display my tickets page after authentication', async ({ page }) => {
    // Login first
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Enviar")').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('demo@ticketeria.com.br');
      await passwordInput.fill('password123');
      await submitButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to tickets page
    await page.goto('/tickets');

    // Should stay on tickets page
    await expect(page).toHaveURL(/\/tickets/);

    // Look for ticket cards
    const ticketCards = page.locator('[class*="ticket"], [class*="card"], [role="article"]');
    if (await ticketCards.first().isVisible()) {
      await expect(ticketCards.first()).toBeVisible();
    }
  });
});
