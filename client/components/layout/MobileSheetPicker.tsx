import { useState } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { useUIStore } from '../../store/uiStore';
import { CreateSheetDialog } from './CreateSheetDialog';

export function MobileSheetPicker() {
  const { sheets, activeSheetId, loadSheet, deleteSheet } = useSheetStore();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const [showCreate, setShowCreate] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ id: string; name: string } | null>(null);

  if (!sidebarOpen) return null;

  const handlePick = (id: string) => {
    loadSheet(id);
    setSidebarOpen(false);
  };

  const handleDelete = () => {
    if (actionTarget) {
      deleteSheet(actionTarget.id);
      setActionTarget(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={() => setSidebarOpen(false)}
        data-testid="mobile-sheet-picker-backdrop"
      />
      {/* Bottom sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl"
        style={{
          height: '92dvh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        data-testid="mobile-sheet-picker"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sheets</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 px-2 py-1"
            data-testid="mobile-sheet-picker-done"
          >
            Done
          </button>
        </div>
        {/* New sheet button */}
        <div className="px-4 pb-3 shrink-0">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full h-12 rounded-xl bg-blue-600 dark:bg-blue-500 text-white font-medium text-base flex items-center justify-center gap-2 active:bg-blue-700"
            data-testid="mobile-create-sheet-btn"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New sheet
          </button>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto px-2" data-testid="mobile-sheet-list">
          {sheets.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8 px-4">
              No sheets yet — tap + New sheet to start.
            </p>
          ) : (
            sheets.map((sheet) => {
              const isActive = activeSheetId === sheet.id;
              return (
                <div
                  key={sheet.id}
                  className={`flex items-center justify-between rounded-lg ${
                    isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'active:bg-gray-100 dark:active:bg-gray-800'
                  }`}
                  data-testid={`mobile-sheet-row-${sheet.id}`}
                >
                  <button
                    onClick={() => handlePick(sheet.id)}
                    className={`flex-1 text-left h-12 px-3 truncate text-base ${
                      isActive ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-800 dark:text-gray-100'
                    }`}
                  >
                    {sheet.name}
                  </button>
                  <button
                    onClick={() => setActionTarget({ id: sheet.id, name: sheet.name })}
                    className="h-12 w-12 flex items-center justify-center text-gray-400 dark:text-gray-500"
                    aria-label={`Actions for ${sheet.name}`}
                    data-testid={`mobile-sheet-actions-${sheet.id}`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="19" cy="12" r="2" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Action sheet for delete */}
      {actionTarget && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setActionTarget(null)} />
          <div
            className="fixed inset-x-0 bottom-0 z-[70] bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            data-testid="mobile-sheet-actions-sheet"
          >
            <div className="flex justify-center pt-2 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            <p className="px-4 py-2 text-center text-sm text-gray-600 dark:text-gray-400 truncate">
              {actionTarget.name}
            </p>
            <button
              onClick={handleDelete}
              className="w-full h-12 text-red-600 dark:text-red-400 font-medium border-t border-gray-200 dark:border-gray-700 active:bg-gray-100 dark:active:bg-gray-800"
              data-testid="mobile-sheet-delete"
            >
              Delete sheet
            </button>
            <button
              onClick={() => setActionTarget(null)}
              className="w-full h-12 text-gray-700 dark:text-gray-200 font-medium border-t border-gray-200 dark:border-gray-700 active:bg-gray-100 dark:active:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {showCreate && <CreateSheetDialog initialName="" onClose={() => setShowCreate(false)} />}
    </>
  );
}
