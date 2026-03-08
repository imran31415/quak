# Multiple Views

Quak supports five different ways to visualize your data. All views render from the same underlying sheet data — switch between them instantly without duplicating anything.

## View Types

### Grid View (Default)

The traditional spreadsheet grid powered by AG Grid. Supports inline editing, per-column filters, sorting, and all cell types.

<img src="/screenshots/grid-view.png" alt="Grid view" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

### Kanban View

Groups rows into swim lanes based on a **dropdown column**. Drag and drop cards between lanes to update the cell value. Each card shows the row title plus two additional fields.

- Lanes are created automatically from dropdown options
- Drag cards between lanes to change their status
- On mobile, use the "Move to..." dropdown per card instead of drag

<img src="/screenshots/kanban-view.png" alt="Kanban view" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

### Calendar View

Displays rows on a month grid based on a **date column**. Navigate between months and click a date to see row details.

- Month navigation with previous/next arrows and Today button
- Events appear as blue chips on their date
- Click a date to expand a detail panel with full row information

<img src="/screenshots/calendar-view.png" alt="Calendar view" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

### Gallery View

A responsive card grid. Each card shows a title column and up to 5 field values. No configuration needed — auto-selects the first text column as the title.

- Responsive: 1 column on mobile, 2 on tablet, 3-4 on desktop
- Auto-selects first text column as card title
- Shows up to 5 additional fields per card

<img src="/screenshots/gallery-view.png" alt="Gallery view" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

### Pivot View

A cross-tabulation view that summarizes data with configurable row fields, column fields, value fields, and aggregation functions. Powered by DuckDB-WASM for instant computation.

- Select row field, column field, value field, and aggregation (SUM, COUNT, AVG, MIN, MAX)
- Grand total row at the bottom
- Read-only HTML table rendering

See [Pivot Tables](/features/pivot-tables) for full documentation.

<img src="/screenshots/pivot-table.png" alt="Pivot table view" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

## Switching Views

Click the view buttons in the toolbar above the sheet content:

| Button | View | Description |
|--------|------|-------------|
| Grid | Grid | Traditional spreadsheet |
| Kanban | Kanban | Swim lanes from dropdown columns |
| Calendar | Calendar | Month grid from date columns |
| Gallery | Gallery | Responsive card grid |
| Pivot | Pivot | Cross-tabulation summary table |

## Configuring Views

For Kanban, Calendar, and Gallery views, click the **gear icon** next to the view buttons to configure which column drives the view:

- **Kanban**: Select which dropdown column defines the lanes
- **Calendar**: Select which date column places events on the calendar
- **Gallery**: Select which column to use as the card title
- **Pivot**: Select row field, column field, value field, and aggregation

## Persistence

Your view choice and configuration are saved per-sheet in localStorage. When you return to a sheet, it remembers which view you were using and how it was configured.

## Technical Details

- Views are purely client-side — no server changes needed
- All views read from the same `sheetStore` data (rows and columns)
- Kanban drag-and-drop uses the HTML5 native drag API
- View state is stored in `uiStore` with Zustand persistence
- Row grouping and date mapping use `useMemo` for performance
