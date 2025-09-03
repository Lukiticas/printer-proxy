import { Router } from 'express';
import { SecurityService } from '../../security/security-service';
import securityStateEndpoint from './state';
import securityDecisionEndpoint from './decision';
import securityWhitelistEndpoint from './whitelist';
import securityBlacklistEndoint from './blacklist';

export function securityRouter(security: SecurityService): Router {
  const r = Router();

  r.get('/state', securityStateEndpoint(security));
  r.post('/decision', securityDecisionEndpoint(security));
  r.delete('/whitelist/:host', securityWhitelistEndpoint(security));
  r.delete('/blacklist/:host', securityBlacklistEndoint(security));

  return r;
}