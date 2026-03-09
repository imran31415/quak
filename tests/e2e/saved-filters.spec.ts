import { test, expect } from '@playwright/test';

test.describe('Saved Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `Filters Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add rows with data
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

  test('saved filters button is visible', async ({ page }) => {
    await expect(page.getByTestId('saved-filters-btn')).toBeVisible();
  });

  test('opens saved filters menu', async ({ page }) => {
    await page.getByTestId('saved-filters-btn').click();
    await page.waitForTimeout(200);
    await expect(page.getByTestId('saved-filters-menu')).toBeVisible();
    await expect(page.getByText('No saved filters')).toBeVisible();
  });

  test('saves a filter', async ({ page }) => {
    // Open saved filters and save (save current state, even without active filter)
    await page.getByTestId('saved-filters-btn').click();
    await page.waitForTimeout(200);
    await page.getByTestId('save-current-filter').click();
    await page.getByTestId('save-filter-input').fill('My Filter');
    await page.getByTestId('save-filter-confirm').click();
    await page.waitForTimeout(300);

    // Badge should show 1
    await expect(page.getByTestId('saved-filters-badge')).toHaveText('1');
  });

  test('deletes a saved filter', async ({ page }) => {
    // Save a filter first
    await page.getByTestId('saved-filters-btn').click();
    await page.waitForTimeout(200);
    await page.getByTestId('save-current-filter').click();
    await page.getByTestId('save-filter-input').fill('TestFilter');
    await page.getByTestId('save-filter-confirm').click();
    await page.waitForTimeout(300);

    // Verify badge
    await expect(page.getByTestId('saved-filters-badge')).toHaveText('1');

    // Close menu first by clicking elsewhere, then re-open
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Re-open and delete
    await page.getByTestId('saved-filters-btn').click();
    await page.waitForTimeout(500);
    await expect(page.getByTestId('saved-filters-menu')).toBeVisible();
    await page.getByTestId('delete-filter-TestFilter').click();
    await page.waitForTimeout(300);

    // Badge should be gone
    await expect(page.getByTestId('saved-filters-badge')).not.toBeVisible();
  });
});
