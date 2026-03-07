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
