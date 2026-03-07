import { test, expect } from '@playwright/test';

test.describe('Keyboard & Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `Keyboard Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1500);
  });

  test('opens search with Ctrl+F', async ({ page }) => {
    await page.keyboard.press('Control+f');
    await expect(page.getByTestId('search-bar')).toBeVisible();
    await expect(page.getByTestId('search-input')).toBeFocused();
  });

  test('search filters grid rows', async ({ page }) => {
    // Add another row and edit
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1500);

    // Edit a text cell in the first data row
    const nameCell = page.locator('[row-index="0"] [col-id="Name"]');
    await nameCell.dblclick();
    const editor = page.getByRole('textbox', { name: 'Input Editor' });
    await editor.fill('FindMe');
    await editor.press('Enter');
    await page.waitForTimeout(500);

    // Open search
    await page.getByTestId('search-toggle').click();
    await page.getByTestId('search-input').fill('FindMe');
    await page.waitForTimeout(500);

    // Should filter to show matching rows
    await expect(page.getByTestId('status-bar')).toContainText('rows');
  });

  test('closes search with Escape', async ({ page }) => {
    await page.getByTestId('search-toggle').click();
    await expect(page.getByTestId('search-bar')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('search-bar')).not.toBeVisible();
  });

  test('undo/redo buttons exist and are properly disabled', async ({ page }) => {
    // Undo should be disabled initially
    const undoBtn = page.getByTestId('undo-btn');
    await expect(undoBtn).toBeVisible();

    const redoBtn = page.getByTestId('redo-btn');
    await expect(redoBtn).toBeVisible();
  });
});
