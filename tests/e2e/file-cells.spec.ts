import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGE_FILE = path.join(__dirname, '..', 'fixtures', 'test-image.png');
const DOC_FILE = path.join(__dirname, '..', 'fixtures', 'test-doc.txt');

test.describe('File Cells', () => {
  let sheetName: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    sheetName = `File Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    // Use blank template
    await page.getByTestId('template-blank').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add a file column
    await page.locator('.ag-header-cell:has-text("+")').click();
    await page.getByTestId('add-col-name').fill('Attachment');
    await page.getByTestId('add-col-type').selectOption('file');
    await page.getByTestId('add-col-submit').click();
    await page.waitForTimeout(1000);

    // Add a row
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(1000);
  });

  test('empty file cell shows upload prompt', async ({ page }) => {
    const emptyCell = page.getByTestId('file-cell-empty').first();
    await expect(emptyCell).toBeVisible();
    await expect(emptyCell).toContainText('Upload');
  });

  test('uploads an image file and shows thumbnail', async ({ page }) => {
    const emptyCell = page.getByTestId('file-cell-empty').first();

    // Trigger file upload using filechooser event
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      emptyCell.click(),
    ]);
    await fileChooser.setFiles(IMAGE_FILE);
    await page.waitForTimeout(2000);

    // Cell should now be populated with thumbnail
    const populatedCell = page.getByTestId('file-cell-populated').first();
    await expect(populatedCell).toBeVisible();
    await expect(page.getByTestId('file-cell-thumbnail').first()).toBeVisible();
    await expect(populatedCell).toContainText('test-image.png');
  });

  test('uploads a document file and shows file icon', async ({ page }) => {
    const emptyCell = page.getByTestId('file-cell-empty').first();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      emptyCell.click(),
    ]);
    await fileChooser.setFiles(DOC_FILE);
    await page.waitForTimeout(2000);

    const populatedCell = page.getByTestId('file-cell-populated').first();
    await expect(populatedCell).toBeVisible();
    await expect(page.getByTestId('file-cell-icon').first()).toBeVisible();
    await expect(populatedCell).toContainText('test-doc.txt');
  });

  test('clicking image cell opens preview modal', async ({ page }) => {
    // Upload image first
    const emptyCell = page.getByTestId('file-cell-empty').first();
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      emptyCell.click(),
    ]);
    await fileChooser.setFiles(IMAGE_FILE);
    await page.waitForTimeout(2000);

    // Click the populated cell to open preview
    await page.getByTestId('file-cell-populated').first().click();
    await page.waitForTimeout(500);

    const modal = page.getByTestId('file-preview-modal');
    await expect(modal).toBeVisible();
    await expect(page.getByTestId('file-preview-image')).toBeVisible();
    await expect(page.getByTestId('file-preview-download')).toBeVisible();
    await expect(page.getByTestId('file-preview-replace')).toBeVisible();
    await expect(page.getByTestId('file-preview-remove')).toBeVisible();
  });

  test('remove button clears the file cell', async ({ page }) => {
    // Upload image
    const emptyCell = page.getByTestId('file-cell-empty').first();
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      emptyCell.click(),
    ]);
    await fileChooser.setFiles(IMAGE_FILE);
    await page.waitForTimeout(2000);

    // Open preview and remove
    await page.getByTestId('file-cell-populated').first().click();
    await page.waitForTimeout(500);
    await page.getByTestId('file-preview-remove').click();
    await page.waitForTimeout(1000);

    // Cell should be empty again
    await expect(page.getByTestId('file-cell-empty').first()).toBeVisible();
  });

  test('replace button allows uploading a new file', async ({ page }) => {
    // Upload image first
    const emptyCell = page.getByTestId('file-cell-empty').first();
    const [fileChooser1] = await Promise.all([
      page.waitForEvent('filechooser'),
      emptyCell.click(),
    ]);
    await fileChooser1.setFiles(IMAGE_FILE);
    await page.waitForTimeout(2000);

    // Open preview and replace
    await page.getByTestId('file-cell-populated').first().click();
    await page.waitForTimeout(500);

    const [fileChooser2] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('file-preview-replace').click(),
    ]);
    await fileChooser2.setFiles(DOC_FILE);
    await page.waitForTimeout(2000);

    // Should now show the document
    const populatedCell = page.getByTestId('file-cell-populated').first();
    await expect(populatedCell).toBeVisible();
    await expect(populatedCell).toContainText('test-doc.txt');
  });

  test('file data persists across reload', async ({ page }) => {
    // Upload image
    const emptyCell = page.getByTestId('file-cell-empty').first();
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      emptyCell.click(),
    ]);
    await fileChooser.setFiles(IMAGE_FILE);
    await page.waitForTimeout(2000);

    // Verify populated
    await expect(page.getByTestId('file-cell-populated').first()).toBeVisible();

    // Reload and re-select the sheet
    await page.reload();
    await page.waitForTimeout(1000);
    await page.getByTestId('sidebar').getByText(sheetName).click();
    await page.waitForTimeout(1500);

    // Should still be populated
    const populatedCell = page.getByTestId('file-cell-populated').first();
    await expect(populatedCell).toBeVisible();
    await expect(populatedCell).toContainText('test-image.png');
  });
});
