import { Request, RequestHandler, Response } from "express";
import { ErrorResponse, SecurityStateResponse } from "../../types";
import { loggers } from "../../logging/logger";
import { SecurityService } from "../../security/security-service";

export default function securityStateEndpoint(security: SecurityService): RequestHandler {
  return async (_req: Request, res: Response<SecurityStateResponse | ErrorResponse>) => {
    try {
      res.json({
        ...security.getState(),
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
      loggers.api.error('SecurityStateCheckFailed', { error: e.message });

      return res.status(500).json({
        success: false,
        error: 'SecurityStateCheckFailed',
        timestamp: new Date().toISOString()
      });
    }
  }
}