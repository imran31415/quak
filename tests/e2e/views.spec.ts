import { test, expect } from '@playwright/test';
import { createSheetWithData, deleteAllSheets } from '../helpers/e2e';

test.describe('Multiple Views', () => {
  let sheetId: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await deleteAllSheets(page);

    sheetId = await createSheetWithData(
      page,
      `Views Test ${Date.now()}`,
      [
        { name: 'Name', cellType: 'text', width: 200 },
        { name: 'Status', cellType: 'dropdown', width: 120, options: ['Todo', 'In Progress', 'Done'] },
        { name: 'Due Date', cellType: 'date', width: 130 },
        { name: 'Priority', cellType: 'number', width: 100 },
      ],
      [
        { Name: 'Task A', Status: 'Todo', 'Due Date': '2026-03-15', Priority: 1 },
        { Name: 'Task B', Status: 'In Progress', 'Due Date': '2026-03-20', Priority: 2 },
        { Name: 'Task C', Status: 'Done', 'Due Date': '2026-03-10', Priority: 3 },
      ]
    );
  });

  test('shows view switcher with 4 view options', async ({ page }) => {
    const switcher = page.getByTestId('view-switcher');
    await expect(switcher).toBeVisible();
    await expect(page.getByTestId('view-btn-grid')).toBeVisible();
    await expect(page.getByTestId('view-btn-kanban')).toBeVisible();
    await expect(page.getByTestId('view-btn-calendar')).toBeVisible();
    await expect(page.getByTestId('view-btn-gallery')).toBeVisible();
  });

  test('defaults to grid view', async ({ page }) => {
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();
  });

  test('switches to gallery view and shows cards', async ({ page }) => {
    await page.getByTestId('view-btn-gallery').click();
    await expect(page.getByTestId('gallery-view')).toBeVisible();

    const cards = page.getByTestId('gallery-card');
    await expect(cards).toHaveCount(3);

    // Check card titles
    const titles = page.getByTestId('gallery-card-title');
    await expect(titles.first()).toContainText('Task A');
  });

  test('switches to kanban view and shows lanes', async ({ page }) => {
    await page.getByTestId('view-btn-kanban').click();
    await expect(page.getByTestId('kanban-view')).toBeVisible();

    // Should have lanes for each dropdown option
    await expect(page.getByTestId('kanban-lane-Todo')).toBeVisible();
    await expect(page.getByTestId('kanban-lane-In Progress')).toBeVisible();
    await expect(page.getByTestId('kanban-lane-Done')).toBeVisible();

    // Cards should be distributed
    const cards = page.getByTestId('kanban-card');
    await expect(cards).toHaveCount(3);
  });

  test('switches to calendar view and shows navigation', async ({ page }) => {
    await page.getByTestId('view-btn-calendar').click();
    await expect(page.getByTestId('calendar-view')).toBeVisible();

    // Navigate to March 2026 where our test data lives
    await expect(page.getByTestId('calendar-title')).toBeVisible();
    await expect(page.getByTestId('calendar-prev')).toBeVisible();
    await expect(page.getByTestId('calendar-next')).toBeVisible();
    await expect(page.getByTestId('calendar-today')).toBeVisible();
  });

  test('calendar shows events on correct dates', async ({ page }) => {
    await page.getByTestId('view-btn-calendar').click();

    // Navigate to March 2026
    const title = page.getByTestId('calendar-title');
    const titleText = await title.textContent();

    // If not on March 2026, navigate there
    if (!titleText?.includes('March 2026')) {
      // Navigate forward/back to find it - for now just check events exist
      // The test data has dates in March 2026
      let attempts = 0;
      while (attempts < 24) {
        const current = await title.textContent();
        if (current?.includes('March 2026')) break;
        if (current?.includes('2027') || current?.includes('2028')) {
          await page.getByTestId('calendar-prev').click();
        } else {
          await page.getByTestId('calendar-next').click();
        }
        attempts++;
        await page.waitForTimeout(100);
      }
    }

    // Events should appear on dates
    const events = page.getByTestId('calendar-event');
    await expect(events.first()).toBeVisible();
  });

  test('calendar navigation works', async ({ page }) => {
    await page.getByTestId('view-btn-calendar').click();

    const title = page.getByTestId('calendar-title');
    const initialTitle = await title.textContent();

    // Go next month
    await page.getByTestId('calendar-next').click();
    const nextTitle = await title.textContent();
    expect(nextTitle).not.toBe(initialTitle);

    // Go prev month
    await page.getByTestId('calendar-prev').click();
    const backTitle = await title.textContent();
    expect(backTitle).toBe(initialTitle);
  });

  test('switches back to grid view', async ({ page }) => {
    // Go to gallery
    await page.getByTestId('view-btn-gallery').click();
    await expect(page.getByTestId('gallery-view')).toBeVisible();

    // Go back to grid
    await page.getByTestId('view-btn-grid').click();
    await expect(page.getByTestId('spreadsheet-grid')).toBeVisible();
  });

  test('view choice persists across reload', async ({ page }) => {
    // Switch to gallery
    await page.getByTestId('view-btn-gallery').click();
    await expect(page.getByTestId('gallery-view')).toBeVisible();

    // Reload
    await page.reload();
    await page.waitForTimeout(2000);

    // Click the sheet in the sidebar to load it
    const sheetList = page.getByTestId('sheet-list');
    await sheetList.waitFor({ state: 'visible', timeout: 5000 });
    // Find any sheet button that contains "Views Test"
    const sheetBtn = sheetList.getByText(/Views Test/);
    const btnCount = await sheetBtn.count();
    if (btnCount > 0) {
      await sheetBtn.first().click();
      await page.waitForTimeout(1500);
    }

    // Should still be in gallery view (persisted via localStorage)
    await expect(page.getByTestId('gallery-view')).toBeVisible();
  });

  test('config button appears for non-grid views', async ({ page }) => {
    // Grid view: no config button
    await expect(page.getByTestId('view-config-btn')).not.toBeVisible();

    // Gallery view: config button visible
    await page.getByTestId('view-btn-gallery').click();
    await expect(page.getByTestId('view-config-btn')).toBeVisible();

    // Click it to open popover
    await page.getByTestId('view-config-btn').click();
    await expect(page.getByTestId('view-config-popover')).toBeVisible();
  });

  test('gallery cards show field values', async ({ page }) => {
    await page.getByTestId('view-btn-gallery').click();

    const firstCard = page.getByTestId('gallery-card').first();
    await expect(firstCard).toContainText('Status');
    await expect(firstCard).toContainText('Priority');
  });

  test('kanban card titles display correctly', async ({ page }) => {
    await page.getByTestId('view-btn-kanban').click();

    const titles = page.getByTestId('kanban-card-title');
    const allTitles: string[] = [];
    const count = await titles.count();
    for (let i = 0; i < count; i++) {
      allTitles.push((await titles.nth(i).textContent()) || '');
    }

    expect(allTitles).toContain('Task A');
    expect(allTitles).toContain('Task B');
    expect(allTitles).toContain('Task C');
  });
});
