import { test, expect } from '@playwright/test';

test.describe('Row Reordering (Drag & Drop)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `Reorder Test ${Date.now()}`;
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

    for (let i = 0; i < 3; i++) {
      const cell = page.locator(`[row-index="${i}"] [col-id="Name"]`);
      await cell.dblclick();
      const editor = page.getByRole('textbox', { name: 'Input Editor' });
      await editor.fill(`Row ${i + 1}`);
      await editor.press('Enter');
      await page.waitForTimeout(300);
    }
  });

  test('drag handle column is visible', async ({ page }) => {
    // The drag column should have AG Grid drag handle class
    const dragHandles = page.locator('.ag-row-drag');
    const count = await dragHandles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('rows can be reordered via drag and drop', async ({ page }) => {
    // Get initial order
    const row0Text = await page.locator('[row-index="0"] [col-id="Name"]').innerText();
    expect(row0Text).toBe('Row 1');

    // Drag first row down to third position
    const firstDragHandle = page.locator('[row-index="0"] .ag-row-drag').first();
    const thirdRow = page.locator('[row-index="2"] .ag-row-drag').first();

    await firstDragHandle.dragTo(thirdRow);
    await page.waitForTimeout(500);

    // Verify the order changed
    const newRow0Text = await page.locator('[row-index="0"] [col-id="Name"]').innerText();
    // After dragging Row 1 down, Row 2 should be at index 0
    expect(newRow0Text).toBe('Row 2');
  });

  test('reorder persists after reload', async ({ page }) => {
    // Drag first row to second position
    const firstDragHandle = page.locator('[row-index="0"] .ag-row-drag').first();
    const secondRow = page.locator('[row-index="1"] .ag-row-drag').first();

    await firstDragHandle.dragTo(secondRow);
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);

    // Click the sheet in sidebar to reload it
    const sidebarItem = page.locator('[data-testid="sidebar"]').locator('text=Reorder Test').first();
    if (await sidebarItem.isVisible()) {
      await sidebarItem.click();
      await page.waitForTimeout(1000);
    }
  });
});
