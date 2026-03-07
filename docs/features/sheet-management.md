# Sheet Management

Quak supports multiple sheets, each with its own columns, rows, and data. Manage sheets from the sidebar.

## Creating Sheets

### Quick Create

Type a name in the sidebar input and click **+** to create a blank sheet with a single text column.

### From Templates

Click the template button to choose from pre-built sheet layouts:

| Template | Columns |
|----------|---------|
| **Blank** | Single text column |
| **Task Tracker** | Name (text), Value (number), Done (checkbox), Status (dropdown), Due Date (date), Notes (markdown) |
| **Budget** | Item (text), Amount (number), Category (dropdown), Date (date) |
| **Custom** | Define your own columns with any type combination |

Templates set up column names, types, and dropdown options so you can start entering data immediately.

## Switching Sheets

Click any sheet name in the sidebar to switch. The active sheet is highlighted. Your last active sheet is remembered across page reloads (stored in localStorage).

## Deleting Sheets

Click the **x** button next to a sheet name to delete it. This removes the sheet and all its data permanently.

## Column Management

Right-click a column header (or use the header menu) for column operations:

- **Rename** — change the column name
- **Change type** — convert to any of the 7 cell types
- **Delete** — remove the column and its data (with confirmation)

### Adding Columns

Click the **+** column button to add a new column. Configure:

1. **Name** — the column header text
2. **Type** — select from text, number, checkbox, dropdown, date, formula, markdown
3. **Options** — for dropdown columns, enter the available choices

### Resizing Columns

Drag the edge of any column header to resize it. Column widths are managed by AG Grid.

## Row Operations

- **Add rows** — click **+ Row** in the toolbar
- **Delete rows** — select rows with checkboxes, then click **Delete Selected**
- **Individual delete** — use the row action menu on each row
