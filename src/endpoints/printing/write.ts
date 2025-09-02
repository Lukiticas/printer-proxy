import { Request, Response, RequestHandler } from 'express';
import PrinterManager from '../../printer-manager';
import { PrinterJobRequestBody, PrinterJobResponseBody } from '../../types';
import { loggers } from '../../logging/logger';

export default function writeEndpoint(manager: PrinterManager): RequestHandler {
  return async (
    req: Request<unknown, unknown, PrinterJobRequestBody>,
    res: Response<PrinterJobResponseBody | { error: string }>
  ) => {
    try {
      const body = req.body || {};

      const parseIfString: PrinterJobRequestBody = typeof body === 'string' ? JSON.parse(body) : body;

      const { data, printer } = parseIfString;

      if (!data || typeof data !== 'string') {
        loggers.api.error('PrintFailed', { error: 'Missing "data" (string) in body' });

        return res
          .status(400)
          .json({ error: 'Missing "data" (string) in request body.' });
      }

      const jobId = await manager.sendRaw(printer ?? 'default', data);

      res.json({
        success: true,
        jobId,
        printer: printer || 'default',
        message: 'Print job submitted',
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      loggers.api.error('PrintFailed', { error: e.message });

      res.status(500).json({
        success: false,
        error: e.message || 'Print failed',
        message: e.message,
        timestamp: new Date().toISOString(),
      } as any);
    }
  };
}