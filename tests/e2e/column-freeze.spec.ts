import { test, expect } from '@playwright/test';
import { createSheetWithData, waitForGrid } from '../helpers/e2e';

test.describe('Column Freezing/Pinning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('freeze a column via menu', async ({ page }) => {
    await createSheetWithData(page, `Freeze Test ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Value', cellType: 'number' },
      { name: 'Status', cellType: 'text' },
    ], [
      { Name: 'Alice', Value: 100, Status: 'Active' },
      { Name: 'Bob', Value: 200, Status: 'Inactive' },
    ]);
    await waitForGrid(page);

    // Open column menu for Name
    await page.getByTestId('col-menu-name').click();
    await page.getByTestId('col-menu-dropdown').waitFor({ state: 'visible' });

    // Click freeze button
    await page.getByTestId('freeze-col-btn').click();
    await page.waitForTimeout(1000);

    // Verify pin icon appears
    await expect(page.getByTestId('pin-icon-name')).toBeVisible();

    // Verify column is in pinned left section
    const pinnedHeader = page.locator('.ag-pinned-left-header');
    await expect(pinnedHeader).toBeVisible();
    await expect(pinnedHeader.getByText('Name')).toBeVisible();
  });

  test('unfreeze a column', async ({ page }) => {
    await createSheetWithData(page, `Unfreeze Test ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Value', cellType: 'number' },
    ], [
      { Name: 'Alice', Value: 100 },
    ]);
    await waitForGrid(page);

    // Freeze first
    await page.getByTestId('col-menu-name').click();
    await page.getByTestId('freeze-col-btn').click();
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('pin-icon-name')).toBeVisible();

    // Now unfreeze
    await page.getByTestId('col-menu-name').click();
    await page.getByTestId('col-menu-dropdown').waitFor({ state: 'visible' });

    // Button should say "Unfreeze Column"
    await expect(page.getByTestId('freeze-col-btn')).toHaveText('Unfreeze Column');
    await page.getByTestId('freeze-col-btn').click();
    await page.waitForTimeout(1000);

    // Pin icon should be gone
    await expect(page.getByTestId('pin-icon-name')).not.toBeVisible();
  });

  test('frozen column state persists after reload', async ({ page }) => {
    await createSheetWithData(page, `Persist Freeze ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Value', cellType: 'number' },
    ], [
      { Name: 'Alice', Value: 100 },
    ]);
    await waitForGrid(page);

    // Freeze Name column
    await page.getByTestId('col-menu-name').click();
    await page.getByTestId('freeze-col-btn').click();
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('pin-icon-name')).toBeVisible();

    // Reload the page
    await page.reload();
    await page.waitForTimeout(1500);

    // Click the sheet again
    const sheetLink = page.getByTestId('sheet-list').locator('button').first();
    await sheetLink.click();
    await page.waitForTimeout(1000);

    // Verify pin icon is still there
    await expect(page.getByTestId('pin-icon-name')).toBeVisible();
    const pinnedHeader = page.locator('.ag-pinned-left-header');
    await expect(pinnedHeader).toBeVisible();
  });

  test('multiple columns can be frozen', async ({ page }) => {
    await createSheetWithData(page, `Multi Freeze ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Value', cellType: 'number' },
      { name: 'Status', cellType: 'text' },
    ], [
      { Name: 'Alice', Value: 100, Status: 'Active' },
    ]);
    await waitForGrid(page);

    // Freeze Name
    await page.getByTestId('col-menu-name').click();
    await page.getByTestId('freeze-col-btn').click();
    await page.waitForTimeout(1000);

    // Freeze Value
    await page.getByTestId('col-menu-value').click();
    await page.getByTestId('freeze-col-btn').click();
    await page.waitForTimeout(1000);

    // Both should have pin icons
    await expect(page.getByTestId('pin-icon-name')).toBeVisible();
    await expect(page.getByTestId('pin-icon-value')).toBeVisible();

    // Both should be in pinned header
    const pinnedHeader = page.locator('.ag-pinned-left-header');
    await expect(pinnedHeader.getByText('Name')).toBeVisible();
    await expect(pinnedHeader.getByText('Value')).toBeVisible();
  });
});
