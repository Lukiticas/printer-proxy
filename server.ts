import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import healthEndpoint from './src/endpoints/health';
import PrinterManager from './src/printer-manager';
import { requestLogger } from './src/middleware/request-logger';
import { errorHandler } from './src/middleware/error-handler';
import { loggers, setupGlobalExceptionLogging } from './src/logging/logger';
import { ConfigService } from './src/config/config-service';
import { configRouter } from './src/endpoints/config';
import { printingRouter } from './src/endpoints/printing';
import { PowerShellPromptProvider } from './src/security/powershell-provider';
import { SecurityService } from './src/security/security-service';
import { securityMiddleware } from './src/middleware/security';
import { securityRouter } from './src/endpoints/security';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const printerManager = new PrinterManager();
const configService = new ConfigService(undefined);

async function bootstrap() {
  setupGlobalExceptionLogging();

  app.use(helmet());
  app.use(cors());
  app.use(bodyParser.json({ limit: '256kb' }));
  app.use(bodyParser.text({ limit: '512kb', type: 'text/plain' }));
  app.use(requestLogger());

  await configService.init(printerManager)
  printerManager.setConfigService(configService);

  const settings = configService.get();

  const promptProvider = new PowerShellPromptProvider();
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

  app.listen(PORT, HOST, () => {
    loggers.main.info(`Printer Proxy listening on http://${HOST}:${PORT}`, {
      host: HOST,
      port: PORT,
      defaultPrinter: settings.defaultPrinter
    });
  });
}

bootstrap().catch(err => {
  loggers.errors.error('BootstrapFailed', { error: err.message, stack: err.stack });
  process.exit(1);
});

export default app;