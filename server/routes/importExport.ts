import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { batchInsert } from '../utils/batchInsert.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function cellTypeToDuckDB(cellType: string): string {
  switch (cellType) {
    case 'number': return 'DOUBLE';
    case 'checkbox': return 'BOOLEAN';
    case 'date': return 'DATE';
    default: return 'VARCHAR';
  }
}

function safeTableName(id: string): string {
  return 'sheet_' + id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function inferType(values: unknown[]): string {
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonEmpty.length === 0) return 'text';
  const sample = nonEmpty.slice(0, 50);

  const allBool = sample.every((v) => v === 'true' || v === 'false' || v === true || v === false);
  if (allBool) return 'checkbox';

  const allNum = sample.every((v) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))));
  if (allNum) return 'number';

  const dateRe = /^\d{4}-\d{2}-\d{2}/;
  const allDate = sample.every((v) => typeof v === 'string' && dateRe.test(v) && !isNaN(Date.parse(v)));
  if (allDate) return 'date';

  return 'text';
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = tabCount > commaCount && tabCount > semicolonCount ? '\t'
    : semicolonCount > commaCount ? ';' : ',';

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === delimiter) { fields.push(current); current = ''; }
        else current += ch;
      }
    }
    fields.push(current);
    return fields;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).filter((l) => l.trim()).map(parseLine);
  return { headers, rows };
}

function formatValue(val: unknown, cellType: string): string {
  if (val === null || val === undefined || val === '') return 'NULL';
  if (cellType === 'number') return String(Number(val));
  if (cellType === 'checkbox') return (val === 'true' || val === true) ? 'TRUE' : 'FALSE';
  return `'${String(val).replace(/'/g, "''")}'`;
}

// POST /api/import - import CSV or JSON file
router.post('/api/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const content = req.file.buffer.toString('utf-8');
    const filename = req.file.originalname || 'import';
    const ext = filename.split('.').pop()?.toLowerCase();

    let headers: string[];
    let dataRows: Record<string, unknown>[];

    if (ext === 'json') {
      const parsed = JSON.parse(content);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      headers = [...new Set(arr.flatMap((r: Record<string, unknown>) => Object.keys(r)))];
      dataRows = arr;
    } else {
      // CSV/TSV
      const { headers: csvHeaders, rows: csvRows } = parseCSV(content);
      headers = csvHeaders;
      dataRows = csvRows.map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
        return obj;
      });
    }

    // Infer column types
    const columns = headers.map((h) => {
      const values = dataRows.map((r) => r[h]);
      const cellType = inferType(values);
      return {
        id: h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        name: h,
        cellType,
        width: cellType === 'checkbox' ? 80 : cellType === 'number' ? 120 : 150,
      };
    });

    const id = crypto.randomUUID();
    const tableName = safeTableName(id);
    const sheetName = filename.replace(/\.[^.]+$/, '');

    const db = getDb();

    // Create table
    const colDefs = columns
      .map((col) => `"${col.name.replace(/"/g, '""')}" ${cellTypeToDuckDB(col.cellType)}`)
      .join(', ');
    await db.run(`CREATE TABLE "${tableName}" (${colDefs})`);

    // Insert rows in batches
    await batchInsert(db, tableName, columns, dataRows);

    // Insert metadata
    const columnsJson = JSON.stringify(columns);
    await db.run(
      `INSERT INTO __quak_sheets (id, name, columns, created_at, updated_at)
       VALUES ('${id}', '${sheetName.replace(/'/g, "''")}', '${columnsJson.replace(/'/g, "''")}', current_timestamp, current_timestamp)`
    );

    res.status(201).json({ id, name: sheetName, columns, rowCount: dataRows.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/sheets/:id/export - export sheet as CSV or JSON
router.get('/api/sheets/:id/export', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const format = (req.query.format as string) || 'csv';

    const db = getDb();
    const tableName = safeTableName(id);

    // Get metadata
    const metaResult = await db.runAndReadAll(
      `SELECT name, columns FROM __quak_sheets WHERE id = '${id.replace(/'/g, "''")}'`
    );
    const metaRows = metaResult.getRowObjectsJson();
    if (metaRows.length === 0) {
      res.status(404).json({ error: 'Sheet not found' });
      return;
    }

    const meta = metaRows[0] as Record<string, unknown>;
    const sheetName = meta.name as string;
    const columnsRaw = meta.columns;
    const columns = (typeof columnsRaw === 'string' ? JSON.parse(columnsRaw) : columnsRaw) as { name: string; cellType: string }[];

    // Get data
    const dataResult = await db.runAndReadAll(`SELECT * FROM "${tableName}"`);
    const rows = dataResult.getRowObjectsJson() as Record<string, unknown>[];

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${sheetName}.json"`);
      const clean = rows.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const col of columns) obj[col.name] = row[col.name];
        return obj;
      });
      res.json(clean);
    } else {
      const escapeCSV = (v: string) => v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
      const header = columns.map((c) => escapeCSV(c.name)).join(',');
      const dataLines = rows.map((row) =>
        columns.map((c) => escapeCSV(String(row[c.name] ?? ''))).join(',')
      );
      const csv = [header, ...dataLines].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${sheetName}.csv"`);
      res.send(csv);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
