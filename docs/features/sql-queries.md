# SQL Query Panel

Quak's SQL query panel lets you run SQL against your spreadsheet data using DuckDB-WASM, entirely in the browser.

## Opening the Query Panel

Click the **SQL** button in the top-right corner of the header. The query panel appears below the spreadsheet grid.

## Writing Queries

The query editor includes **SQL syntax highlighting** with color-coded keywords, strings, and numbers. Your current sheet is available as the table `current_sheet`.

```sql
SELECT * FROM current_sheet WHERE Priority = 'Critical'
```

### Querying Across Sheets

All sheets are available as SQL tables. Table names are derived from sheet names (lowercased, spaces replaced with underscores):

```sql
-- Sheet "Project Tracker" becomes "project_tracker"
SELECT t.Task, b.Amount
FROM project_tracker t
JOIN budget b ON t.Task = b.Item
```

The **Table List** panel shows all available tables and lets you click to insert a table name into your query.

## Running Queries

- Click the **Run** button, or
- Press **Ctrl+Enter** (or **Cmd+Enter** on Mac)

Results appear below the editor with:
- **Row count** and **execution time** (e.g., "10 rows - 71.9ms")
- A results table matching the query output

## Query Templates

Click **Templates** to see pre-built query patterns:

| Template | Query |
|----------|-------|
| Select All | `SELECT * FROM current_sheet LIMIT 100` |
| Count | `SELECT COUNT(*) as total FROM current_sheet` |
| Group By | `SELECT column, COUNT(*) FROM current_sheet GROUP BY column` |
| Filter | `SELECT * FROM current_sheet WHERE column = 'value'` |

Click any template to insert it into the editor.

## Query History

Every query you run is saved automatically. Click **History** to browse:

- **Recent queries** with execution time and row count
- **Pin** queries with a custom name for quick access
- **Saved** tab for pinned queries
- **Clear** history when needed

Click any history entry to restore it to the editor.

<img src="/screenshots/project-tracker.png" alt="SQL query panel with results" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

*Query panel showing SQL results below the Project Tracker spreadsheet*
