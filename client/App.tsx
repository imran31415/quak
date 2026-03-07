import { useCallback, useState } from 'react';
import { DuckDBProvider } from './db/DuckDBProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { SpreadsheetGrid } from './components/grid/SpreadsheetGrid';
import { QueryPanel } from './components/query/QueryPanel';
import { ImportDialog } from './components/import/ImportDialog';
import { ToastContainer } from './components/layout/Toast';

export default function App() {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showImport, setShowImport] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv' || ext === 'tsv' || ext === 'json') {
        setImportFile(file);
        setShowImport(true);
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <DuckDBProvider>
        <div onDragOver={handleDragOver} onDrop={handleDrop} className="h-full">
          <AppShell>
            <div className="flex flex-col h-full">
              <div className="flex-1 min-h-0">
                <SpreadsheetGrid />
              </div>
              <QueryPanel />
            </div>
          </AppShell>
        </div>
        {showImport && (
          <ImportDialog
            initialFile={importFile || undefined}
            onClose={() => {
              setShowImport(false);
              setImportFile(null);
            }}
          />
        )}
      </DuckDBProvider>
      <ToastContainer />
    </ErrorBoundary>
  );
}
