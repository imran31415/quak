import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import path from 'path';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import sheetsRouter from './routes/sheets.js';
import queryRouter from './routes/query.js';
import importExportRouter from './routes/importExport.js';
import chatRouter from './routes/chat.js';
import commentsRouter from './routes/comments.js';
import auditRouter from './routes/audit.js';
import snapshotsRouter from './routes/snapshots.js';
import uploadsRouter from './routes/uploads.js';
import cellFormatsRouter from './routes/cellFormats.js';
import { attachSession } from './middleware/session.js';
import { CLIENT_DIST_DIR, IS_PRODUCTION } from './config.js';
import { logger } from './logger.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  pinoHttp({
    logger,
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, id: req.id }),
    },
  }),
);

app.use(
  helmet({
    contentSecurityPolicy: IS_PRODUCTION
      ? {
          useDefaults: true,
          directives: {
            'script-src': ["'self'", "'wasm-unsafe-eval'"],
            'connect-src': ["'self'", 'https://openrouter.ai'],
            'img-src': ["'self'", 'data:', 'blob:'],
            'style-src': ["'self'", "'unsafe-inline'"],
            'worker-src': ["'self'", 'blob:'],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  }),
);

if (!IS_PRODUCTION) {
  app.use(cors());
}

app.use(express.json({ limit: '10mb' }));

// Health probes register before the session middleware so they stay anonymous.
app.use(healthRouter);

// Every other /api/* route gets req.user populated (anonymous user lazily
// created on first request without a session cookie).
app.use(attachSession);
app.use(authRouter);
app.use(sheetsRouter);
app.use(queryRouter);
app.use(importExportRouter);
app.use(chatRouter);
app.use(commentsRouter);
app.use(auditRouter);
app.use(snapshotsRouter);
app.use(uploadsRouter);
app.use(cellFormatsRouter);

if (IS_PRODUCTION) {
  app.use(express.static(CLIENT_DIST_DIR, { index: false, maxAge: '1h' }));
  const spaFallback: RequestHandler = (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'));
  };
  app.get(/^\/(?!api\/).*/, spaFallback);
}

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = typeof err?.status === 'number' ? err.status : 500;
  req.log?.error({ err, status }, 'request_error');
  if (res.headersSent) {
    res.end();
    return;
  }
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err?.message ?? 'Request failed',
  });
};
app.use(errorHandler);

export default app;
