import { test, expect } from '@playwright/test';

test.describe('Find & Replace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `FindReplace Test ${Date.now()}`;
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
      await editor.fill(`Item ${i + 1}`);
      await editor.press('Enter');
      await page.waitForTimeout(300);
    }
  });

  test('opens find & replace via Ctrl+H', async ({ page }) => {
    await page.keyboard.press('Control+h');
    await page.waitForTimeout(300);
    await expect(page.getByTestId('find-replace-bar')).toBeVisible();
  });

  test('finds text matches', async ({ page }) => {
    await page.keyboard.press('Control+h');
    await page.waitForTimeout(300);

    await page.getByTestId('find-input').fill('Item');
    await page.waitForTimeout(300);

    const matchCount = page.getByTestId('match-count');
    await expect(matchCount).toContainText('of 3');
  });

  test('replaces single match', async ({ page }) => {
    await page.keyboard.press('Control+h');
    await page.waitForTimeout(300);

    await page.getByTestId('find-input').fill('Item 1');
    await page.waitForTimeout(300);
    await page.getByTestId('replace-input').fill('Product A');
    await page.getByTestId('replace-btn').click();
    await page.waitForTimeout(500);

    // Verify the replacement
    await expect(page.locator('[row-index="0"] [col-id="Name"]')).toContainText('Product A');
  });

  test('replaces all matches', async ({ page }) => {
    await page.keyboard.press('Control+h');
    await page.waitForTimeout(300);

    await page.getByTestId('find-input').fill('Item');
    await page.waitForTimeout(300);
    await page.getByTestId('replace-input').fill('Product');
    await page.getByTestId('replace-all-btn').click();
    await page.waitForTimeout(500);

    // Verify all replacements
    await expect(page.locator('[row-index="0"] [col-id="Name"]')).toContainText('Product 1');
    await expect(page.locator('[row-index="1"] [col-id="Name"]')).toContainText('Product 2');
    await expect(page.locator('[row-index="2"] [col-id="Name"]')).toContainText('Product 3');
  });

  test('closes find & replace bar', async ({ page }) => {
    await page.keyboard.press('Control+h');
    await page.waitForTimeout(300);
    await expect(page.getByTestId('find-replace-bar')).toBeVisible();

    await page.getByTestId('find-replace-close').click();
    await page.waitForTimeout(200);
    await expect(page.getByTestId('find-replace-bar')).not.toBeVisible();
  });
});
