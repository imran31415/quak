# Testing

Quak has a comprehensive test suite covering both unit tests and end-to-end browser tests.

## Running Tests

```bash
# All tests (unit + E2E)
make test

# Unit tests only
make test-unit

# E2E tests only
make test-e2e

# Single E2E test file
make test-file F=query

# Quick check (typecheck + unit)
make check

# Full verification (typecheck + unit + E2E)
make verify
```

## Unit Tests (Vitest)

11 test files covering core logic:

| Test File | What It Tests |
|-----------|---------------|
| `csvParser.test.ts` | CSV parsing with delimiters, quotes, edge cases |
| `exportUtils.test.ts` | Data export to CSV and JSON |
| `formulaEngine.test.ts` | SQL formula evaluation |
| `validation.test.ts` | Cell value validation by type |
| `validationRules.test.ts` | Extended validation rules (required, min/max, regex) |
| `conditionalFormat.test.ts` | Conditional formatting rule evaluation |
| `undoStore.test.ts` | Undo/redo stack behavior |
| `column-management.test.ts` | Column add/delete/rename/type change |
| `constants.test.ts` | Constants and cell type definitions |
| `server-routes.test.ts` | Express API route handlers |
| `typeInference.test.ts` | Auto-detection of column types |

## E2E Tests (Playwright)

20 test files that drive a real browser:

| Test File | What It Tests |
|-----------|---------------|
| `cells.spec.ts` | Cell editing for each type |
| `charts.spec.ts` | Chart rendering and interactions |
| `chat.spec.ts` | AI chat panel, tool calls, mock LLM responses |
| `chat-tools.spec.ts` | Enhanced AI tools (summarize, sort) |
| `column-freeze.spec.ts` | Column freezing and unfreezing |
| `columns.spec.ts` | Column operations (add, rename, delete, type change) |
| `conditional-format.spec.ts` | Conditional formatting rules and persistence |
| `data-validation.spec.ts` | Data validation rules and visual feedback |
| `filter-sort.spec.ts` | Search, column filters, sorting |
| `grouping.spec.ts` | Row grouping, collapse/expand, subtotals |
| `import-export.spec.ts` | File import and data export |
| `keyboard.spec.ts` | Keyboard shortcut handling |
| `mobile.spec.ts` | Mobile layout and navigation |
| `multi-sheet-query.spec.ts` | Cross-sheet SQL queries |
| `pivot.spec.ts` | Pivot table view and aggregation |
| `query-history.spec.ts` | Query history and pinning |
| `query.spec.ts` | SQL query execution and results |
| `row-operations.spec.ts` | Row add, delete, and selection |
| `sheet.spec.ts` | Sheet CRUD operations |
| `views.spec.ts` | Grid, Kanban, Calendar, Gallery views |

## Test Architecture

- **E2E tests** use Playwright to start the full app (server + client) and drive a Chromium browser
- **Unit tests** use Vitest with fast in-memory execution
- Both share test fixtures from `tests/helpers/fixtures.ts`
- E2E tests clean the database before each run for isolation
- Chat tests use `MOCK_LLM=true` environment variable for deterministic LLM responses without external API calls
