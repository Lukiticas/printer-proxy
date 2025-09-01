import { Request, Response, RequestHandler } from 'express';
import PrinterManager from '../../printer-manager';
import {
  DefaultPrinterResponse,
  SetDefaultPrinterRequest,
  SetDefaultPrinterResponse,
} from '../../types';
import { loggers } from '../../logging/logger';

const handleGet = async (_req: Request, res: Response, manager: PrinterManager) => {
  try {
    const printer = await manager.getDefaultResolved();

    const body: DefaultPrinterResponse = {
      printer: printer,
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

    const record = await manager.setPinnedDefault(body.name, body.pinned ?? true);

    return res.json({
      success: true,
      saved: {
        name: record.name,
        pinned: record.pinned,
        savedAt: record.savedAt,
      },
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
    manager.clearPinnedDefault();

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

const forwardHandler = (req: Request, res: Response, manager: PrinterManager) => {
  if (req.method === 'GET') {
    return handleGet(req, res, manager);
  }

  if (req.method === 'POST') {
    return handlePost(req, res, manager);
  }

  if (req.method === 'DELETE') {
    return handleDelete(req, res, manager);
  }

  loggers.api.error('MethodNotAllowed', { method: req.method });
  return res.status(405).json({ error: 'Method not allowed' });
};

export default function defaultEndpoint(
  manager: PrinterManager
): RequestHandler {
  return async (req: Request, res: Response) => {
    return forwardHandler(req, res, manager);
  };
}