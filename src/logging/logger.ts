import fs from 'fs';
import path from 'path';
import { createLogger, format, transports, Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LoggerMap } from '../types';

const {
  LOG_DIR = 'logs',
  LOG_LEVEL = 'info',
  LOG_ROTATE = 'true',
  LOG_MAX_SIZE_MB = '10',
  LOG_MAX_FILES = '14d'
} = process.env

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(LOG_DIR);

const baseJsonFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.printf(info => {
    const { timestamp, level, message, stack, ...rest } = info;

    const payload = {
      ts: timestamp,
      level,
      msg: message,
      ...(stack ? { stack } : {}),
      ...rest
    };

    return JSON.stringify(payload);
  })
);

function buildFileTransport(filename: string, level: string) {
  const fullPath = path.join(LOG_DIR, filename);

  if (LOG_ROTATE === 'true') {
    return new DailyRotateFile({
      level,
      dirname: LOG_DIR,
      filename: filename.replace(/\.log$/, '') + '-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: false,
      maxSize: `${LOG_MAX_SIZE_MB}m`,
      maxFiles: LOG_MAX_FILES,
      createSymlink: true,
      symlinkName: filename,
    });
  }

  return new transports.File({ filename: fullPath, level });
}

function buildLogger(category: string, baseLevel = LOG_LEVEL): Logger {
  return createLogger({
    level: baseLevel,
    format: baseJsonFormat,
    defaultMeta: { category },
    transports: [
      buildFileTransport(
        category === 'api'
          ? 'api.log'
          : category === 'printing'
            ? 'printing.log'
            : category === 'errors'
              ? 'errors.log'
              : category === 'security'
                ? 'security.log'
                : 'app.log',
        baseLevel
      ),
      new transports.Console({
        level: baseLevel,
        format: format.combine(
          format.colorize(),
          format.timestamp(),
          format.printf(info => {
            const { timestamp, level, message, stack, ...rest } = info;
            const meta = Object.keys(rest).length
              ? ' ' + JSON.stringify(rest)
              : '';

            return `[${timestamp}] ${level} ${message}${stack ? '\n' + stack : ''}${meta}`;
          })
        ),
      }),
    ],
    exitOnError: false,
  });
}

export const loggers: LoggerMap = {
  main: buildLogger('main'),
  api: buildLogger('api'),
  printing: buildLogger('printing'),
  errors: buildLogger('errors', 'error'),
  security: buildLogger('security'),
};

export function mirrorError(err: any, context: Record<string, unknown> = {}) {
  const message = err?.message || String(err);
  const stack = err?.stack;
  loggers.errors.error(message, { stack, ...context });
}

export function setupGlobalExceptionLogging() {
  process.on('uncaughtException', (err) => {
    mirrorError(err, { origin: 'uncaughtException' });
    process.exit(1)
  });

  process.on('unhandledRejection', (reason: any) => {
    mirrorError(
      reason instanceof Error ? reason : new Error(String(reason)),
      { origin: 'unhandledRejection' }
    );
  });
}