import type { Server } from 'http';
import app from './app.js';
import { initDb, closeDb } from './db.js';
import { PORT } from './config.js';
import { logger } from './logger.js';

const SHUTDOWN_TIMEOUT_MS = 25_000;

let httpServer: Server | undefined;
let shuttingDown = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutdown_started');

  const forceTimer = setTimeout(() => {
    logger.error('shutdown_timeout_forcing_exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();

  try {
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer!.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info('http_server_closed');
    }
    await closeDb();
    logger.info('db_closed');
    clearTimeout(forceTimer);
    process.exit(exitCode);
  } catch (err) {
    logger.error({ err }, 'shutdown_error');
    process.exit(1);
  }
}

async function main(): Promise<void> {
  await initDb();

  httpServer = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'server_listening');
  });

  // Long SSE streams: don't keep TCP idle forever, but allow long-lived chat
  httpServer.keepAliveTimeout = 65_000;
  httpServer.headersTimeout = 66_000;
  httpServer.requestTimeout = 0; // disable per-request timeout (chat SSE)

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandled_rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught_exception');
  void shutdown('uncaughtException', 1);
});

main().catch((err) => {
  logger.fatal({ err }, 'startup_failed');
  process.exit(1);
});
