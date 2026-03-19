import { test, expect } from '@playwright/test';

test.describe('Version History / Snapshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sheetName = `Snap Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();
  });

  test('version history toggle button is visible', async ({ page }) => {
    await expect(page.getByTestId('version-history-toggle')).toBeVisible();
  });

  test('opens and closes version history panel', async ({ page }) => {
    await page.getByTestId('version-history-toggle').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('version-history-panel')).toBeVisible();

    await page.getByTestId('version-history-close').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('version-history-panel')).not.toBeVisible();
  });

  test('shows empty state when no snapshots', async ({ page }) => {
    await page.getByTestId('version-history-toggle').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('version-history-empty')).toBeVisible();
  });

  test('creates snapshot with default label', async ({ page }) => {
    await page.getByTestId('version-history-toggle').click();
    await page.waitForTimeout(300);

    await page.getByTestId('snapshot-create-btn').click();
    await page.getByTestId('snapshot-confirm-create').click();
    await page.waitForTimeout(1000);

    const entries = page.getByTestId('snapshot-entry');
    await expect(entries).toHaveCount(1);
    await expect(page.getByTestId('snapshot-version-badge').first()).toHaveText('v1');
  });

  test('creates snapshot with custom label', async ({ page }) => {
    await page.getByTestId('version-history-toggle').click();
    await page.waitForTimeout(300);

    await page.getByTestId('snapshot-create-btn').click();
    await page.getByTestId('snapshot-label-input').fill('My checkpoint');
    await page.getByTestId('snapshot-confirm-create').click();
    await page.waitForTimeout(1000);

    await expect(page.getByTestId('snapshot-label').first()).toHaveText('My checkpoint');
  });

  test('restores snapshot and auto-creates pre-restore snapshot', async ({ page }) => {
    // Add a row so we have data
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(500);

    // Create snapshot
    await page.getByTestId('version-history-toggle').click();
    await page.waitForTimeout(300);
    await page.getByTestId('snapshot-create-btn').click();
    await page.getByTestId('snapshot-confirm-create').click();
    await page.waitForTimeout(1000);

    // Add another row to change state
    await page.getByTestId('version-history-close').click();
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(500);

    // Restore
    await page.getByTestId('version-history-toggle').click();
    await page.waitForTimeout(300);
    await page.getByTestId('snapshot-restore-btn').first().click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('restore-confirmation')).toBeVisible();
    await page.getByTestId('restore-confirm-btn').click();
    await page.waitForTimeout(1500);

    // Should now have 2 snapshots (original + auto-save)
    const entries = page.getByTestId('snapshot-entry');
    const count = await entries.count();
    expect(count).toBe(2);
  });

  test('deletes snapshot', async ({ page }) => {
    // Create a snapshot
    await page.getByTestId('version-history-toggle').click();
    await page.waitForTimeout(300);
    await page.getByTestId('snapshot-create-btn').click();
    await page.getByTestId('snapshot-confirm-create').click();
    await page.waitForTimeout(1000);

    await expect(page.getByTestId('snapshot-entry')).toHaveCount(1);

    // Delete it
    await page.getByTestId('snapshot-delete-btn').first().click();
    await page.waitForTimeout(1000);

    await expect(page.getByTestId('version-history-empty')).toBeVisible();
  });

  test('preview modal shows snapshot data', async ({ page }) => {
    // Add a row with data
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(500);

    // Create snapshot
    await page.getByTestId('version-history-toggle').click();
    await page.waitForTimeout(300);
    await page.getByTestId('snapshot-create-btn').click();
    await page.getByTestId('snapshot-confirm-create').click();
    await page.waitForTimeout(1000);

    // Open preview
    await page.getByTestId('snapshot-preview-btn').first().click();
    await page.waitForTimeout(500);

    await expect(page.getByTestId('snapshot-preview-modal')).toBeVisible();
    await expect(page.getByTestId('snapshot-preview-table')).toBeVisible();
    await expect(page.getByTestId('snapshot-preview-meta')).toBeVisible();

    // Close
    await page.getByTestId('snapshot-preview-close').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('snapshot-preview-modal')).not.toBeVisible();
  });

  test('mutual exclusion with audit panel', async ({ page }) => {
    // Open version history panel
    await page.getByTestId('version-history-toggle').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('version-history-panel')).toBeVisible();

    // Click audit log toggle via dispatchEvent to bypass panel overlay
    await page.getByTestId('audit-log-toggle').dispatchEvent('click');
    await page.waitForTimeout(300);

    // Audit panel should be open, version panel should be closed
    await expect(page.getByTestId('audit-log-panel')).toBeVisible();
    await expect(page.getByTestId('version-history-panel')).not.toBeVisible();

    // Click version history toggle via dispatchEvent to bypass panel overlay
    await page.getByTestId('version-history-toggle').dispatchEvent('click');
    await page.waitForTimeout(300);

    // Version panel should be open, audit panel should be closed
    await expect(page.getByTestId('version-history-panel')).toBeVisible();
    await expect(page.getByTestId('audit-log-panel')).not.toBeVisible();
  });
});
