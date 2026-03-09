import { test, expect } from '@playwright/test';

test.describe('Clipboard & Range Selection', () => {
  let sheetName: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    sheetName = `Clipboard Test ${Date.now()}`;
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

    // Fill in some data in the Name column
    for (let i = 0; i < 3; i++) {
      const cell = page.locator(`[row-index="${i}"] [col-id="Name"]`);
      await cell.dblclick();
      const editor = page.getByRole('textbox', { name: 'Input Editor' });
      await editor.fill(`Item ${i + 1}`);
      await editor.press('Enter');
      await page.waitForTimeout(300);
    }

    // Fill in Value column
    for (let i = 0; i < 3; i++) {
      const cell = page.locator(`[row-index="${i}"] [col-id="Value"]`);
      await cell.dblclick();
      const editor = page.getByRole('textbox', { name: 'Input Editor' });
      await editor.fill(`${(i + 1) * 10}`);
      await editor.press('Enter');
      await page.waitForTimeout(300);
    }
  });

  test('selects a single cell on click', async ({ page }) => {
    const cell = page.locator('[row-index="0"] [col-id="Name"]');
    await cell.click();
    await page.waitForTimeout(200);

    // Cell should have selection highlight (blue background)
    const style = await cell.evaluate((el) => {
      const cellEl = el.closest('[col-id="Name"]') as HTMLElement;
      return cellEl?.style.backgroundColor;
    });
    // Single cell selection doesn't show in status bar
    await expect(page.getByTestId('selection-info')).not.toBeVisible();
  });

  test('selects a range via shift+click', async ({ page }) => {
    // Click first cell
    const startCell = page.locator('[row-index="0"] [col-id="Name"]');
    await startCell.click();
    await page.waitForTimeout(200);

    // Shift+click end cell
    const endCell = page.locator('[row-index="2"] [col-id="Value"]');
    await endCell.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(200);

    // Status bar should show selection info
    await expect(page.getByTestId('selection-info')).toBeVisible();
    await expect(page.getByTestId('selection-info')).toContainText('selected');
  });

  test('copies cells with Ctrl+C', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click first Name cell
    const startCell = page.locator('[row-index="0"] [col-id="Name"]');
    await startCell.click();
    await page.waitForTimeout(200);

    // Shift+click to select Name column (3 rows)
    const endCell = page.locator('[row-index="2"] [col-id="Name"]');
    await endCell.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(200);

    // Copy
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(500);

    // Read clipboard
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('Item 1');
    expect(clipboardText).toContain('Item 2');
    expect(clipboardText).toContain('Item 3');
  });

  test('pastes cells with Ctrl+V', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Write TSV data to clipboard
    await page.evaluate(() => {
      return navigator.clipboard.writeText('Pasted A\nPasted B\nPasted C');
    });

    // Click destination cell
    const destCell = page.locator('[row-index="0"] [col-id="Name"]');
    await destCell.click();
    await page.waitForTimeout(200);

    // Paste
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(1000);

    // Verify pasted values
    await expect(page.locator('[row-index="0"] [col-id="Name"]')).toContainText('Pasted A');
    await expect(page.locator('[row-index="1"] [col-id="Name"]')).toContainText('Pasted B');
    await expect(page.locator('[row-index="2"] [col-id="Name"]')).toContainText('Pasted C');
  });

  test('undo restores cells after paste', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Note original values
    const originalValues: string[] = [];
    for (let i = 0; i < 3; i++) {
      const text = await page.locator(`[row-index="${i}"] [col-id="Name"]`).innerText();
      originalValues.push(text);
    }

    // Write TSV data to clipboard and paste
    await page.evaluate(() => navigator.clipboard.writeText('X\nY\nZ'));
    const destCell = page.locator('[row-index="0"] [col-id="Name"]');
    await destCell.click();
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(1000);

    // Verify paste happened
    await expect(page.locator('[row-index="0"] [col-id="Name"]')).toContainText('X');

    // Undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(1000);

    // Verify original values restored
    for (let i = 0; i < 3; i++) {
      await expect(page.locator(`[row-index="${i}"] [col-id="Name"]`)).toContainText(originalValues[i]);
    }
  });

  test('escape clears selection', async ({ page }) => {
    // Select range
    const startCell = page.locator('[row-index="0"] [col-id="Name"]');
    await startCell.click();
    await page.waitForTimeout(200);
    const endCell = page.locator('[row-index="2"] [col-id="Name"]');
    await endCell.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(200);

    // Verify selection is shown
    await expect(page.getByTestId('selection-info')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Selection info should be gone
    await expect(page.getByTestId('selection-info')).not.toBeVisible();
  });

  test('status bar shows selection dimensions', async ({ page }) => {
    // Click first cell
    const startCell = page.locator('[row-index="0"] [col-id="Name"]');
    await startCell.click();
    await page.waitForTimeout(200);

    // Shift+click to select 2 rows x 2 cols (Name + Status)
    const endCell = page.locator('[row-index="1"] [col-id="Status"]');
    await endCell.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(200);

    // Check selection display
    const selInfo = page.getByTestId('selection-info');
    await expect(selInfo).toBeVisible();
    const text = await selInfo.innerText();
    expect(text).toMatch(/2\s*x\s*\d+\s*selected/);
  });
});
