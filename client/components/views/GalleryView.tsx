import { useMemo } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { useUIStore } from '../../store/uiStore';

export function GalleryView() {
  const { activeSheetId, activeSheetMeta, rows } = useSheetStore();
  const viewConfigs = useUIStore((s) => s.viewConfigs);

  const titleColumnId = useMemo(() => {
    if (!activeSheetId || !activeSheetMeta) return null;
    const config = viewConfigs[activeSheetId];
    if (config?.galleryTitleColumnId) {
      const col = activeSheetMeta.columns.find((c) => c.id === config.galleryTitleColumnId);
      if (col) return col;
    }
    // Auto-select first text column
    return activeSheetMeta.columns.find((c) => c.cellType === 'text') || activeSheetMeta.columns[0] || null;
  }, [activeSheetId, activeSheetMeta, viewConfigs]);

  const displayColumns = useMemo(() => {
    if (!activeSheetMeta) return [];
    return activeSheetMeta.columns
      .filter((c) => c.id !== titleColumnId?.id)
      .slice(0, 5);
  }, [activeSheetMeta, titleColumnId]);

  if (!activeSheetMeta || !activeSheetId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a sheet to view
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400" data-testid="gallery-empty">
        No rows to display. Add rows in Grid view.
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto h-full" data-testid="gallery-view">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rows.map((row, idx) => {
          const title = titleColumnId ? formatValue(row[titleColumnId.name]) : `Row ${idx + 1}`;
          return (
            <div
              key={row.rowid as number ?? idx}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              data-testid="gallery-card"
            >
              <h3 className="font-medium text-gray-900 mb-2 truncate" data-testid="gallery-card-title">
                {title || <span className="text-gray-300 italic">Untitled</span>}
              </h3>
              <div className="space-y-1.5">
                {displayColumns.map((col) => (
                  <div key={col.id} className="flex items-start gap-2 text-sm">
                    <span className="text-gray-400 shrink-0 w-20 truncate">{col.name}</span>
                    <span className="text-gray-700 truncate">
                      {formatCellValue(row[col.name], col.cellType)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function formatCellValue(value: unknown, cellType: string): string {
  if (value === null || value === undefined) return '-';
  if (cellType === 'checkbox') return value ? 'Yes' : 'No';
  if (cellType === 'date' && value) {
    try {
      return new Date(value as string).toLocaleDateString();
    } catch {
      return String(value);
    }
  }
  return String(value);
}
