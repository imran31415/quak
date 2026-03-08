import { useMemo, useState, useCallback } from 'react';
import { useSheetStore } from '../../store/sheetStore';
import { useUIStore } from '../../store/uiStore';
import type { ColumnConfig } from '@shared/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface CalendarEvent {
  rowIndex: number;
  row: Record<string, unknown>;
  date: Date;
}

export function CalendarView() {
  const { activeSheetId, activeSheetMeta, rows } = useSheetStore();
  const viewConfigs = useUIStore((s) => s.viewConfigs);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dateColumn = useMemo((): ColumnConfig | null => {
    if (!activeSheetId || !activeSheetMeta) return null;
    const config = viewConfigs[activeSheetId];
    if (config?.calendarColumnId) {
      const col = activeSheetMeta.columns.find((c) => c.id === config.calendarColumnId);
      if (col) return col;
    }
    return activeSheetMeta.columns.find((c) => c.cellType === 'date') || null;
  }, [activeSheetId, activeSheetMeta, viewConfigs]);

  const titleColumn = useMemo((): ColumnConfig | null => {
    if (!activeSheetMeta) return null;
    return activeSheetMeta.columns.find((c) => c.cellType === 'text') || activeSheetMeta.columns[0] || null;
  }, [activeSheetMeta]);

  const eventsByDate = useMemo((): Map<string, CalendarEvent[]> => {
    const map = new Map<string, CalendarEvent[]>();
    if (!dateColumn) return map;

    rows.forEach((row, rowIndex) => {
      const rawDate = row[dateColumn.name];
      if (!rawDate) return;
      try {
        const date = new Date(rawDate as string);
        if (isNaN(date.getTime())) return;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ rowIndex, row, date });
      } catch {
        // Skip invalid dates
      }
    });

    return map;
  }, [rows, dateColumn]);

  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    // Pad start
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: d,
        isCurrentMonth: false,
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      });
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      });
    }

    // Pad end to fill 6 rows
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      });
    }

    return days;
  }, [currentMonth]);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth({ year: now.getFullYear(), month: now.getMonth() });
  }, []);

  const prevMonth = useCallback(() => {
    setCurrentMonth((c) => {
      if (c.month === 0) return { year: c.year - 1, month: 11 };
      return { year: c.year, month: c.month - 1 };
    });
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentMonth((c) => {
      if (c.month === 11) return { year: c.year + 1, month: 0 };
      return { year: c.year, month: c.month + 1 };
    });
  }, []);

  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) || []) : [];

  if (!activeSheetMeta || !activeSheetId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
        Select a sheet to view
      </div>
    );
  }

  if (!dateColumn) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500" data-testid="calendar-no-column">
        <div className="text-center">
          <p>No date column found.</p>
          <p className="text-sm mt-1">Add a date column in Grid view, or configure the Calendar column in view settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto h-full" data-testid="calendar-view">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-200"
            data-testid="calendar-prev"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 4l-4 4 4 4" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 w-48 text-center" data-testid="calendar-title">
            {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-200"
            data-testid="calendar-next"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-700"
          data-testid="calendar-today"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          {DAY_NAMES.map((day) => (
            <div key={day} className="px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const events = eventsByDate.get(day.key) || [];
            const isToday = day.key === todayKey;
            const isSelected = day.key === selectedDate;

            return (
              <div
                key={day.key}
                className={`min-h-[80px] border-b border-r border-gray-100 dark:border-gray-700 p-1 cursor-pointer transition-colors ${
                  day.isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'
                } ${isSelected ? 'ring-2 ring-inset ring-blue-400' : ''} hover:bg-blue-50/50 dark:hover:bg-blue-900/20`}
                onClick={() => setSelectedDate(isSelected ? null : day.key)}
                data-testid={`calendar-day-${day.key}`}
              >
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                    isToday
                      ? 'bg-blue-600 text-white font-bold'
                      : day.isCurrentMonth
                        ? 'text-gray-700 dark:text-gray-200'
                        : 'text-gray-300 dark:text-gray-600'
                  }`}
                >
                  {day.date.getDate()}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {events.slice(0, 3).map((ev) => {
                    const label = titleColumn
                      ? String(ev.row[titleColumn.name] || '')
                      : `Row ${ev.rowIndex + 1}`;
                    return (
                      <div
                        key={ev.rowIndex}
                        className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded truncate"
                        data-testid="calendar-event"
                        title={label}
                      >
                        {label || 'Untitled'}
                      </div>
                    );
                  })}
                  {events.length > 3 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 px-1.5">
                      +{events.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected date detail popover */}
      {selectedDate && selectedEvents.length > 0 && (
        <div className="mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4" data-testid="calendar-detail">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
            >
              Close
            </button>
          </div>
          <div className="space-y-2">
            {selectedEvents.map((ev) => (
              <div
                key={ev.rowIndex}
                className="border border-gray-100 dark:border-gray-700 rounded p-2"
                data-testid="calendar-detail-item"
              >
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {titleColumn ? String(ev.row[titleColumn.name] || 'Untitled') : `Row ${ev.rowIndex + 1}`}
                </p>
                {activeSheetMeta.columns
                  .filter((c) => c.id !== dateColumn.id && c.id !== titleColumn?.id)
                  .slice(0, 3)
                  .map((col) => (
                    <p key={col.id} className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {col.name}: {formatValue(ev.row[col.name], col.cellType)}
                    </p>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown, cellType: string): string {
  if (value === null || value === undefined) return '-';
  if (cellType === 'checkbox') return value ? 'Yes' : 'No';
  return String(value);
}
