import { test, expect } from '@playwright/test';

test.describe('Chat Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Clear chat store from localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('quak-chat-store'));
    await page.reload();
  });

  test('opens and closes chat panel via toggle button', async ({ page }) => {
    // Panel should not be visible initially
    await expect(page.getByTestId('chat-panel')).not.toBeVisible();

    // Click AI button to open
    await page.getByTestId('toggle-chat').click();
    await expect(page.getByTestId('chat-panel')).toBeVisible();
    await expect(page.getByText('AI Assistant')).toBeVisible();

    // Click close button to close
    await page.getByTestId('close-chat').click();
    await expect(page.getByTestId('chat-panel')).not.toBeVisible();
  });

  test('toggles chat panel with AI button', async ({ page }) => {
    await page.getByTestId('toggle-chat').click();
    await expect(page.getByTestId('chat-panel')).toBeVisible();

    // Click AI button again to close
    await page.getByTestId('toggle-chat').click();
    await expect(page.getByTestId('chat-panel')).not.toBeVisible();
  });

  test('shows API key prompt when no key is set', async ({ page }) => {
    await page.getByTestId('toggle-chat').click();
    await expect(page.getByTestId('api-key-banner')).toBeVisible();
    await expect(page.getByTestId('set-api-key-btn')).toBeVisible();
  });

  test('can set API key', async ({ page }) => {
    await page.getByTestId('toggle-chat').click();

    // Click to show input
    await page.getByTestId('set-api-key-btn').click();
    await expect(page.getByTestId('api-key-input')).toBeVisible();

    // Enter and save key
    await page.getByTestId('api-key-input').fill('sk-or-test-key-123');
    await page.getByTestId('save-api-key').click();

    // Banner should disappear
    await expect(page.getByTestId('api-key-banner')).not.toBeVisible();
  });

  test('sends message and displays response (mock LLM)', async ({ page }) => {
    await page.getByTestId('toggle-chat').click();

    // Set a mock API key so we can send
    await page.getByTestId('set-api-key-btn').click();
    await page.getByTestId('api-key-input').fill('test-key');
    await page.getByTestId('save-api-key').click();

    // Type and send a message
    await page.getByTestId('chat-input').fill('Hello');
    await page.getByTestId('send-btn').click();

    // User message should appear
    await expect(page.getByTestId('user-message')).toBeVisible();
    await expect(page.getByTestId('user-message')).toContainText('Hello');

    // Assistant response should appear (mock returns a greeting)
    await expect(page.getByTestId('assistant-message')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('assistant-message')).toContainText('help you manage');
  });

  test('displays tool call card with mock add_rows', async ({ page }) => {
    // First create a sheet to have an active sheet
    const sheetName = `Chat Test ${Date.now()}`;
    await page.getByTestId('new-sheet-input').fill(sheetName);
    await page.getByTestId('create-sheet-btn').click();
    await page.getByTestId('template-tasks').click();
    await page.getByTestId('dialog-create-btn').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();

    // Open chat and set API key
    await page.getByTestId('toggle-chat').click();
    await page.getByTestId('set-api-key-btn').click();
    await page.getByTestId('api-key-input').fill('test-key');
    await page.getByTestId('save-api-key').click();

    // Send a message that triggers add_rows tool
    await page.getByTestId('chat-input').fill('add some rows please');
    await page.getByTestId('send-btn').click();

    // Wait for tool call card to appear
    await expect(page.getByTestId('tool-call-card')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('add_rows')).toBeVisible();

    // Wait for the response text
    await expect(page.getByTestId('assistant-message')).toContainText('added 2 sample rows', { timeout: 10000 });

    // Grid should have refreshed with new rows
    await expect(page.getByTestId('status-bar')).toContainText('2 rows', { timeout: 5000 });
  });

  test('model selector changes persist', async ({ page }) => {
    await page.getByTestId('toggle-chat').click();

    // Change model
    await page.getByTestId('model-selector').selectOption('openai/gpt-4o');

    // Reload and check persistence
    await page.reload();
    await page.getByTestId('toggle-chat').click();
    await expect(page.getByTestId('model-selector')).toHaveValue('openai/gpt-4o');
  });

  test('clear button removes all messages', async ({ page }) => {
    await page.getByTestId('toggle-chat').click();

    // Set API key
    await page.getByTestId('set-api-key-btn').click();
    await page.getByTestId('api-key-input').fill('test-key');
    await page.getByTestId('save-api-key').click();

    // Send a message
    await page.getByTestId('chat-input').fill('Hello');
    await page.getByTestId('send-btn').click();
    await expect(page.getByTestId('user-message')).toBeVisible();
    await expect(page.getByTestId('assistant-message')).toBeVisible({ timeout: 10000 });

    // Clear
    await page.getByTestId('clear-chat').click();
    await expect(page.getByTestId('user-message')).not.toBeVisible();
    await expect(page.getByText('Ask me to manage your spreadsheets!')).toBeVisible();
  });
});
