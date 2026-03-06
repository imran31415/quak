import { test, expect } from '@playwright/test';

test.describe('Cell Editing', () => {
  let sheetName: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    sheetName = `Cells Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add a row
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1500);
  });

  test('edits a text cell', async ({ page }) => {
    // Double-click the Name cell to edit
    const nameCell = page.getByRole('gridcell').first();
    await nameCell.dblclick();

    const editor = page.getByRole('textbox', { name: 'Input Editor' });
    await expect(editor).toBeVisible();
    await editor.fill('Test Name');
    await editor.press('Enter');

    // Verify the cell shows the new value
    await expect(page.getByRole('gridcell', { name: 'Test Name' })).toBeVisible();
  });

  test('toggles a checkbox cell', async ({ page }) => {
    const checkbox = page.getByTestId('checkbox-cell').first();
    await expect(checkbox).not.toBeChecked();

    // Toggle on
    await checkbox.click();
    await page.waitForTimeout(500);
    await expect(checkbox).toBeChecked();

    // Toggle off
    await checkbox.click();
    await page.waitForTimeout(500);
    await expect(checkbox).not.toBeChecked();
  });

  test('edits a number cell', async ({ page }) => {
    // The Value column is the second cell — double-click to edit
    const valueCell = page.getByRole('gridcell', { name: '0' }).first();
    await valueCell.dblclick();

    const editor = page.getByRole('textbox', { name: 'Input Editor' });
    await editor.fill('42');
    await editor.press('Enter');

    await expect(page.getByRole('gridcell', { name: '42' })).toBeVisible();
  });
});
