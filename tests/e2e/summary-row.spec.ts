import { test, expect } from '@playwright/test';

test.describe('Summary Row (Inline Column Totals)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `Totals Test ${Date.now()}`;
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

    // Fill Name column (text)
    for (let i = 0; i < 3; i++) {
      const cell = page.locator(`[row-index="${i}"] [col-id="Name"]`);
      await cell.dblclick();
      const editor = page.getByRole('textbox', { name: 'Input Editor' });
      await editor.fill(`Item ${i + 1}`);
      await editor.press('Enter');
      await page.waitForTimeout(300);
    }

    // Fill Value column (number)
    for (let i = 0; i < 3; i++) {
      const cell = page.locator(`[row-index="${i}"] [col-id="Value"]`);
      await cell.dblclick();
      const editor = page.getByRole('textbox', { name: 'Input Editor' });
      await editor.fill(`${(i + 1) * 10}`);
      await editor.press('Enter');
      await page.waitForTimeout(300);
    }
  });

  test('toggles totals row on and off', async ({ page }) => {
    // Initially no pinned bottom row
    const pinnedBottom = page.locator('.ag-floating-bottom');

    // Click totals toggle
    await page.getByTestId('totals-toggle').click();
    await page.waitForTimeout(500);

    // Pinned bottom row should appear with sum
    const pinnedBottomRow = page.locator('.ag-floating-bottom-container [col-id="Value"]');
    await expect(pinnedBottomRow).toBeVisible();
    await expect(pinnedBottomRow).toContainText('Sum: 60');

    // Name column should show "3 filled"
    const nameCell = page.locator('.ag-floating-bottom-container [col-id="Name"]');
    await expect(nameCell).toContainText('3 filled');

    // Toggle off
    await page.getByTestId('totals-toggle').click();
    await page.waitForTimeout(500);

    // Pinned bottom should be empty
    await expect(page.locator('.ag-floating-bottom-container [col-id="Value"]')).not.toBeVisible();
  });

  test('summary row is not editable', async ({ page }) => {
    await page.getByTestId('totals-toggle').click();
    await page.waitForTimeout(500);

    // Try double-clicking the summary row - should not enter edit mode
    const summaryCell = page.locator('.ag-floating-bottom-container [col-id="Name"]');
    await summaryCell.dblclick();
    await page.waitForTimeout(300);

    // No editor should be visible in the summary row area
    const editor = page.locator('.ag-floating-bottom-container .ag-cell-edit-input');
    await expect(editor).not.toBeVisible();
  });
});
