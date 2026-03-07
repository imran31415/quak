# Search & Filtering

Quak provides multiple ways to find and filter data in your sheets.

## Text Search

Press **Ctrl+F** (or click the search icon) to open the search bar. Type to filter rows in real-time.

- **Match count** shows how many rows match (e.g., "3 of 10 rows")
- Search checks all cell values across every column
- Press **Escape** to close the search bar and clear the filter
- A yellow indicator bar appears when search is active

## Column Filters

Toggle **floating filters** to show per-column filter inputs directly in the column headers.

Each column type gets an appropriate filter:

| Column Type | Filter Behavior |
|-------------|----------------|
| Text | Contains / starts with / exact match |
| Number | Equals / greater than / less than / range |
| Date | Date range selection |
| Checkbox | True / false filter |
| Dropdown | Select from available options |

A blue notification bar shows when column filters are active, displaying the count of filtered columns. Click **Clear Filters** to remove all column filters at once.

## Sorting

Click any column header to sort:

- **First click** — sort ascending
- **Second click** — sort descending
- **Third click** — remove sort

Hold **Shift** and click additional columns for multi-column sorting.

## Combined Filtering

Text search, column filters, and sorting all work together. The status bar at the bottom shows the current filtered row count vs. total rows.
