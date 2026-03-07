# Tech Stack

## Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| [React](https://react.dev) | 19 | UI framework |
| [TypeScript](https://typescriptlang.org) | 5.x | Type safety |
| [Vite](https://vite.dev) | 6 | Build tool and dev server |
| [AG Grid Community](https://ag-grid.com) | 35 | Spreadsheet grid component |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Utility-first styling |
| [Zustand](https://zustand.docs.pmnd.rs) | 5 | State management |
| [DuckDB-WASM](https://duckdb.org/docs/api/wasm) | 1.29 | In-browser SQL engine |
| [Recharts](https://recharts.org) | 3.8 | Chart visualization |
| [React Markdown](https://github.com/remarkjs/react-markdown) | 9 | Markdown cell rendering |

## Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Express](https://expressjs.com) | 4 | HTTP server |
| [@duckdb/node-api](https://duckdb.org/docs/api/nodejs/overview) | 1.4 | Server-side DuckDB |
| [Multer](https://github.com/expressjs/multer) | 1.x | File upload handling |
| [CORS](https://github.com/expressjs/cors) | 2.x | Cross-origin requests |

## AI Integration

| Technology | Purpose |
|-----------|---------|
| [OpenRouter](https://openrouter.ai) | Multi-provider LLM API gateway |
| Server-Sent Events (SSE) | Real-time streaming of LLM responses |
| Native `fetch` | HTTP streaming client (no extra dependencies) |

## Testing

| Technology | Purpose |
|-----------|---------|
| [Vitest](https://vitest.dev) | Unit testing (9 test files) |
| [Playwright](https://playwright.dev) | E2E testing (14 test files) |

## Development

| Tool | Purpose |
|------|---------|
| [tsx](https://github.com/privatenumber/tsx) | TypeScript execution for server |
| [concurrently](https://github.com/open-cli-tools/concurrently) | Run server + client in parallel |
| Make | Task runner for common operations |
