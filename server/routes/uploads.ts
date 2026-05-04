import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { FILE_MAX_SIZE, FILE_ACCEPTED_EXTENSIONS } from '../../shared/constants.js';
import { UPLOADS_DIR } from '../config.js';
import { getDb } from '../db.js';
import type { AuthedRequest } from '../middleware/session.js';

function escSql(s: string): string { return s.replace(/'/g, "''"); }

async function uploadOwner(filename: string): Promise<string | null> {
  const r = await getDb().runAndReadAll(
    `SELECT owner_id FROM __quak_uploads WHERE filename = '${escSql(filename)}'`,
  );
  const rows = r.getRowObjectsJson() as Array<Record<string, unknown>>;
  return rows.length > 0 ? String(rows[0].owner_id) : null;
}

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (FILE_ACCEPTED_EXTENSIONS.includes(ext as typeof FILE_ACCEPTED_EXTENSIONS[number])) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not allowed`));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: FILE_MAX_SIZE },
  fileFilter,
});

const router = Router();

// POST /api/uploads — upload a file
router.post('/api/uploads', upload.single('file'), async (req: Request, res: Response) => {
  const u = (req as AuthedRequest).user;
  if (!u) { res.status(500).json({ error: 'Session not initialized' }); return; }
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  await getDb().run(
    `INSERT INTO __quak_uploads (filename, owner_id, original_name) VALUES ('${escSql(req.file.filename)}', '${escSql(u.id)}', '${escSql(req.file.originalname || '')}')`,
  );

  const metadata = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  };

  res.status(201).json(metadata);
});

// GET /api/uploads/:filename — serve a file
router.get('/api/uploads/:filename', async (req: Request, res: Response) => {
  const u = (req as AuthedRequest).user;
  if (!u) { res.status(500).json({ error: 'Session not initialized' }); return; }
  const filename = path.basename(String(req.params.filename)); // sanitize
  const owner = await uploadOwner(filename);
  if (owner !== u.id) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.sendFile(filePath);
});

// DELETE /api/uploads/:filename — remove a file
router.delete('/api/uploads/:filename', async (req: Request, res: Response) => {
  const u = (req as AuthedRequest).user;
  if (!u) { res.status(500).json({ error: 'Session not initialized' }); return; }
  const filename = path.basename(String(req.params.filename)); // sanitize
  const owner = await uploadOwner(filename);
  if (owner !== u.id) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await getDb().run(`DELETE FROM __quak_uploads WHERE filename = '${escSql(filename)}'`);
  res.json({ success: true });
});

export default router;
