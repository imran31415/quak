import { test, expect } from '@playwright/test';
import { createSheetWithData, waitForGrid } from '../helpers/e2e';

test.describe('Data Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('required rule rejects empty input', async ({ page }) => {
    await createSheetWithData(page, `DV Required ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Value', cellType: 'number' },
    ], [
      { Name: 'Alice', Value: 100 },
    ]);
    await waitForGrid(page);

    // Set required rule on Name column
    await page.getByTestId('col-menu-name').click();
    await page.getByTestId('col-menu-dropdown').waitFor({ state: 'visible' });
    await page.getByTestId('validation-rules-btn').click();
    await page.getByTestId('validation-rules-panel').waitFor({ state: 'visible' });

    // Toggle required
    await page.getByTestId('required-toggle').click();
    await page.getByTestId('save-validation-rules').click();
    await page.waitForTimeout(1500);

    // Try to clear the Name cell - double-click to edit, clear, enter
    const nameCell = page.locator('[row-index="0"] [col-id="Name"]');
    await nameCell.dblclick();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // The cell should still have the old value (validation rejected the empty)
    await expect(nameCell).toContainText('Alice');
  });

  test('min/max value enforcement', async ({ page }) => {
    await createSheetWithData(page, `DV MinMax ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Score', cellType: 'number' },
    ], [
      { Name: 'Alice', Score: 50 },
    ]);
    await waitForGrid(page);

    // Set min_value=0, max_value=100 on Score
    await page.getByTestId('col-menu-score').click();
    await page.getByTestId('validation-rules-btn').click();
    await page.getByTestId('validation-rules-panel').waitFor({ state: 'visible' });

    // Add min_value rule
    await page.getByTestId('add-validation-rule').click();
    await page.getByTestId('validation-type-0').selectOption('min_value');
    await page.getByTestId('validation-value-0').fill('0');

    // Add max_value rule
    await page.getByTestId('add-validation-rule').click();
    await page.getByTestId('validation-type-1').selectOption('max_value');
    await page.getByTestId('validation-value-1').fill('100');

    await page.getByTestId('save-validation-rules').click();
    await page.waitForTimeout(1500);

    // Try to enter -10 (should be rejected)
    const scoreCell = page.locator('[row-index="0"] [col-id="Score"]');
    await scoreCell.dblclick();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('-10');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Score should still be 50
    await expect(scoreCell).toContainText('50');

    // Try to enter 200 (should be rejected)
    await scoreCell.dblclick();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('200');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Score should still be 50
    await expect(scoreCell).toContainText('50');

    // Enter 75 (should work)
    await scoreCell.dblclick();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('75');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    await expect(scoreCell).toContainText('75');
  });

  test('validation rules persist after reload', async ({ page }) => {
    await createSheetWithData(page, `DV Persist ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Score', cellType: 'number' },
    ], [
      { Name: 'Alice', Score: 50 },
    ]);
    await waitForGrid(page);

    // Set required on Name
    await page.getByTestId('col-menu-name').click();
    await page.getByTestId('validation-rules-btn').click();
    await page.getByTestId('required-toggle').click();
    await page.getByTestId('save-validation-rules').click();
    await page.waitForTimeout(1500);

    // Reload
    await page.reload();
    await page.waitForTimeout(1500);
    const sheetLink = page.getByTestId('sheet-list').locator('button').first();
    await sheetLink.click();
    await page.waitForTimeout(1000);

    // Open validation rules panel - should show required checked
    await page.getByTestId('col-menu-name').click();
    await page.getByTestId('validation-rules-btn').click();
    await page.getByTestId('validation-rules-panel').waitFor({ state: 'visible' });

    const checkbox = page.getByTestId('required-toggle').locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
  });
});
