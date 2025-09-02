import { NextFunction, Request, Response } from 'express';
import { loggers, mirrorError } from '../logging/logger';
import { LoggedRequest } from '../types';

export function errorHandler() {
  return (err: any, req: LoggedRequest, res: Response, _next: NextFunction) => {
    const requestId = (req as any).requestId;

    mirrorError(err, {
      requestId,
      method: req.method,
      url: req.originalUrl,
    });

    loggers.api.error('RequestError', {
      requestId,
      status: err.status || 500,
      message: err.message,
    });

    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      requestId,
      timestamp: new Date().toISOString(),
    });
  };
}