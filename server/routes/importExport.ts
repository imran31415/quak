import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import { getDb } from '../db.js';
import { batchInsert } from '../utils/batchInsert.js';
import { assertOwnership } from './sheets.js';
import type { AuthedRequest } from '../middleware/session.js';

function uid(req: Request, res: Response): string | null {
  const u = (req as AuthedRequest).user;
  if (!u) { res.status(500).json({ error: 'Session not initialized' }); return null; }
  return u.id;
}

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

async function parseXlsxBuffer(buf: Buffer): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('XLSX file has no worksheets');
  const allRows: unknown[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const arr: unknown[] = [];
    // Cells are 1-indexed; values has a leading slot we can ignore
    const vals = row.values as unknown[];
    for (let i = 1; i < vals.length; i++) {
      const v = vals[i];
      if (v === null || v === undefined) { arr.push(''); continue; }
      if (typeof v === 'object' && v !== null && 'text' in (v as Record<string, unknown>)) {
        arr.push(String((v as { text: unknown }).text ?? ''));
      } else if (v instanceof Date) {
        arr.push(v.toISOString().slice(0, 10));
      } else {
        arr.push(v as unknown);
      }
    }
    allRows.push(arr);
  });
  if (allRows.length === 0) return { headers: [], rows: [] };
  const headers = (allRows[0] as unknown[]).map((h, i) => String(h ?? `Column ${i + 1}`));
  const rows = allRows.slice(1).map((r) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { obj[h] = (r as unknown[])[i] ?? ''; });
    return obj;
  });
  return { headers, rows };
}

// Convert a Google Sheets URL to its CSV-export URL.
// Accepts /edit, /view, /preview, or any URL containing /spreadsheets/d/<id>.
function googleSheetsCsvUrl(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  const sheetId = m[1];
  const gidMatch = url.match(/[?#&]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

async function createSheetFromRows(
  ownerId: string,
  sheetName: string,
  headers: string[],
  dataRows: Record<string, unknown>[],
): Promise<{ id: string; name: string; columns: { id: string; name: string; cellType: string; width: number }[]; rowCount: number }> {
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
  const db = getDb();

  const colDefs = columns
    .map((col) => `"${col.name.replace(/"/g, '""')}" ${cellTypeToDuckDB(col.cellType)}`)
    .join(', ');
  await db.run(`CREATE TABLE "${tableName}" (__order INTEGER, ${colDefs})`);
  await batchInsert(db, tableName, columns, dataRows);
  await db.run(`UPDATE "${tableName}" SET __order = rowid WHERE __order IS NULL`);

  const columnsJson = JSON.stringify(columns);
  await db.run(
    `INSERT INTO __quak_sheets (id, owner_id, name, columns, created_at, updated_at)
     VALUES ('${id}', '${ownerId.replace(/'/g, "''")}', '${sheetName.replace(/'/g, "''")}', '${columnsJson.replace(/'/g, "''")}', current_timestamp, current_timestamp)`
  );

  return { id, name: sheetName, columns, rowCount: dataRows.length };
}

// POST /api/import - import CSV / TSV / JSON / XLSX file
router.post('/api/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = uid(req, res);
    if (!userId) return;
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const filename = req.file.originalname || 'import';
    const ext = filename.split('.').pop()?.toLowerCase();

    let headers: string[];
    let dataRows: Record<string, unknown>[];

    if (ext === 'xlsx' || ext === 'xls') {
      const parsed = await parseXlsxBuffer(req.file.buffer);
      headers = parsed.headers;
      dataRows = parsed.rows;
    } else if (ext === 'json') {
      const content = req.file.buffer.toString('utf-8');
      const parsed = JSON.parse(content);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      headers = [...new Set(arr.flatMap((r: Record<string, unknown>) => Object.keys(r)))];
      dataRows = arr;
    } else {
      // CSV/TSV
      const content = req.file.buffer.toString('utf-8');
      const { headers: csvHeaders, rows: csvRows } = parseCSV(content);
      headers = csvHeaders;
      dataRows = csvRows.map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
        return obj;
      });
    }

    const sheetName = filename.replace(/\.[^.]+$/, '');
    const result = await createSheetFromRows(userId, sheetName, headers, dataRows);
    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/import/url - fetch a remote CSV (e.g. Google Sheets) and import.
router.post('/api/import/url', async (req: Request, res: Response) => {
  try {
    const userId = uid(req, res);
    if (!userId) return;
    const url = String((req.body as { url?: unknown }).url ?? '').trim();
    const userName = String((req.body as { name?: unknown }).name ?? '').trim();
    if (!url) {
      res.status(400).json({ error: 'url is required' });
      return;
    }

    let fetchUrl = url;
    let defaultName = 'Imported Sheet';
    const gsCsv = googleSheetsCsvUrl(url);
    if (gsCsv) {
      fetchUrl = gsCsv;
      defaultName = 'Google Sheet';
    }

    let r: globalThis.Response;
    try {
      r = await fetch(fetchUrl, { redirect: 'follow' });
    } catch (e: unknown) {
      const cause = (e as { cause?: { code?: string; message?: string } }).cause;
      res.status(502).json({
        error: `Network error fetching ${fetchUrl}: ${(e as Error).message}${cause?.code ? ` (${cause.code}: ${cause.message ?? ''})` : ''}`,
      });
      return;
    }
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      res.status(502).json({
        error: `Fetch failed (${r.status}). For Google Sheets, ensure the sheet is shared "Anyone with the link can view".`,
        detail: body.slice(0, 200),
      });
      return;
    }
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    const text = await r.text();

    let headers: string[];
    let dataRows: Record<string, unknown>[];

    if (ct.includes('application/json') || (!gsCsv && url.endsWith('.json'))) {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      headers = [...new Set(arr.flatMap((r2: Record<string, unknown>) => Object.keys(r2)))];
      dataRows = arr;
    } else {
      const { headers: csvHeaders, rows: csvRows } = parseCSV(text);
      headers = csvHeaders;
      dataRows = csvRows.map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
        return obj;
      });
    }

    const sheetName = userName || defaultName;
    const result = await createSheetFromRows(userId, sheetName, headers, dataRows);
    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/sheets/:id/export - export sheet as CSV or JSON
router.get('/api/sheets/:id/export', async (req: Request, res: Response) => {
  try {
    const userId = uid(req, res);
    if (!userId) return;
    const id = req.params.id as string;
    if (!(await assertOwnership(id, userId, res))) return;
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
