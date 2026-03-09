import { test, expect } from '@playwright/test';

test.describe('Cell Comments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `Comments Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Add a row with data
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(800);

    const cell = page.locator('[row-index="0"] [col-id="Name"]');
    await cell.dblclick();
    const editor = page.getByRole('textbox', { name: 'Input Editor' });
    await editor.fill('Test Item');
    await editor.press('Enter');
    await page.waitForTimeout(300);
  });

  test('adds a comment via right-click', async ({ page }) => {
    // Right-click on a cell
    const cell = page.locator('[row-index="0"] [col-id="Name"]');
    await cell.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Comment popover should appear
    await expect(page.getByTestId('comment-popover')).toBeVisible();

    // Type a comment
    await page.getByTestId('comment-textarea').fill('This is a test comment');
    await page.getByTestId('comment-save').click();
    await page.waitForTimeout(500);

    // Close the popover by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Verify comment was saved by right-clicking again
    await cell.click({ button: 'right' });
    await page.waitForTimeout(300);
    await expect(page.getByTestId('comment-text')).toHaveText('This is a test comment');
  });

  test('views and edits a comment', async ({ page }) => {
    // Add a comment first
    const cell = page.locator('[row-index="0"] [col-id="Name"]');
    await cell.click({ button: 'right' });
    await page.waitForTimeout(300);
    await page.getByTestId('comment-textarea').fill('Original comment');
    await page.getByTestId('comment-save').click();
    await page.waitForTimeout(500);

    // Close popover, then right-click again to view
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await cell.click({ button: 'right' });
    await page.waitForTimeout(300);
    await expect(page.getByTestId('comment-text')).toHaveText('Original comment');

    // Edit the comment
    await page.getByTestId('comment-edit').click();
    await page.getByTestId('comment-textarea').fill('Updated comment');
    await page.getByTestId('comment-save').click();
    await page.waitForTimeout(500);

    // Close popover, then verify update
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await cell.click({ button: 'right' });
    await page.waitForTimeout(300);
    await expect(page.getByTestId('comment-text')).toHaveText('Updated comment');
  });

  test('deletes a comment', async ({ page }) => {
    // Add a comment
    const cell = page.locator('[row-index="0"] [col-id="Name"]');
    await cell.click({ button: 'right' });
    await page.waitForTimeout(300);
    await page.getByTestId('comment-textarea').fill('To be deleted');
    await page.getByTestId('comment-save').click();
    await page.waitForTimeout(500);

    // Close popover, then delete it
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await cell.click({ button: 'right' });
    await page.waitForTimeout(300);
    await page.getByTestId('comment-delete').click();
    await page.waitForTimeout(500);

    // Comment indicator should be gone
    const hasCommentClass = await cell.evaluate((el) => {
      return el.classList.contains('has-comment');
    });
    expect(hasCommentClass).toBe(false);
  });
});
