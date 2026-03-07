import { test, expect } from '@playwright/test';

test.describe('Multi-Sheet SQL Queries', () => {
  test('query panel shows table list', async ({ page }) => {
    await page.goto('/');

    // Create first sheet
    const sheetName1 = `Sheet A ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName1);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add row
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1000);

    // Create second sheet
    const sheetName2 = `Sheet B ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName2);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await page.waitForTimeout(1000);

    // Open query panel
    await page.getByTestId('toggle-query').click();
    await expect(page.getByTestId('query-panel')).toBeVisible();

    // Table list should show both sheets
    await expect(page.getByTestId('table-list')).toBeVisible();
  });

  test('runs query against current sheet', async ({ page }) => {
    await page.goto('/');

    const sheetName = `Query Multi ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1500);

    // Open query panel and run
    await page.getByTestId('toggle-query').click();
    const queryInput = page.getByTestId('query-input');
    await queryInput.fill('SELECT COUNT(*) as total FROM current_sheet');
    await page.getByTestId('run-query-btn').click();
    await page.waitForTimeout(2000);

    await expect(page.getByTestId('query-results')).toBeVisible();
    await expect(page.getByTestId('query-results')).toContainText('1 rows');
  });
});
