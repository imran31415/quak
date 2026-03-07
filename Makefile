.PHONY: dev server client test test-unit test-e2e test-e2e-ui typecheck clean kill status build install reset test-file check verify

# Default: start both server and client
dev: kill
	npm run dev

# Start just the Express server
server: kill-server
	npx tsx server/index.ts

# Start just the Vite client
client: kill-client
	npx vite --port 5173

# Run all tests (unit + E2E)
test: test-unit test-e2e

# Run unit tests
test-unit:
	npx vitest run

# Run E2E tests (Playwright auto-starts servers via webServer config)
test-e2e: kill clean-db
	npx playwright test

# Run a specific E2E test file (usage: make test-file F=query)
test-file: kill clean-db
	npx playwright test tests/e2e/$(F).spec.ts --reporter=list

# Run E2E with headed browser for debugging
test-e2e-ui: kill clean-db
	npx playwright test --headed

# TypeScript type check (no emit)
typecheck:
	npx tsc --noEmit

# Install all dependencies including Playwright browsers
install:
	npm install
	npx playwright install chromium

# Kill ALL quak-related processes (server, client, esbuild)
kill:
	-pkill -f "tsx.*server/index" 2>/dev/null || true
	-pkill -f "vite.*--port" 2>/dev/null || true
	-pkill -f "node.*vite" 2>/dev/null || true
	-pkill -f "esbuild.*service" 2>/dev/null || true
	-pkill -f "concurrently.*dev" 2>/dev/null || true
	@sleep 2

# Kill just server processes
kill-server:
	-pkill -f "tsx.*server/index" 2>/dev/null
	@sleep 1

# Kill just client (Vite) processes
kill-client:
	-pkill -f "node.*vite" 2>/dev/null
	-pkill -f "esbuild.*service" 2>/dev/null
	@sleep 1

# Remove test database
clean-db:
	rm -f server/storage/data/quak.duckdb server/storage/data/quak.duckdb.wal

# Clean database, test results, and vite cache
clean: kill clean-db
	rm -rf test-results/
	rm -rf node_modules/.vite/

# Full clean and rebuild
reset: clean
	rm -rf node_modules/
	npm install

# Build for production
build:
	npx vite build

# Quick check: typecheck + unit tests
check: typecheck test-unit

# Full verification: typecheck + unit + E2E
verify: typecheck test-unit test-e2e

# Show running quak processes and port status
status:
	@echo "=== Quak Processes ==="
	@ps aux | grep -E "(vite|tsx.*server|esbuild.*service|concurrently)" | grep -v grep || echo "  (none running)"
	@echo ""
	@echo "=== Port Status ==="
	@grep -q "1435" /proc/net/tcp6 2>/dev/null && echo "  5173 (Vite): in use" || echo "  5173 (Vite): free"
	@grep -q "0BC1" /proc/net/tcp6 2>/dev/null && echo "  3001 (Server): in use" || echo "  3001 (Server): free"
