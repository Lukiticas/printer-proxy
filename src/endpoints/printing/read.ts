import { Request, Response, RequestHandler } from 'express';
import PrinterManager from '../../printer-manager';
import { PrinterJobRequestBody, PrinterJobResponseBody } from '../../types';
import { loggers } from '../../logging/logger';

export default function readEndpoint(manager: PrinterManager): RequestHandler {
  return async (
    req: Request<unknown, unknown, PrinterJobRequestBody>,
    res: Response<PrinterJobResponseBody | { error: string }>
  ) => {
    try {
      const body = req.body || {};

      const parseIfString: PrinterJobRequestBody = typeof body === 'string' ? JSON.parse(body) : body;
      const { printer, data } = parseIfString;

      const jobId = await manager.sendRaw(printer, data || '~HQES');

      res.json({
        success: true,
        jobId,
        printer: printer || 'default',
        message: 'Print job submitted',
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      loggers.api.error('ReadFailed', { error: e.message });

      res.status(500).json({
        success: false,
        printer: req.body?.printer,
        message: req.body?.data,
        error: e.message || 'Status query failed',
        timestamp: new Date().toISOString(),
      });
    }
  };
}