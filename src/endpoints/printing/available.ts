import { Request, Response, RequestHandler } from 'express';
import PrinterManager from '../../printing/printer-manager';
import { AvailablePrintersResponse } from '../../types';

import { loggers } from '../../logging/logger';

export default function availableEndpoint(manager: PrinterManager): RequestHandler {
  return async (_req: Request, res: Response<AvailablePrintersResponse | { error: string }>) => {
    try {
      const printers = await manager.list();

      res.json({
        printers,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      loggers.api.error('AvailableFailed', { error: e.message });
      res.status(500).json({ error: e.message || 'Internal error' });
    }
  };
}