import { useState, useEffect, useCallback } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { useUIStore } from '../../store/uiStore';
import type {
  AggregationType,
  DashboardWidget,
  DashboardWidgetType,
  DashboardChartConfig,
  DashboardMetricConfig,
  DashboardTableConfig,
  DashboardConfig,
} from '../../store/uiStore';
import { runQuery, initDuckDB } from '../../db/duckdb';
import { ChartView } from '../query/ChartView';
import type { ChartType } from '../query/ChartView';
import type { ColumnConfig } from '@shared/types';

function cellTypeToSQL(cellType: string): string {
  switch (cellType) {
    case 'number': return 'DOUBLE';
    case 'checkbox': return 'BOOLEAN';
    default: return 'VARCHAR';
  }
}

async function syncToWasm(meta: { columns: ColumnConfig[] }, rows: Record<string, unknown>[]) {
  const cols = meta.columns
    .filter((c) => c.cellType !== 'formula')
    .map((c) => `"${c.name}" ${cellTypeToSQL(c.cellType)}`)
    .join(', ');
  await initDuckDB();
  await runQuery('DROP TABLE IF EXISTS current_sheet');
  await runQuery(`CREATE TABLE current_sheet (${cols})`);
  const filteredCols = meta.columns.filter((c) => c.cellType !== 'formula');
  const batchSize = 1000;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuesClauses = batch.map((row) => {
      const values = filteredCols.map((col) => {
        const val = row[col.name];
        if (val === null || val === undefined || val === '') return 'NULL';
        if (col.cellType === 'number') return Number(val);
        if (col.cellType === 'checkbox') return val ? 'TRUE' : 'FALSE';
        return `'${String(val).replace(/'/g, "''")}'`;
      }).join(', ');
      return `(${values})`;
    }).join(', ');
    await runQuery(`INSERT INTO current_sheet VALUES ${valuesClauses}`);
  }
}

const AGGREGATIONS: AggregationType[] = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'];

function generateWidgetSQL(widget: DashboardWidget): string | null {
  switch (widget.type) {
    case 'chart': {
      const cfg = widget.chartConfig;
      if (!cfg?.xColumn || !cfg.yColumns?.length) return null;
      const yCols = cfg.yColumns.map((c) => `"${c}"`).join(', ');
      return `SELECT "${cfg.xColumn}", ${yCols} FROM current_sheet`;
    }
    case 'metric': {
      const cfg = widget.metricConfig;
      if (!cfg?.column || !cfg.aggregation) return null;
      return `SELECT ${cfg.aggregation}("${cfg.column}") as value FROM current_sheet`;
    }
    case 'table': {
      const cfg = widget.tableConfig;
      if (!cfg?.columns?.length) return null;
      const cols = cfg.columns.map((c) => `"${c}"`).join(', ');
      return `SELECT ${cols} FROM current_sheet LIMIT ${cfg.limit || 10}`;
    }
    default:
      return null;
  }
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function createDefaultWidget(type: DashboardWidgetType): DashboardWidget {
  const base = { id: makeId(), type, title: type === 'chart' ? 'Chart' : type === 'metric' ? 'Metric' : 'Table' };
  switch (type) {
    case 'chart':
      return { ...base, chartConfig: { chartType: 'bar', xColumn: '', yColumns: [] } };
    case 'metric':
      return { ...base, metricConfig: { column: '', aggregation: 'SUM' } };
    case 'table':
      return { ...base, tableConfig: { columns: [], limit: 10 } };
  }
}

export function DashboardView() {
  const { activeSheetMeta: meta, rows, activeSheetId } = useSheetStore();
  const { viewConfigs, setViewConfig } = useUIStore();
  const config = activeSheetId ? viewConfigs[activeSheetId] : undefined;
  const dashboardConfig = config?.dashboardConfig || { widgets: [], columnCount: 2 as const };

  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const numberCols = meta?.columns.filter((c) => c.cellType === 'number') || [];
  const allCols = meta?.columns.filter((c) => c.cellType !== 'formula') || [];

  const hasWidgets = dashboardConfig.widgets.length > 0;

  useEffect(() => {
    if (!meta || rows.length === 0 || !hasWidgets) {
      setSynced(false);
      return;
    }
    let cancelled = false;
    setSynced(false);
    setSyncError(null);
    syncToWasm(meta, rows)
      .then(() => { if (!cancelled) setSynced(true); })
      .catch((err) => { if (!cancelled) setSyncError((err as Error).message); });
    return () => { cancelled = true; };
  }, [meta, rows, hasWidgets]);

  const updateConfig = useCallback((updates: Partial<DashboardConfig>) => {
    if (!activeSheetId) return;
    const current = viewConfigs[activeSheetId]?.dashboardConfig || { widgets: [], columnCount: 2 as const };
    setViewConfig(activeSheetId, { dashboardConfig: { ...current, ...updates } });
  }, [activeSheetId, viewConfigs, setViewConfig]);

  const addWidget = useCallback((type: DashboardWidgetType) => {
    const widget = createDefaultWidget(type);
    updateConfig({ widgets: [...dashboardConfig.widgets, widget] });
  }, [dashboardConfig.widgets, updateConfig]);

  const removeWidget = useCallback((widgetId: string) => {
    updateConfig({ widgets: dashboardConfig.widgets.filter((w) => w.id !== widgetId) });
  }, [dashboardConfig.widgets, updateConfig]);

  const updateWidget = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    updateConfig({
      widgets: dashboardConfig.widgets.map((w) => w.id === widgetId ? { ...w, ...updates } : w),
    });
  }, [dashboardConfig.widgets, updateConfig]);

  const moveWidget = useCallback((widgetId: string, direction: 'up' | 'down') => {
    const widgets = [...dashboardConfig.widgets];
    const idx = widgets.findIndex((w) => w.id === widgetId);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= widgets.length) return;
    [widgets[idx], widgets[targetIdx]] = [widgets[targetIdx], widgets[idx]];
    updateConfig({ widgets });
  }, [dashboardConfig.widgets, updateConfig]);

  if (!meta) return null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-auto" data-testid="dashboard-view">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700" data-testid="dashboard-toolbar">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 mr-2">Add Widget:</span>
        <button
          onClick={() => addWidget('chart')}
          className="px-3 py-1 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
          data-testid="add-chart-widget"
        >
          + Chart
        </button>
        <button
          onClick={() => addWidget('metric')}
          className="px-3 py-1 text-sm bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-100 dark:hover:bg-green-900/50"
          data-testid="add-metric-widget"
        >
          + Metric
        </button>
        <button
          onClick={() => addWidget('table')}
          className="px-3 py-1 text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50"
          data-testid="add-table-widget"
        >
          + Table
        </button>
      </div>

      {syncError && (
        <div className="mx-4 mt-3 p-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded">
          {syncError}
        </div>
      )}

      {/* Widget Grid */}
      {dashboardConfig.widgets.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500" data-testid="dashboard-empty">
          <div className="text-center">
            <p className="text-lg mb-2">No widgets configured</p>
            <p className="text-sm">Add a chart, metric, or table widget to get started</p>
          </div>
        </div>
      ) : (
        <div
          className="p-4 gap-4"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${dashboardConfig.columnCount}, 1fr)`,
          }}
          data-testid="dashboard-grid"
        >
          {dashboardConfig.widgets.map((widget, idx) => (
            <DashboardWidgetCard
              key={widget.id}
              widget={widget}
              synced={synced}
              allCols={allCols}
              numberCols={numberCols}
              onUpdate={(updates) => updateWidget(widget.id, updates)}
              onRemove={() => removeWidget(widget.id)}
              onMoveUp={idx > 0 ? () => moveWidget(widget.id, 'up') : undefined}
              onMoveDown={idx < dashboardConfig.widgets.length - 1 ? () => moveWidget(widget.id, 'down') : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface WidgetCardProps {
  widget: DashboardWidget;
  synced: boolean;
  allCols: ColumnConfig[];
  numberCols: ColumnConfig[];
  onUpdate: (updates: Partial<DashboardWidget>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function DashboardWidgetCard({ widget, synced, allCols, numberCols, onUpdate, onRemove, onMoveUp, onMoveDown }: WidgetCardProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [result, setResult] = useState<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!synced) return;
    const sql = generateWidgetSQL(widget);
    if (!sql) {
      setResult(null);
      return;
    }
    setError(null);
    runQuery(sql)
      .then((r) => setResult(r))
      .catch((err) => setError((err as Error).message));
  }, [synced, widget]);

  return (
    <div
      className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm"
      data-testid={`widget-${widget.id}`}
      data-widget-type={widget.type}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200" data-testid="widget-title">
          {widget.title}
        </span>
        <div className="flex items-center gap-1">
          {onMoveUp && (
            <button onClick={onMoveUp} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Move up">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 10l4-4 4 4" /></svg>
            </button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Move down">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6l4 4 4-4" /></svg>
            </button>
          )}
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Configure"
            data-testid="widget-config-toggle"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="2" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            title="Remove"
            data-testid="widget-remove"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </div>
      </div>

      {/* Config Panel */}
      {configOpen && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50" data-testid="widget-config-panel">
          <div className="mb-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={widget.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              data-testid="widget-title-input"
            />
          </div>
          {widget.type === 'chart' && (
            <ChartConfigPanel widget={widget} allCols={allCols} numberCols={numberCols} onUpdate={onUpdate} />
          )}
          {widget.type === 'metric' && (
            <MetricConfigPanel widget={widget} numberCols={numberCols} onUpdate={onUpdate} />
          )}
          {widget.type === 'table' && (
            <TableConfigPanel widget={widget} allCols={allCols} onUpdate={onUpdate} />
          )}
        </div>
      )}

      {/* Body */}
      <div className="p-3" data-testid="widget-body">
        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
        {!synced && !error && <div className="text-sm text-gray-400">Loading data...</div>}
        {synced && !error && (
          <>
            {widget.type === 'chart' && <ChartWidgetBody widget={widget} result={result} />}
            {widget.type === 'metric' && <MetricWidgetBody widget={widget} result={result} />}
            {widget.type === 'table' && <TableWidgetBody result={result} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Config Panels ─── */

function ChartConfigPanel({
  widget,
  allCols,
  numberCols,
  onUpdate,
}: {
  widget: DashboardWidget;
  allCols: ColumnConfig[];
  numberCols: ColumnConfig[];
  onUpdate: (u: Partial<DashboardWidget>) => void;
}) {
  const cfg = widget.chartConfig!;
  const update = (u: Partial<DashboardChartConfig>) =>
    onUpdate({ chartConfig: { ...cfg, ...u } });

  return (
    <>
      <div className="mb-2">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Chart Type</label>
        <div className="flex gap-1">
          {(['bar', 'line', 'pie'] as const).map((t) => (
            <button
              key={t}
              onClick={() => update({ chartType: t })}
              className={`px-2 py-1 text-xs rounded ${cfg.chartType === t ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
              data-testid={`chart-type-${t}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">X Column</label>
        <select
          value={cfg.xColumn}
          onChange={(e) => update({ xColumn: e.target.value })}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          data-testid="chart-x-select"
        >
          <option value="">Select...</option>
          {allCols.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Y Columns</label>
        <div className="flex flex-wrap gap-2">
          {numberCols.map((c) => {
            const selected = cfg.yColumns.includes(c.name);
            return (
              <label key={c.id} className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const yColumns = selected
                      ? cfg.yColumns.filter((y) => y !== c.name)
                      : [...cfg.yColumns, c.name];
                    update({ yColumns });
                  }}
                  data-testid={`chart-y-${c.name}`}
                />
                {c.name}
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
}

function MetricConfigPanel({
  widget,
  numberCols,
  onUpdate,
}: {
  widget: DashboardWidget;
  numberCols: ColumnConfig[];
  onUpdate: (u: Partial<DashboardWidget>) => void;
}) {
  const cfg = widget.metricConfig!;
  const update = (u: Partial<DashboardMetricConfig>) =>
    onUpdate({ metricConfig: { ...cfg, ...u } });

  return (
    <>
      <div className="mb-2">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Column</label>
        <select
          value={cfg.column}
          onChange={(e) => update({ column: e.target.value })}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          data-testid="metric-column-select"
        >
          <option value="">Select...</option>
          {numberCols.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Aggregation</label>
        <select
          value={cfg.aggregation}
          onChange={(e) => update({ aggregation: e.target.value as AggregationType })}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          data-testid="metric-agg-select"
        >
          {AGGREGATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </>
  );
}

function TableConfigPanel({
  widget,
  allCols,
  onUpdate,
}: {
  widget: DashboardWidget;
  allCols: ColumnConfig[];
  onUpdate: (u: Partial<DashboardWidget>) => void;
}) {
  const cfg = widget.tableConfig!;
  const update = (u: Partial<DashboardTableConfig>) =>
    onUpdate({ tableConfig: { ...cfg, ...u } });

  return (
    <>
      <div className="mb-2">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Columns</label>
        <div className="flex flex-wrap gap-2">
          {allCols.map((c) => {
            const selected = cfg.columns.includes(c.name);
            return (
              <label key={c.id} className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const columns = selected
                      ? cfg.columns.filter((col) => col !== c.name)
                      : [...cfg.columns, c.name];
                    update({ columns });
                  }}
                  data-testid={`table-col-${c.name}`}
                />
                {c.name}
              </label>
            );
          })}
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Row Limit</label>
        <input
          type="number"
          value={cfg.limit}
          onChange={(e) => update({ limit: Math.max(1, parseInt(e.target.value) || 10) })}
          className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          min={1}
          data-testid="table-limit-input"
        />
      </div>
    </>
  );
}

/* ─── Widget Bodies ─── */

function ChartWidgetBody({
  widget,
  result,
}: {
  widget: DashboardWidget;
  result: { columns: string[]; rows: Record<string, unknown>[] } | null;
}) {
  const cfg = widget.chartConfig!;
  if (!cfg.xColumn || !cfg.yColumns.length) {
    return <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Configure X and Y columns to see chart</div>;
  }
  if (!result || !result.rows.length) {
    return <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No data</div>;
  }
  return (
    <ChartView
      result={{ columns: result.columns, rows: result.rows, rowCount: result.rows.length, time: 0 }}
      chartType={cfg.chartType}
      xColumn={cfg.xColumn}
      yColumns={cfg.yColumns}
    />
  );
}

function MetricWidgetBody({
  widget,
  result,
}: {
  widget: DashboardWidget;
  result: { columns: string[]; rows: Record<string, unknown>[] } | null;
}) {
  const cfg = widget.metricConfig!;
  if (!cfg.column) {
    return <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Select a column</div>;
  }
  if (!result || !result.rows.length) {
    return <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No data</div>;
  }
  const value = result.rows[0]?.value;
  const displayValue = value !== null && value !== undefined ? Number(value) : 0;
  const formatted = Number.isInteger(displayValue) ? displayValue.toLocaleString() : displayValue.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="py-4 text-center" data-testid="metric-display">
      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="metric-value">
        {formatted}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {cfg.aggregation} of {cfg.column}
      </div>
    </div>
  );
}

function TableWidgetBody({
  result,
}: {
  result: { columns: string[]; rows: Record<string, unknown>[] } | null;
}) {
  if (!result || !result.columns.length) {
    return <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Select columns to display</div>;
  }
  if (!result.rows.length) {
    return <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No data</div>;
  }
  return (
    <div className="overflow-auto" data-testid="table-display">
      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700">
            {result.columns.map((col) => (
              <th key={col} className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              {result.columns.map((col) => (
                <td key={col} className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
