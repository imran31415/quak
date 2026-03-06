import { DuckDBProvider } from './db/DuckDBProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { SpreadsheetGrid } from './components/grid/SpreadsheetGrid';
import { QueryPanel } from './components/query/QueryPanel';

export default function App() {
  return (
    <ErrorBoundary>
      <DuckDBProvider>
        <AppShell>
          <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0">
              <SpreadsheetGrid />
            </div>
            <QueryPanel />
          </div>
        </AppShell>
      </DuckDBProvider>
    </ErrorBoundary>
  );
}
