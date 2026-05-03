import { pino } from 'pino';
import { IS_PRODUCTION } from './config.js';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (IS_PRODUCTION ? 'info' : 'debug'),
  base: { service: 'quak-server' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
