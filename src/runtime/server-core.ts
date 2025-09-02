import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import path from 'path';
import PrinterManager from '../printing/printer-manager';
import { requestLogger } from '../middleware/request-logger';
import { errorHandler } from '../middleware/error-handler';
import { loggers, setupGlobalExceptionLogging } from '../logging/logger';
import { configRouter } from '../endpoints/config';
import { ConfigService } from '../config/config-service';
import { SecurityService } from '../security/security-service';
import { securityMiddleware } from '../middleware/security';
import { securityRouter } from '../endpoints/security';
import { StartServerOptions, startServerOutput } from '../types';
import { printingRouter } from '../endpoints/printing';
import { PowerShellPromptProvider } from '../security/powershell-provider';
import healthEndpoint from '../endpoints/health';

export async function startServer(opts: StartServerOptions = {}): Promise<startServerOutput> {
  setupGlobalExceptionLogging();

  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(bodyParser.json({ limit: '256kb' }));
  app.use(bodyParser.text({ limit: '512kb', type: 'text/plain' }));
  app.use(requestLogger());

  const printerManager = new PrinterManager();
  const configService = new ConfigService();

  await configService.init()

  printerManager.setConfigService(configService);

  const settings = configService.get();

  const promptProvider = opts.promptProvider || new PowerShellPromptProvider();
  const securityService = new SecurityService(configService, promptProvider);

  app.use(securityMiddleware(securityService));

  app.use('/', printingRouter(configService, printerManager));
  app.use('/config', configRouter(configService, printerManager));
  app.use('/security', securityRouter(securityService));
  app.get('/health', healthEndpoint());

  const staticRoot = path.join(process.cwd(), 'public', 'settings');
  app.use('/settings', express.static(staticRoot));

  app.get('/', (_req, res) => {
    res.redirect('/settings');
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found', timestamp: new Date().toISOString() });
  });

  app.use(errorHandler());

  const PORT = settings.port;
  const HOST = settings.host;

  const httpServer = await new Promise<import('http').Server>((resolve) => {
    const srv = app.listen(PORT, HOST, () => {
      loggers.main.info(`Printer Proxy listening on http://${HOST}:${PORT}`, {
        host: HOST,
        port: PORT,
        defaultPrinter: settings.defaultPrinter
      });

      resolve(srv);
    });
  });

  async function stop() {
    loggers.main.info('ServerStopping');
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
    loggers.main.info('ServerStopped');
  }

  return {
    app,
    httpServer,
    stop,
    settings,
    configService,
    printerManager,
    securityService
  };
}

