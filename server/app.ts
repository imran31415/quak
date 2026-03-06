import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import sheetsRouter from './routes/sheets.js';
import queryRouter from './routes/query.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRouter);
app.use(sheetsRouter);
app.use(queryRouter);

export default app;
