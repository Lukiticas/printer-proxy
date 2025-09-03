import { Request, RequestHandler, Response } from "express";
import { ErrorResponse, SecurityListingResponse } from "../../types";
import { loggers } from "../../logging/logger";
import { SecurityService } from "../../security/security-service";

export default function securityBlacklistEndoint(security: SecurityService): RequestHandler {
  return async (req: Request, res: Response<SecurityListingResponse | ErrorResponse>) => {
    try {
      const host = security.normalizeHost(req.params.host);
      security.removeBlacklist(host);

      res.json({
        success: true,
        host
      });
    } catch (e: any) {
      loggers.api.error('SecurityBlacklistFailed', { error: e.message });

      return res.status(500).json({
        success: false,
        error: 'SecurityBlacklistFailed',
        timestamp: new Date().toISOString()
      });
    }
  }
}