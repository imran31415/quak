# Quak — DuckDB-Powered Spreadsheet

A spreadsheet application powered by DuckDB, where cells can contain both data and interactive UI widgets (dropdowns, checkboxes, date pickers, rendered markdown) on the same sheet. DuckDB-WASM runs in the browser for instant SQL queries; a Node.js server persists data.

![Quak Screenshot](screenshot.png)

## Features

- **Hybrid cell types** — text, numbers, checkboxes, dropdowns, date pickers, and markdown all in one sheet
- **In-browser SQL** — query your spreadsheet data with SQL powered by DuckDB-WASM
- **Instant editing** — optimistic UI updates with background server sync
- **Markdown rendering** — cells render bold, italic, code, lists, and GFM checkboxes
- **Responsive** — mobile-friendly layout with bottom navigation and slide-over sidebar
- **Persistent storage** — server-side DuckDB for durable data

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite 6 |
| Grid | AG Grid Community v35 |
| Styling | Tailwind CSS |
| State | Zustand 5 |
| Client DB | DuckDB-WASM (in-browser SQL) |
| Server | Express 4 + @duckdb/node-api |
| Tests | Vitest (unit) + Playwright (E2E) |

## Quick Start

```bash
npm install
npm run dev
```

This starts both the Express server (port 3001) and Vite dev server (port 5173). Open http://localhost:5173.

## Project Structure

```
quak/
├── shared/          # Shared types & constants
├── client/          # React frontend
│   ├── db/          # DuckDB-WASM setup
│   ├── api/         # Server API calls
│   ├── store/       # Zustand stores
│   ├── hooks/       # Custom hooks
│   └── components/  # UI components
│       ├── layout/  # AppShell, Header, Sidebar, MobileNav
│       ├── grid/    # SpreadsheetGrid, GridToolbar, StatusBar
│       ├── cells/   # CellRouter + per-type renderers
│       └── query/   # SQL query panel
├── server/          # Express backend + DuckDB storage
└── tests/           # Unit (Vitest) + E2E (Playwright)
```

## Cell Types

| Type | Description |
|------|-------------|
| Text | Standard text input |
| Number | Numeric values |
| Checkbox | Toggle on/off with a click |
| Dropdown | Select from predefined options |
| Date | Native date picker |
| Markdown | Rich text with GFM support |

## SQL Query Panel

Click the **SQL** button to open the query panel. Queries run against DuckDB-WASM in the browser — your current sheet data is available as `current_sheet`.

```sql
SELECT * FROM current_sheet WHERE Priority = 'Critical'
```

## Testing

```bash
# Unit tests
npx vitest run

# E2E tests
npx playwright test
```

## License

MIT
