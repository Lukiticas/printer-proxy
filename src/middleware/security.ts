import { Request, Response, NextFunction } from 'express';
import { SecurityService } from '../security/security-service';
import { loggers } from '../logging/logger';

const EXCLUDED_PREFIXES = ['/settings/', '/settings', '/health'];

export function securityMiddleware(security: SecurityService) {
  return async (req: Request, res: Response, next: NextFunction) => {
  
    try {
      if (req.method === 'OPTIONS') {
        return next();
      }

      if (EXCLUDED_PREFIXES.some(p => req.path === p || req.path.startsWith(p))) {
        return next();
      }

      const originHeader = (req.headers.origin || req.headers.referer || '').toString();
      let hostCandidate = originHeader;

      if (!hostCandidate) {
        const ra = req.socket.remoteAddress || '';
        hostCandidate = ra;
      }

      const host = security.normalizeHost(hostCandidate);
      const action = security.classifyAction(req.method, req.path);

      if (security.isLoopback(host)) {
        return next();
      }

      const decision = await security.evaluate(host, action);

      if (decision.type !== 'allow') {
        res.status(403).json({
          error: 'AccessDenied',
          host,
          reason: decision.reason,
          scope: decision.scope,
          timestamp: new Date().toISOString()
        });

        return;
      }

      return next();
    } catch (e: any) {
      loggers.security.error('SecurityMiddlewareError', { error: e.message });
      res.status(500).json({ error: 'SecurityMiddlewareError', message: e.message });
    }
  };
}