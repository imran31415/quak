# Row Grouping & Subtotals

Group rows by a column value to organize data into collapsible sections with automatic subtotals. Useful for analyzing data by category, status, assignee, or any text/dropdown column.

<img src="/screenshots/row-grouping.png" alt="Row grouping with subtotals" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

*Rows grouped by Status with subtotal rows showing SUM for Budget column*

## Grouping Rows

1. Click the **menu icon** on a text or dropdown column header
2. Click **Group by this Column**
3. Rows are organized into collapsible groups with:
   - **Group headers** showing the value and row count (e.g., "Done (2)")
   - **Data rows** within each group
   - **Subtotal rows** with aggregated values

## Collapsing Groups

Click any **group header row** to collapse or expand that group. Collapsed groups hide their data rows and subtotal.

## Toolbar Indicator

When grouping is active, a chip appears in the toolbar: **"Grouped by: [column name]"** with an **x** button to remove the grouping.

## Removing Grouping

Two ways to remove grouping:
- Click the **x** on the toolbar grouping chip
- Click the column menu and select **Remove Grouping**

## Subtotals

Subtotal rows appear at the bottom of each group:
- **Number columns** show the SUM of values in the group
- **Other columns** show the item count (e.g., "3 items")

## Technical Details

- Grouping is a client-side transformation — no server changes needed
- The `buildGroupedRows()` function inserts header and subtotal rows into the flat data
- Group state (which groups are collapsed) is stored in component state
- Grouping configuration is stored in `uiStore` per-sheet via `groupByColumnId`
- Uses AG Grid's `cellRendererSelector` for custom rendering of group headers and subtotals
- Group header and subtotal rows are non-editable
