import { useState, useRef, useEffect } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { CELL_TYPES } from '@shared/constants';
import type { CellType } from '@shared/constants';
import type { ConditionalFormatRule, ValidationRule } from '@shared/types';
import { ConditionalFormatPanel } from './ConditionalFormatPanel';
import { ValidationRulesPanel } from './ValidationRulesPanel';
import { useUIStore } from '../../store/uiStore';

interface ColumnHeaderMenuProps {
  columnId: string;
  columnName: string;
  cellType: CellType;
  pinned?: 'left' | null;
  formula?: string;
  conditionalFormats?: ConditionalFormatRule[];
  validationRules?: ValidationRule[];
}

export function ColumnHeaderMenu({ columnId, columnName, cellType, pinned, formula, conditionalFormats, validationRules }: ColumnHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(columnName);
  const [changingType, setChangingType] = useState(false);
  const [editingFormula, setEditingFormula] = useState(false);
  const [newFormula, setNewFormula] = useState(formula || '');
  const [showConditionalFormat, setShowConditionalFormat] = useState(false);
  const [showValidationRules, setShowValidationRules] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { renameColumn, deleteColumn, updateColumnConfig, loadSheet } = useSheetStore();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setRenaming(false);
        setChangingType(false);
        setEditingFormula(false);
        setShowConditionalFormat(false);
        setShowValidationRules(false);
      }
    }
    if (open || showConditionalFormat || showValidationRules) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, showConditionalFormat, showValidationRules]);

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

  const handleSaveFormula = async () => {
    const { activeSheetId } = useSheetStore.getState();
    if (activeSheetId && newFormula.trim()) {
      await updateColumnConfig(columnId, { formula: newFormula.trim() });
    }
    setEditingFormula(false);
    setOpen(false);
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

  const handleToggleFreeze = async () => {
    const { activeSheetId } = useSheetStore.getState();
    if (activeSheetId) {
      const { api } = await import('../../api/sheets');
      const newPinned = pinned === 'left' ? null : 'left';
      await api.updateColumn(activeSheetId, columnId, { pinned: newPinned });
      await useSheetStore.getState().loadSheet(activeSheetId);
    }
    setOpen(false);
  };

  return (
    <div className={`relative inline-block ${open ? 'z-[100]' : ''}`} ref={menuRef}>
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
          ) : editingFormula ? (
            <div className="p-2">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Formula (SQL expression)</label>
              <textarea
                value={newFormula}
                onChange={(e) => setNewFormula(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows={2}
                autoFocus
                data-testid="formula-input"
              />
              <div className="flex gap-1 mt-1">
                <button onClick={handleSaveFormula} className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded" data-testid="formula-save-btn">Save</button>
                <button onClick={() => { setEditingFormula(false); setNewFormula(formula || ''); }} className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-200">Cancel</button>
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
              <button
                onClick={handleToggleFreeze}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                data-testid="freeze-col-btn"
              >
                {pinned === 'left' ? 'Unfreeze Column' : 'Freeze Column'}
              </button>
              <button
                onClick={() => { setOpen(false); setShowConditionalFormat(true); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                data-testid="conditional-format-btn"
              >
                Conditional Formatting
              </button>
              <button
                onClick={() => { setOpen(false); setShowValidationRules(true); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                data-testid="validation-rules-btn"
              >
                Validation Rules
              </button>
              {cellType === 'formula' && (
                <button
                  onClick={() => { setEditingFormula(true); setNewFormula(formula || ''); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  data-testid="edit-formula-btn"
                >
                  Edit Formula
                </button>
              )}
              {(cellType === 'text' || cellType === 'dropdown') && (() => {
                const { activeSheetId } = useSheetStore.getState();
                const viewConfigs = useUIStore.getState().viewConfigs;
                const isGrouped = activeSheetId && viewConfigs[activeSheetId]?.groupByColumnId === columnId;
                return (
                  <button
                    onClick={() => {
                      if (activeSheetId) {
                        useUIStore.getState().setViewConfig(activeSheetId, {
                          groupByColumnId: isGrouped ? undefined : columnId,
                        });
                      }
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                    data-testid="group-by-btn"
                  >
                    {isGrouped ? 'Remove Grouping' : 'Group by this Column'}
                  </button>
                );
              })()}
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
      {showConditionalFormat && (
        <ConditionalFormatPanel
          rules={conditionalFormats || []}
          onSave={async (rules) => {
            await updateColumnConfig(columnId, { conditionalFormats: rules.length > 0 ? rules : undefined });
            setShowConditionalFormat(false);
          }}
          onClose={() => setShowConditionalFormat(false)}
        />
      )}
      {showValidationRules && (
        <ValidationRulesPanel
          rules={validationRules || []}
          onSave={async (rules) => {
            await updateColumnConfig(columnId, { validationRules: rules.length > 0 ? rules : undefined });
            setShowValidationRules(false);
          }}
          onClose={() => setShowValidationRules(false)}
        />
      )}
    </div>
  );
}
