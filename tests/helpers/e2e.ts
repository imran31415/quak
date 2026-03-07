import type { Page } from '@playwright/test';

export async function createSheet(page: Page, name?: string, columns?: { name: string; cellType: string }[]) {
  const sheetName = name || `Test Sheet ${Date.now()}`;
  await page.getByTestId('new-sheet-input').fill(sheetName);
  await page.getByTestId('create-sheet-btn').click();
  await page.waitForTimeout(1000);
  return sheetName;
}

export async function deleteAllSheets(page: Page) {
  page.on('dialog', (dialog) => dialog.accept());
  const deleteButtons = page.locator('button[data-testid^="delete-sheet-"]');
  const count = await deleteButtons.count();
  for (let i = count - 1; i >= 0; i--) {
    await deleteButtons.nth(i).click();
    await page.waitForTimeout(300);
  }
}

export async function waitForGrid(page: Page) {
  await page.getByTestId('spreadsheet-grid').waitFor({ state: 'visible', timeout: 10000 });
}

export async function getCellValue(page: Page, row: number, col: number) {
  const cells = page.getByRole('gridcell');
  const cell = cells.nth(row * (await getColumnCount(page)) + col);
  return cell.textContent();
}

async function getColumnCount(page: Page) {
  const headers = page.getByRole('columnheader');
  return headers.count();
}

export async function addRows(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await page.getByTestId('add-row-btn').click();
    await page.waitForTimeout(800);
  }
}

export async function openQueryPanel(page: Page) {
  await page.getByTestId('toggle-query').click();
  await page.getByTestId('query-panel').waitFor({ state: 'visible' });
}

export async function runQuery(page: Page, sql: string) {
  const queryInput = page.getByTestId('query-input');
  await queryInput.fill(sql);
  await page.getByTestId('run-query-btn').click();
  await page.waitForTimeout(2000);
}

/**
 * Creates a sheet with data via the API, then loads it in the UI.
 * Returns the sheet ID.
 */
export async function createSheetWithData(
  page: Page,
  name: string,
  columns: { name: string; cellType: string; width?: number; options?: string[] }[],
  rows: Record<string, unknown>[]
): Promise<string> {
  const baseURL = 'http://localhost:3001';

  // Create sheet via API
  const colsWithIds = columns.map((c) => ({
    ...c,
    id: c.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
    width: c.width || 150,
  }));

  const createRes = await page.request.post(`${baseURL}/api/sheets`, {
    data: { name, columns: colsWithIds },
  });
  const { id } = await createRes.json();

  // Add rows via API
  for (const row of rows) {
    await page.request.post(`${baseURL}/api/sheets/${id}/rows`, {
      data: row,
    });
  }

  // Navigate and load the sheet in the UI
  await page.goto('/');
  await page.waitForTimeout(500);
  const sheetLink = page.getByTestId('sheet-list').getByText(name);
  await sheetLink.click();
  await page.waitForTimeout(1000);

  return id;
}
