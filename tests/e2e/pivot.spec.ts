import { test, expect } from '@playwright/test';
import { createSheetWithData, waitForGrid } from '../helpers/e2e';

test.describe('Pivot Table View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('pivot button visible in view switcher', async ({ page }) => {
    await createSheetWithData(page, `Pivot Btn ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Amount', cellType: 'number' },
    ], [
      { Name: 'A', Amount: 10 },
    ]);
    await waitForGrid(page);

    const pivotBtn = page.getByTestId('view-btn-pivot');
    await expect(pivotBtn).toBeVisible();
    await expect(pivotBtn).toContainText('Pivot');
  });

  test('shows empty state when not configured', async ({ page }) => {
    await createSheetWithData(page, `Pivot Empty ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Amount', cellType: 'number' },
    ], [
      { Name: 'A', Amount: 10 },
    ]);
    await waitForGrid(page);

    // Switch to pivot view
    await page.getByTestId('view-btn-pivot').click();
    await page.waitForTimeout(500);

    // Should show empty state
    await expect(page.getByTestId('pivot-view')).toBeVisible();
    await expect(page.getByTestId('pivot-empty')).toBeVisible();
    await expect(page.getByTestId('pivot-empty')).toContainText('Configure the pivot table');
  });

  test('configured pivot renders correct table', async ({ page }) => {
    await createSheetWithData(page, `Pivot Data ${Date.now()}`, [
      { name: 'Category', cellType: 'text' },
      { name: 'Region', cellType: 'dropdown', options: ['East', 'West'] },
      { name: 'Amount', cellType: 'number' },
    ], [
      { Category: 'Widgets', Region: 'East', Amount: 100 },
      { Category: 'Widgets', Region: 'West', Amount: 200 },
      { Category: 'Gadgets', Region: 'East', Amount: 300 },
      { Category: 'Gadgets', Region: 'West', Amount: 400 },
    ]);
    await waitForGrid(page);

    // Switch to pivot view
    await page.getByTestId('view-btn-pivot').click();
    await page.waitForTimeout(500);

    // Configure pivot: Row=Category, Column=Region, Value=Amount, Agg=SUM
    await page.getByTestId('pivot-row-select').selectOption({ label: 'Category' });
    await page.getByTestId('pivot-col-select').selectOption({ label: 'Region' });
    await page.getByTestId('pivot-value-select').selectOption({ label: 'Amount' });
    await page.waitForTimeout(1500);

    // Pivot table should be visible
    await expect(page.getByTestId('pivot-table')).toBeVisible();

    // Check that grand total row exists
    await expect(page.getByTestId('pivot-grand-total')).toBeVisible();
    await expect(page.getByTestId('pivot-grand-total')).toContainText('GRAND TOTAL');

    // Check table contains expected values
    const tableText = await page.getByTestId('pivot-table').textContent();
    expect(tableText).toContain('Gadgets');
    expect(tableText).toContain('Widgets');
    expect(tableText).toContain('East');
    expect(tableText).toContain('West');
    expect(tableText).toContain('TOTAL');
  });

  test('aggregation type changes values', async ({ page }) => {
    await createSheetWithData(page, `Pivot Agg ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Type', cellType: 'dropdown', options: ['A', 'B'] },
      { name: 'Score', cellType: 'number' },
    ], [
      { Name: 'X', Type: 'A', Score: 10 },
      { Name: 'Y', Type: 'A', Score: 20 },
      { Name: 'Z', Type: 'B', Score: 30 },
    ]);
    await waitForGrid(page);

    // Switch to pivot view
    await page.getByTestId('view-btn-pivot').click();
    await page.waitForTimeout(500);

    // Configure pivot
    await page.getByTestId('pivot-row-select').selectOption({ label: 'Name' });
    await page.getByTestId('pivot-col-select').selectOption({ label: 'Type' });
    await page.getByTestId('pivot-value-select').selectOption({ label: 'Score' });
    await page.waitForTimeout(1500);

    // Default is SUM - check grand total
    await expect(page.getByTestId('pivot-table')).toBeVisible();
    const sumText = await page.getByTestId('pivot-grand-total').textContent();
    expect(sumText).toContain('60'); // SUM of all scores

    // Switch to COUNT
    await page.getByTestId('pivot-agg-select').selectOption('COUNT');
    await page.waitForTimeout(1500);

    const countText = await page.getByTestId('pivot-grand-total').textContent();
    expect(countText).toContain('3'); // COUNT of all rows
  });
});
