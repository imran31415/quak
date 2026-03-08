import { test, expect } from '@playwright/test';
import { createSheetWithData, waitForGrid } from '../helpers/e2e';

test.describe('Enhanced AI Chat Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('quak-chat-store'));
    await page.reload();
  });

  async function setupChatWithSheet(page: import('@playwright/test').Page) {
    const sheetId = await createSheetWithData(page, `Chat Tools ${Date.now()}`, [
      { name: 'Name', cellType: 'text' },
      { name: 'Category', cellType: 'dropdown', options: ['A', 'B'] },
      { name: 'Score', cellType: 'number' },
    ], [
      { Name: 'Charlie', Category: 'B', Score: 30 },
      { Name: 'Alice', Category: 'A', Score: 10 },
      { Name: 'Bob', Category: 'A', Score: 20 },
    ]);
    await waitForGrid(page);

    // Open chat and set API key
    await page.getByTestId('toggle-chat').click();
    await page.getByTestId('set-api-key-btn').click();
    await page.getByTestId('api-key-input').fill('test-key');
    await page.getByTestId('save-api-key').click();

    return sheetId;
  }

  test('summarize triggers summarize_data tool', async ({ page }) => {
    await setupChatWithSheet(page);

    // Send a message that triggers summarize_data
    await page.getByTestId('chat-input').fill('summarize my data');
    await page.getByTestId('send-btn').click();

    // Wait for tool call card to appear
    await expect(page.getByTestId('tool-call-card')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('summarize_data')).toBeVisible();

    // Wait for the response text
    await expect(page.getByTestId('assistant-message')).toContainText('summary', { timeout: 10000 });
  });

  test('sort triggers sort_sheet tool', async ({ page }) => {
    await setupChatWithSheet(page);

    // Send a message that triggers sort_sheet
    await page.getByTestId('chat-input').fill('sort this sheet');
    await page.getByTestId('send-btn').click();

    // Wait for tool call card to appear
    await expect(page.getByTestId('tool-call-card')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('sort_sheet')).toBeVisible();

    // Wait for the response text
    await expect(page.getByTestId('assistant-message')).toContainText('sorted', { timeout: 10000 });
  });

  test('tool results display in chat', async ({ page }) => {
    await setupChatWithSheet(page);

    // Send summarize to get a tool result with data
    await page.getByTestId('chat-input').fill('give me a summary');
    await page.getByTestId('send-btn').click();

    // Tool call card should show
    await expect(page.getByTestId('tool-call-card')).toBeVisible({ timeout: 10000 });

    // The tool result should contain data (the summarize_data tool returns column stats)
    await expect(page.getByTestId('tool-call-card')).toContainText('summarize_data');

    // The assistant message should also appear
    await expect(page.getByTestId('assistant-message')).toBeVisible({ timeout: 10000 });
  });
});
