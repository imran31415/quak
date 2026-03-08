import type { ColumnConfig } from '@shared/types';

export interface GroupedRow extends Record<string, unknown> {
  __isGroupHeader?: boolean;
  __isSubtotalRow?: boolean;
  __groupValue?: string;
  __groupRowCount?: number;
  __groupId?: string;
}

export function buildGroupedRows(
  rows: Record<string, unknown>[],
  groupByCol: ColumnConfig,
  allCols: ColumnConfig[],
  collapsedGroups: Set<string>
): GroupedRow[] {
  // Group rows by column value
  const groups = new Map<string, Record<string, unknown>[]>();
  const groupOrder: string[] = [];

  for (const row of rows) {
    const val = row[groupByCol.name];
    const key = val === null || val === undefined || val === '' ? '(empty)' : String(val);
    if (!groups.has(key)) {
      groups.set(key, []);
      groupOrder.push(key);
    }
    groups.get(key)!.push(row);
  }

  // Sort groups alphabetically
  groupOrder.sort((a, b) => a.localeCompare(b));

  const result: GroupedRow[] = [];

  for (const groupValue of groupOrder) {
    const groupRows = groups.get(groupValue)!;
    const groupId = `group_${groupValue}`;
    const isCollapsed = collapsedGroups.has(groupId);

    // Header row
    result.push({
      __isGroupHeader: true,
      __groupValue: groupValue,
      __groupRowCount: groupRows.length,
      __groupId: groupId,
      __idx: groupId,
      [groupByCol.name]: `${groupValue} (${groupRows.length})`,
    });

    // Data rows (if not collapsed)
    if (!isCollapsed) {
      for (const row of groupRows) {
        result.push({ ...row });
      }

      // Subtotal row
      const subtotals: GroupedRow = {
        __isSubtotalRow: true,
        __groupId: `subtotal_${groupValue}`,
        __idx: `subtotal_${groupValue}`,
      };

      for (const col of allCols) {
        if (col.cellType === 'number') {
          const sum = groupRows.reduce((acc, r) => {
            const v = Number(r[col.name]);
            return acc + (isNaN(v) ? 0 : v);
          }, 0);
          subtotals[col.name] = sum;
        } else if (col.name === groupByCol.name) {
          subtotals[col.name] = 'Subtotal';
        } else {
          subtotals[col.name] = `${groupRows.length} items`;
        }
      }

      result.push(subtotals);
    }
  }

  return result;
}
