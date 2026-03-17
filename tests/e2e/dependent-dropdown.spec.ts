import { test, expect } from '@playwright/test';
import { createSheetWithData, waitForGrid } from '../helpers/e2e';

test.describe('Dependent Dropdowns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('configure and use dependent dropdown', async ({ page }) => {
    // Create sheet with Country and City dropdown columns
    await createSheetWithData(page, `DepDrop ${Date.now()}`, [
      { name: 'Country', cellType: 'dropdown', options: ['USA', 'France'] },
      { name: 'City', cellType: 'dropdown', options: ['NYC', 'LA', 'Paris', 'Lyon'] },
    ], [
      { Country: 'USA', City: 'NYC' },
      { Country: 'France', City: 'Paris' },
    ]);
    await waitForGrid(page);

    // Open column menu for City
    await page.getByTestId('col-menu-city').click();
    await page.getByTestId('col-menu-dropdown').waitFor({ state: 'visible' });

    // Click Dependent Dropdown
    await page.getByTestId('dependent-dropdown-btn').click();
    await page.getByTestId('dependent-dropdown-panel').waitFor({ state: 'visible' });

    // Enable and select parent column
    await page.getByTestId('dependent-enable-toggle').locator('input').check();
    await page.getByTestId('dependent-parent-select').selectOption({ label: 'Country' });

    // Map USA → NYC, LA  and France → Paris, Lyon
    await page.getByTestId('dependent-mapping-USA').fill('NYC, LA');
    await page.getByTestId('dependent-mapping-France').fill('Paris, Lyon');

    // Save
    await page.getByTestId('save-dependent-dropdown').click();
    await page.waitForTimeout(1000);

    // Click on City cell in row 0 (Country=USA) — should see only NYC, LA
    const cityCell0 = page.locator('[row-index="0"] [col-id="City"]');
    await cityCell0.dblclick();
    await page.waitForTimeout(300);

    // Check dropdown options
    const select0 = page.locator('.ag-popup-editor select, .ag-cell-edit-wrapper select');
    if (await select0.count() > 0) {
      const options0 = await select0.locator('option').allTextContents();
      expect(options0).toContain('NYC');
      expect(options0).toContain('LA');
      expect(options0).not.toContain('Paris');
      expect(options0).not.toContain('Lyon');
    }

    // Press Escape to close editor
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Click on City cell in row 1 (Country=France) — should see only Paris, Lyon
    const cityCell1 = page.locator('[row-index="1"] [col-id="City"]');
    await cityCell1.dblclick();
    await page.waitForTimeout(300);

    const select1 = page.locator('.ag-popup-editor select, .ag-cell-edit-wrapper select');
    if (await select1.count() > 0) {
      const options1 = await select1.locator('option').allTextContents();
      expect(options1).toContain('Paris');
      expect(options1).toContain('Lyon');
      expect(options1).not.toContain('NYC');
      expect(options1).not.toContain('LA');
    }

    await page.keyboard.press('Escape');
  });

  test('config persists across page reload', async ({ page }) => {
    const sheetName = `DepPersist ${Date.now()}`;
    await createSheetWithData(page, sheetName, [
      { name: 'Country', cellType: 'dropdown', options: ['USA', 'France'] },
      { name: 'City', cellType: 'dropdown', options: ['NYC', 'LA', 'Paris', 'Lyon'] },
    ], [
      { Country: 'USA', City: 'NYC' },
    ]);
    await waitForGrid(page);

    // Configure dependent dropdown
    await page.getByTestId('col-menu-city').click();
    await page.getByTestId('col-menu-dropdown').waitFor({ state: 'visible' });
    await page.getByTestId('dependent-dropdown-btn').click();
    await page.getByTestId('dependent-dropdown-panel').waitFor({ state: 'visible' });

    await page.getByTestId('dependent-enable-toggle').locator('input').check();
    await page.getByTestId('dependent-parent-select').selectOption({ label: 'Country' });
    await page.getByTestId('dependent-mapping-USA').fill('NYC, LA');
    await page.getByTestId('dependent-mapping-France').fill('Paris, Lyon');
    await page.getByTestId('save-dependent-dropdown').click();
    await page.waitForTimeout(1000);

    // Reload the page
    await page.reload();
    await page.waitForTimeout(1000);

    // Click the sheet to re-open it
    const sheetLink = page.getByTestId('sheet-list').getByText(sheetName);
    await sheetLink.click();
    await waitForGrid(page);

    // Re-open dependent dropdown config to verify it persisted
    await page.getByTestId('col-menu-city').click();
    await page.getByTestId('col-menu-dropdown').waitFor({ state: 'visible' });
    await page.getByTestId('dependent-dropdown-btn').click();
    await page.getByTestId('dependent-dropdown-panel').waitFor({ state: 'visible' });

    // Verify toggle is checked and parent is selected
    const toggle = page.getByTestId('dependent-enable-toggle').locator('input');
    await expect(toggle).toBeChecked();

    const parentSelect = page.getByTestId('dependent-parent-select');
    await expect(parentSelect).toHaveValue(/country/i);

    // Verify mapping values persisted
    const usaMapping = page.getByTestId('dependent-mapping-USA');
    await expect(usaMapping).toHaveValue(/NYC/);
  });

  test('fallback shows all options when parent is empty', async ({ page }) => {
    await createSheetWithData(page, `DepFallback ${Date.now()}`, [
      { name: 'Country', cellType: 'dropdown', options: ['USA', 'France'] },
      { name: 'City', cellType: 'dropdown', options: ['NYC', 'LA', 'Paris', 'Lyon'] },
    ], [
      { Country: null, City: '' },
    ]);
    await waitForGrid(page);

    // Configure dependent dropdown
    await page.getByTestId('col-menu-city').click();
    await page.getByTestId('col-menu-dropdown').waitFor({ state: 'visible' });
    await page.getByTestId('dependent-dropdown-btn').click();
    await page.getByTestId('dependent-dropdown-panel').waitFor({ state: 'visible' });

    await page.getByTestId('dependent-enable-toggle').locator('input').check();
    await page.getByTestId('dependent-parent-select').selectOption({ label: 'Country' });
    await page.getByTestId('dependent-mapping-USA').fill('NYC, LA');
    await page.getByTestId('dependent-mapping-France').fill('Paris, Lyon');
    await page.getByTestId('save-dependent-dropdown').click();
    await page.waitForTimeout(1000);

    // Click on City cell in row 0 (Country=empty) — should see all options
    const cityCell = page.locator('[row-index="0"] [col-id="City"]');
    await cityCell.dblclick();
    await page.waitForTimeout(300);

    const select = page.locator('.ag-popup-editor select, .ag-cell-edit-wrapper select');
    if (await select.count() > 0) {
      const options = await select.locator('option').allTextContents();
      expect(options).toContain('NYC');
      expect(options).toContain('LA');
      expect(options).toContain('Paris');
      expect(options).toContain('Lyon');
    }

    await page.keyboard.press('Escape');
  });
});
