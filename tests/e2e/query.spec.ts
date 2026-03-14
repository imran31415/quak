import { test, expect } from '@playwright/test';

test.describe('SQL Query Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `Query Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add a row and edit it
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1500);
  });

  test('opens and closes query panel', async ({ page }) => {
    // Open query panel
    await page.getByTestId('toggle-query').click();
    await expect(page.getByTestId('query-panel')).toBeVisible();
    await expect(page.getByTestId('query-input')).toBeVisible();

    // Close query panel
    await page.getByTestId('toggle-query').click();
    await expect(page.getByTestId('query-panel')).not.toBeVisible();
  });

  test('executes a SQL query and shows results', async ({ page }) => {
    // Open query panel
    await page.getByTestId('toggle-query').click();

    // Default query should be pre-filled
    const queryInput = page.getByTestId('query-input');
    await expect(queryInput).toHaveValue(/SELECT.*FROM.*current_sheet/);

    // Run the query
    await page.getByTestId('run-query-btn').click();
    await page.waitForTimeout(2000);

    // Results should be visible
    await expect(page.getByTestId('query-results')).toBeVisible();
    await expect(page.getByTestId('query-results')).toContainText('1 rows');
  });

  test('shows error for invalid SQL', async ({ page }) => {
    await page.getByTestId('toggle-query').click();

    const queryInput = page.getByTestId('query-input');
    await queryInput.fill('INVALID SQL QUERY');
    await page.getByTestId('run-query-btn').click();

    await expect(page.getByTestId('query-error')).toBeVisible({ timeout: 10000 });
  });
});
