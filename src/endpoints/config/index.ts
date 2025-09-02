import { Router } from 'express';
import { ConfigService } from '../../config/config-service';
import PrinterManager from '../../printing/printer-manager';
import getConfigEndpoint from './get-config';
import putConfigEndpoint from './put-config';
import reloadEnvEndpoint from './reload-env';

export function configRouter(config: ConfigService, manager: PrinterManager): Router {
  const router = Router();

  router.get('/', getConfigEndpoint(config, manager));
  router.put('/', putConfigEndpoint(config, manager));
  router.post('/reload-env', reloadEnvEndpoint(config, manager));

  return router;
}