import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';

const router = Router();

// GET /api/sheets/:id/cell-formats — list all formats for a sheet
router.get('/api/sheets/:id/cell-formats', async (req: Request, res: Response) => {
  try {
    const sheetId = req.params.id as string;
    const db = getDb();
    const result = await db.runAndReadAll(
      `SELECT * FROM __quak_cell_formats WHERE sheet_id = '${sheetId.replace(/'/g, "''")}'`
    );
    const rows = result.getRowObjectsJson();
    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// PUT /api/sheets/:id/cell-formats — upsert single cell format
router.put('/api/sheets/:id/cell-formats', async (req: Request, res: Response) => {
  try {
    const sheetId = req.params.id as string;
    const { rowId, colName, bold, italic, underline, strikethrough, textColor, bgColor } = req.body as {
      rowId: number;
      colName: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      strikethrough?: boolean;
      textColor?: string;
      bgColor?: string;
    };

    if (rowId === undefined || !colName) {
      res.status(400).json({ error: 'rowId and colName are required' });
      return;
    }

    const db = getDb();
    const safeSheetId = sheetId.replace(/'/g, "''");
    const safeColName = colName.replace(/'/g, "''");

    // Check if format exists
    const existing = await db.runAndReadAll(
      `SELECT id FROM __quak_cell_formats WHERE sheet_id = '${safeSheetId}' AND row_id = ${Number(rowId)} AND col_name = '${safeColName}'`
    );
    const existingRows = existing.getRowObjectsJson();

    if (existingRows.length > 0) {
      const id = (existingRows[0] as Record<string, unknown>).id as string;
      await db.run(
        `UPDATE __quak_cell_formats SET bold = ${!!bold}, italic = ${!!italic}, underline = ${!!underline}, strikethrough = ${!!strikethrough}, text_color = ${textColor ? `'${textColor.replace(/'/g, "''")}'` : 'NULL'}, bg_color = ${bgColor ? `'${bgColor.replace(/'/g, "''")}'` : 'NULL'} WHERE id = '${id.replace(/'/g, "''")}'`
      );
      res.json({ id });
    } else {
      const id = crypto.randomUUID();
      await db.run(
        `INSERT INTO __quak_cell_formats (id, sheet_id, row_id, col_name, bold, italic, underline, strikethrough, text_color, bg_color) VALUES ('${id}', '${safeSheetId}', ${Number(rowId)}, '${safeColName}', ${!!bold}, ${!!italic}, ${!!underline}, ${!!strikethrough}, ${textColor ? `'${textColor.replace(/'/g, "''")}'` : 'NULL'}, ${bgColor ? `'${bgColor.replace(/'/g, "''")}'` : 'NULL'})`
      );
      res.status(201).json({ id });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// PUT /api/sheets/:id/cell-formats/bulk — bulk upsert
router.put('/api/sheets/:id/cell-formats/bulk', async (req: Request, res: Response) => {
  try {
    const sheetId = req.params.id as string;
    const { formats } = req.body as {
      formats: Array<{
        rowId: number;
        colName: string;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        strikethrough?: boolean;
        textColor?: string;
        bgColor?: string;
      }>;
    };

    if (!formats || !Array.isArray(formats) || formats.length === 0) {
      res.status(400).json({ error: 'formats array is required' });
      return;
    }

    const db = getDb();
    const safeSheetId = sheetId.replace(/'/g, "''");
    let upserted = 0;

    for (const fmt of formats) {
      const safeColName = fmt.colName.replace(/'/g, "''");
      const existing = await db.runAndReadAll(
        `SELECT id FROM __quak_cell_formats WHERE sheet_id = '${safeSheetId}' AND row_id = ${Number(fmt.rowId)} AND col_name = '${safeColName}'`
      );
      const existingRows = existing.getRowObjectsJson();

      if (existingRows.length > 0) {
        const id = (existingRows[0] as Record<string, unknown>).id as string;
        await db.run(
          `UPDATE __quak_cell_formats SET bold = ${!!fmt.bold}, italic = ${!!fmt.italic}, underline = ${!!fmt.underline}, strikethrough = ${!!fmt.strikethrough}, text_color = ${fmt.textColor ? `'${fmt.textColor.replace(/'/g, "''")}'` : 'NULL'}, bg_color = ${fmt.bgColor ? `'${fmt.bgColor.replace(/'/g, "''")}'` : 'NULL'} WHERE id = '${id.replace(/'/g, "''")}'`
        );
      } else {
        const id = crypto.randomUUID();
        await db.run(
          `INSERT INTO __quak_cell_formats (id, sheet_id, row_id, col_name, bold, italic, underline, strikethrough, text_color, bg_color) VALUES ('${id}', '${safeSheetId}', ${Number(fmt.rowId)}, '${safeColName}', ${!!fmt.bold}, ${!!fmt.italic}, ${!!fmt.underline}, ${!!fmt.strikethrough}, ${fmt.textColor ? `'${fmt.textColor.replace(/'/g, "''")}'` : 'NULL'}, ${fmt.bgColor ? `'${fmt.bgColor.replace(/'/g, "''")}'` : 'NULL'})`
        );
      }
      upserted++;
    }

    res.json({ success: true, upserted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/sheets/:id/cell-formats — clear formatting for given cells
router.delete('/api/sheets/:id/cell-formats', async (req: Request, res: Response) => {
  try {
    const sheetId = req.params.id as string;
    const { cells } = req.body as {
      cells: Array<{ rowId: number; colName: string }>;
    };

    if (!cells || !Array.isArray(cells) || cells.length === 0) {
      res.status(400).json({ error: 'cells array is required' });
      return;
    }

    const db = getDb();
    const safeSheetId = sheetId.replace(/'/g, "''");

    for (const cell of cells) {
      const safeColName = cell.colName.replace(/'/g, "''");
      await db.run(
        `DELETE FROM __quak_cell_formats WHERE sheet_id = '${safeSheetId}' AND row_id = ${Number(cell.rowId)} AND col_name = '${safeColName}'`
      );
    }

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
