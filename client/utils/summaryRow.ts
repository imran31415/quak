import type { ColumnConfig } from '@shared/types';

/**
 * Build a single summary row for pinnedBottomRowData.
 * Numeric  → "Sum: X"
 * Checkbox → "X/Y" (true count / total)
 * Date     → "min – max" range
 * Dropdown → "most common" (N)
 * Text/Markdown → "N filled"
 */
export function buildSummaryRow(
  rows: Record<string, unknown>[],
  columns: ColumnConfig[]
): Record<string, unknown> {
  const dataRows = rows.filter(
    (r) => !r.__isGroupHeader && !r.__isSubtotalRow
  );
  const result: Record<string, unknown> = { __isSummaryRow: true, __idx: '__summary' };

  for (const col of columns) {
    const values = dataRows.map((r) => r[col.name]);

    switch (col.cellType) {
      case 'number': {
        const nums = values
          .filter((v) => v !== null && v !== undefined && v !== '')
          .map(Number)
          .filter((n) => !isNaN(n));
        result[col.name] = nums.length > 0 ? `Sum: ${nums.reduce((a, b) => a + b, 0)}` : '';
        break;
      }
      case 'checkbox': {
        const total = values.length;
        const trueCount = values.filter((v) => v === true || v === 'true').length;
        result[col.name] = `${trueCount}/${total}`;
        break;
      }
      case 'date': {
        const dates = values
          .filter((v) => v !== null && v !== undefined && v !== '')
          .map((v) => new Date(String(v)))
          .filter((d) => !isNaN(d.getTime()));
        if (dates.length > 0) {
          const min = new Date(Math.min(...dates.map((d) => d.getTime())));
          const max = new Date(Math.max(...dates.map((d) => d.getTime())));
          const fmt = (d: Date) => d.toISOString().split('T')[0];
          result[col.name] = min.getTime() === max.getTime()
            ? fmt(min)
            : `${fmt(min)} – ${fmt(max)}`;
        } else {
          result[col.name] = '';
        }
        break;
      }
      case 'dropdown': {
        const filled = values.filter((v) => v !== null && v !== undefined && v !== '');
        if (filled.length === 0) {
          result[col.name] = '';
          break;
        }
        const counts = new Map<string, number>();
        for (const v of filled) {
          const s = String(v);
          counts.set(s, (counts.get(s) || 0) + 1);
        }
        let maxVal = '';
        let maxCount = 0;
        for (const [val, count] of counts) {
          if (count > maxCount) {
            maxVal = val;
            maxCount = count;
          }
        }
        result[col.name] = `${maxVal} (${maxCount})`;
        break;
      }
      default: {
        // text, markdown, formula
        const filled = values.filter(
          (v) => v !== null && v !== undefined && v !== ''
        ).length;
        result[col.name] = `${filled} filled`;
        break;
      }
    }
  }

  return result;
}
