# Conditional Formatting

Apply color-coded formatting rules to cells based on their values. Highlight important data at a glance — for example, green for "Done" status, red for overdue items, or yellow for values above a threshold.

<img src="/screenshots/conditional-formatting.png" alt="Conditional formatting" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

*Status column with green/yellow/red formatting, Priority column with red/blue formatting*

## Adding Rules

1. Click the **menu icon** on any column header
2. Click **Conditional Formatting**
3. In the panel that appears:
   - Select an **operator** (equals, not equals, greater than, less than, contains, is empty, is not empty)
   - Enter a **value** to match (not needed for is empty/is not empty)
   - Choose a **background color** and **text color** from the palette
4. Click **Add Rule** to add more rules
5. Click **Save** to apply

## Operators

| Operator | Description | Example |
|----------|-------------|---------|
| equals | Exact match | Status equals "Done" |
| not_equals | Does not match | Priority not equals "Low" |
| greater_than | Numeric comparison | Budget greater than 5000 |
| less_than | Numeric comparison | Score less than 50 |
| contains | Substring match | Name contains "test" |
| is_empty | Cell is null/empty | Notes is empty |
| is_not_empty | Cell has a value | Assignee is not empty |

## Color Palette

8 predefined colors with light and dark mode variants:

- Red, Green, Blue, Yellow, Purple, Pink, Orange, Teal

Colors automatically adapt to dark mode — using darker backgrounds and lighter text colors.

## Multiple Rules

You can add multiple rules to the same column. Rules are evaluated in order — the first matching rule determines the cell's styling.

## Persistence

Formatting rules are saved as part of the column configuration on the server. They persist across page reloads and sessions.

## Technical Details

- Rules are stored in the `conditionalFormats` array on each `ColumnConfig`
- AG Grid's `cellStyle` callback evaluates rules on each render
- The `evaluateRules()` function in `client/utils/conditionalFormat.ts` handles matching
- Dark mode detection uses `document.documentElement.classList.contains('dark')`
