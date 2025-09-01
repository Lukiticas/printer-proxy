import { Router } from "express";
import PrinterManager from "../../printer-manager";
import availableEndpoint from './available';
import defaultEndpoint from './default';
import writeEndpoint from './write';
import readEndpoint from './read';

export function printingRouter(manager: PrinterManager): Router {
  const router = Router();

  router.get('/available', availableEndpoint(manager));
  router.get('/default', defaultEndpoint(manager));
  router.post('/default', defaultEndpoint(manager));
  router.delete('/default', defaultEndpoint(manager));
  router.post('/write', writeEndpoint(manager));
  router.post('/read', readEndpoint(manager));

  return router;
}