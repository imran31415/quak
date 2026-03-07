import { test, expect } from '@playwright/test';

test.describe('Row Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `Rows Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add 3 rows
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1000);
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1000);
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1000);
  });

  test('deletes a single row via row action button', async ({ page }) => {
    await expect(page.getByTestId('status-bar')).toContainText('3 rows');

    await page.getByTestId('row-delete-0').click();
    await page.waitForTimeout(1000);

    await expect(page.getByTestId('status-bar')).toContainText('2 rows');
  });

  test('selects rows with checkboxes', async ({ page }) => {
    await page.getByTestId('row-select-0').click();
    await page.getByTestId('row-select-1').click();

    // Should show bulk delete button
    await expect(page.getByTestId('delete-selected-btn')).toBeVisible();
    await expect(page.getByTestId('delete-selected-btn')).toContainText('Delete 2 rows');
  });

  test('bulk deletes selected rows', async ({ page }) => {
    await page.getByTestId('row-select-0').click();
    await page.getByTestId('row-select-2').click();

    await page.getByTestId('delete-selected-btn').click();
    await page.waitForTimeout(1000);

    await expect(page.getByTestId('status-bar')).toContainText('1 rows');
  });
});
