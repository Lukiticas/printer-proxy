import { Request, RequestHandler, Response } from "express";
import { ConfigService } from "../../config/config-service";
import PrinterManager from "../../printing/printer-manager";
import { loggers } from "../../logging/logger";

export default function putConfigEndpoint(config: ConfigService, manager: PrinterManager): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const patch = req.body || {};
      const printers = (await manager.list()).map(p => p.name);

      const { changedKeys, restartRequired, settings } = config.update({
        host: patch.host,
        port: patch.port,
        defaultPrinter: patch.defaultPrinter
      });

      const stale = !!(settings.defaultPrinter && !printers.includes(settings.defaultPrinter));

      return res.json({
        success: true,
        changedKeys,
        restartRequired,
        settings,
        runtime: {
          staleDefaultPrinter: stale,
          availablePrinters: printers
        },
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
      loggers.api.error('ConfigUpdateFailed', { error: e.message });

      res.status(400).json({
        success: false,
        error: e.message || 'Validation failed',
        timestamp: new Date().toISOString()
      });
    }
  }
}