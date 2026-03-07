# Charts & Visualization

Query results can be visualized as interactive charts. After running a SQL query, switch from table view to chart view with one click.

## Chart Types

### Bar Chart

Best for comparing values across categories. Select a text column for the X axis and a numeric column for the Y axis.

```sql
SELECT Owner, COUNT(*) as task_count
FROM current_sheet
GROUP BY Owner
ORDER BY task_count DESC
```

### Line Chart

Best for showing trends over time or sequences. Works well with date or ordered data.

```sql
SELECT "Due Date", SUM(Estimate) as total_estimate
FROM current_sheet
GROUP BY "Due Date"
ORDER BY "Due Date"
```

### Pie Chart

Best for showing proportions of a whole. Uses the first text column as labels and first numeric column as values.

```sql
SELECT Priority, COUNT(*) as count
FROM current_sheet
GROUP BY Priority
```

## Using Charts

1. **Run a query** that returns at least one text column and one numeric column
2. Click the **Chart** toggle to switch from table view
3. **Select chart type** — bar, line, or pie
4. **Configure axes** — choose which columns map to X and Y

The chart updates immediately when you change the configuration.

## Tips

- Queries that return a single numeric column (like `COUNT(*)`) work best as simple indicators — use bar or pie charts for more interesting visuals
- Use `ORDER BY` in your query to control the display order
- `GROUP BY` queries pair naturally with charts — aggregate your data first, then visualize
- Charts are powered by [Recharts](https://recharts.org/) and are fully interactive (hover for tooltips)
