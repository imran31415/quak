import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import sheetsRouter from './routes/sheets.js';
import queryRouter from './routes/query.js';
import importExportRouter from './routes/importExport.js';
import chatRouter from './routes/chat.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRouter);
app.use(sheetsRouter);
app.use(queryRouter);
app.use(importExportRouter);
app.use(chatRouter);

export default app;
