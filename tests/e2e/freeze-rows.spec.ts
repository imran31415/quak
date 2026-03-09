import { test, expect } from '@playwright/test';

test.describe('Freeze Rows (Pin to Top)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `Freeze Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add 3 rows with data
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('add-row-btn').click();
      await page.waitForTimeout(800);
    }

    // Fill Name column
    for (let i = 0; i < 3; i++) {
      const cell = page.locator(`[row-index="${i}"] [col-id="Name"]`);
      await cell.dblclick();
      const editor = page.getByRole('textbox', { name: 'Input Editor' });
      await editor.fill(`Row ${i + 1}`);
      await editor.press('Enter');
      await page.waitForTimeout(300);
    }
  });

  test('pins a row to the top', async ({ page }) => {
    // Click pin button on second row
    await page.getByTestId('row-pin-1').click();
    await page.waitForTimeout(500);

    // The pinned row should appear in the floating top section
    const pinnedTop = page.locator('.ag-floating-top-container [col-id="Name"]');
    await expect(pinnedTop).toBeVisible();
    await expect(pinnedTop).toContainText('Row 2');
  });

  test('pin button exists and row appears in pinned section', async ({ page }) => {
    // Pin first row
    await page.getByTestId('row-pin-0').click();
    await page.waitForTimeout(500);

    // Verify it's pinned by checking floating top content
    const pinnedTop = page.locator('.ag-floating-top-container [col-id="Name"]');
    await expect(pinnedTop).toBeVisible();
    await expect(pinnedTop).toContainText('Row 1');

    // The main grid should still show Row 2 and Row 3 but not Row 1
    const row0Main = page.locator('.ag-body-viewport [row-index="0"] [col-id="Name"]');
    await expect(row0Main).toContainText('Row 2');
  });
});
