import { Request, Response, RequestHandler } from 'express';
import PrinterManager from '../../printing/printer-manager';
import {
  DefaultPrinterResponse,
  SetDefaultPrinterRequest,
  SetDefaultPrinterResponse,
} from '../../types';
import { loggers } from '../../logging/logger';

const handleGet = async (_req: Request, res: Response, manager: PrinterManager) => {
  try {
    const printer = await manager.getDefaultPrinter();

    const body: DefaultPrinterResponse = {
      printer: printer || undefined,
      timestamp: new Date().toISOString(),
    };

    return res.json(body);
  } catch (e: any) {
    loggers.api.error('GetDefaultFailed', { error: e.message });

    return res.status(500).json({
      error: e.message || 'Internal error',
      timestamp: new Date().toISOString(),
    });
  }
};

const handlePost = async (req: Request, res: Response, manager: PrinterManager) => {
  const body = req.body as SetDefaultPrinterRequest;

  try {
    if (!body?.name) {
      loggers.api.error('SetDefaultFailed', { error: 'Missing "name" in body' });

      return res.status(400).json({
        success: false,
        error: 'Missing "name" in body',
        timestamp: new Date().toISOString(),
      } as SetDefaultPrinterResponse);
    }

    const record = await manager.setDefaultPrinter(body.name);

    if (!record) {
      throw new Error(`Printer "${body.name}" not found`);
    }

    return res.json({
      success: true,
      saved: record,
      timestamp: new Date().toISOString(),
    } as SetDefaultPrinterResponse);
  } catch (e: any) {
    loggers.api.error('SetDefaultFailed', { error: e.message });

    return res.status(400).json({
      success: false,
      error: e.message || 'Failed to set default',
      timestamp: new Date().toISOString(),
    } as SetDefaultPrinterResponse);
  }
};

const handleDelete = async (_req: Request, res: Response, manager: PrinterManager) => {
  try {
    manager.clearDefaultPrinter()

    return res.json({
      success: true,
      message: 'Pinned default cleared',
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    loggers.api.error('ClearDefaultFailed', { error: e.message });

    return res.status(500).json({
      success: false,
      error: e.message || 'Failed to clear default',
      timestamp: new Date().toISOString(),
    });
  }
};

export default function defaultEndpoint(manager: PrinterManager): RequestHandler {
  const handlers: Record<string, (req: Request, res: Response, manager: PrinterManager) => Promise<Response>> = {
    GET: handleGet,
    POST: handlePost,
    DELETE: handleDelete,
  };

  return async (req: Request, res: Response) => {
    const handler = handlers[req.method] || undefined;

    if (handler) {
      return handler(req, res, manager);
    }

    loggers.api.error('MethodNotAllowed', { method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  };
}