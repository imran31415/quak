# Pivot Tables

Summarize and cross-tabulate your data with a pivot table view. Select a row field, column field, value field, and aggregation function to instantly generate a summary table powered by DuckDB-WASM.

<img src="/screenshots/pivot-table.png" alt="Pivot table view" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

*Pivot table showing Budget by Assignee and Status with SUM aggregation*

## Switching to Pivot View

Click the **Pivot** button in the view switcher toolbar (next to Grid, Kanban, Calendar, Gallery).

## Configuring the Pivot

Four dropdowns at the top of the pivot view:

| Setting | Description | Column Types |
|---------|-------------|-------------|
| **Row Field** | Values become row labels | Text, Dropdown |
| **Column Field** | Values become column headers | Text, Dropdown |
| **Value Field** | Values are aggregated in cells | Number |
| **Aggregation** | How values are combined | SUM, COUNT, AVG, MIN, MAX |

## Reading the Table

- **Row labels** — distinct values from the Row Field
- **Column headers** — distinct values from the Column Field, plus a TOTAL column
- **Cell values** — aggregated values where row and column intersect
- **Grand Total row** — aggregation across all rows for each column

## Aggregation Functions

| Function | Description |
|----------|-------------|
| SUM | Total of all values |
| COUNT | Number of non-null values |
| AVG | Average (mean) of values |
| MIN | Smallest value |
| MAX | Largest value |

## Empty State

Before configuring, the pivot view shows a prompt: "Configure the pivot table above to see results."

## Technical Details

- Pivot computation runs entirely in the browser using DuckDB-WASM
- Sheet data is synced to a temporary `current_sheet` table in DuckDB-WASM
- SQL uses conditional aggregation (`CASE WHEN ... THEN ... END`) for cross-tabulation
- The pivot table is rendered as a plain HTML table (not AG Grid)
- Configuration is stored per-sheet in `uiStore` via `pivotConfig`
- Query helpers are in `client/utils/pivotQuery.ts`
