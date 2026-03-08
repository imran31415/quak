import { test, expect } from '@playwright/test';
import { createSheetWithData, waitForGrid } from '../helpers/e2e';

test.describe('Conditional Formatting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('apply conditional format rule to a column', async ({ page }) => {
    await createSheetWithData(page, `CF Test ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Status', cellType: 'text' },
    ], [
      { Name: 'Alice', Status: 'Done' },
      { Name: 'Bob', Status: 'Pending' },
    ]);
    await waitForGrid(page);

    // Open column menu for Status
    await page.getByTestId('col-menu-status').click();
    await page.getByTestId('col-menu-dropdown').waitFor({ state: 'visible' });

    // Click Conditional Formatting
    await page.getByTestId('conditional-format-btn').click();
    await page.getByTestId('conditional-format-panel').waitFor({ state: 'visible' });

    // Add a rule
    await page.getByTestId('add-format-rule').click();
    await page.getByTestId('format-operator-0').selectOption('equals');
    await page.getByTestId('format-value-0').fill('Done');

    // Select green color
    await page.getByTestId('format-color-green-0').click();

    // Save
    await page.getByTestId('save-format-rules').click();
    await page.waitForTimeout(1500);

    // Verify the "Done" cell has green background
    const doneCell = page.locator('[row-index="0"] [col-id="Status"]');
    const bgColor = await doneCell.evaluate((el) => getComputedStyle(el).backgroundColor);
    // #bbf7d0 = rgb(187, 247, 208)
    expect(bgColor).toBe('rgb(187, 247, 208)');

    // "Pending" cell should NOT have the green background
    const pendingCell = page.locator('[row-index="1"] [col-id="Status"]');
    const pendingBg = await pendingCell.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(pendingBg).not.toBe('rgb(187, 247, 208)');
  });

  test('multiple rules on same column', async ({ page }) => {
    await createSheetWithData(page, `CF Multi ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Score', cellType: 'number' },
    ], [
      { Name: 'Alice', Score: 90 },
      { Name: 'Bob', Score: 30 },
    ]);
    await waitForGrid(page);

    // Open conditional formatting for Score
    await page.getByTestId('col-menu-score').click();
    await page.getByTestId('conditional-format-btn').click();
    await page.getByTestId('conditional-format-panel').waitFor({ state: 'visible' });

    // Add rule 1: greater_than 50 → green
    await page.getByTestId('add-format-rule').click();
    await page.getByTestId('format-operator-0').selectOption('greater_than');
    await page.getByTestId('format-value-0').fill('50');
    await page.getByTestId('format-color-green-0').click();

    // Add rule 2: less_than 50 → red
    await page.getByTestId('add-format-rule').click();
    await page.getByTestId('format-operator-1').selectOption('less_than');
    await page.getByTestId('format-value-1').fill('50');
    // Red is default (first color), already selected

    // Save
    await page.getByTestId('save-format-rules').click();
    await page.waitForTimeout(1500);

    // Score=90 should be green
    const highCell = page.locator('[row-index="0"] [col-id="Score"]');
    const highBg = await highCell.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(highBg).toBe('rgb(187, 247, 208)');

    // Score=30 should be red
    const lowCell = page.locator('[row-index="1"] [col-id="Score"]');
    const lowBg = await lowCell.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(lowBg).toBe('rgb(254, 202, 202)');
  });

  test('rules persist after reload', async ({ page }) => {
    await createSheetWithData(page, `CF Persist ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Status', cellType: 'text' },
    ], [
      { Name: 'Alice', Status: 'Done' },
    ]);
    await waitForGrid(page);

    // Apply rule: Status equals "Done" → green
    await page.getByTestId('col-menu-status').click();
    await page.getByTestId('conditional-format-btn').click();
    await page.getByTestId('add-format-rule').click();
    await page.getByTestId('format-operator-0').selectOption('equals');
    await page.getByTestId('format-value-0').fill('Done');
    await page.getByTestId('format-color-green-0').click();
    await page.getByTestId('save-format-rules').click();
    await page.waitForTimeout(1500);

    // Reload
    await page.reload();
    await page.waitForTimeout(1500);

    // Click sheet again
    const sheetLink = page.getByTestId('sheet-list').locator('button').first();
    await sheetLink.click();
    await page.waitForTimeout(1000);

    // Cell should still be green
    const cell = page.locator('[row-index="0"] [col-id="Status"]');
    const bgColor = await cell.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe('rgb(187, 247, 208)');
  });
});
