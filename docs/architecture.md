# Architecture

Quak uses a dual-DuckDB architecture: DuckDB-WASM runs in the browser for instant queries, while a Node.js server with `@duckdb/node-api` handles persistent storage.

## High-Level Overview

```
Browser                              Server
┌──────────────────────┐      ┌──────────────────────┐
│  React 19 + AG Grid  │      │  Express 4           │
│  ┌────────────────┐  │      │  ┌────────────────┐  │
│  │ Zustand Stores │  │ HTTP │  │ @duckdb/node   │  │
│  │  (sheet, UI,   │◄─┼──────┼─►│  (persistent)  │  │
│  │  undo, query)  │  │      │  │                │  │
│  └────────────────┘  │      │  └────────┬───────┘  │
│  ┌────────────────┐  │      │           │          │
│  │ DuckDB-WASM    │  │      │  ┌────────▼───────┐  │
│  │ (in-browser    │  │      │  │ quak.duckdb    │  │
│  │  SQL queries)  │  │      │  │ (file storage) │  │
│  └────────────────┘  │      │  └────────────────┘  │
└──────────────────────┘      └──────────────────────┘
```

## Project Structure

```
quak/
├── shared/              # Shared types, constants, type inference
│   ├── types.ts         # TypeScript interfaces (Sheet, Column, Row)
│   ├── constants.ts     # Cell types, defaults
│   └── typeInference.ts # Auto-detect column types on import
├── client/              # React frontend
│   ├── App.tsx          # Root component with drag-drop handling
│   ├── db/              # DuckDB-WASM initialization
│   ├── api/             # HTTP client for server API
│   ├── store/           # Zustand state management
│   │   ├── sheetStore   # Sheet CRUD, rows, columns, cells
│   │   ├── uiStore      # UI state (mobile, query panel)
│   │   ├── undoStore    # Undo/redo action stack
│   │   ├── queryStore   # Query history and results
│   │   └── toastStore   # Notification messages
│   ├── hooks/           # Custom React hooks
│   └── components/
│       ├── layout/      # AppShell, Header, Sidebar, MobileNav
│       ├── grid/        # SpreadsheetGrid, Toolbar, StatusBar
│       ├── cells/       # Per-type cell renderers and editors
│       ├── query/       # SQL panel, charts, history, templates
│       └── import/      # File import dialog
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── db.ts            # DuckDB initialization
│   ├── routes/          # API endpoints
│   └── utils/           # Batch insert optimization
└── tests/
    ├── unit/            # Vitest unit tests
    └── e2e/             # Playwright E2E tests
```

## Data Flow

1. **User edits a cell** in the AG Grid
2. **Zustand store** updates immediately (optimistic UI)
3. **Undo store** captures the action for undo/redo
4. **API client** sends the change to the Express server
5. **Server** persists to DuckDB on disk

For SQL queries:
1. **User writes SQL** in the query panel
2. **Current sheet data** is loaded into DuckDB-WASM as a temporary table
3. **DuckDB-WASM** executes the query entirely in the browser
4. **Results** are displayed as a table or chart

## State Management

Quak uses five Zustand stores, each with a single responsibility:

| Store | Purpose |
|-------|---------|
| `sheetStore` | Sheet list, active sheet, rows, columns, cell values |
| `uiStore` | UI flags — mobile detection, query panel visibility |
| `undoStore` | Action stack (max 50) for undo/redo |
| `queryStore` | Query text, results, history, pinned queries |
| `toastStore` | Toast notification queue |
