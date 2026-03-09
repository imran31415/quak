import { test, expect } from '@playwright/test';

test.describe('Audit Log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `Audit Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();
  });

  test('audit log toggle button is visible', async ({ page }) => {
    await expect(page.getByTestId('audit-log-toggle')).toBeVisible();
  });

  test('opens and closes audit panel', async ({ page }) => {
    await page.getByTestId('audit-log-toggle').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('audit-log-panel')).toBeVisible();

    await page.getByTestId('audit-log-close').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('audit-log-panel')).not.toBeVisible();
  });

  test('shows empty state when no changes', async ({ page }) => {
    await page.getByTestId('audit-log-toggle').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('audit-log-empty')).toBeVisible();
  });

  test('logs row addition', async ({ page }) => {
    // Add a row
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1000);

    // Open audit panel
    await page.getByTestId('audit-log-toggle').click();
    await page.waitForTimeout(500);

    // Should show an entry
    const entries = page.getByTestId('audit-log-entry');
    const count = await entries.count();
    expect(count).toBeGreaterThan(0);
  });

  test('logs cell edit', async ({ page }) => {
    // Add a row and edit a cell
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(800);

    const cell = page.locator('[row-index="0"] [col-id="Name"]');
    await cell.dblclick();
    const editor = page.getByRole('textbox', { name: 'Input Editor' });
    await editor.fill('Test Data');
    await editor.press('Enter');
    await page.waitForTimeout(500);

    // Open audit panel
    await page.getByTestId('audit-log-toggle').click();
    await page.waitForTimeout(500);

    // Should show entries for row_add and cell_update
    const entries = page.getByTestId('audit-log-entry');
    const count = await entries.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
