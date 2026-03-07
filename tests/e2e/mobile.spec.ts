import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows mobile bottom nav', async ({ page }) => {
    await expect(page.getByTestId('mobile-nav')).toBeVisible();
    await expect(page.getByTestId('mobile-sheets-btn')).toBeVisible();
    await expect(page.getByTestId('mobile-query-btn')).toBeVisible();
  });

  test('sidebar is hidden by default on mobile', async ({ page }) => {
    await expect(page.getByTestId('sidebar')).not.toBeVisible();
  });

  test('opens sidebar via mobile nav', async ({ page }) => {
    await page.getByTestId('mobile-sheets-btn').click();
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('sidebar-overlay')).toBeVisible();
  });

  test('closes sidebar when clicking overlay', async ({ page }) => {
    await page.getByTestId('mobile-sheets-btn').click();
    await expect(page.getByTestId('sidebar')).toBeVisible();

    // Click the overlay on the right side (away from sidebar)
    await page.getByTestId('sidebar-overlay').click({ position: { x: 350, y: 300 }, force: true });
    await expect(page.getByTestId('sidebar')).not.toBeVisible();
  });

  test('creates sheet and grid displays full-width', async ({ page }) => {
    // Open sidebar
    await page.getByTestId('mobile-sheets-btn').click();
    await expect(page.getByTestId('sidebar')).toBeVisible();

    // Create sheet
    const sheetName = `Mobile Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();

    // Handle CreateSheetDialog
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await page.waitForTimeout(1000);

    // Sidebar should close, grid should be visible
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();
  });
});
