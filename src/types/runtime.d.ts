import { IncomingMessage, Server, ServerResponse } from 'http';
import { SettingsData } from './schema';
import { ConfigService } from '../config/config-service';
import PrinterManager from '../printer-manager';
import { SecurityService } from '../security/security-service';
import { Express } from 'express';


export interface StartServerOptions {
  promptProvider?: PromptProvider;
}

export interface startServerOutput {
  app: Express;
  httpServer: Server<typeof IncomingMessage, typeof ServerResponse>,
  stop: () => Promise<void>;
  settings: SettingsData,
  configService: ConfigService;
  printerManager: PrinterManager;
  securityService: SecurityService;
}