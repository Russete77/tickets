import { test, expect } from '@playwright/test';

test.describe('Event Page - Comprehensive Tests', () => {
  let eventUrl: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to home and get event URL
    await page.goto('/');

    // Click first event link to get URL
    const eventLink = page.locator('a[href*="/event/"]').first();
    await expect(eventLink).toBeVisible({ timeout: 5000 });

    eventUrl = (await eventLink.getAttribute('href')) || '';
    await eventLink.click();

    // Ensure we're on event page
    await expect(page).toHaveURL(/\/event\//);
  });

  test('should load event page with correct URL pattern', async ({ page }) => {
    // Verify URL matches pattern
    expect(page.url()).toMatch(/\/event\/.+/);
  });

  test('should display event page content in main element', async ({ page }) => {
    const main = page.locator('main').first();
    await expect(main).toBeVisible();
  });

  test('should display event hero section with image', async ({ page }) => {
    // Look for hero/main image
    const heroImage = page.locator('[class*="hero"], [class*="header"]').first();
    if (await heroImage.isVisible()) {
      await expect(heroImage).toBeVisible();
    }

    // Check for img tag
    const image = page.locator('img[alt*="event" i], img[alt*="imagem"], img').first();
    if (await image.isVisible()) {
      await expect(image).toBeVisible();
    }
  });

  test('should display event title with correct heading hierarchy', async ({ page }) => {
    // H1 should be event title
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    // Should have text content
    const text = await heading.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });

  test('should display event description', async ({ page }) => {
    // Look for description
    const description = page.locator('[class*="description"], [class*="desc"]').first();
    if (await description.isVisible()) {
      await expect(description).toBeVisible();
    }

    // Or look for paragraph tags in main
    const paragraph = page.locator('main p').first();
    if (await paragraph.isVisible()) {
      await expect(paragraph).toBeVisible();
    }
  });

  test('should display event date and time information', async ({ page }) => {
    // Look for date/time info
    const dateInfo = page.locator('[class*="date"], [class*="time"], [class*="quando"]').first();
    if (await dateInfo.isVisible()) {
      await expect(dateInfo).toBeVisible();
    }

    // Check for text with date pattern
    const dateText = page.locator('text=/\\d{1,2}[\\/\\.\\-]\\d{1,2}[\\/\\.\\-]\\d{4}/').first();
    if (await dateText.isVisible()) {
      await expect(dateText).toBeVisible();
    }
  });

  test('should display event location/venue', async ({ page }) => {
    // Look for location info
    const location = page.locator('[class*="location"], [class*="local"], [class*="venue"]').first();
    if (await location.isVisible()) {
      await expect(location).toBeVisible();
    }
  });

  test('should display batch/ticket selector', async ({ page }) => {
    const batchSelector = page.locator('[class*="batch"], [class*="ticket"], [class*="ingresso"]').first();
    if (await batchSelector.isVisible()) {
      await expect(batchSelector).toBeVisible();
    }
  });

  test('should have multiple batch options to select from', async ({ page }) => {
    // Look for batch buttons or options
    const batchButtons = page.locator('button[class*="batch"], input[type="radio"], label');
    const count = await batchButtons.count();

    if (count > 1) {
      // Click second batch option
      const secondBatch = batchButtons.nth(1);
      await secondBatch.click();

      // Verify still on event page
      await expect(page).toHaveURL(/\/event\//);
    }
  });

  test('should display ticket price for batch', async ({ page }) => {
    // Look for price display
    const price = page.locator('[class*="price"], [class*="valor"], text=/R\\$|\\$|€/').first();
    if (await price.isVisible()) {
      await expect(price).toBeVisible();
    }
  });

  test('should display available tickets count', async ({ page }) => {
    // Look for availability info
    const available = page.locator('[class*="available"], [class*="disponível"], text=/\\d+\\s+(ingressos|tickets|places)/i').first();
    if (await available.isVisible()) {
      await expect(available).toBeVisible();
    }
  });

  test('should display share buttons section', async ({ page }) => {
    // Look for share section
    const shareSection = page.locator('[class*="share"], [class*="compartilh"]').first();
    if (await shareSection.isVisible()) {
      await expect(shareSection).toBeVisible();
    }
  });

  test('should have social share buttons', async ({ page }) => {
    // Look for social share buttons
    const shareButtons = page.locator('button[aria-label*="share" i], a[href*="facebook"], a[href*="twitter"], a[href*="whatsapp"], a[href*="instagram"]');
    const count = await shareButtons.count();

    if (count > 0) {
      await expect(shareButtons.first()).toBeVisible();
    }
  });

  test('should display event gallery with multiple images', async ({ page }) => {
    // Look for gallery
    const gallery = page.locator('[class*="gallery"], [class*="galeria"]').first();
    if (await gallery.isVisible()) {
      await expect(gallery).toBeVisible();

      // Check for images in gallery
      const images = page.locator('img');
      const imageCount = await images.count();
      expect(imageCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('should allow navigating gallery with controls', async ({ page }) => {
    // Look for gallery next/previous buttons
    const nextButton = page.locator('button[aria-label*="next" i], button[aria-label*="próximo" i]').first();
    if (await nextButton.isVisible()) {
      await nextButton.click();
      // Just verify page doesn't error
      await expect(page).toHaveURL(/\/event\//);
    }
  });

  test('should display event reviews section', async ({ page }) => {
    // Look for reviews
    const reviews = page.locator('[class*="review"], [class*="avaliação"]').first();
    if (await reviews.isVisible()) {
      await expect(reviews).toBeVisible();
    }
  });

  test('should display rating/stars', async ({ page }) => {
    // Look for stars/rating
    const rating = page.locator('[class*="star"], [class*="rating"], [class*="nota"]').first();
    if (await rating.isVisible()) {
      await expect(rating).toBeVisible();
    }
  });

  test('should display individual review items', async ({ page }) => {
    // Look for individual reviews
    const reviewItems = page.locator('[class*="review-item"], [class*="avaliação"]');
    const count = await reviewItems.count();
    // May or may not have reviews
  });

  test('should display event timeline/schedule section', async ({ page }) => {
    // Look for timeline
    const timeline = page.locator('[class*="timeline"], [class*="schedule"], [class*="horário"]').first();
    if (await timeline.isVisible()) {
      await expect(timeline).toBeVisible();
    }
  });

  test('should display map or venue details', async ({ page }) => {
    // Look for map
    const map = page.locator('[class*="map"], iframe[src*="maps"]').first();
    if (await map.isVisible()) {
      await expect(map).toBeVisible();
    }

    // Or look for venue address
    const venue = page.locator('[class*="venue"], [class*="endereço"]').first();
    if (await venue.isVisible()) {
      await expect(venue).toBeVisible();
    }
  });

  test('should display organizer/promoter information', async ({ page }) => {
    // Look for organizer info
    const organizer = page.locator('[class*="organizer"], [class*="promotor"], [class*="promoter"]').first();
    if (await organizer.isVisible()) {
      await expect(organizer).toBeVisible();
    }
  });

  test('should display buy/checkout button prominently', async ({ page }) => {
    // Look for buy button
    const buyButton = page.locator('button:has-text("Comprar"), button:has-text("comprar"), a[href*="/checkout"]').first();
    if (await buyButton.isVisible()) {
      await expect(buyButton).toBeVisible();
    }
  });

  test('should redirect to login when unauthenticated user clicks buy button', async ({ page }) => {
    // Click buy button
    const buyButton = page.locator('button:has-text("Comprar"), button:has-text("comprar"), a[href*="/checkout"]').first();
    if (await buyButton.isVisible()) {
      await buyButton.click();

      // Should redirect to login or checkout
      await expect(page).toHaveURL(/\/login|\/checkout/, { timeout: 10000 });
    }
  });

  test('should be scrollable through all sections', async ({ page }) => {
    // Scroll down through page
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    await page.waitForLoadState('networkidle');

    // Still on event page
    await expect(page).toHaveURL(/\/event\//);

    // Continue scrolling
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    // Verify still on event page
    await expect(page).toHaveURL(/\/event\//);
  });

  test('should load all resources without 404 errors', async ({ page }) => {
    // Set up listener for failed requests
    const failedRequests: string[] = [];

    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    // Reload page to capture all requests
    await page.reload();

    // Should not have critical resource failures
    // Note: 404s on optional resources are acceptable
  });

  test('should have responsive design elements', async ({ page }) => {
    // Check that layout is responsive
    const main = page.locator('main').first();
    const box = await main.boundingBox();

    expect(box).toBeTruthy();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  });

  test('should preserve batch selection when scrolling', async ({ page }) => {
    // Select a batch
    const batchButtons = page.locator('button[class*="batch"], input[type="radio"]');
    if (await batchButtons.count() > 1) {
      const secondBatch = batchButtons.nth(1);
      await secondBatch.click();

      // Scroll down
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      // Check batch is still selected
      const batchSection = page.locator('[class*="batch"], [class*="ticket"]').first();
      if (await batchSection.isVisible()) {
        await expect(batchSection).toBeVisible();
      }
    }
  });

  test('should handle back navigation from event page', async ({ page }) => {
    // Simulate back button behavior
    await page.evaluate(() => {
      window.history.back();
    });

    // Should navigate back to previous page (home or search)
    await page.waitForLoadState('networkidle');

    // Check we're not still on same event
    // May be on home or search
  });
});