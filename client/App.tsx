import { useCallback, useState } from 'react';
import { DuckDBProvider } from './db/DuckDBProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { ViewContainer } from './components/views/ViewContainer';
import { QueryPanel } from './components/query/QueryPanel';
import { ImportDialog } from './components/import/ImportDialog';
import { ToastContainer } from './components/layout/Toast';
import { useUIStore } from './store/uiStore';

const ACCEPTED_IMPORT_EXTS = new Set(['csv', 'tsv', 'json', 'xlsx', 'xls']);

export default function App() {
  const [importFile, setImportFile] = useState<File | null>(null);
  const importDialogOpen = useUIStore((s) => s.importDialogOpen);
  const setImportDialogOpen = useUIStore((s) => s.setImportDialogOpen);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext && ACCEPTED_IMPORT_EXTS.has(ext)) {
        setImportFile(file);
        setImportDialogOpen(true);
      }
    }
  }, [setImportDialogOpen]);

  return (
    <ErrorBoundary>
      <DuckDBProvider>
        <div onDragOver={handleDragOver} onDrop={handleDrop} className="h-full">
          <AppShell>
            <div className="flex flex-col h-full">
              <div className="flex-1 min-h-0 overflow-hidden">
                <ViewContainer />
              </div>
              <QueryPanel />
            </div>
          </AppShell>
        </div>
        {importDialogOpen && (
          <ImportDialog
            initialFile={importFile || undefined}
            onClose={() => {
              setImportDialogOpen(false);
              setImportFile(null);
            }}
          />
        )}
      </DuckDBProvider>
      <ToastContainer />
    </ErrorBoundary>
  );
}
