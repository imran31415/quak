import { test, expect } from '@playwright/test';

test.describe('XLSX Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `XLSX Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add a row with data
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(800);

    const cell = page.locator('[row-index="0"] [col-id="Name"]');
    await cell.dblclick();
    const editor = page.getByRole('textbox', { name: 'Input Editor' });
    await editor.fill('Test Data');
    await editor.press('Enter');
    await page.waitForTimeout(300);
  });

  test('XLSX option is visible in export dropdown', async ({ page }) => {
    await page.getByTestId('export-btn').click();
    await page.waitForTimeout(200);
    await expect(page.getByTestId('export-xlsx')).toBeVisible();
  });

  test('XLSX export triggers download', async ({ page }) => {
    await page.getByTestId('export-btn').click();
    await page.waitForTimeout(200);

    // Listen for download event
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.getByTestId('export-xlsx').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.xlsx');
  });
});
