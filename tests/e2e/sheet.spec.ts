import { test, expect } from '@playwright/test';

test.describe('Sheet CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows empty state on first load', async ({ page }) => {
    await expect(page.getByTestId('header')).toBeVisible();
    await expect(page.getByText('No sheet selected')).toBeVisible();
  });

  test('creates a new sheet and displays grid', async ({ page }) => {
    const sheetName = `E2E Sheet ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();

    // Sheet should appear in sidebar and grid should load
    await expect(page.getByText(sheetName)).toBeVisible();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();
    await expect(page.getByTestId('status-bar')).toContainText('0 rows');
    await expect(page.getByTestId('status-bar')).toContainText('6 columns');
  });

  test('adds rows to a sheet', async ({ page }) => {
    const sheetName = `Rows Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add two rows
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1000);
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1000);

    await expect(page.getByTestId('status-bar')).toContainText('2 rows');
  });

  test('persists sheet data across page reloads', async ({ page }) => {
    const sheetName = `Persist Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add a row
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1500);

    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);

    // Sheet should still be in sidebar
    await expect(page.getByText(sheetName)).toBeVisible();

    // Click the sheet
    await page.getByText(sheetName).click();
    await page.waitForTimeout(1000);

    // Row should still be there
    await expect(page.getByTestId('status-bar')).toContainText('1 rows');
  });

  test('deletes a sheet', async ({ page }) => {
    const sheetName = `Delete Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Set up dialog handler to accept the confirm
    page.on('dialog', (dialog) => dialog.accept());

    // Find the delete button for this specific sheet using data-testid
    const sheetItem = page.getByText(sheetName);
    const container = sheetItem.locator('..');
    await container.locator('button[data-testid^="delete-sheet-"]').click();
    await page.waitForTimeout(500);

    // Sheet should be removed
    await expect(page.getByText(sheetName)).not.toBeVisible();
    await expect(page.getByText('No sheet selected')).toBeVisible();
  });
});
