import { useEffect, useState } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { useUIStore } from '../../store/uiStore';
import { CreateSheetDialog } from './CreateSheetDialog';

export function Sidebar() {
  const { sheets, activeSheetId, fetchSheets, loadSheet, deleteSheet } = useSheetStore();
  const { sidebarOpen, isMobile, setSidebarOpen } = useUIStore();
  const [newName, setNewName] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    fetchSheets().then(() => {
      const saved = localStorage.getItem('quak-active-sheet');
      if (saved) {
        const { sheets: currentSheets } = useSheetStore.getState();
        if (currentSheets.some((s) => s.id === saved)) {
          loadSheet(saved);
        }
      }
    });
  }, [fetchSheets, loadSheet]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    setShowDialog(true);
  };

  if (!sidebarOpen) return null;

  return (
    <>
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}
      <aside
        className={`${
          isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'
        } w-64 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0`}
        data-testid="sidebar"
      >
        <div className="p-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Sheets</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="New sheet name..."
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              data-testid="new-sheet-input"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              aria-label="Create sheet"
              data-testid="create-sheet-btn"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2" data-testid="sheet-list">
          {sheets.length === 0 && (
            <p className="text-sm text-gray-400 p-2">No sheets yet</p>
          )}
          {sheets.map((sheet) => (
            <div
              key={sheet.id}
              className={`flex items-center justify-between p-2 rounded cursor-pointer text-sm ${
                activeSheetId === sheet.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <span
                className="flex-1 truncate"
                onClick={() => {
                  loadSheet(sheet.id);
                  if (isMobile) setSidebarOpen(false);
                }}
                data-testid={`sheet-item-${sheet.id}`}
              >
                {sheet.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${sheet.name}"?`)) deleteSheet(sheet.id);
                }}
                className="ml-2 text-gray-400 hover:text-red-500"
                aria-label={`Delete ${sheet.name}`}
                data-testid={`delete-sheet-${sheet.id}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {showDialog && (
        <CreateSheetDialog
          initialName={newName}
          onClose={() => {
            setShowDialog(false);
            setNewName('');
          }}
        />
      )}
    </>
  );
}
