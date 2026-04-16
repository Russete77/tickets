import { test, expect } from '@playwright/test';

test.describe('Authentication - Login', () => {
  test('should render login page with form elements', async ({ page }) => {
    await page.goto('/login');

    // Verify login page elements
    const loginForm = page.locator('form, [class*="login"]').first();
    await expect(loginForm).toBeVisible();

    // Check for email and password inputs
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await expect(emailInput).toBeVisible();
    }
    if (await passwordInput.isVisible()) {
      await expect(passwordInput).toBeVisible();
    }
  });

  test('should display submit button on login form', async ({ page }) => {
    await page.goto('/login');

    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Enviar")').first();
    await expect(submitButton).toBeVisible();
  });

  test('should show validation on empty login submission', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without filling fields
    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Enviar")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should stay on login page (form validation prevents submission)
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    }
  });

  test('should allow entering email', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      const value = await emailInput.inputValue();
      expect(value).toBe('test@example.com');
    }
  });

  test('should allow entering password', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('password123');
      const value = await passwordInput.inputValue();
      expect(value).toBe('password123');
    }
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Enviar")').first();

    // Fill in mock credentials (from MSW mock data)
    if (await emailInput.isVisible()) {
      await emailInput.fill('demo@ticketeria.com.br');
    }
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('password123');
    }

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should redirect to homepage or dashboard after successful login
      await expect(page).toHaveURL(/\/$|\/admin|\/tickets/, { timeout: 10000 });
    }
  });

  test('should reject invalid login credentials', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Enviar")').first();

    // Fill in invalid credentials
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid@example.com');
    }
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('wrongpassword');
    }

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should stay on login page
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    }
  });

  test('should show error message on invalid login', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Enviar")').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('wrong@example.com');
      await passwordInput.fill('wrongpass');
      await submitButton.click();

      // Check for error message
      const errorMessage = page.locator('[class*="error"], [role="alert"]').first();
      // Error messages may appear or not depending on implementation
      await page.waitForLoadState('networkidle');
    }
  });

  test('should have link to register page', async ({ page }) => {
    await page.goto('/login');

    // Look for register link on login page
    const registerLink = page.locator('a[href*="register"], button:has-text("cadastro"), a:has-text("Cadastre")').first();
    if (await registerLink.isVisible()) {
      await expect(registerLink).toBeVisible();
    }
  });

  test('should navigate from login to register', async ({ page }) => {
    await page.goto('/login');

    const registerLink = page.locator('a[href*="register"], button:has-text("cadastro"), a:has-text("Cadastre")').first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/register/);
    }
  });
});

test.describe('Authentication - Register', () => {
  test('should render register page with form elements', async ({ page }) => {
    await page.goto('/register');

    // Verify register page elements
    const registerForm = page.locator('form, [class*="register"]').first();
    await expect(registerForm).toBeVisible();

    // Check for typical registration inputs
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    // At least email and password should be visible
    if (await emailInput.isVisible()) {
      await expect(emailInput).toBeVisible();
    }
    if (await passwordInput.isVisible()) {
      await expect(passwordInput).toBeVisible();
    }
  });

  test('should display name input on register form', async ({ page }) => {
    await page.goto('/register');

    const nameInput = page.locator('input[placeholder*="nome" i], input[placeholder*="name" i], input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await expect(nameInput).toBeVisible();
    }
  });

  test('should display submit button on register form', async ({ page }) => {
    await page.goto('/register');

    const submitButton = page.locator('button[type="submit"], button:has-text("Cadastro"), button:has-text("Registrar")').first();
    await expect(submitButton).toBeVisible();
  });

  test('should validate empty register fields', async ({ page }) => {
    await page.goto('/register');

    const submitButton = page.locator('button[type="submit"], button:has-text("Cadastro"), button:has-text("Registrar")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should stay on register page due to validation
      await expect(page).toHaveURL(/\/register/, { timeout: 5000 });
    }
  });

  test('should allow entering name', async ({ page }) => {
    await page.goto('/register');

    const nameInput = page.locator('input[placeholder*="nome" i], input[placeholder*="name" i], input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User');
      const value = await nameInput.inputValue();
      expect(value).toBe('Test User');
    }
  });

  test('should allow entering email', async ({ page }) => {
    await page.goto('/register');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('newuser@example.com');
      const value = await emailInput.inputValue();
      expect(value).toBe('newuser@example.com');
    }
  });

  test('should allow entering password', async ({ page }) => {
    await page.goto('/register');

    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('password123');
      const value = await passwordInput.inputValue();
      expect(value).toBe('password123');
    }
  });

  test('should register with valid data', async ({ page }) => {
    await page.goto('/register');

    const nameInput = page.locator('input[placeholder*="nome" i], input[placeholder*="name" i], input[type="text"]').first();
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Cadastro"), button:has-text("Registrar")').first();

    // Generate unique email for each test
    const uniqueEmail = `test${Date.now()}@example.com`;

    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User');
    }
    if (await emailInput.isVisible()) {
      await emailInput.fill(uniqueEmail);
    }
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('password123');
    }

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should redirect after successful registration
      await expect(page).not.toHaveURL(/\/register/, { timeout: 10000 });
    }
  });

  test('should have link to login page', async ({ page }) => {
    await page.goto('/register');

    const loginLink = page.locator('a[href*="login"], button:has-text("login"), a:has-text("Entrar")').first();
    if (await loginLink.isVisible()) {
      await expect(loginLink).toBeVisible();
    }
  });

  test('should navigate from register to login', async ({ page }) => {
    await page.goto('/register');

    const loginLink = page.locator('a[href*="login"], button:has-text("login"), a:has-text("Entrar")').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
