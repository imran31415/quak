# Column Freezing

Pin columns to the left side of the grid so they stay visible while scrolling horizontally. Useful for keeping identifier columns (like names or IDs) in view when working with wide sheets.

## Freezing a Column

1. Click the **menu icon** on any column header
2. Click **Freeze Column**
3. The column moves to the left pinned section with a small pin icon

## Unfreezing a Column

1. Click the menu icon on the frozen column
2. Click **Unfreeze Column**
3. The column returns to its normal position

## Behavior

- Frozen columns stay fixed on the left while other columns scroll horizontally
- Multiple columns can be frozen simultaneously
- A small **pin icon** appears next to frozen column names
- Freeze state persists across page reloads (stored on the server)

## Technical Details

- Uses AG Grid's built-in `pinned: 'left'` column property
- Freeze state is saved as part of the column configuration in DuckDB
- The `PUT /api/sheets/:id/columns/:columnId` endpoint handles the `pinned` field
