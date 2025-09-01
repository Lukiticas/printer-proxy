import { Request, Response, RequestHandler } from 'express';
import PrinterManager from '../printer-manager';
import { ReadRequestBody, ReadResponseBody } from '../types';
import { loggers } from '../logging/logger';

export default function readEndpoint(
  manager: PrinterManager
): RequestHandler {
  return async (
    req: Request<unknown, unknown, ReadRequestBody>,
    res: Response<ReadResponseBody | { error: string }>
  ) => {
    try {
      const body = req.body || {};
      
      const parseIfString: ReadRequestBody = typeof body === 'string' ? JSON.parse(body) : body;
      const { printer, command } = parseIfString;

      const status = await manager.queryStatus(printer, command || '~HQES');

      res.json({
        success: true,
        printer: printer || 'default',
        command: command || '~HQES',
        status,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      loggers.api.error('ReadFailed', { error: e.message });
      
      res.status(500).json({
        success: false,
        printer: req.body?.printer,
        command: req.body?.command,
        error: e.message || 'Status query failed',
        timestamp: new Date().toISOString(),
      });
    }
  };
}