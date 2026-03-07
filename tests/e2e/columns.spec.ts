import { test, expect } from '@playwright/test';

test.describe('Column Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `Columns Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    // Select "Task Tracker" template
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();
  });

  test('adds a new column via the + button', async ({ page }) => {
    // Click the + column header
    const addColHeader = page.getByRole('columnheader', { name: '+' });
    await addColHeader.click();
    await expect(page.getByTestId('add-column-panel')).toBeVisible();

    // Fill in column details
    await page.getByTestId('add-col-name').fill('Priority');
    await page.getByTestId('add-col-type').selectOption('dropdown');
    await page.getByTestId('add-col-options').fill('Low, Medium, High');
    await page.getByTestId('add-col-submit').click();

    // Wait for reload
    await page.waitForTimeout(1500);

    // Column should be visible
    await expect(page.getByRole('columnheader', { name: 'Priority' })).toBeVisible();
    await expect(page.getByTestId('status-bar')).toContainText('7 columns');
  });

  test('deletes a column', async ({ page }) => {
    // Open column menu for "Notes"
    await page.getByTestId('col-menu-notes').click();
    await expect(page.getByTestId('col-menu-dropdown')).toBeVisible();

    // Accept the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());
    await page.getByTestId('delete-col-btn').click();
    await page.waitForTimeout(1500);

    // Column should be gone
    await expect(page.getByRole('columnheader', { name: 'Notes' })).not.toBeVisible();
    await expect(page.getByTestId('status-bar')).toContainText('5 columns');
  });

  test('renames a column', async ({ page }) => {
    await page.getByTestId('col-menu-name').click();
    await page.getByTestId('rename-col-btn').click();

    const input = page.getByTestId('rename-col-input');
    await input.clear();
    await input.fill('Full Name');
    await input.press('Enter');
    await page.waitForTimeout(1500);

    await expect(page.getByRole('columnheader', { name: 'Full Name' })).toBeVisible();
  });
});
