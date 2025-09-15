import { test, expect } from '@playwright/test';

test.describe('User Registration E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');
  });

  test('should complete user registration flow', async ({ page }) => {
    // Fill in registration form
    await page.fill('[data-testid="name-input"]', 'John Doe');
    await page.fill('[data-testid="email-input"]', 'john.doe@bracu.ac.bd');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'password123');
    await page.fill('[data-testid="bracu-id-input"]', '12345678');
    await page.selectOption('[data-testid="gender-select"]', 'Male');

    // Submit form
    await page.click('[data-testid="signup-button"]');

    // Should redirect to login page with success message
    await expect(page).toHaveURL('/login');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Registration successful');
  });

  test('should validate form fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('[data-testid="signup-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="bracu-id-error"]')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('[data-testid="name-input"]', 'John Doe');
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'password123');
    await page.fill('[data-testid="bracu-id-input"]', '12345678');
    await page.selectOption('[data-testid="gender-select"]', 'Male');

    await page.click('[data-testid="signup-button"]');

    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');
  });

  test('should validate BRACU email requirement', async ({ page }) => {
    await page.fill('[data-testid="name-input"]', 'John Doe');
    await page.fill('[data-testid="email-input"]', 'john@gmail.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'password123');
    await page.fill('[data-testid="bracu-id-input"]', '12345678');
    await page.selectOption('[data-testid="gender-select"]', 'Male');

    await page.click('[data-testid="signup-button"]');

    await expect(page.locator('[data-testid="email-error"]')).toContainText('Must use BRACU email');
  });

  test('should validate password confirmation', async ({ page }) => {
    await page.fill('[data-testid="name-input"]', 'John Doe');
    await page.fill('[data-testid="email-input"]', 'john@bracu.ac.bd');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'different-password');
    await page.fill('[data-testid="bracu-id-input"]', '12345678');
    await page.selectOption('[data-testid="gender-select"]', 'Male');

    await page.click('[data-testid="signup-button"]');

    await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('Passwords do not match');
  });

  test('should handle duplicate email registration', async ({ page }) => {
    // First registration
    await page.fill('[data-testid="name-input"]', 'John Doe');
    await page.fill('[data-testid="email-input"]', 'john@bracu.ac.bd');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'password123');
    await page.fill('[data-testid="bracu-id-input"]', '12345678');
    await page.selectOption('[data-testid="gender-select"]', 'Male');
    await page.click('[data-testid="signup-button"]');

    await expect(page).toHaveURL('/login');

    // Try to register again with same email
    await page.goto('/signup');
    await page.fill('[data-testid="name-input"]', 'Jane Doe');
    await page.fill('[data-testid="email-input"]', 'john@bracu.ac.bd');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'password123');
    await page.fill('[data-testid="bracu-id-input"]', '87654321');
    await page.selectOption('[data-testid="gender-select"]', 'Female');
    await page.click('[data-testid="signup-button"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText('Email already exists');
  });
});
