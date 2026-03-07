# Getting Started

## Prerequisites

- **Node.js** 20 or later
- **npm** 9 or later

## Installation

```bash
git clone <repo-url>
cd quak
npm install
```

## Development

Start both the Express server and Vite dev server:

```bash
npm run dev
```

This launches:
- **Express API server** on `http://localhost:3001`
- **Vite dev server** on `http://localhost:5173`

Open `http://localhost:5173` to use the app.

### Using the Makefile

The project includes a Makefile for common operations:

```bash
make dev        # Start both servers (kills existing first)
make kill       # Stop all running processes
make status     # Show running processes and port status
make clean      # Kill processes + clean database files
make clean-db   # Remove DuckDB database files only
```

## Your First Sheet

1. Open the app at `http://localhost:5173`
2. Type a sheet name in the sidebar and click **+** (or use a template)
3. Click **+ Row** to add data rows
4. Click any cell to edit its value
5. Click the **SQL** button to open the query panel and run queries against your data
6. Click the **AI** button to open the chat assistant and manage data with natural language

## What's Next

- Try the [AI Chat Assistant](/features/ai-chat) for natural-language data management
- Learn about all [Cell Types](/features/cell-types)
- Run [SQL Queries](/features/sql-queries) against your data
- Visualize results with [Charts](/features/charts)
- [Import data](/features/import-export) from CSV, TSV, or JSON files
