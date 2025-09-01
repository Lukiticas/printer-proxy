import { Request, RequestHandler, Response } from "express";
import { ConfigService } from "../../config/config-service";
import PrinterManager from "../../printer-manager";
import { loggers } from "../../logging/logger";

export default function reloadEnvEndpoint(config: ConfigService, manager: PrinterManager): RequestHandler {
  return async (_req: Request, res: Response) => {
    try {
      const printers = (await manager.list()).map(p => p.name);
      const { changedKeys } = config.reloadFromEnv(printers);
      const settings = config.get();

      if (settings.defaultPrinter && printers.includes(settings.defaultPrinter)) {
        manager.setExplicitDefault(settings.defaultPrinter);
      }

      const stale = !!(settings.defaultPrinter && !printers.includes(settings.defaultPrinter));

      return res.json({
        success: true,
        changedKeys,
        settings,
        runtime: {
          staleDefaultPrinter: stale,
          availablePrinters: printers
        },
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
      loggers.api.error('ConfigReloadFailed', { error: e.message });
      res.status(500).json({ success: false, error: e.message || 'Reload failed' });
    }
  }
}