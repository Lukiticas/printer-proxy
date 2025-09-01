import { Request, Response, RequestHandler } from 'express';
import PrinterManager from '../printer-manager';
import { AvailablePrintersResponse } from '../../types';
import pkg from '../../package.json';

export default function availableEndpoint(manager: PrinterManager): RequestHandler {
  return async (_req: Request, res: Response<AvailablePrintersResponse | { error: string }>) => {
    try {
      const printers = await manager.list();
      
      res.json({
        printers: printers.map((p) => ({
          name: p.name,
          connection: p.connection,
          isDefault: p.isDefault,
          manufacturer: p.manufacturer,
          origin: pkg.name,
          lastSeen: p?.lastSeen ?? 0,
          uid: p.uid,
          status: p.status,
        })),
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Internal error' });
    }
  };
}