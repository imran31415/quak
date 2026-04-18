import express from 'express';
import cors from 'cors';
import { apiKeyAuth } from './middleware/apiKeyAuth.js';
import healthRouter from './routes/health.js';
import sheetsRouter from './routes/sheets.js';
import queryRouter from './routes/query.js';
import importExportRouter from './routes/importExport.js';
import chatRouter from './routes/chat.js';
import commentsRouter from './routes/comments.js';
import auditRouter from './routes/audit.js';
import snapshotsRouter from './routes/snapshots.js';
import uploadsRouter from './routes/uploads.js';
import cellFormatsRouter from './routes/cellFormats.js';
import apiKeysRouter from './routes/apiKeys.js';
import webhooksRouter from './routes/webhooks.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', apiKeyAuth);

app.use(healthRouter);
app.use(sheetsRouter);
app.use(queryRouter);
app.use(importExportRouter);
app.use(chatRouter);
app.use(commentsRouter);
app.use(auditRouter);
app.use(snapshotsRouter);
app.use(uploadsRouter);
app.use(cellFormatsRouter);
app.use(apiKeysRouter);
app.use(webhooksRouter);

export default app;
