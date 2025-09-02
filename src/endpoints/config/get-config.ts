import { Request, RequestHandler, Response } from "express";
import { ConfigService } from "../../config/config-service";
import PrinterManager from "../../printing/printer-manager";
import { loggers } from "../../logging/logger";
import pkg from '../../../package.json';

export default function getConfigEndpoint(config: ConfigService, manager: PrinterManager): RequestHandler {
  return async (_req: Request, res: Response) => {
    try {
      const printers = (await manager.list()).map(p => p.name);
      const info = config.runtimeInfo(printers);

      return res.json({
        supportedConversions: [],
        version: pkg.version,
        apiLevel: pkg.version,
        buildNumber: 'N/A',
        plataform: pkg.name,
        settings: config.get(),
        runtime: info,
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
      loggers.api.error('ConfigGetFailed', { error: e.message });
      res.status(500).json({ error: e.message || 'Internal error' });
    }
  }
}