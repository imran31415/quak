import { useState, useCallback } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { api } from '../../api/sheets';
import { FormFields } from './FormFields';

export function FormView() {
  const { activeSheetId, activeSheetMeta, linkedRecordOptions } = useSheetStore();
  const loadSheet = useSheetStore((s) => s.loadSheet);
  const [success, setSuccess] = useState(false);

  const formUrl = activeSheetId ? `${window.location.origin}/forms/${activeSheetId}` : '';

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(formUrl);
  }, [formUrl]);

  const handleSubmit = useCallback(async (values: Record<string, unknown>) => {
    if (!activeSheetId) return;
    await api.addRow(activeSheetId, values);
    await loadSheet(activeSheetId);
    setSuccess(true);
  }, [activeSheetId, loadSheet]);

  if (!activeSheetMeta || !activeSheetId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
        Select a sheet to view
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto h-full" data-testid="form-view">
      {/* Share bar */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600" data-testid="form-share-bar">
          <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V6a4 4 0 0 0-8 0v2a6 6 0 0 0 12 0V5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            readOnly
            value={formUrl}
            className="flex-1 text-sm bg-transparent text-gray-600 dark:text-gray-300 outline-none truncate"
            data-testid="form-share-url"
          />
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shrink-0"
            data-testid="form-copy-link-btn"
          >
            Copy Link
          </button>
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            data-testid="form-open-link"
          >
            Open
          </a>
        </div>
      </div>

      {/* Form preview */}
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{activeSheetMeta.name}</h2>

        {success ? (
          <div className="text-center py-6" data-testid="form-success">
            <div className="text-green-600 dark:text-green-400 text-lg font-medium mb-2">Response submitted!</div>
            <button
              onClick={() => setSuccess(false)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              data-testid="form-submit-another-btn"
            >
              Submit another
            </button>
          </div>
        ) : (
          <FormFields
            columns={activeSheetMeta.columns}
            linkedRecordOptions={linkedRecordOptions}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
