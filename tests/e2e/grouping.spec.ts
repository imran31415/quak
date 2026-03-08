import { test, expect } from '@playwright/test';
import { createSheetWithData, waitForGrid } from '../helpers/e2e';

test.describe('Row Grouping & Subtotals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('group by dropdown column shows headers and subtotals', async ({ page }) => {
    await createSheetWithData(page, `Group Test ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Category', cellType: 'dropdown', options: ['A', 'B'] },
      { name: 'Value', cellType: 'number' },
    ], [
      { Name: 'Item 1', Category: 'A', Value: 100 },
      { Name: 'Item 2', Category: 'A', Value: 200 },
      { Name: 'Item 3', Category: 'B', Value: 300 },
    ]);
    await waitForGrid(page);

    // Group by Category
    await page.getByTestId('col-menu-category').click();
    await page.getByTestId('col-menu-dropdown').waitFor({ state: 'visible' });
    await page.getByTestId('group-by-btn').click();
    await page.waitForTimeout(500);

    // Toolbar should show grouping indicator
    await expect(page.getByTestId('grouping-indicator')).toBeVisible();
    await expect(page.getByTestId('grouping-indicator')).toContainText('Category');

    // Group headers should be visible
    await expect(page.getByTestId('group-header-group_A')).toBeVisible();
    await expect(page.getByTestId('group-header-group_B')).toBeVisible();

    // Subtotal rows should be visible
    const subtotalCells = page.locator('[data-testid="subtotal-cell"]');
    expect(await subtotalCells.count()).toBeGreaterThan(0);
  });

  test('collapse and expand groups', async ({ page }) => {
    await createSheetWithData(page, `Collapse Test ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Status', cellType: 'dropdown', options: ['Done', 'Pending'] },
      { name: 'Score', cellType: 'number' },
    ], [
      { Name: 'Task 1', Status: 'Done', Score: 10 },
      { Name: 'Task 2', Status: 'Done', Score: 20 },
      { Name: 'Task 3', Status: 'Pending', Score: 30 },
    ]);
    await waitForGrid(page);

    // Group by Status
    await page.getByTestId('col-menu-status').click();
    await page.getByTestId('group-by-btn').click();
    await page.waitForTimeout(500);

    // Count rows before collapse
    const rowsBefore = await page.locator('.ag-row').count();

    // Click on Done group header to collapse
    await page.getByTestId('group-header-group_Done').click();
    await page.waitForTimeout(300);

    // Rows should decrease (Done group collapsed, hides 2 data + 1 subtotal)
    const rowsAfter = await page.locator('.ag-row').count();
    expect(rowsAfter).toBeLessThan(rowsBefore);

    // Click again to expand
    await page.getByTestId('group-header-group_Done').click();
    await page.waitForTimeout(300);

    const rowsExpanded = await page.locator('.ag-row').count();
    expect(rowsExpanded).toBe(rowsBefore);
  });

  test('toolbar shows grouping indicator and remove button', async ({ page }) => {
    await createSheetWithData(page, `Indicator Test ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Type', cellType: 'dropdown', options: ['X', 'Y'] },
    ], [
      { Name: 'A', Type: 'X' },
      { Name: 'B', Type: 'Y' },
    ]);
    await waitForGrid(page);

    // No indicator initially
    await expect(page.getByTestId('grouping-indicator')).not.toBeVisible();

    // Group by Type
    await page.getByTestId('col-menu-type').click();
    await page.getByTestId('group-by-btn').click();
    await page.waitForTimeout(500);

    // Indicator should show
    await expect(page.getByTestId('grouping-indicator')).toBeVisible();
    await expect(page.getByTestId('grouping-indicator')).toContainText('Type');

    // Remove grouping via toolbar
    await page.getByTestId('remove-grouping-btn').click();
    await page.waitForTimeout(500);

    // Indicator should disappear
    await expect(page.getByTestId('grouping-indicator')).not.toBeVisible();
  });

  test('remove grouping returns to normal view', async ({ page }) => {
    await createSheetWithData(page, `Remove Group ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Tag', cellType: 'dropdown', options: ['Alpha', 'Beta'] },
    ], [
      { Name: 'Item 1', Tag: 'Alpha' },
      { Name: 'Item 2', Tag: 'Beta' },
    ]);
    await waitForGrid(page);

    // Group
    await page.getByTestId('col-menu-tag').click();
    await page.getByTestId('group-by-btn').click();
    await page.waitForTimeout(500);

    // Now use menu to remove grouping
    await page.getByTestId('col-menu-tag').click();
    await page.getByTestId('col-menu-dropdown').waitFor({ state: 'visible' });
    await expect(page.getByTestId('group-by-btn')).toHaveText('Remove Grouping');
    await page.getByTestId('group-by-btn').click();
    await page.waitForTimeout(500);

    // Group headers should be gone
    await expect(page.getByTestId('group-header-group_Alpha')).not.toBeVisible();
    await expect(page.getByTestId('grouping-indicator')).not.toBeVisible();
  });
});
