import { useState, useCallback } from 'react';
import { parseCSV } from '../../utils/csvParser';
import { inferColumnsFromData } from '@shared/typeInference';
import { useSheetStore } from '../../store/sheetStore';
import { api } from '../../api/sheets';
import type { ColumnConfig } from '@shared/types';

interface ImportDialogProps {
  onClose: () => void;
  initialFile?: File;
}

export function ImportDialog({ onClose, initialFile }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [preview, setPreview] = useState<{ columns: ColumnConfig[]; rows: Record<string, unknown>[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fetchSheets, loadSheet } = useSheetStore();

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    try {
      const text = await f.text();
      const ext = f.name.split('.').pop()?.toLowerCase();

      let rows: Record<string, unknown>[];
      if (ext === 'json') {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        const { headers, rows: csvRows } = parseCSV(text);
        rows = csvRows.map((row) => {
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
          return obj;
        });
      }

      const columns = inferColumnsFromData(rows);
      setPreview({ columns, rows: rows.slice(0, 5) });
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  // Process initial file
  useState(() => {
    if (initialFile) handleFile(initialFile);
  });

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const result = await api.importFile(file);
      await fetchSheets();
      await loadSheet(result.id);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="import-dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Import File</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <div className="p-4">
          {!preview ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              data-testid="import-dropzone"
            >
              <p className="text-gray-500 mb-3">Drag & drop a CSV or JSON file here</p>
              <label className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded cursor-pointer hover:bg-blue-700">
                Choose File
                <input
                  type="file"
                  accept=".csv,.tsv,.json"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                  data-testid="import-file-input"
                />
              </label>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                File: <strong>{file?.name}</strong> · {preview.columns.length} columns detected
              </p>
              <div className="overflow-x-auto border border-gray-200 rounded mb-3 max-h-48">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {preview.columns.map((col) => (
                        <th key={col.id} className="px-2 py-1 text-left font-medium text-gray-600 border-b">
                          {col.name}
                          <span className="ml-1 text-gray-400">({col.cellType})</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        {preview.columns.map((col) => (
                          <td key={col.id} className="px-2 py-1 text-gray-700">{String(row[col.name] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400">Showing first {preview.rows.length} rows</p>
            </div>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
          {preview && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              data-testid="import-submit"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
