import { test, expect } from '@playwright/test';

test.describe('Linked Records & Lookup Columns', () => {
  let sourceSheetName: string;
  let targetSheetName: string;

  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Create source sheet (Companies) with Column 1 (for name) and Industry
    sourceSheetName = `Companies ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sourceSheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-blank').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add Industry column
    await page.getByRole('columnheader', { name: '+' }).click();
    await page.getByTestId('add-col-name').fill('Industry');
    await page.getByTestId('add-col-type').selectOption('text');
    await page.getByTestId('add-col-submit').click();
    await page.waitForTimeout(1000);

    // Add first row
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1000);

    // Set Column 1 = "Acme Corp"
    const nameCell1 = page.locator('[row-index="0"] [col-id="Column 1"]');
    await nameCell1.dblclick();
    await page.keyboard.type('Acme Corp');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Set Industry = "Technology"
    const industryCell1 = page.locator('[row-index="0"] [col-id="Industry"]');
    await industryCell1.dblclick();
    await page.keyboard.type('Technology');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Add second row
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1000);

    const nameCell2 = page.locator('[row-index="1"] [col-id="Column 1"]');
    await nameCell2.dblclick();
    await page.keyboard.type('Globex Inc');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    const industryCell2 = page.locator('[row-index="1"] [col-id="Industry"]');
    await industryCell2.dblclick();
    await page.keyboard.type('Finance');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Create target sheet (Contacts)
    targetSheetName = `Contacts ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(targetSheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-blank').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add a row with contact name
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1000);

    const contactNameCell = page.locator('[row-index="0"] [col-id="Column 1"]');
    await contactNameCell.dblclick();
    await page.keyboard.type('John Doe');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  });

  test('creates a linked_record column pointing to another sheet', async ({ page }) => {
    // Add linked_record column
    await page.getByRole('columnheader', { name: '+' }).click();
    await page.getByTestId('add-col-name').fill('Company');
    await page.getByTestId('add-col-type').selectOption('linked_record');

    // Sheet selector should appear
    await expect(page.getByTestId('add-col-linked-sheet')).toBeVisible();

    // Add button should be disabled (no sheet selected yet)
    await expect(page.getByTestId('add-col-submit')).toBeDisabled();

    // Select the source sheet
    await page.getByTestId('add-col-linked-sheet').selectOption({ label: sourceSheetName });
    await page.waitForTimeout(1000);

    // Display column selector should appear
    await expect(page.getByTestId('add-col-display-column')).toBeVisible();

    // Select "Column 1" as display column
    await page.getByTestId('add-col-display-column').selectOption('Column 1');

    // Add button should be enabled now
    await expect(page.getByTestId('add-col-submit')).toBeEnabled();
    await page.getByTestId('add-col-submit').click();
    await page.waitForTimeout(1500);

    // Column should appear
    await expect(page.getByRole('columnheader', { name: 'Company' })).toBeVisible();
  });

  test('selects a linked record via dropdown and shows display value', async ({ page }) => {
    // Add linked_record column
    await page.getByRole('columnheader', { name: '+' }).click();
    await page.getByTestId('add-col-name').fill('Company');
    await page.getByTestId('add-col-type').selectOption('linked_record');
    await page.getByTestId('add-col-linked-sheet').selectOption({ label: sourceSheetName });
    await page.waitForTimeout(1000);
    await page.getByTestId('add-col-display-column').selectOption('Column 1');
    await page.getByTestId('add-col-submit').click();
    await page.waitForTimeout(1500);

    // Double-click the Company cell to open dropdown
    const companyCell = page.locator('[row-index="0"] [col-id="Company"]');
    await companyCell.dblclick();
    await page.waitForTimeout(500);

    // AG Grid select editor renders as a custom combobox — click to expand
    const selectEditor = page.getByRole('combobox').last();
    await expect(selectEditor).toBeVisible();
    await selectEditor.click();
    await page.waitForTimeout(300);

    // Click the "Acme Corp" option in the dropdown list
    await page.getByRole('option', { name: 'Acme Corp' }).click();
    await page.waitForTimeout(2000);

    // The cell should now show the linked record display value
    await expect(companyCell).toContainText('Acme Corp');
  });

  test('adds a lookup column following a linked_record and shows computed value', async ({ page }) => {
    // First, add linked_record column
    await page.getByRole('columnheader', { name: '+' }).click();
    await page.getByTestId('add-col-name').fill('Company');
    await page.getByTestId('add-col-type').selectOption('linked_record');
    await page.getByTestId('add-col-linked-sheet').selectOption({ label: sourceSheetName });
    await page.waitForTimeout(1000);
    await page.getByTestId('add-col-display-column').selectOption('Column 1');
    await page.getByTestId('add-col-submit').click();
    await page.waitForTimeout(1500);

    // Set Company on first row
    const companyCell = page.locator('[row-index="0"] [col-id="Company"]');
    await companyCell.dblclick();
    await page.waitForTimeout(500);
    const selectEditor = page.getByRole('combobox').last();
    await selectEditor.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Acme Corp' }).click();
    await page.waitForTimeout(2000);

    // Now add a lookup column
    await page.getByRole('columnheader', { name: '+' }).click();
    await page.getByTestId('add-col-name').fill('Industry Lookup');
    await page.getByTestId('add-col-type').selectOption('lookup');

    // Linked column selector should appear
    await expect(page.getByTestId('add-col-lookup-linked')).toBeVisible();
    await expect(page.getByTestId('add-col-submit')).toBeDisabled();

    // Select the Company linked_record column
    await page.getByTestId('add-col-lookup-linked').selectOption({ label: 'Company' });
    await page.waitForTimeout(1000);

    // Return column selector should appear
    await expect(page.getByTestId('add-col-lookup-return')).toBeVisible();

    // Select "Industry" as the return column
    await page.getByTestId('add-col-lookup-return').selectOption('Industry');

    await expect(page.getByTestId('add-col-submit')).toBeEnabled();
    await page.getByTestId('add-col-submit').click();
    await page.waitForTimeout(1500);

    // Column should appear
    await expect(page.getByRole('columnheader', { name: 'Industry Lookup' })).toBeVisible();

    // Lookup cell should show "Technology" (Acme Corp's industry)
    const lookupCell = page.locator('[row-index="0"] [col-id="Industry Lookup"]');
    await expect(lookupCell).toContainText('Technology');
  });

  test('lookup column is read-only', async ({ page }) => {
    // Add linked_record column
    await page.getByRole('columnheader', { name: '+' }).click();
    await page.getByTestId('add-col-name').fill('Company');
    await page.getByTestId('add-col-type').selectOption('linked_record');
    await page.getByTestId('add-col-linked-sheet').selectOption({ label: sourceSheetName });
    await page.waitForTimeout(1000);
    await page.getByTestId('add-col-display-column').selectOption('Column 1');
    await page.getByTestId('add-col-submit').click();
    await page.waitForTimeout(1500);

    // Add lookup column
    await page.getByRole('columnheader', { name: '+' }).click();
    await page.getByTestId('add-col-name').fill('Industry Lookup');
    await page.getByTestId('add-col-type').selectOption('lookup');
    await page.getByTestId('add-col-lookup-linked').selectOption({ label: 'Company' });
    await page.waitForTimeout(1000);
    await page.getByTestId('add-col-lookup-return').selectOption('Industry');
    await page.getByTestId('add-col-submit').click();
    await page.waitForTimeout(1500);

    // Double-click the lookup cell — should NOT enter edit mode
    const lookupCell = page.locator('[row-index="0"] [col-id="Industry Lookup"]');
    await lookupCell.dblclick();
    await page.waitForTimeout(300);

    // No input/select editor should appear
    const input = lookupCell.locator('input');
    const select = lookupCell.locator('select');
    await expect(input).toHaveCount(0);
    await expect(select).toHaveCount(0);
  });

  test('deletes linked_record and lookup columns cleanly', async ({ page }) => {
    // Add linked_record column
    await page.getByRole('columnheader', { name: '+' }).click();
    await page.getByTestId('add-col-name').fill('Company');
    await page.getByTestId('add-col-type').selectOption('linked_record');
    await page.getByTestId('add-col-linked-sheet').selectOption({ label: sourceSheetName });
    await page.waitForTimeout(1000);
    await page.getByTestId('add-col-display-column').selectOption('Column 1');
    await page.getByTestId('add-col-submit').click();
    await page.waitForTimeout(1500);

    // Add lookup column
    await page.getByRole('columnheader', { name: '+' }).click();
    await page.getByTestId('add-col-name').fill('Industry Lookup');
    await page.getByTestId('add-col-type').selectOption('lookup');
    await page.getByTestId('add-col-lookup-linked').selectOption({ label: 'Company' });
    await page.waitForTimeout(1000);
    await page.getByTestId('add-col-lookup-return').selectOption('Industry');
    await page.getByTestId('add-col-submit').click();
    await page.waitForTimeout(1500);

    // Both columns should be visible
    await expect(page.getByRole('columnheader', { name: 'Company' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Industry Lookup' })).toBeVisible();

    // Delete lookup column first
    await page.getByTestId('col-menu-industry_lookup').click();
    page.on('dialog', (dialog) => dialog.accept());
    await page.getByTestId('delete-col-btn').click();
    await page.waitForTimeout(1500);

    await expect(page.getByRole('columnheader', { name: 'Industry Lookup' })).not.toBeVisible();

    // Delete linked_record column
    await page.getByTestId('col-menu-company').click();
    await page.getByTestId('delete-col-btn').click();
    await page.waitForTimeout(1500);

    await expect(page.getByRole('columnheader', { name: 'Company' })).not.toBeVisible();
  });
});
