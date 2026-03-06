import { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeAlpine, type ColDef, type CellValueChangedEvent } from 'ag-grid-community';
import { useSheetData } from '../../hooks/useSheetData';
import { renderers } from '../cells/CellRouter';
import { GridToolbar } from './GridToolbar';
import { StatusBar } from './StatusBar';
import type { ColumnConfig } from '@shared/types';
import type { CellType } from '@shared/constants';

ModuleRegistry.registerModules([AllCommunityModule]);

function getColDefs(columns: ColumnConfig[]): ColDef[] {
  return columns.map((col) => {
    const def: ColDef = {
      field: col.name,
      headerName: col.name,
      width: col.width || 150,
      editable: col.cellType !== 'checkbox',
      cellRenderer: renderers[col.cellType as CellType] || renderers.text,
      cellRendererParams: { cellType: col.cellType },
    };

    if (col.cellType === 'dropdown' && col.options) {
      def.cellEditor = 'agSelectCellEditor';
      def.cellEditorParams = { values: col.options };
    }

    if (col.cellType === 'date') {
      def.cellEditor = 'agTextCellEditor';
    }

    if (col.cellType === 'markdown') {
      def.cellEditor = 'agLargeTextCellEditor';
      def.cellEditorPopup = true;
      def.autoHeight = true;
    }

    if (col.cellType === 'number') {
      def.cellEditor = 'agTextCellEditor';
    }

    return def;
  });
}

export function SpreadsheetGrid() {
  const { meta, rows, updateCell } = useSheetData();

  const columnDefs = useMemo(() => {
    if (!meta) return [];
    return getColDefs(meta.columns);
  }, [meta]);

  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    if (event.rowIndex !== null && event.colDef.field) {
      updateCell(event.rowIndex, event.colDef.field, event.newValue);
    }
  }, [updateCell]);

  if (!meta) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400" data-testid="no-sheet">
        <div className="text-center">
          <p className="text-lg mb-2">No sheet selected</p>
          <p className="text-sm">Create or select a sheet from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="spreadsheet-grid">
      <GridToolbar />
      <div className="flex-1" data-testid="ag-grid-container">
        <AgGridReact
          theme={themeAlpine}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={{
            resizable: true,
            sortable: true,
          }}
          onCellValueChanged={onCellValueChanged}
          animateRows={false}
          getRowId={(params) => String(params.data.__idx)}
        />
      </div>
      <StatusBar />
    </div>
  );
}
