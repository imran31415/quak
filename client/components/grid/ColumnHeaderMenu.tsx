import { useState, useRef, useEffect } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { CELL_TYPES } from '@shared/constants';
import type { CellType } from '@shared/constants';

interface ColumnHeaderMenuProps {
  columnId: string;
  columnName: string;
  cellType: CellType;
}

export function ColumnHeaderMenu({ columnId, columnName, cellType }: ColumnHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(columnName);
  const [changingType, setChangingType] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { renameColumn, deleteColumn } = useSheetStore();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setRenaming(false);
        setChangingType(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleRename = async () => {
    if (newName.trim() && newName !== columnName) {
      await renameColumn(columnId, newName.trim());
    }
    setRenaming(false);
    setOpen(false);
  };

  const handleDelete = async () => {
    if (confirm(`Delete column "${columnName}"?`)) {
      await deleteColumn(columnId);
      setOpen(false);
    }
  };

  const handleChangeType = async (type: CellType) => {
    const { activeSheetId } = useSheetStore.getState();
    if (activeSheetId) {
      const { api } = await import('../../api/sheets');
      await api.updateColumn(activeSheetId, columnId, { cellType: type });
      await useSheetStore.getState().loadSheet(activeSheetId);
    }
    setChangingType(false);
    setOpen(false);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="ml-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        aria-label={`Menu for ${columnName}`}
        data-testid={`col-menu-${columnId}`}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50" data-testid="col-menu-dropdown">
          {renaming ? (
            <div className="p-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
                data-testid="rename-col-input"
              />
              <div className="flex gap-1 mt-1">
                <button onClick={handleRename} className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded">Save</button>
                <button onClick={() => { setRenaming(false); setNewName(columnName); }} className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-200">Cancel</button>
              </div>
            </div>
          ) : changingType ? (
            <div className="p-1">
              {CELL_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => handleChangeType(type)}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded ${type === cellType ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          ) : (
            <div className="py-1">
              <button
                onClick={() => setRenaming(true)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                data-testid="rename-col-btn"
              >
                Rename
              </button>
              <button
                onClick={() => setChangingType(true)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                data-testid="change-type-btn"
              >
                Change Type
              </button>
              <hr className="my-1 border-gray-100 dark:border-gray-700" />
              <button
                onClick={handleDelete}
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                data-testid="delete-col-btn"
              >
                Delete Column
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
