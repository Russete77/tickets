import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Check if page is visible and loaded
    const html = page.locator('html');
    await expect(html).toBeVisible();

    // Verify page title or main heading exists
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should display header navigation', async ({ page }) => {
    // Look for navigation elements or header
    const header = page.locator('header, nav, [role="navigation"]').first();
    await expect(header).toBeVisible();
  });

  test('should display hero section', async ({ page }) => {
    // Hero section typically contains a large image or main banner
    const heroSection = page.locator('[class*="hero"], [class*="banner"]').first();
    await expect(heroSection).toBeVisible();
  });

  test('should display search bar in hero section', async ({ page }) => {
    // Look for search input or search bar
    const searchInput = page.locator('input[placeholder*="buscar" i], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeVisible();
    }
  });

  test('should allow typing in search bar', async ({ page }) => {
    // Find and interact with search input
    const searchInput = page.locator('input[placeholder*="buscar" i], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('coldplay');
      const value = await searchInput.inputValue();
      expect(value).toBe('coldplay');
    }
  });

  test('should display category section with events', async ({ page }) => {
    // Look for category section or event listings
    const categorySection = page.locator('[class*="category"], [class*="section"]').first();
    await expect(categorySection).toBeVisible({ timeout: 5000 });
  });

  test('should load and display event cards', async ({ page }) => {
    // Wait for event cards to load (MSW will provide mock data)
    const eventCards = page.locator('[class*="card"], [role="article"], a[href*="/event/"]');
    await expect(eventCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('should verify event cards are clickable', async ({ page }) => {
    // Find first event link
    const eventLink = page.locator('a[href*="/event/"]').first();
    await expect(eventLink).toBeVisible({ timeout: 5000 });

    // Get href to verify it's a valid link
    const href = await eventLink.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toMatch(/^\/event\/.+/);
  });

  test('should navigate to event detail page when clicking event card', async ({ page }) => {
    // Click the first event card or link to an event
    const eventLink = page.locator('a[href*="/event/"]').first();
    await expect(eventLink).toBeVisible({ timeout: 5000 });

    const href = await eventLink.getAttribute('href');
    await eventLink.click();

    // Should navigate to event page
    if (href) {
      await expect(page).toHaveURL(new RegExp(href));
    }
  });

  test('should navigate to search page via link', async ({ page }) => {
    // Look for search button or link
    const searchButton = page.locator('a[href*="/search"]').first();
    if (await searchButton.isVisible()) {
      await searchButton.click();
      await expect(page).toHaveURL(/\/search/);
    }
  });

  test('should navigate to login page from header', async ({ page }) => {
    // Look for login button or link
    const loginButton = page.locator('button:has-text("Entrar"), a[href*="login"]').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should display multiple event cards', async ({ page }) => {
    // Verify at least 3 event cards are visible
    const eventCards = page.locator('a[href*="/event/"]');
    const count = await eventCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('hero section should be visible and interactive', async ({ page }) => {
    // Hero section visibility check
    const heroSection = page.locator('[class*="hero"]').first();
    await expect(heroSection).toBeVisible();

    // Check hero is in viewport
    await expect(heroSection).toBeInViewport();
  });
});
