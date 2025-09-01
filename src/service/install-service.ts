import path from 'path';
import { loggers } from '../logging/logger';

let Service: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Service = require('node-windows').Service;
} catch (err: any) {
  loggers.main.error('NodeWindowsNotAvailable', { error: err.message });
  process.exit(1);
}

const svc = new Service({
  name: 'Elgin Printer Proxy',
  description: 'HTTP proxy service for Elgin thermal printers',
  script: path.join(__dirname, '..', 'dist', 'server.js'),
  nodeOptions: ['--max_old_space_size=512']
});

svc.on('install', () => {
  loggers.main.info('ServiceInstalled', { name: svc.name });
  svc.start();
});

svc.on('alreadyinstalled', () => loggers.main.warn('ServiceAlreadyInstalled', { name: svc.name }));
svc.on('start', () => loggers.main.info('ServiceStarted', { name: svc.name }));
svc.on('error', (err: any) => loggers.main.error('ServiceError', { error: err.message }));

svc.install();