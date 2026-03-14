import { test, expect } from '@playwright/test';
import { createSheetWithData, waitForGrid } from '../helpers/e2e';

test.describe('Dashboard View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('dashboard button visible in view switcher', async ({ page }) => {
    await createSheetWithData(page, `Dash Btn ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Amount', cellType: 'number' },
    ], [
      { Name: 'A', Amount: 10 },
    ]);
    await waitForGrid(page);

    const dashBtn = page.getByTestId('view-btn-dashboard');
    await expect(dashBtn).toBeVisible();
    await expect(dashBtn).toContainText('Dashboard');
  });

  test('shows empty state when no widgets', async ({ page }) => {
    await createSheetWithData(page, `Dash Empty ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Amount', cellType: 'number' },
    ], [
      { Name: 'A', Amount: 10 },
    ]);
    await waitForGrid(page);

    await page.getByTestId('view-btn-dashboard').click();
    await page.waitForTimeout(500);

    await expect(page.getByTestId('dashboard-view')).toBeVisible();
    await expect(page.getByTestId('dashboard-empty')).toBeVisible();
    await expect(page.getByTestId('dashboard-empty')).toContainText('No widgets configured');
  });

  test('add metric widget and see computed value', async ({ page }) => {
    await createSheetWithData(page, `Dash Metric ${Date.now()}`, [
      { name: 'Item', cellType: 'text' },
      { name: 'Price', cellType: 'number' },
    ], [
      { Item: 'A', Price: 100 },
      { Item: 'B', Price: 200 },
      { Item: 'C', Price: 300 },
    ]);
    await waitForGrid(page);

    await page.getByTestId('view-btn-dashboard').click();
    await page.waitForTimeout(500);

    // Add metric widget
    await page.getByTestId('add-metric-widget').click();
    await page.waitForTimeout(300);

    // Should no longer show empty state
    await expect(page.getByTestId('dashboard-empty')).not.toBeVisible();

    // Open config and configure
    await page.getByTestId('widget-config-toggle').click();
    await page.waitForTimeout(200);
    await page.getByTestId('metric-column-select').selectOption('Price');
    // Default aggregation is SUM
    await page.waitForTimeout(1500);

    // Should show the computed SUM value (600)
    await expect(page.getByTestId('metric-value')).toBeVisible();
    await expect(page.getByTestId('metric-value')).toContainText('600');
  });

  test('add chart widget and see chart rendered', async ({ page }) => {
    await createSheetWithData(page, `Dash Chart ${Date.now()}`, [
      { name: 'Category', cellType: 'text' },
      { name: 'Revenue', cellType: 'number' },
    ], [
      { Category: 'Widgets', Revenue: 500 },
      { Category: 'Gadgets', Revenue: 300 },
      { Category: 'Tools', Revenue: 700 },
    ]);
    await waitForGrid(page);

    await page.getByTestId('view-btn-dashboard').click();
    await page.waitForTimeout(500);

    // Add chart widget
    await page.getByTestId('add-chart-widget').click();
    await page.waitForTimeout(300);

    // Open config
    await page.getByTestId('widget-config-toggle').click();
    await page.waitForTimeout(200);

    // Configure: X=Category, Y=Revenue
    await page.getByTestId('chart-x-select').selectOption('Category');
    await page.getByTestId('chart-y-Revenue').check();
    await page.waitForTimeout(1500);

    // Chart should render
    await expect(page.getByTestId('chart-view')).toBeVisible();
  });

  test('add table widget and see data table', async ({ page }) => {
    await createSheetWithData(page, `Dash Table ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Score', cellType: 'number' },
    ], [
      { Name: 'Alice', Score: 95 },
      { Name: 'Bob', Score: 87 },
    ]);
    await waitForGrid(page);

    await page.getByTestId('view-btn-dashboard').click();
    await page.waitForTimeout(500);

    // Add table widget
    await page.getByTestId('add-table-widget').click();
    await page.waitForTimeout(300);

    // Open config
    await page.getByTestId('widget-config-toggle').click();
    await page.waitForTimeout(200);

    // Select columns
    await page.getByTestId('table-col-Name').check();
    await page.getByTestId('table-col-Score').check();
    await page.waitForTimeout(1500);

    // Table should show data
    await expect(page.getByTestId('table-display')).toBeVisible();
    const tableText = await page.getByTestId('table-display').textContent();
    expect(tableText).toContain('Alice');
    expect(tableText).toContain('Bob');
    expect(tableText).toContain('95');
  });

  test('remove widget makes it disappear', async ({ page }) => {
    await createSheetWithData(page, `Dash Remove ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Value', cellType: 'number' },
    ], [
      { Name: 'X', Value: 1 },
    ]);
    await waitForGrid(page);

    await page.getByTestId('view-btn-dashboard').click();
    await page.waitForTimeout(500);

    // Add a metric widget
    await page.getByTestId('add-metric-widget').click();
    await page.waitForTimeout(300);

    // Widget should exist
    const widgets = page.locator('[data-widget-type]');
    await expect(widgets).toHaveCount(1);

    // Remove it
    await page.getByTestId('widget-remove').click();
    await page.waitForTimeout(300);

    // Should be back to empty state
    await expect(page.getByTestId('dashboard-empty')).toBeVisible();
    await expect(widgets).toHaveCount(0);
  });

  test('widget persistence across page reload', async ({ page }) => {
    await createSheetWithData(page, `Dash Persist ${Date.now()}`, [
      { name: 'Item', cellType: 'text' },
      { name: 'Qty', cellType: 'number' },
    ], [
      { Item: 'A', Qty: 5 },
    ]);
    await waitForGrid(page);

    await page.getByTestId('view-btn-dashboard').click();
    await page.waitForTimeout(500);

    // Add widgets
    await page.getByTestId('add-metric-widget').click();
    await page.waitForTimeout(300);
    await page.getByTestId('add-chart-widget').click();
    await page.waitForTimeout(300);

    // Should have 2 widgets
    const widgets = page.locator('[data-widget-type]');
    await expect(widgets).toHaveCount(2);

    // Reload
    await page.reload();
    await page.waitForTimeout(1000);

    // Widgets should still be there (persisted in localStorage via Zustand)
    const widgetsAfterReload = page.locator('[data-widget-type]');
    await expect(widgetsAfterReload).toHaveCount(2);
  });
});
