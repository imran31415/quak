import { useMemo, useCallback, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeAlpine,
  colorSchemeDark,
  colorSchemeLight,
  type ColDef,
  type CellValueChangedEvent,
  type FilterChangedEvent,
  type ColumnResizedEvent,
} from 'ag-grid-community';
import { useSheetData } from '../../hooks/useSheetData';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { useUndoStore } from '../../store/undoStore';
import { useSheetStore } from '../../store/sheetStore';
import { useTheme } from '../../hooks/useTheme';
import { renderers } from '../cells/CellRouter';
import { GridToolbar } from './GridToolbar';
import { StatusBar } from './StatusBar';
import { SearchBar } from './SearchBar';
import { FilterBar } from './FilterBar';
import { RowActions } from './RowActions';
import { AddColumnPanel } from './AddColumnPanel';
import { ColumnHeaderMenu } from './ColumnHeaderMenu';
import { DatePickerEditor } from '../cells/DatePickerEditor';
import { validateValue } from '../../utils/validation';
import { evaluateRules } from '../../utils/conditionalFormat';
import { buildGroupedRows } from '../../utils/grouping';
import { useUIStore } from '../../store/uiStore';
import { useToastStore } from '../../store/toastStore';
import { GroupHeaderRenderer } from './GroupHeaderRenderer';
import { SubtotalRenderer } from './SubtotalRenderer';
import type { ColumnConfig } from '@shared/types';
import type { CellType } from '@shared/constants';

ModuleRegistry.registerModules([AllCommunityModule]);

// Custom header component for data columns (includes sort + menu)
function DataColumnHeader(props: any) {
  const { displayName, progressSort, colConfig } = props;
  return (
    <div className="flex items-center w-full">
      {colConfig.pinned === 'left' && (
        <svg className="w-3 h-3 mr-1 text-blue-500 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor" data-testid={`pin-icon-${colConfig.id}`}>
          <path d="M9.828.722a.5.5 0 01.354.146l4.95 4.95a.5.5 0 01-.707.707l-.71-.71L11 8.528V12.5a.5.5 0 01-.854.354L7.5 10.207l-3.646 3.647a.5.5 0 01-.708-.708L6.793 9.5 4.146 6.854A.5.5 0 014.5 6h3.972l2.713-2.714-.71-.71a.5.5 0 01.354-.854z" />
        </svg>
      )}
      <span
        className="flex-1 truncate cursor-pointer"
        onClick={(e: React.MouseEvent) => progressSort(e.shiftKey)}
      >
        {displayName}
      </span>
      <ColumnHeaderMenu
        columnId={colConfig.id}
        columnName={colConfig.name}
        cellType={colConfig.cellType}
        pinned={colConfig.pinned}
        conditionalFormats={colConfig.conditionalFormats}
        validationRules={colConfig.validationRules}
      />
    </div>
  );
}

// Custom header for the "+" add-column button
function AddColumnHeaderComp(props: any) {
  return (
    <div
      className="flex items-center justify-center w-full h-full cursor-pointer"
      onClick={() => props.onAdd?.()}
    >
      +
    </div>
  );
}

function getColDefs(columns: ColumnConfig[]): ColDef[] {
  return columns.map((col) => {
    const def: ColDef = {
      field: col.name,
      headerName: col.name,
      width: col.width || 150,
      editable: col.cellType !== 'checkbox' && col.cellType !== 'formula',
      cellRenderer: renderers[col.cellType as CellType] || renderers.text,
      cellRendererParams: { cellType: col.cellType },
      headerComponent: DataColumnHeader,
      headerComponentParams: { colConfig: col },
      pinned: col.pinned || undefined,
    };

    // Validation via valueSetter
    def.valueSetter = (params) => {
      const result = validateValue(params.newValue, col.cellType as CellType, col.options, col.validationRules);
      if (!result.valid) {
        useToastStore.getState().addToast(`Invalid "${col.name}": ${result.error}`, 'error');
        return false;
      }
      params.data[col.name] = params.newValue;
      return true;
    };

    // Validation error styling
    if (col.validationRules?.length) {
      def.cellClassRules = {
        'validation-error': (params) => !validateValue(params.value, col.cellType as CellType, col.options, col.validationRules).valid,
      };
      def.tooltipValueGetter = (params) => {
        const result = validateValue(params.value, col.cellType as CellType, col.options, col.validationRules);
        return result.valid ? undefined : result.error;
      };
    }

    // Filters by type
    if (col.cellType === 'number') {
      def.filter = 'agNumberColumnFilter';
    } else if (col.cellType === 'date') {
      def.filter = 'agDateColumnFilter';
    } else if (col.cellType === 'checkbox') {
      def.filter = 'agTextColumnFilter';
      def.filterValueGetter = (params) => params.data?.[col.name] ? 'true' : 'false';
    } else {
      def.filter = 'agTextColumnFilter';
    }

    if (col.cellType === 'dropdown' && col.options) {
      def.cellEditor = 'agSelectCellEditor';
      def.cellEditorParams = { values: col.options };
    }

    if (col.cellType === 'date') {
      def.cellEditor = DatePickerEditor;
    }

    if (col.cellType === 'markdown') {
      def.cellEditor = 'agLargeTextCellEditor';
      def.cellEditorPopup = true;
      def.autoHeight = true;
    }

    if (col.cellType === 'number') {
      def.cellEditor = 'agTextCellEditor';
    }

    // Conditional formatting
    if (col.conditionalFormats?.length) {
      def.cellStyle = (params) => {
        const isDark = document.documentElement.classList.contains('dark');
        return evaluateRules(params.value, col.conditionalFormats!, isDark ? 'dark' : 'light');
      };
    }

    return def;
  });
}

export function SpreadsheetGrid() {
  const { meta, rows, updateCell } = useSheetData();
  const { activeSheetId } = useSheetStore();
  const { resolvedTheme } = useTheme();
  const gridRef = useRef<AgGridReact>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [displayedRowCount, setDisplayedRowCount] = useState<number | null>(null);
  const [searchMatchCount, setSearchMatchCount] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const undoPush = useUndoStore((s) => s.push);
  const viewConfigs = useUIStore((s) => s.viewConfigs);
  const groupByColumnId = activeSheetId ? viewConfigs[activeSheetId]?.groupByColumnId : undefined;

  useUndoRedo();

  const toggleGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const displayRows = useMemo(() => {
    if (!meta || !groupByColumnId) return rows;
    const groupCol = meta.columns.find((c) => c.id === groupByColumnId);
    if (!groupCol) return rows;
    return buildGroupedRows(rows, groupCol, meta.columns, collapsedGroups);
  }, [rows, meta, groupByColumnId, collapsedGroups]);

  const gridTheme = useMemo(
    () => resolvedTheme === 'dark'
      ? themeAlpine.withPart(colorSchemeDark)
      : themeAlpine.withPart(colorSchemeLight),
    [resolvedTheme]
  );

  const columnDefs = useMemo(() => {
    if (!meta) return [];

    const rowActionsCol: ColDef = {
      headerName: '',
      field: '__actions',
      width: 60,
      pinned: 'left',
      cellRenderer: RowActions,
      editable: false,
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
    };

    let dataCols = getColDefs(meta.columns);

    // Add grouping renderers when grouping is active
    if (groupByColumnId) {
      const groupCol = meta.columns.find((c) => c.id === groupByColumnId);
      const firstColField = groupCol?.name || meta.columns[0]?.name;
      dataCols = dataCols.map((def) => ({
        ...def,
        cellRendererSelector: (params: any) => {
          if (params.data?.__isGroupHeader) {
            if (def.field === firstColField) {
              return {
                component: GroupHeaderRenderer,
                params: {
                  onToggle: toggleGroupCollapse,
                  collapsed: collapsedGroups.has(params.data.__groupId),
                },
              };
            }
            return { component: () => null };
          }
          if (params.data?.__isSubtotalRow) {
            return { component: SubtotalRenderer };
          }
          return undefined;
        },
        editable: (params: any) => {
          if (params.data?.__isGroupHeader || params.data?.__isSubtotalRow) return false;
          return def.editable as boolean;
        },
      }));
    }

    const addCol: ColDef = {
      headerName: '+',
      field: '__add_column',
      width: 40,
      pinned: 'right',
      editable: false,
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      cellRenderer: () => null,
      headerComponent: AddColumnHeaderComp,
      headerComponentParams: { onAdd: () => setAddColumnOpen(true) },
    };

    return [rowActionsCol, ...dataCols, addCol];
  }, [meta, groupByColumnId, collapsedGroups, toggleGroupCollapse]);

  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    if (event.rowIndex !== null && event.colDef.field && event.colDef.field !== '__actions' && event.colDef.field !== '__add_column') {
      // Push undo action
      if (activeSheetId) {
        undoPush({
          type: 'cell_edit',
          sheetId: activeSheetId,
          payload: {
            rowIndex: event.rowIndex,
            column: event.colDef.field,
            oldValue: event.oldValue,
            newValue: event.newValue,
          },
        });
      }
      updateCell(event.rowIndex, event.colDef.field, event.newValue);
    }
  }, [updateCell, activeSheetId, undoPush]);

  const onFilterChanged = useCallback((event: FilterChangedEvent) => {
    const filterModel = event.api.getFilterModel();
    setActiveFilterCount(Object.keys(filterModel).length);
    setDisplayedRowCount(event.api.getDisplayedRowCount());
  }, []);

  const onColumnResized = useCallback((event: ColumnResizedEvent) => {
    if (event.finished && event.column && meta) {
      const field = event.column.getColId();
      const col = meta.columns.find((c) => c.name === field);
      if (col && event.column.getActualWidth() !== col.width) {
        useSheetStore.getState().updateColumnWidth(col.id, event.column.getActualWidth());
      }
    }
  }, [meta]);

  const handleSearch = useCallback((text: string) => {
    gridRef.current?.api?.setGridOption('quickFilterText', text || undefined);
    if (text) {
      setTimeout(() => {
        const count = gridRef.current?.api?.getDisplayedRowCount();
        setSearchMatchCount(count ?? null);
      }, 100);
    } else {
      setSearchMatchCount(null);
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    gridRef.current?.api?.setFilterModel(null);
    setActiveFilterCount(0);
    setDisplayedRowCount(null);
  }, []);

  const handleSearchToggle = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) {
        // Clear search when closing
        gridRef.current?.api?.setGridOption('quickFilterText', undefined);
      }
      return !prev;
    });
  }, []);

  // Listen for Ctrl+F
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setSearchOpen(true);
    }
  }, []);

  if (!meta) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500" data-testid="no-sheet">
        <div className="text-center">
          <p className="text-lg mb-2">No sheet selected</p>
          <p className="text-sm">Create or select a sheet from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="spreadsheet-grid" onKeyDown={handleKeyDown}>
      <GridToolbar
        onSearchToggle={handleSearchToggle}
        searchOpen={searchOpen}
      />
      {searchOpen && (
        <SearchBar
          onSearch={handleSearch}
          onClose={() => {
            setSearchOpen(false);
            setSearchMatchCount(null);
            gridRef.current?.api?.setGridOption('quickFilterText', undefined);
          }}
          matchCount={searchMatchCount}
        />
      )}
      <FilterBar activeFilterCount={activeFilterCount} onClearAll={handleClearFilters} />
      <div className="flex-1 relative" data-testid="ag-grid-container">
        <AgGridReact
          ref={gridRef}
          theme={gridTheme}
          rowData={displayRows}
          columnDefs={columnDefs}
          defaultColDef={{
            resizable: true,
            sortable: true,
            floatingFilter: true,
          }}
          onCellValueChanged={onCellValueChanged}
          onFilterChanged={onFilterChanged}
          onColumnResized={onColumnResized}
          animateRows={false}
          getRowId={(params) => String(params.data.__idx)}
          enterNavigatesVertically={true}
          enterNavigatesVerticallyAfterEdit={true}
          undoRedoCellEditing={false}
          processCellForClipboard={(params) => {
            const value = params.value;
            if (typeof value === 'boolean') return value ? 'true' : 'false';
            return value;
          }}
          processCellFromClipboard={(params) => {
            return params.value;
          }}
        />
        {addColumnOpen && (
          <div className="absolute right-10 top-10 z-50">
            <AddColumnPanel onClose={() => setAddColumnOpen(false)} />
          </div>
        )}
      </div>
      <StatusBar filteredCount={displayedRowCount} />
    </div>
  );
}
