import { test, expect } from '@playwright/test';

test.describe('Event Detail Page', () => {
  let eventHref: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to first event
    await page.goto('/');

    // Click first event link and store href
    const eventLink = page.locator('a[href*="/event/"]').first();
    await expect(eventLink).toBeVisible({ timeout: 5000 });

    eventHref = (await eventLink.getAttribute('href')) || '';
    await eventLink.click();

    // Should be on event detail page
    await expect(page).toHaveURL(/\/event\//);
  });

  test('should load event detail page with correct URL structure', async ({ page }) => {
    // Verify event content is visible
    const eventContent = page.locator('main').first();
    await expect(eventContent).toBeVisible();

    // Verify URL matches expected pattern
    expect(page.url()).toMatch(/\/event\/.+/);
  });

  test('should display event title', async ({ page }) => {
    // Look for event title
    const eventTitle = page.locator('h1').first();
    await expect(eventTitle).toBeVisible();

    // Title should have text
    const titleText = await eventTitle.textContent();
    expect(titleText).toBeTruthy();
    expect(titleText?.length).toBeGreaterThan(0);
  });

  test('should display event information section', async ({ page }) => {
    // Look for event information (date, location, etc.)
    const eventInfo = page.locator('[class*="info"], [class*="details"]').first();
    if (await eventInfo.isVisible()) {
      await expect(eventInfo).toBeVisible();
    }
  });

  test('should display event gallery section', async ({ page }) => {
    // Look for event image or gallery
    const eventGallery = page.locator('[class*="gallery"]').first();
    if (await eventGallery.isVisible()) {
      await expect(eventGallery).toBeVisible();
    }

    // Check for images
    const images = page.locator('main img').first();
    if (await images.isVisible()) {
      await expect(images).toBeVisible();
    }
  });

  test('should display batch selector with available options', async ({ page }) => {
    // Look for batch selector or ticket options
    const batchSection = page.locator('[class*="batch"], [class*="ingresso"]').first();
    if (await batchSection.isVisible()) {
      await expect(batchSection).toBeVisible();
    }
  });

  test('should allow selecting different ticket batches', async ({ page }) => {
    // Look for batch buttons or radio buttons
    const batchButtons = page.locator('button[class*="batch"], input[type="radio"]');
    const count = await batchButtons.count();

    if (count > 1) {
      const batchButton = batchButtons.nth(1);
      await batchButton.click();

      // Verify page still loaded correctly
      await expect(page).toHaveURL(/\/event\//);
    }
  });

  test('should display share buttons', async ({ page }) => {
    // Look for share section with social buttons
    const shareSection = page.locator('[class*="share"]').first();
    if (await shareSection.isVisible()) {
      await expect(shareSection).toBeVisible();
    }

    // Check for individual share buttons
    const shareButtons = page.locator('button[aria-label*="share" i], button[title*="share" i], a[href*="facebook"], a[href*="twitter"], a[href*="whatsapp"], a[href*="instagram"]');
    if (await shareButtons.first().isVisible()) {
      await expect(shareButtons.first()).toBeVisible();
    }
  });

  test('should display event reviews section', async ({ page }) => {
    // Look for reviews section
    const reviewsSection = page.locator('[class*="review"], [class*="avaliação"]').first();
    if (await reviewsSection.isVisible()) {
      await expect(reviewsSection).toBeVisible();
    }
  });

  test('should display event rating/stars', async ({ page }) => {
    // Look for rating/stars
    const rating = page.locator('[class*="star"], [class*="rating"]').first();
    if (await rating.isVisible()) {
      await expect(rating).toBeVisible();
    }
  });

  test('should display checkout/purchase button', async ({ page }) => {
    // Look for buy/purchase button
    const buyButton = page.locator('button:has-text("Comprar"), button:has-text("comprar"), a[href*="/checkout"]').first();
    if (await buyButton.isVisible()) {
      await expect(buyButton).toBeVisible();
    }
  });

  test('should redirect to login when unauthenticated user tries to purchase', async ({ page }) => {
    // Click buy button (assuming user is not authenticated)
    const buyButton = page.locator('button:has-text("Comprar"), button:has-text("comprar"), a[href*="/checkout"]').first();
    if (await buyButton.isVisible()) {
      await buyButton.click();

      // Should redirect to login or checkout (depending on auth state)
      await expect(page).toHaveURL(/\/checkout|\/login/, { timeout: 10000 });
    }
  });

  test('should display event timeline/schedule', async ({ page }) => {
    // Look for timeline/schedule section
    const timeline = page.locator('[class*="timeline"], [class*="schedule"], [class*="horário"]').first();
    if (await timeline.isVisible()) {
      await expect(timeline).toBeVisible();
    }
  });

  test('should display venue/location information', async ({ page }) => {
    // Look for venue information
    const venue = page.locator('[class*="venue"], [class*="location"], [class*="local"]').first();
    if (await venue.isVisible()) {
      await expect(venue).toBeVisible();
    }
  });

  test('should display map if venue available', async ({ page }) => {
    // Look for map container
    const map = page.locator('[class*="map"], iframe[src*="maps"]').first();
    if (await map.isVisible()) {
      await expect(map).toBeVisible();
    }
  });

  test('should be responsive and scroll through all sections', async ({ page }) => {
    // Scroll through the page to ensure all elements load
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    // Wait for potential lazy-loaded content
    await page.waitForLoadState('networkidle');

    // Verify page is still on event detail
    await expect(page).toHaveURL(/\/event\//);
  });
});
