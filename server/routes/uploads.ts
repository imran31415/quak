import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { FILE_MAX_SIZE, FILE_ACCEPTED_EXTENSIONS } from '../../shared/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'storage', 'uploads');

// Ensure uploads directory exists
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
router.post('/api/uploads', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const metadata = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  };

  res.status(201).json(metadata);
});

// GET /api/uploads/:filename — serve a file
router.get('/api/uploads/:filename', (req: Request, res: Response) => {
  const filename = path.basename(String(req.params.filename)); // sanitize
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  res.sendFile(filePath);
});

// DELETE /api/uploads/:filename — remove a file
router.delete('/api/uploads/:filename', (req: Request, res: Response) => {
  const filename = path.basename(String(req.params.filename)); // sanitize
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  fs.unlinkSync(filePath);
  res.json({ success: true });
});

export default router;
