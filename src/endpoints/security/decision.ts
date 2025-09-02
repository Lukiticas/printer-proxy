import { Request, RequestHandler, Response } from "express";
import { ErrorResponse, securityDecisionResponse } from "../../types";
import { loggers } from "../../logging/logger";
import { SecurityService } from "../../security/security-service";

export default function securityDecisionEndpoint(security: SecurityService): RequestHandler {
  return async (req: Request, res: Response<securityDecisionResponse | ErrorResponse>) => {
    try {
      const { host, decision } = req.body || {};

      if (!host || !decision) {
        return res.status(400).json({
          error: 'host and decision required',
          success: false,
          timestamp: new Date().toISOString()
        });
      }

      const h = security.normalizeHost(host);

      switch (decision) {
        case 'whitelist':
          security.whitelist(h);
          return res.json({ success: true, host: h, decision: 'whitelist' });
        case 'blacklist':
          security.blacklist(h);
          return res.json({ success: true, host: h, decision: 'blacklist' });
        case 'allow-once':
        case 'deny-once':
          return res.json({ success: true, host: h, decision });
        default:
          throw new Error('Invalid decision');
      }
    } catch (e: any) {
      loggers.api.error('SecurityDecisionFailed', { error: e.message });

      return res.status(500).json({
        success: false,
        error: 'SecurityDecisionFailed',
        timestamp: new Date().toISOString()
      });
    }
  }
}