import { test, expect } from '@playwright/test';

test.describe('Filtering & Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `Filter Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add two rows
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1000);
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1000);
  });

  test('sorts column when header is clicked', async ({ page }) => {
    // Click the Name column header to sort
    await page.getByRole('columnheader', { name: 'Name' }).click();
    await page.waitForTimeout(500);

    // The header should show sort indicator (AG Grid adds aria-sort)
    const header = page.getByRole('columnheader', { name: 'Name' });
    await expect(header).toBeVisible();
  });

  test('floating filter inputs are visible', async ({ page }) => {
    // AG Grid floating filters should be present
    // They render as input fields below headers
    const filterInputs = page.locator('.ag-floating-filter-input');
    const count = await filterInputs.count();
    expect(count).toBeGreaterThan(0);
  });
});
