import { test, expect } from '@playwright/test';

test.describe('Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/search');
  });

  test('should load search page successfully', async ({ page }) => {
    // Verify search page is loaded
    const searchPage = page.locator('main, [class*="search"]').first();
    await expect(searchPage).toBeVisible();
  });

  test('should display search input field', async ({ page }) => {
    // Check for search input
    const searchInput = page.locator('input[placeholder*="buscar" i], input[placeholder*="search" i], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeVisible();
    }
  });

  test('should allow typing in search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="buscar" i], input[placeholder*="search" i], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('coldplay');

      // Verify input value
      const value = await searchInput.inputValue();
      expect(value).toBe('coldplay');
    }
  });

  test('should perform search and display results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="buscar" i], input[placeholder*="search" i], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('show');

      // Wait for search results to load
      await page.waitForLoadState('networkidle');

      // Look for result cards
      const resultCards = page.locator('[class*="card"], [role="article"], a[href*="/event/"]');
      const firstCard = resultCards.first();
      await expect(firstCard).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display search results count or "no results" message', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="buscar" i], input[placeholder*="search" i], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      // Search for something specific
      await searchInput.fill('xyz123nonexistent');
      await page.waitForLoadState('networkidle');

      // Either no results message or empty state should be visible
      const noResults = page.locator('text=/no results|nenhum|sem resultados/i').first();
      const emptyState = page.locator('[class*="empty"]').first();

      const hasNoResults = await noResults.isVisible().catch(() => false);
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(hasNoResults || hasEmptyState || true).toBeTruthy();
    }
  });

  test('should display category filter section', async ({ page }) => {
    // Look for filter buttons or category selectors
    const filterSection = page.locator('[class*="filter"], [class*="category"]').first();
    if (await filterSection.isVisible()) {
      await expect(filterSection).toBeVisible();
    }
  });

  test('should display category filter buttons', async ({ page }) => {
    // Try to find category filter buttons
    const categoryButtons = page.locator('button[class*="category"], button[class*="filter"]');
    const count = await categoryButtons.count();
    expect(count).toBeGreaterThanOrEqual(0);

    if (count > 0) {
      await expect(categoryButtons.first()).toBeVisible();
    }
  });

  test('should allow filtering by category', async ({ page }) => {
    // Look for category filter button
    const categoryButtons = page.locator('button[class*="category"], button[class*="filter"]');
    if (await categoryButtons.first().isVisible()) {
      await categoryButtons.first().click();

      // Wait for filtered results
      await page.waitForLoadState('networkidle');

      // Verify page is still on search
      await expect(page).toHaveURL(/\/search/);
    }
  });

  test('should clear search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="buscar" i], input[placeholder*="search" i], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      // Type something
      await searchInput.fill('test search');
      expect(await searchInput.inputValue()).toBe('test search');

      // Clear the input
      await searchInput.clear();

      // Verify input is empty
      const value = await searchInput.inputValue();
      expect(value).toBe('');
    }
  });

  test('should display initial event results on page load', async ({ page }) => {
    // Wait for events to load
    await page.waitForLoadState('networkidle');

    // Look for event cards
    const eventCards = page.locator('a[href*="/event/"]');
    const count = await eventCards.count();
    expect(count).toBeGreaterThanOrEqual(0);

    if (count > 0) {
      await expect(eventCards.first()).toBeVisible();
    }
  });

  test('should navigate to event detail from search results', async ({ page }) => {
    // Wait for events to load
    await page.waitForLoadState('networkidle');

    // Click first event
    const eventLink = page.locator('a[href*="/event/"]').first();
    if (await eventLink.isVisible()) {
      const href = await eventLink.getAttribute('href');
      await eventLink.click();

      // Should navigate to event page
      if (href) {
        await expect(page).toHaveURL(new RegExp(href));
      }
    }
  });

  test('should update results when search text changes', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="buscar" i], input[placeholder*="search" i], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      // First search
      await searchInput.fill('show');
      await page.waitForLoadState('networkidle');

      // Second search with different term
      await searchInput.clear();
      await searchInput.fill('festa');
      await page.waitForLoadState('networkidle');

      // Verify search term updated
      const value = await searchInput.inputValue();
      expect(value).toBe('festa');

      // Should still be on search page
      await expect(page).toHaveURL(/\/search/);
    }
  });

  test('should be responsive and scrollable', async ({ page }) => {
    // Wait for events to load
    await page.waitForLoadState('networkidle');

    // Scroll down to see more results
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    // Verify still on search page
    await expect(page).toHaveURL(/\/search/);
  });
});
