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
│  │  undo, query,  │  │      │  │                │  │
│  │  chat)         │  │  SSE │  └────────┬───────┘  │
│  └────────────────┘  │◄─────┤           │          │
│  ┌────────────────┐  │      │  ┌────────▼───────┐  │
│  │ DuckDB-WASM    │  │      │  │ quak.duckdb    │  │
│  │ (in-browser    │  │      │  │ (file storage) │  │
│  │  SQL queries)  │  │      │  └────────────────┘  │
│  └────────────────┘  │      │  ┌────────────────┐  │
│  ┌────────────────┐  │      │  │ LLM Integration│  │
│  │ Chat Panel     │  │      │  │ (OpenRouter +  │  │
│  │ (AI assistant) │  │      │  │  tool executor)│  │
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
│   │   ├── uiStore      # UI state (mobile, query panel, chat panel)
│   │   ├── chatStore    # Chat messages, model, API key
│   │   ├── undoStore    # Undo/redo action stack
│   │   ├── queryStore   # Query history and results
│   │   └── toastStore   # Notification messages
│   ├── hooks/           # Custom React hooks
│   └── components/
│       ├── layout/      # AppShell, Header, Sidebar, MobileNav
│       ├── grid/        # SpreadsheetGrid, Toolbar, StatusBar
│       ├── cells/       # Per-type cell renderers and editors
│       ├── chat/        # AI chat panel and tool call cards
│       ├── query/       # SQL panel, charts, history, templates
│       └── import/      # File import dialog
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── db.ts            # DuckDB initialization
│   ├── routes/          # API endpoints (sheets, query, chat)
│   ├── llm/             # LLM integration (OpenRouter, tools, system prompt)
│   └── utils/           # SQL helpers, batch insert
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

For AI chat:
1. **User sends a message** in the chat panel
2. **Server** builds a system prompt with sheet context and streams to OpenRouter
3. **LLM** responds with text and/or tool calls
4. **Server** executes tool calls directly against DuckDB and returns results via SSE
5. **Agentic loop** — LLM can make multiple rounds of tool calls (up to 10)
6. **Client** updates the grid when mutating tools complete

## State Management

Quak uses six Zustand stores, each with a single responsibility:

| Store | Purpose |
|-------|---------|
| `sheetStore` | Sheet list, active sheet, rows, columns, cell values |
| `uiStore` | UI flags — mobile detection, query panel, chat panel |
| `chatStore` | Chat messages, streaming state, model selection, API key |
| `undoStore` | Action stack (max 50) for undo/redo |
| `queryStore` | Query text, results, history, pinned queries |
| `toastStore` | Toast notification queue |
