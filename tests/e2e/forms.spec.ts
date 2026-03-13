import { test, expect } from '@playwright/test';
import { createSheetWithData, deleteAllSheets } from '../helpers/e2e';

test.describe('Forms View', () => {
  let sheetId: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await deleteAllSheets(page);

    sheetId = await createSheetWithData(
      page,
      `Form Test ${Date.now()}`,
      [
        { name: 'Name', cellType: 'text', width: 200 },
        { name: 'Age', cellType: 'number', width: 100 },
        { name: 'Active', cellType: 'checkbox', width: 100 },
        { name: 'Status', cellType: 'dropdown', width: 120, options: ['Open', 'Closed'] },
        { name: 'Due', cellType: 'date', width: 130 },
      ],
      [
        { Name: 'Alice', Age: 30, Active: true, Status: 'Open', Due: '2026-03-15' },
      ]
    );
  });

  test('form view tab visible in ViewSwitcher', async ({ page }) => {
    await expect(page.getByTestId('view-btn-form')).toBeVisible();
  });

  test('shows form preview when form tab clicked', async ({ page }) => {
    await page.getByTestId('view-btn-form').click();
    await expect(page.getByTestId('form-view')).toBeVisible();
    await expect(page.getByTestId('form-fields')).toBeVisible();
  });

  test('share URL displayed and contains sheet ID', async ({ page }) => {
    await page.getByTestId('view-btn-form').click();
    const urlInput = page.getByTestId('form-share-url');
    await expect(urlInput).toBeVisible();
    const url = await urlInput.inputValue();
    expect(url).toContain(`/forms/${sheetId}`);
  });

  test('form fields rendered for each column type', async ({ page }) => {
    await page.getByTestId('view-btn-form').click();

    // text input
    await expect(page.getByTestId('form-field-name')).toBeVisible();
    // number input
    await expect(page.getByTestId('form-field-age')).toBeVisible();
    // checkbox
    await expect(page.getByTestId('form-field-active')).toBeVisible();
    // dropdown
    await expect(page.getByTestId('form-field-status')).toBeVisible();
    // date
    await expect(page.getByTestId('form-field-due')).toBeVisible();
  });

  test('in-app form submission works', async ({ page }) => {
    await page.getByTestId('view-btn-form').click();

    // Fill out the form
    await page.getByTestId('form-field-name').fill('Bob');
    await page.getByTestId('form-field-age').fill('25');
    await page.getByTestId('form-field-active').check();
    await page.getByTestId('form-field-status').selectOption('Closed');
    await page.getByTestId('form-field-due').fill('2026-04-01');

    // Submit
    await page.getByTestId('form-submit-btn').click();
    await expect(page.getByTestId('form-success')).toBeVisible();

    // Verify "Submit another" button
    await expect(page.getByTestId('form-submit-another-btn')).toBeVisible();

    // Switch to grid view to verify the row was added
    await page.getByTestId('view-btn-grid').click();
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('status-bar')).toContainText('2 rows');
  });

  test('standalone /forms/:id page loads and submits', async ({ page }) => {
    // Navigate to the standalone form page
    await page.goto(`/forms/${sheetId}`);
    await expect(page.getByTestId('form-page')).toBeVisible();
    await expect(page.getByTestId('form-fields')).toBeVisible();

    // Fill and submit
    await page.getByTestId('form-field-name').fill('Charlie');
    await page.getByTestId('form-field-age').fill('35');
    await page.getByTestId('form-submit-btn').click();

    await expect(page.getByTestId('form-page-success')).toBeVisible();
  });

  test('invalid form ID shows error on standalone page', async ({ page }) => {
    await page.goto('/forms/nonexistent-id-12345');
    await expect(page.getByTestId('form-page-error')).toBeVisible();
  });
});
