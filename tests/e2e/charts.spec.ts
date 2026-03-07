import { test, expect } from '@playwright/test';

test.describe('Charts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `Chart Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add rows with data
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1500);
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1500);
  });

  test('switches to chart view from query results', async ({ page }) => {
    // Open query panel
    await page.getByTestId('toggle-query').click();

    // Run a query
    await page.getByTestId('query-input').fill('SELECT * FROM current_sheet');
    await page.getByTestId('run-query-btn').click();
    await page.waitForTimeout(2000);

    // Switch to chart view
    await page.getByTestId('view-chart').click();

    // Chart config should appear
    await expect(page.getByTestId('chart-config')).toBeVisible();
    // Chart view should render
    await expect(page.getByTestId('chart-view')).toBeVisible();
  });

  test('changes chart type', async ({ page }) => {
    await page.getByTestId('toggle-query').click();
    await page.getByTestId('query-input').fill('SELECT * FROM current_sheet');
    await page.getByTestId('run-query-btn').click();
    await page.waitForTimeout(2000);

    await page.getByTestId('view-chart').click();

    // Switch to line chart
    await page.getByTestId('chart-type-line').click();
    await expect(page.getByTestId('chart-view')).toBeVisible();

    // Switch to pie chart
    await page.getByTestId('chart-type-pie').click();
    await expect(page.getByTestId('chart-view')).toBeVisible();
  });

  test('export results buttons exist', async ({ page }) => {
    await page.getByTestId('toggle-query').click();
    await page.getByTestId('query-input').fill('SELECT * FROM current_sheet');
    await page.getByTestId('run-query-btn').click();
    await page.waitForTimeout(2000);

    await expect(page.getByTestId('export-results-csv')).toBeVisible();
    await expect(page.getByTestId('export-results-json')).toBeVisible();
  });
});
