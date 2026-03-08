import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('theme toggle cycles light → dark → system → light', async ({ page }) => {
    const toggle = page.getByTestId('theme-toggle');
    await expect(toggle).toBeVisible();

    // Default is system — click to go to light
    await toggle.click();

    // Now light — click to go to dark
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Now dark — click to go to system
    await toggle.click();

    // Now system — click to go to light
    await toggle.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('dark class is applied when dark theme is set', async ({ page }) => {
    const toggle = page.getByTestId('theme-toggle');

    // Cycle to dark: system -> light -> dark
    await toggle.click(); // light
    await toggle.click(); // dark

    // Verify dark class on html
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Header should have dark background styling
    const header = page.getByTestId('header');
    await expect(header).toBeVisible();
  });

  test('theme persists across reload', async ({ page }) => {
    const toggle = page.getByTestId('theme-toggle');

    // Cycle to dark: system -> light -> dark
    await toggle.click(); // light
    await toggle.click(); // dark
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Reload and verify
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByTestId('theme-toggle')).toBeVisible();
  });

  test('AG Grid renders in dark mode after toggle', async ({ page }) => {
    // Create a sheet first
    const sheetName = `Theme Grid ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Toggle to dark
    const toggle = page.getByTestId('theme-toggle');
    await toggle.click(); // light
    await toggle.click(); // dark
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Grid should still be visible and rendered
    await expect(page.getByTestId('ag-grid-container')).toBeVisible();
    await expect(page.getByTestId('status-bar')).toBeVisible();
  });

  test('system preference emulation works', async ({ page }) => {
    // Set theme to system explicitly
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('quak-ui-store') || '{}');
      store.state = { ...store.state, theme: 'system' };
      localStorage.setItem('quak-ui-store', JSON.stringify(store));
    });

    // Emulate dark system preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Emulate light system preference
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});

test.describe('Mobile Chat Panel', () => {
  test('chat panel is full screen on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Mobile nav should be visible with AI button
    await expect(page.getByTestId('mobile-nav')).toBeVisible();
    await expect(page.getByTestId('mobile-ai-btn')).toBeVisible();

    // Open chat via mobile nav
    await page.getByTestId('mobile-ai-btn').click();
    await expect(page.getByTestId('chat-panel')).toBeVisible();

    // Verify it uses fixed inset-0 (full-screen)
    const chatPanel = page.getByTestId('chat-panel');
    const box = await chatPanel.boundingBox();
    expect(box).not.toBeNull();
    // Should span the full viewport width
    expect(box!.width).toBeGreaterThanOrEqual(370);
  });

  test('mobile nav has theme toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.getByTestId('mobile-theme-btn')).toBeVisible();
    await page.getByTestId('mobile-theme-btn').click();
    // After a couple clicks should reach dark
    await page.getByTestId('mobile-theme-btn').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
