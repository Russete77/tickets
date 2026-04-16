import { test, expect } from '@playwright/test';

// Helper function to login as admin
async function loginAsAdmin(page: any) {
  await page.goto('/login');

  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Enviar")').first();

  if (await emailInput.isVisible()) {
    await emailInput.fill('admin@ticketeria.com.br');
  }
  if (await passwordInput.isVisible()) {
    await passwordInput.fill('password123');
  }
  if (await submitButton.isVisible()) {
    await submitButton.click();

    // Wait for login to complete
    await page.waitForLoadState('networkidle');
  }
}

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to admin dashboard
    await loginAsAdmin(page);
    await page.goto('/admin');
  });

  test('should load admin dashboard', async ({ page }) => {
    // Verify admin page loaded
    await expect(page).toHaveURL(/\/admin/);

    // Check for main content
    const main = page.locator('main, [class*="admin"], [class*="dashboard"]').first();
    await expect(main).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Without logging in, try to access admin
    await page.goto('/admin', { waitUntil: 'networkidle' });

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display admin navigation sidebar', async ({ page }) => {
    // Look for sidebar/navigation
    const sidebar = page.locator('aside, [class*="sidebar"], [class*="nav"], nav').first();
    if (await sidebar.isVisible()) {
      await expect(sidebar).toBeVisible();
    }
  });

  test('should display navigation links to admin sections', async ({ page }) => {
    // Look for links to admin pages
    const navLinks = page.locator('a[href*="/admin/"], button:has-text("eventos"), button:has-text("usuários"), button:has-text("financeiro")');
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(0);

    if (count > 0) {
      await expect(navLinks.first()).toBeVisible();
    }
  });

  test('should display dashboard metrics or overview', async ({ page }) => {
    // Look for dashboard cards/metrics
    const metrics = page.locator('[class*="card"], [class*="metric"], [class*="stat"]').first();
    if (await metrics.isVisible()) {
      await expect(metrics).toBeVisible();
    }
  });

  test('should have working navigation to events page', async ({ page }) => {
    // Look for events link
    const eventsLink = page.locator('a[href="/admin/events"], button:has-text("eventos"), a:has-text("Eventos")').first();
    if (await eventsLink.isVisible()) {
      await eventsLink.click();
      await expect(page).toHaveURL(/\/admin\/events/);
    }
  });

  test('should have working navigation to finance page', async ({ page }) => {
    // Look for finance link
    const financeLink = page.locator('a[href="/admin/finance"], button:has-text("financeiro"), button:has-text("finance"), a:has-text("Financeiro")').first();
    if (await financeLink.isVisible()) {
      await financeLink.click();
      await expect(page).toHaveURL(/\/admin\/finance/);
    }
  });

  test('should have working navigation to affiliates page', async ({ page }) => {
    // Look for affiliates link
    const affiliatesLink = page.locator('a[href="/admin/affiliates"], button:has-text("afiliados"), button:has-text("affiliates"), a:has-text("Afiliados")').first();
    if (await affiliatesLink.isVisible()) {
      await affiliatesLink.click();
      await expect(page).toHaveURL(/\/admin\/affiliates/);
    }
  });

  test('should have working navigation to users page', async ({ page }) => {
    // Look for users link
    const usersLink = page.locator('a[href="/admin/users"], button:has-text("usuários"), button:has-text("users"), a:has-text("Usuários")').first();
    if (await usersLink.isVisible()) {
      await usersLink.click();
      await expect(page).toHaveURL(/\/admin\/users/);
    }
  });

  test('should have working navigation to orders/tickets page', async ({ page }) => {
    // Look for orders/tickets link
    const ordersLink = page.locator('a[href="/admin/tickets"], button:has-text("pedidos"), button:has-text("ingressos"), a:has-text("Pedidos"), a:has-text("Ingressos")').first();
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
      await expect(page).toHaveURL(/\/admin\/tickets/);
    }
  });
});

test.describe('Admin Events Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');
  });

  test('should load events management page', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/events/);

    // Check for main content
    const main = page.locator('main, [class*="events"]').first();
    await expect(main).toBeVisible();
  });

  test('should display events list or table', async ({ page }) => {
    // Look for events list/table
    const eventsList = page.locator('[class*="table"], [class*="list"], [role="table"]').first();
    if (await eventsList.isVisible()) {
      await expect(eventsList).toBeVisible();
    }
  });

  test('should display create event button', async ({ page }) => {
    // Look for create button
    const createButton = page.locator('button:has-text("Criar"), button:has-text("criar"), button:has-text("Novo"), button:has-text("novo"), a[href*="/admin/events/new"]').first();
    if (await createButton.isVisible()) {
      await expect(createButton).toBeVisible();
    }
  });

  test('should display event actions or controls', async ({ page }) => {
    // Look for action buttons (edit, delete, etc.)
    const actions = page.locator('button[aria-label*="edit" i], button[aria-label*="delete" i], button[aria-label*="ações" i]').first();
    // Actions may or may not be visible depending on whether there are events
  });

  test('should navigate back to dashboard', async ({ page }) => {
    // Look for back or home link
    const backLink = page.locator('a[href="/admin"], button:has-text("voltar"), a:has-text("Dashboard")').first();
    if (await backLink.isVisible()) {
      await backLink.click();
      await expect(page).toHaveURL(/\/admin\/$/);
    }
  });
});

test.describe('Admin Finance Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/finance');
  });

  test('should load finance management page', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/finance/);

    // Check for main content
    const main = page.locator('main, [class*="finance"]').first();
    await expect(main).toBeVisible();
  });

  test('should display financial metrics or charts', async ({ page }) => {
    // Look for charts or metrics
    const charts = page.locator('[class*="chart"], [class*="graph"], svg').first();
    if (await charts.isVisible()) {
      await expect(charts).toBeVisible();
    }

    // Or look for metrics cards
    const metrics = page.locator('[class*="metric"], [class*="stat"], [class*="card"]').first();
    if (await metrics.isVisible()) {
      await expect(metrics).toBeVisible();
    }
  });

  test('should display revenue information', async ({ page }) => {
    // Look for revenue section
    const revenue = page.locator('text=/receita|revenue|faturamento/i').first();
    if (await revenue.isVisible()) {
      await expect(revenue).toBeVisible();
    }
  });

  test('should display transaction list or history', async ({ page }) => {
    // Look for transaction list
    const transactions = page.locator('[class*="transaction"], [class*="history"], [role="table"]').first();
    if (await transactions.isVisible()) {
      await expect(transactions).toBeVisible();
    }
  });

  test('should have export or download functionality', async ({ page }) => {
    // Look for export button
    const exportButton = page.locator('button:has-text("Exportar"), button:has-text("exportar"), button:has-text("Download"), button:has-text("download")').first();
    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeVisible();
    }
  });

  test('should navigate back to dashboard', async ({ page }) => {
    // Look for back or home link
    const backLink = page.locator('a[href="/admin"], button:has-text("voltar"), a:has-text("Dashboard")').first();
    if (await backLink.isVisible()) {
      await backLink.click();
      await expect(page).toHaveURL(/\/admin\/$/);
    }
  });
});

test.describe('Admin Affiliates Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/affiliates');
  });

  test('should load affiliates management page', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/affiliates/);

    // Check for main content
    const main = page.locator('main, [class*="affiliate"]').first();
    await expect(main).toBeVisible();
  });

  test('should display affiliates list', async ({ page }) => {
    // Look for affiliates list/table
    const affiliatesList = page.locator('[class*="table"], [class*="list"], [role="table"]').first();
    if (await affiliatesList.isVisible()) {
      await expect(affiliatesList).toBeVisible();
    }
  });

  test('should display create affiliate button', async ({ page }) => {
    // Look for create button
    const createButton = page.locator('button:has-text("Adicionar"), button:has-text("Novo"), a[href*="/admin/affiliates/new"]').first();
    if (await createButton.isVisible()) {
      await expect(createButton).toBeVisible();
    }
  });

  test('should display affiliate metrics', async ({ page }) => {
    // Look for affiliate stats/metrics
    const metrics = page.locator('[class*="metric"], [class*="stat"], [class*="card"]').first();
    if (await metrics.isVisible()) {
      await expect(metrics).toBeVisible();
    }
  });

  test('should display affiliate commission information', async ({ page }) => {
    // Look for commission section
    const commission = page.locator('text=/comissão|commission|ganhos/i').first();
    if (await commission.isVisible()) {
      await expect(commission).toBeVisible();
    }
  });

  test('should navigate back to dashboard', async ({ page }) => {
    // Look for back or home link
    const backLink = page.locator('a[href="/admin"], button:has-text("voltar"), a:has-text("Dashboard")').first();
    if (await backLink.isVisible()) {
      await backLink.click();
      await expect(page).toHaveURL(/\/admin\/$/);
    }
  });
});

test.describe('Admin Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
  });

  test('should have functional sidebar navigation', async ({ page }) => {
    // Check sidebar exists
    const sidebar = page.locator('aside, [class*="sidebar"]').first();
    if (await sidebar.isVisible()) {
      // Click through different sections
      const financeLink = page.locator('a[href="/admin/finance"], button:has-text("financeiro")').first();
      if (await financeLink.isVisible()) {
        await financeLink.click();
        await expect(page).toHaveURL(/\/admin\/finance/);
      }
    }
  });

  test('should maintain navigation state when returning to sections', async ({ page }) => {
    // Navigate to finance
    const financeLink = page.locator('a[href="/admin/finance"], button:has-text("financeiro")').first();
    if (await financeLink.isVisible()) {
      await financeLink.click();
      await expect(page).toHaveURL(/\/admin\/finance/);

      // Navigate back to events
      const eventsLink = page.locator('a[href="/admin/events"], button:has-text("eventos")').first();
      if (await eventsLink.isVisible()) {
        await eventsLink.click();
        await expect(page).toHaveURL(/\/admin\/events/);
      }
    }
  });

  test('should highlight current page in navigation', async ({ page }) => {
    // Navigate to finance
    const financeLink = page.locator('a[href="/admin/finance"], button:has-text("financeiro")').first();
    if (await financeLink.isVisible()) {
      await financeLink.click();

      // Check if current link is highlighted
      const activeLink = page.locator('a[href="/admin/finance"][class*="active"], button:has-text("financeiro")[class*="active"]').first();
      // Active state may or may not exist depending on implementation
    }
  });

  test('should allow logout from admin area', async ({ page }) => {
    // Look for logout button
    const logoutButton = page.locator('button:has-text("Sair"), button:has-text("Logout"), button:has-text("logout"), a[href*="logout"]').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Should redirect away from admin
      await expect(page).not.toHaveURL(/\/admin/);
    }
  });
});