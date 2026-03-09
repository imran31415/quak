import type { ColumnConfig } from '@shared/types';
import ExcelJS from 'exceljs';

export async function exportToXLSX(
  sheetName: string,
  columns: ColumnConfig[],
  rows: Record<string, unknown>[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  // Header row
  sheet.columns = columns.map((col) => ({
    header: col.name,
    key: col.name,
    width: Math.max(Math.round(col.width / 8), 12),
  }));

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };

  // Data rows
  for (const row of rows) {
    const rowData: Record<string, unknown> = {};
    for (const col of columns) {
      let val = row[col.name];
      if (col.cellType === 'number' && val !== null && val !== undefined && val !== '') {
        val = Number(val);
      }
      if (col.cellType === 'date' && val && typeof val === 'string') {
        val = new Date(val);
      }
      rowData[col.name] = val ?? '';
    }
    sheet.addRow(rowData);
  }

  // Number formatting
  for (let colIdx = 0; colIdx < columns.length; colIdx++) {
    const col = columns[colIdx];
    const excelCol = sheet.getColumn(colIdx + 1);
    if (col.cellType === 'number') {
      excelCol.numFmt = col.format || '#,##0.##';
    } else if (col.cellType === 'date') {
      excelCol.numFmt = col.format || 'yyyy-mm-dd';
    }
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sheetName}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
