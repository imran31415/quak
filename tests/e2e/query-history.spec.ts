import { test, expect } from '@playwright/test';

test.describe('Query History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `History Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1500);
  });

  test('shows query in history after execution', async ({ page }) => {
    await page.getByTestId('toggle-query').click();

    const queryInput = page.getByTestId('query-input');
    await queryInput.fill('SELECT * FROM current_sheet');
    await page.getByTestId('run-query-btn').click();
    await page.waitForTimeout(2000);

    // History should be visible
    await expect(page.getByTestId('query-history')).toBeVisible();
    await expect(page.getByTestId('query-history')).toContainText('SELECT * FROM current_sheet');
  });

  test('query templates are visible', async ({ page }) => {
    await page.getByTestId('toggle-query').click();

    await expect(page.getByTestId('query-templates')).toBeVisible();
    await expect(page.getByTestId('template-select-all')).toBeVisible();
    await expect(page.getByTestId('template-count')).toBeVisible();
  });

  test('clicking a template loads it into the editor', async ({ page }) => {
    await page.getByTestId('toggle-query').click();

    await page.getByTestId('template-count').click();

    const queryInput = page.getByTestId('query-input');
    const value = await queryInput.inputValue();
    expect(value).toContain('COUNT');
  });
});
