import { useMemo, useState, useCallback } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { useUIStore } from '../../store/uiStore';
import type { ColumnConfig } from '@shared/types';

interface KanbanCard {
  rowIndex: number;
  row: Record<string, unknown>;
}

export function KanbanView() {
  const { activeSheetId, activeSheetMeta, rows, updateCell } = useSheetStore();
  const viewConfigs = useUIStore((s) => s.viewConfigs);
  const isMobile = useUIStore((s) => s.isMobile);
  const [draggedCard, setDraggedCard] = useState<{ rowIndex: number; fromLane: string } | null>(null);
  const [dragOverLane, setDragOverLane] = useState<string | null>(null);

  const kanbanColumn = useMemo((): ColumnConfig | null => {
    if (!activeSheetId || !activeSheetMeta) return null;
    const config = viewConfigs[activeSheetId];
    if (config?.kanbanColumnId) {
      const col = activeSheetMeta.columns.find((c) => c.id === config.kanbanColumnId);
      if (col) return col;
    }
    // Auto-select first dropdown column
    return activeSheetMeta.columns.find((c) => c.cellType === 'dropdown') || null;
  }, [activeSheetId, activeSheetMeta, viewConfigs]);

  const titleColumn = useMemo((): ColumnConfig | null => {
    if (!activeSheetMeta) return null;
    return activeSheetMeta.columns.find((c) => c.cellType === 'text') || activeSheetMeta.columns[0] || null;
  }, [activeSheetMeta]);

  const previewColumns = useMemo((): ColumnConfig[] => {
    if (!activeSheetMeta || !kanbanColumn || !titleColumn) return [];
    return activeSheetMeta.columns
      .filter((c) => c.id !== kanbanColumn.id && c.id !== titleColumn.id)
      .slice(0, 2);
  }, [activeSheetMeta, kanbanColumn, titleColumn]);

  const lanes = useMemo((): Map<string, KanbanCard[]> => {
    const map = new Map<string, KanbanCard[]>();
    if (!kanbanColumn) return map;

    const options = kanbanColumn.options || [];
    for (const opt of options) {
      map.set(opt, []);
    }
    // Add "Uncategorized" for rows without a value
    map.set('__uncategorized__', []);

    rows.forEach((row, rowIndex) => {
      const value = row[kanbanColumn.name] as string;
      const lane = value && options.includes(value) ? value : '__uncategorized__';
      map.get(lane)!.push({ rowIndex, row });
    });

    // Remove uncategorized if empty
    if (map.get('__uncategorized__')!.length === 0) {
      map.delete('__uncategorized__');
    }

    return map;
  }, [rows, kanbanColumn]);

  const handleDragStart = useCallback((e: React.DragEvent, rowIndex: number, fromLane: string) => {
    setDraggedCard({ rowIndex, fromLane });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(rowIndex));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, lane: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLane(lane);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverLane(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toLane: string) => {
    e.preventDefault();
    setDragOverLane(null);
    if (!draggedCard || !kanbanColumn) return;
    if (draggedCard.fromLane === toLane) {
      setDraggedCard(null);
      return;
    }
    const newValue = toLane === '__uncategorized__' ? '' : toLane;
    updateCell(draggedCard.rowIndex, kanbanColumn.name, newValue);
    setDraggedCard(null);
  }, [draggedCard, kanbanColumn, updateCell]);

  const handleMoveCard = useCallback((rowIndex: number, toLane: string) => {
    if (!kanbanColumn) return;
    const newValue = toLane === '__uncategorized__' ? '' : toLane;
    updateCell(rowIndex, kanbanColumn.name, newValue);
  }, [kanbanColumn, updateCell]);

  if (!activeSheetMeta || !activeSheetId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
        Select a sheet to view
      </div>
    );
  }

  if (!kanbanColumn) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500" data-testid="kanban-no-column">
        <div className="text-center">
          <p>No dropdown column found.</p>
          <p className="text-sm mt-1">Add a dropdown column in Grid view, or configure the Kanban column in view settings.</p>
        </div>
      </div>
    );
  }

  const laneEntries = Array.from(lanes.entries());

  return (
    <div
      className={`p-4 overflow-auto h-full ${isMobile ? '' : 'flex gap-4'}`}
      data-testid="kanban-view"
    >
      {laneEntries.map(([laneName, cards]) => {
        const displayName = laneName === '__uncategorized__' ? 'Uncategorized' : laneName;
        return (
          <div
            key={laneName}
            className={`${
              isMobile ? 'mb-4' : 'flex-shrink-0 w-72'
            } bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 ${
              dragOverLane === laneName ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/30' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, laneName)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, laneName)}
            data-testid={`kanban-lane-${laneName}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{displayName}</h3>
              <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5">
                {cards.length}
              </span>
            </div>
            <div className="space-y-2">
              {cards.map((card) => (
                <KanbanCardComponent
                  key={card.row.rowid as number ?? card.rowIndex}
                  card={card}
                  titleColumn={titleColumn}
                  previewColumns={previewColumns}
                  laneName={laneName}
                  laneOptions={kanbanColumn.options || []}
                  isMobile={isMobile}
                  onDragStart={handleDragStart}
                  onMoveCard={handleMoveCard}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCardComponent({
  card,
  titleColumn,
  previewColumns,
  laneName,
  laneOptions,
  isMobile,
  onDragStart,
  onMoveCard,
}: {
  card: KanbanCard;
  titleColumn: ColumnConfig | null;
  previewColumns: ColumnConfig[];
  laneName: string;
  laneOptions: string[];
  isMobile: boolean;
  onDragStart: (e: React.DragEvent, rowIndex: number, fromLane: string) => void;
  onMoveCard: (rowIndex: number, toLane: string) => void;
}) {
  const title = titleColumn ? String(card.row[titleColumn.name] || '') : `Row ${card.rowIndex + 1}`;

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
      draggable={!isMobile}
      onDragStart={(e) => onDragStart(e, card.rowIndex, laneName)}
      data-testid="kanban-card"
    >
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" data-testid="kanban-card-title">
        {title || <span className="text-gray-300 dark:text-gray-600 italic">Untitled</span>}
      </p>
      {previewColumns.map((col) => (
        <p key={col.id} className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
          {col.name}: {formatPreview(card.row[col.name], col.cellType)}
        </p>
      ))}
      {isMobile && (
        <select
          className="mt-2 w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          value={laneName}
          onChange={(e) => onMoveCard(card.rowIndex, e.target.value)}
          data-testid="kanban-move-select"
        >
          {laneOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function formatPreview(value: unknown, cellType: string): string {
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
